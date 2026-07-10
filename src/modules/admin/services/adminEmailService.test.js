import { beforeEach, describe, expect, it, vi } from 'vitest';
import XLSX from 'xlsx';
import {
  dedupeEmails,
  isValidEmail,
  normalizeEmail,
  chunkArray,
  parseRecipientsFromSpreadsheet,
  MAX_RECIPIENTS_PER_SEND,
  getAdminEmailHistory,
  sendAdminEmail,
  previewAdminEmailFromUpload,
} from './adminEmailService.js';
import { AdminEmailLog } from '../models/AdminEmailLog.js';
import { User } from '../../users/models/User.js';
import { sendBulkCustomEmails } from '../../../config/email.js';

vi.mock('../models/AdminEmailLog.js', () => ({
  AdminEmailLog: {
    create: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock('../../users/models/User.js', () => ({
  User: {
    find: vi.fn(),
  },
}));

vi.mock('../../../config/email.js', () => ({
  sendBulkCustomEmails: vi.fn(),
  getCurrentProvider: vi.fn(() => 'resend'),
}));

vi.mock('../../../config/email/templates.js', () => ({
  createEmailTemplates: {
    customAdminEmail: vi.fn(({ subject, body }) => ({
      subject,
      html: `<p>${body}</p>`,
      text: body,
    })),
  },
}));

vi.mock('../../activities/services/activityService.js', () => ({
  default: {
    logActivity: vi.fn(),
  },
}));

vi.mock('../../notifications/services/notificationService.js', () => ({
  createNotificationsForUsers: vi.fn(),
  notifyAdmins: vi.fn(),
}));

vi.mock('../../../utils/logger.js', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

const createFindChain = (value) => ({
  select: vi.fn().mockResolvedValue(value),
});

const createHistoryFindChain = (value) => {
  const chain = {
    populate: vi.fn(() => chain),
    sort: vi.fn(() => chain),
    skip: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    lean: vi.fn().mockResolvedValue(value),
  };
  return chain;
};

const buildWorkbookBuffer = (rows) => {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Recipients');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

describe('adminEmailService helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes and validates emails', () => {
    expect(normalizeEmail('  Test@Example.COM ')).toBe('test@example.com');
    expect(isValidEmail('valid@example.com')).toBe(true);
    expect(isValidEmail('invalid-email')).toBe(false);
  });

  it('deduplicates emails case-insensitively', () => {
    expect(
      dedupeEmails(['A@Example.com', 'a@example.com', 'b@example.com'])
    ).toEqual(['a@example.com', 'b@example.com']);
  });

  it('chunks arrays into requested sizes', () => {
    const items = Array.from({ length: 101 }, (_, index) => `user${index}@example.com`);
    const chunks = chunkArray(items, 100);

    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toHaveLength(100);
    expect(chunks[1]).toHaveLength(1);
  });

  it('parses email addresses from spreadsheet buffer', () => {
    const buffer = buildWorkbookBuffer([
      ['email'],
      ['one@example.com'],
      ['two@example.com'],
      ['invalid'],
      ['one@example.com'],
    ]);

    const result = parseRecipientsFromSpreadsheet(buffer);

    expect(result.emails).toEqual(['one@example.com', 'two@example.com']);
    expect(result.duplicateCount).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toEqual(
      expect.objectContaining({
        row: 4,
        email: 'invalid',
        error: 'Invalid email format',
      })
    );
  });

  it('exposes a max recipient limit constant', () => {
    expect(MAX_RECIPIENTS_PER_SEND).toBe(500);
  });

  it('returns a successful send result when provider delivery and logging succeed', async () => {
    User.find.mockReturnValue(createFindChain([]));
    sendBulkCustomEmails.mockResolvedValue({
      success: true,
      sent: 1,
      failed: 0,
      provider: 'resend',
      results: [{ success: true, email: 'one@example.com', messageId: 'msg_1' }],
    });
    AdminEmailLog.create.mockResolvedValue({ _id: 'log_1' });

    const result = await sendAdminEmail({
      adminUser: {
        _id: 'admin_1',
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'ADMIN',
      },
      recipients: ['one@example.com'],
      subject: 'Test',
      body: 'Hello',
    });

    expect(result.log).toEqual({ _id: 'log_1' });
    expect(result.sendResult.sent).toBe(1);
    expect(result.warnings).toEqual([]);
  });

  it('rejects when provider delivery fails', async () => {
    User.find.mockReturnValue(createFindChain([]));
    sendBulkCustomEmails.mockRejectedValue(new Error('Provider unavailable'));

    await expect(
      sendAdminEmail({
        adminUser: {
          _id: 'admin_1',
          name: 'Admin User',
          email: 'admin@example.com',
          role: 'ADMIN',
        },
        recipients: ['one@example.com'],
        subject: 'Test',
        body: 'Hello',
      })
    ).rejects.toThrow('Provider unavailable');

    expect(AdminEmailLog.create).not.toHaveBeenCalled();
  });

  it('returns warnings when logging fails after provider delivery succeeds', async () => {
    User.find.mockReturnValue(createFindChain([]));
    sendBulkCustomEmails.mockResolvedValue({
      success: true,
      sent: 1,
      failed: 0,
      provider: 'resend',
      results: [{ success: true, email: 'one@example.com', messageId: 'msg_1' }],
    });
    AdminEmailLog.create.mockRejectedValue(new Error('Log write failed'));

    const result = await sendAdminEmail({
      adminUser: {
        _id: 'admin_1',
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'ADMIN',
      },
      recipients: ['one@example.com'],
      subject: 'Test',
      body: 'Hello',
    });

    expect(result.log).toBeNull();
    expect(result.sendResult.sent).toBe(1);
    expect(result.warnings).toEqual([
      'Email delivery succeeded, but post-send bookkeeping failed: Log write failed',
    ]);
  });

  it('returns an empty history response when there are no email logs', async () => {
    AdminEmailLog.find.mockReturnValue(createHistoryFindChain([]));
    AdminEmailLog.countDocuments.mockResolvedValue(0);

    const result = await getAdminEmailHistory({ page: 1, limit: 10 });

    expect(result).toEqual({
      logs: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1,
      },
    });
  });

  it('previews valid bulk upload recipients before sending', async () => {
    User.find.mockReturnValue(createFindChain([
      { email: 'lms@example.com' },
    ]));

    const result = await previewAdminEmailFromUpload({
      fileBuffer: buildWorkbookBuffer([
        ['email'],
        ['one@example.com'],
        ['two@example.com'],
      ]),
      recipients: ['manual@example.com'],
      userIds: ['user_1'],
    });

    expect(result).toEqual({
      fileRecipientCount: 2,
      manualRecipientCount: 1,
      lmsRecipientCount: 1,
      duplicateCount: 0,
      recipientCount: 4,
      validEmails: [
        'one@example.com',
        'two@example.com',
        'manual@example.com',
        'lms@example.com',
      ],
      parseErrors: [],
      warnings: [],
    });
  });

  it('previews invalid rows and duplicate recipients without blocking preview', async () => {
    User.find.mockReturnValue(createFindChain([
      { email: 'two@example.com' },
    ]));

    const result = await previewAdminEmailFromUpload({
      fileBuffer: buildWorkbookBuffer([
        ['email'],
        ['one@example.com'],
        ['invalid'],
        ['one@example.com'],
        ['two@example.com'],
      ]),
      recipients: ['one@example.com', 'manual@example.com'],
      userIds: ['user_1'],
    });

    expect(result.fileRecipientCount).toBe(2);
    expect(result.manualRecipientCount).toBe(2);
    expect(result.lmsRecipientCount).toBe(1);
    expect(result.duplicateCount).toBe(3);
    expect(result.recipientCount).toBe(3);
    expect(result.validEmails).toEqual([
      'one@example.com',
      'two@example.com',
      'manual@example.com',
    ]);
    expect(result.parseErrors).toEqual([
      {
        row: 3,
        email: 'invalid',
        error: 'Invalid email format',
      },
    ]);
    expect(result.warnings).toEqual([]);
  });

  it('rejects preview when spreadsheet is missing the email header', async () => {
    await expect(
      previewAdminEmailFromUpload({
        fileBuffer: buildWorkbookBuffer([
          ['name'],
          ['one@example.com'],
        ]),
      })
    ).rejects.toThrow('Missing required header: email');
  });

  it('rejects preview when spreadsheet has no data rows', async () => {
    await expect(
      previewAdminEmailFromUpload({
        fileBuffer: buildWorkbookBuffer([
          ['email'],
        ]),
      })
    ).rejects.toThrow('Spreadsheet must have at least a header row and one data row');
  });

  it('previews recipient limit warnings before sending', async () => {
    User.find.mockReturnValue(createFindChain([]));
    const rows = [
      ['email'],
      ...Array.from({ length: MAX_RECIPIENTS_PER_SEND + 1 }, (_, index) => [
        `user${index}@example.com`,
      ]),
    ];

    const result = await previewAdminEmailFromUpload({
      fileBuffer: buildWorkbookBuffer(rows),
    });

    expect(result.recipientCount).toBe(MAX_RECIPIENTS_PER_SEND + 1);
    expect(result.warnings).toEqual([
      `Cannot send to more than ${MAX_RECIPIENTS_PER_SEND} recipients at once`,
    ]);
  });
});
