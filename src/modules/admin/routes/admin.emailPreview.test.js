import { beforeEach, describe, expect, it, vi } from 'vitest';
import adminRouter from './admin.js';
import { bulkPreviewAdminEmailHandler } from '../controllers/adminEmailController.js';
import { previewAdminEmailFromUpload } from '../services/adminEmailService.js';

vi.mock('../../../middleware/auth.js', () => ({
  requireAuth: (_req, _res, next) => next(),
}));

vi.mock('../../../middleware/rbac.js', () => ({
  requireAdmin: (_req, _res, next) => next(),
}));

vi.mock('../controllers/adminController.js', () => ({
  getDashboardStats: vi.fn(),
  getUserStatistics: vi.fn(),
  getCourseStatistics: vi.fn(),
  getEnrollmentStatistics: vi.fn(),
  getCompletionStatistics: vi.fn(),
}));

vi.mock('../../../config/email.js', () => ({
  testEmailService: vi.fn(),
  getCurrentProvider: vi.fn(() => 'resend'),
  setEmailProvider: vi.fn(),
}));

vi.mock('../services/adminEmailService.js', () => ({
  sendAdminEmail: vi.fn(),
  sendAdminEmailFromUpload: vi.fn(),
  previewAdminEmailFromUpload: vi.fn(),
  getAdminEmailHistory: vi.fn(),
  buildEmailListTemplateBuffer: vi.fn(),
}));

const createResponse = () => {
  const res = {
    statusCode: 200,
    body: null,
    status: vi.fn((statusCode) => {
      res.statusCode = statusCode;
      return res;
    }),
    json: vi.fn((body) => {
      res.body = body;
      return res;
    }),
  };
  return res;
};

describe('admin email bulk preview route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers POST /email/bulk-preview', () => {
    const matchingRoute = adminRouter.stack.find((layer) => {
      return layer.route?.path === '/email/bulk-preview' && layer.route?.methods?.post;
    });

    expect(matchingRoute).toBeTruthy();
  });

  it('returns preview data from the controller', async () => {
    previewAdminEmailFromUpload.mockResolvedValue({
      fileRecipientCount: 2,
      manualRecipientCount: 1,
      lmsRecipientCount: 0,
      duplicateCount: 0,
      recipientCount: 3,
      validEmails: ['one@example.com', 'two@example.com', 'manual@example.com'],
      parseErrors: [],
      warnings: [],
    });
    const req = {
      file: { buffer: Buffer.from('email\none@example.com\ntwo@example.com') },
      body: {
        recipients: JSON.stringify(['manual@example.com']),
      },
    };
    const res = createResponse();

    await bulkPreviewAdminEmailHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      ok: true,
      data: {
        fileRecipientCount: 2,
        manualRecipientCount: 1,
        lmsRecipientCount: 0,
        duplicateCount: 0,
        recipientCount: 3,
        validEmails: ['one@example.com', 'two@example.com', 'manual@example.com'],
        parseErrors: [],
        warnings: [],
      },
      message: 'Bulk email upload preview generated successfully',
    });
    expect(previewAdminEmailFromUpload).toHaveBeenCalledWith({
      fileBuffer: expect.any(Buffer),
      recipients: ['manual@example.com'],
      userIds: [],
    });
  });

  it('returns 400 when preview is requested without a file', async () => {
    const res = createResponse();

    await bulkPreviewAdminEmailHandler({ body: {} }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body).toEqual({
      ok: false,
      message: 'Excel or CSV file is required',
    });
    expect(previewAdminEmailFromUpload).not.toHaveBeenCalled();
  });
});
