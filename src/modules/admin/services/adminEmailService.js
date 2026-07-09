import { randomUUID } from 'crypto';
import XLSX from 'xlsx';
import { User } from '../../users/models/User.js';
import { AdminEmailLog } from '../models/AdminEmailLog.js';
import {
  sendBulkCustomEmails,
  getCurrentProvider,
} from '../../../config/email.js';
import { createEmailTemplates } from '../../../config/email/templates.js';
import ActivityService from '../../activities/services/activityService.js';
import { createNotificationsForUsers, notifyAdmins } from '../../notifications/services/notificationService.js';
import { logger } from '../../../utils/logger.js';

export const MAX_RECIPIENTS_PER_SEND = 500;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function isValidEmail(email) {
  return EMAIL_REGEX.test(normalizeEmail(email));
}

export function dedupeEmails(emails) {
  const seen = new Set();
  const result = [];

  for (const email of emails) {
    const normalized = normalizeEmail(email);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

export function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export function parseRecipientsFromSpreadsheet(fileBuffer) {
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (jsonData.length < 2) {
    throw new Error('Spreadsheet must have at least a header row and one data row');
  }

  const headers = jsonData[0].map((header) =>
    header ? header.toString().trim().toLowerCase() : ''
  );

  const emailIndex = headers.findIndex((header) => header === 'email');
  if (emailIndex === -1) {
    throw new Error('Missing required header: email');
  }

  const emails = [];
  const errors = [];

  for (let i = 1; i < jsonData.length; i += 1) {
    const row = jsonData[i];
    const rowNumber = i + 1;
    const rawEmail = row[emailIndex];

    if (!rawEmail) {
      continue;
    }

    const email = normalizeEmail(rawEmail);
    if (!isValidEmail(email)) {
      errors.push({
        row: rowNumber,
        email: String(rawEmail),
        error: 'Invalid email format',
      });
      continue;
    }

    emails.push(email);
  }

  return {
    emails: dedupeEmails(emails),
    errors,
    totalRows: jsonData.length - 1,
  };
}

export function buildEmailListTemplateBuffer() {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([
    ['email'],
    ['recipient@example.com'],
  ]);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Recipients');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

async function resolveUserEmails(userIds = []) {
  if (!userIds.length) {
    return [];
  }

  const users = await User.find({
    _id: { $in: userIds },
    status: 'ACTIVE',
  }).select('email');

  return users.map((user) => normalizeEmail(user.email)).filter(Boolean);
}

export async function collectRecipients({ recipients = [], userIds = [] }) {
  const manualEmails = dedupeEmails(
    recipients.map(normalizeEmail).filter((email) => email && isValidEmail(email))
  );

  const invalidManual = recipients
    .map(normalizeEmail)
    .filter((email) => email && !isValidEmail(email));

  if (invalidManual.length > 0) {
    throw new Error(`Invalid email address(es): ${invalidManual.join(', ')}`);
  }

  const userEmails = await resolveUserEmails(userIds);
  const merged = dedupeEmails([...manualEmails, ...userEmails]);

  if (merged.length === 0) {
    throw new Error('At least one valid recipient is required');
  }

  if (merged.length > MAX_RECIPIENTS_PER_SEND) {
    throw new Error(`Cannot send to more than ${MAX_RECIPIENTS_PER_SEND} recipients at once`);
  }

  return merged;
}

function buildBodyPreview(body) {
  return String(body || '').trim().slice(0, 200);
}

async function logAdminEmailSend({
  adminUser,
  subject,
  body,
  recipients,
  sendResult,
  idempotencyPrefix,
}) {
  const failedRecipients = (sendResult.results || [])
    .filter((result) => !result.success)
    .map((result) => ({
      email: result.email,
      error: result.error || 'Failed to send email',
    }));

  const log = await AdminEmailLog.create({
    sentBy: adminUser._id,
    subject,
    bodyPreview: buildBodyPreview(body),
    recipientCount: recipients.length,
    sentCount: sendResult.sent || 0,
    failedCount: sendResult.failed || 0,
    recipients,
    failedRecipients,
    provider: sendResult.provider || getCurrentProvider(),
    idempotencyPrefix,
  });

  try {
    await ActivityService.logActivity({
      action: 'ADMIN_EMAIL_SENT',
      actor: {
        id: adminUser._id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
      },
      target: {
        type: 'EMAIL_BATCH',
        name: subject,
        id: log._id,
      },
      metadata: {
        recipientCount: recipients.length,
        sentCount: sendResult.sent || 0,
        failedCount: sendResult.failed || 0,
        provider: sendResult.provider || getCurrentProvider(),
      },
    });
  } catch (error) {
    logger.warn('Failed to log admin email activity', error);
  }

  try {
    const recipientUsers = await User.find({
      email: { $in: recipients.map(normalizeEmail) },
      status: 'ACTIVE',
    }).select('_id');

    if (recipientUsers.length) {
      await createNotificationsForUsers(
        recipientUsers.map((user) => user._id),
        {
          type: 'ADMIN_MESSAGE',
          title: subject,
          message: buildBodyPreview(body) || 'You have a new message from CONFAB LMS.',
          link: '/dashboard/settings',
          data: {
            adminEmailLogId: log._id.toString(),
            sentBy: adminUser._id.toString(),
          },
          priority: 'MEDIUM',
        }
      );
    }

    if (failedRecipients.length > 0) {
      await notifyAdmins({
        type: 'SYSTEM',
        title: 'Admin email delivery issues',
        message: `${failedRecipients.length} recipient(s) failed for "${subject}".`,
        link: '/dashboard/emails',
        data: { adminEmailLogId: log._id.toString() },
        priority: 'HIGH',
      });
    }
  } catch (notificationError) {
    logger.warn('Failed to create admin email notifications', notificationError);
  }

  return log;
}

export async function sendAdminEmail({
  adminUser,
  recipients = [],
  userIds = [],
  subject,
  body,
}) {
  const mergedRecipients = await collectRecipients({ recipients, userIds });
  const template = createEmailTemplates.customAdminEmail({ subject, body });
  const idempotencyPrefix = `admin-email/${randomUUID()}`;

  const sendResult = await sendBulkCustomEmails(mergedRecipients, {
    subject: template.subject,
    html: template.html,
    text: template.text,
    idempotencyPrefix,
  });

  const log = await logAdminEmailSend({
    adminUser,
    subject,
    body,
    recipients: mergedRecipients,
    sendResult,
    idempotencyPrefix,
  });

  return {
    log,
    sendResult,
    recipients: mergedRecipients,
  };
}

export async function sendAdminEmailFromUpload({
  adminUser,
  fileBuffer,
  recipients = [],
  userIds = [],
  subject,
  body,
}) {
  const parsed = parseRecipientsFromSpreadsheet(fileBuffer);
  const mergedRecipients = await collectRecipients({
    recipients: [...recipients, ...parsed.emails],
    userIds,
  });

  const template = createEmailTemplates.customAdminEmail({ subject, body });
  const idempotencyPrefix = `admin-email/${randomUUID()}`;

  const sendResult = await sendBulkCustomEmails(mergedRecipients, {
    subject: template.subject,
    html: template.html,
    text: template.text,
    idempotencyPrefix,
  });

  const log = await logAdminEmailSend({
    adminUser,
    subject,
    body,
    recipients: mergedRecipients,
    sendResult,
    idempotencyPrefix,
  });

  return {
    log,
    sendResult,
    recipients: mergedRecipients,
    parseErrors: parsed.errors,
  };
}

export async function getAdminEmailHistory({ page = 1, limit = 20 }) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (safePage - 1) * safeLimit;

  const [logs, total] = await Promise.all([
    AdminEmailLog.find()
      .populate('sentBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    AdminEmailLog.countDocuments(),
  ]);

  return {
    logs,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit) || 1,
    },
  };
}
