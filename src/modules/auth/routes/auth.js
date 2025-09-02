import express from 'express';
import { z } from 'zod';
import { validateBody } from '../../../middleware/validation.js';
import { asyncHandler } from '../../../middleware/error.js';
import {
  register,
  login,
  logout,
  refresh,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  acceptInvite,
  completeInvite,
  debugToken,
} from '../controllers/authController.js';

const router = express.Router();

// Validation schemas
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['ADMIN', 'INSTRUCTOR', 'PARTICIPANT']).optional(),
  cohortId: z.string().min(1, 'Cohort ID must be provided if specified').optional(),
  roleInCohort: z.enum(['LEADER', 'MEMBER', 'MENTOR']).default('MEMBER').optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const completeInviteSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// Routes
router.post('/register', validateBody(registerSchema), asyncHandler(register));
router.post('/login', validateBody(loginSchema), asyncHandler(login));
router.post('/logout', asyncHandler(logout));
router.post('/refresh', validateBody(refreshSchema), asyncHandler(refresh));
router.get('/debug-token', asyncHandler(debugToken));
router.post('/forgot-password', validateBody(forgotPasswordSchema), asyncHandler(forgotPassword));
router.post('/reset-password', validateBody(resetPasswordSchema), asyncHandler(resetPassword));
router.get('/verify-email', asyncHandler(verifyEmail));
router.post('/resend-verification', validateBody(resendVerificationSchema), asyncHandler(resendVerification));
router.get('/accept-invite', asyncHandler(acceptInvite));
router.post('/complete-invite', validateBody(completeInviteSchema), asyncHandler(completeInvite));

export default router;
