import express from 'express';
import multer from 'multer';
import { requireAuth } from '../../../middleware/auth.js';
import { requireAdmin } from '../../../middleware/rbac.js';
import { validateBody } from '../../../middleware/validation.js';
import { asyncHandler } from '../../../middleware/error.js';
import { z } from 'zod';
import {
  getDashboardStats,
  getUserStatistics,
  getCourseStatistics,
  getEnrollmentStatistics,
  getCompletionStatistics,
} from '../controllers/adminController.js';
import {
  sendAdminEmailHandler,
  bulkUploadAdminEmailHandler,
  bulkPreviewAdminEmailHandler,
  getAdminEmailHistoryHandler,
  downloadAdminEmailTemplateHandler,
} from '../controllers/adminEmailController.js';
import { testEmailService, getCurrentProvider, setEmailProvider } from '../../../config/email.js';

const router = express.Router();

const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/csv',
    ];

    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls|csv)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel or CSV files (.xlsx, .xls, .csv) are allowed'), false);
    }
  },
});

// Validation schemas
const testEmailSchema = z.object({
  email: z.string().email('Invalid email address'),
  provider: z.enum(['resend', 'nodemailer']).optional(),
});

const switchProviderSchema = z.object({
  provider: z.enum(['resend', 'nodemailer'], 'Invalid email provider'),
});

const sendAdminEmailSchema = z.object({
  recipients: z.array(z.string().email('Invalid email address')).default([]),
  userIds: z.array(z.string().min(1)).optional().default([]),
  subject: z.string().trim().min(1, 'Subject is required').max(200, 'Subject cannot exceed 200 characters'),
  body: z.string().trim().min(1, 'Body is required').max(50000, 'Body cannot exceed 50000 characters'),
  sendMode: z.enum(['individual']).optional().default('individual'),
});

const emailHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

// All admin routes require authentication and admin role
router.use(requireAuth, requireAdmin);

// Dashboard Statistics
router.get('/dashboard', asyncHandler(getDashboardStats));

// Detailed Statistics
router.get('/stats/users', asyncHandler(getUserStatistics));
router.get('/stats/courses', asyncHandler(getCourseStatistics));
router.get('/stats/enrollments', asyncHandler(getEnrollmentStatistics));
router.get('/stats/completion', asyncHandler(getCompletionStatistics));

// Email Management Routes
router.get('/email/provider', asyncHandler(async (req, res) => {
  const provider = getCurrentProvider();
  res.json({
    ok: true,
    data: { provider },
    message: 'Current email provider retrieved successfully'
  });
}));

router.post('/email/provider', validateBody(switchProviderSchema), asyncHandler(async (req, res) => {
  const { provider } = req.body;
  setEmailProvider(provider);
  res.json({
    ok: true,
    data: { provider },
    message: `Email provider switched to ${provider} successfully`
  });
}));

router.post('/email/test', validateBody(testEmailSchema), asyncHandler(async (req, res) => {
  const { email, provider } = req.body;
  
  // Switch provider if specified
  if (provider) {
    setEmailProvider(provider);
  }
  
  const result = await testEmailService(email);
  
  res.json({
    ok: true,
    data: result,
    message: `Test email sent successfully via ${getCurrentProvider()}`
  });
}));

router.post('/email/send', validateBody(sendAdminEmailSchema), asyncHandler(sendAdminEmailHandler));

router.post(
  '/email/bulk-preview',
  excelUpload.single('emailFile'),
  asyncHandler(bulkPreviewAdminEmailHandler)
);

router.post(
  '/email/bulk-upload',
  excelUpload.single('emailFile'),
  asyncHandler(bulkUploadAdminEmailHandler)
);

router.get('/email/history', asyncHandler(async (req, res) => {
  const parsed = emailHistoryQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      message: 'Invalid query parameters',
      errors: parsed.error.flatten(),
    });
  }

  req.query = parsed.data;
  return getAdminEmailHistoryHandler(req, res);
}));

router.get('/email/template', asyncHandler(downloadAdminEmailTemplateHandler));

export default router;
