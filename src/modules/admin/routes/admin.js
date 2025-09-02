import express from 'express';
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
import { testEmailService, getCurrentProvider, setEmailProvider } from '../../../config/email.js';

const router = express.Router();

// Validation schemas
const testEmailSchema = z.object({
  email: z.string().email('Invalid email address'),
  provider: z.enum(['resend', 'nodemailer']).optional(),
});

const switchProviderSchema = z.object({
  provider: z.enum(['resend', 'nodemailer'], 'Invalid email provider'),
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

export default router;
