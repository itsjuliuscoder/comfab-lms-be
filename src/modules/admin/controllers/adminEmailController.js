import {
  sendAdminEmail,
  sendAdminEmailFromUpload,
  previewAdminEmailFromUpload,
  getAdminEmailHistory,
  buildEmailListTemplateBuffer,
} from '../services/adminEmailService.js';

const bulkUploadFieldsSchema = {
  subject: (value) => {
    const subject = String(value || '').trim();
    if (!subject) throw new Error('Subject is required');
    if (subject.length > 200) throw new Error('Subject cannot exceed 200 characters');
    return subject;
  },
  body: (value) => {
    const body = String(value || '').trim();
    if (!body) throw new Error('Body is required');
    if (body.length > 50000) throw new Error('Body cannot exceed 50000 characters');
    return body;
  },
};

export const sendAdminEmailHandler = async (req, res) => {
  const { recipients = [], userIds = [], subject, body } = req.body;

  const result = await sendAdminEmail({
    adminUser: req.user,
    recipients,
    userIds,
    subject,
    body,
  });

  res.json({
    ok: true,
    data: {
      logId: result.log?._id || null,
      recipientCount: result.recipients.length,
      sentCount: result.sendResult.sent,
      failedCount: result.sendResult.failed,
      provider: result.sendResult.provider,
      warnings: result.warnings,
      failedRecipients: result.sendResult.results
        ?.filter((item) => !item.success)
        .map((item) => ({
          email: item.email,
          error: item.error,
        })),
    },
    message: `Email sent to ${result.sendResult.sent} of ${result.recipients.length} recipients`,
  });
};

export const bulkUploadAdminEmailHandler = async (req, res) => {
  if (!req.file?.buffer) {
    return res.status(400).json({
      ok: false,
      message: 'Excel or CSV file is required',
    });
  }

  let subject;
  let body;

  try {
    subject = bulkUploadFieldsSchema.subject(req.body.subject);
    body = bulkUploadFieldsSchema.body(req.body.body);
  } catch (error) {
    return res.status(400).json({
      ok: false,
      message: error.message,
    });
  }

  let recipients = [];
  let userIds = [];

  if (req.body.recipients) {
    try {
      recipients = JSON.parse(req.body.recipients);
    } catch {
      recipients = String(req.body.recipients)
        .split(',')
        .map((email) => email.trim())
        .filter(Boolean);
    }
  }

  if (req.body.userIds) {
    try {
      userIds = JSON.parse(req.body.userIds);
    } catch {
      userIds = String(req.body.userIds)
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
    }
  }

  const result = await sendAdminEmailFromUpload({
    adminUser: req.user,
    fileBuffer: req.file.buffer,
    recipients,
    userIds,
    subject,
    body,
  });

  res.json({
    ok: true,
    data: {
      logId: result.log?._id || null,
      recipientCount: result.recipients.length,
      sentCount: result.sendResult.sent,
      failedCount: result.sendResult.failed,
      provider: result.sendResult.provider,
      parseErrors: result.parseErrors,
      warnings: result.warnings,
      failedRecipients: result.sendResult.results
        ?.filter((item) => !item.success)
        .map((item) => ({
          email: item.email,
          error: item.error,
        })),
    },
    message: `Email sent to ${result.sendResult.sent} of ${result.recipients.length} recipients`,
  });
};

export const bulkPreviewAdminEmailHandler = async (req, res) => {
  if (!req.file?.buffer) {
    return res.status(400).json({
      ok: false,
      message: 'Excel or CSV file is required',
    });
  }

  let recipients = [];
  let userIds = [];

  if (req.body.recipients) {
    try {
      recipients = JSON.parse(req.body.recipients);
    } catch {
      recipients = String(req.body.recipients)
        .split(',')
        .map((email) => email.trim())
        .filter(Boolean);
    }
  }

  if (req.body.userIds) {
    try {
      userIds = JSON.parse(req.body.userIds);
    } catch {
      userIds = String(req.body.userIds)
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
    }
  }

  const result = await previewAdminEmailFromUpload({
    fileBuffer: req.file.buffer,
    recipients,
    userIds,
  });

  res.json({
    ok: true,
    data: result,
    message: 'Bulk email upload preview generated successfully',
  });
};

export const getAdminEmailHistoryHandler = async (req, res) => {
  const { page, limit } = req.query;
  const result = await getAdminEmailHistory({ page, limit });

  res.json({
    ok: true,
    data: result,
    message: 'Admin email history retrieved successfully',
  });
};

export const downloadAdminEmailTemplateHandler = async (_req, res) => {
  const buffer = buildEmailListTemplateBuffer();

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="email-list-template.xlsx"'
  );
  res.send(buffer);
};
