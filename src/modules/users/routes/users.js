import express from 'express';
import multer from 'multer';
import { z } from 'zod';
import { requireAuth } from '../../../middleware/auth.js';
import { requireAdmin, requireRole } from '../../../middleware/rbac.js';
import { validateBody, validateQuery } from '../../../middleware/validation.js';
import { asyncHandler } from '../../../middleware/error.js';
import {
  getProfile,
  updateProfile,
  uploadAvatar,
  changePassword,
  getPreferences,
  updatePreferences,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  bulkActions,
  searchUsers,
  verifyInstructor,
  inviteUser,
  bulkInviteUsers,
  bulkInviteUsersFromExcel,
  downloadBulkInviteTemplate,
} from '../controllers/userController.js';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

// Configure multer for Excel file uploads
const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for Excel files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/octet-stream' // Generic binary
    ];
    
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'), false);
    }
  },
});

// Validation schemas
const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

const updatePreferencesSchema = z.object({
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  language: z.string().optional(),
  timezone: z.string().optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
  role: z.enum(['ADMIN', 'INSTRUCTOR', 'PARTICIPANT']).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
});

const bulkActionsSchema = z.object({
  action: z.enum(['activate', 'suspend', 'delete']),
  userIds: z.array(z.string()).min(1, 'At least one user ID is required'),
});

const inviteUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['ADMIN', 'INSTRUCTOR', 'PARTICIPANT']).default('PARTICIPANT'),
  cohortId: z.string().min(1, 'Cohort ID must be provided if specified').optional(),
  roleInCohort: z.enum(['LEADER', 'MEMBER', 'MENTOR']).default('MEMBER').optional(),
});

const bulkInviteSchema = z.object({
  users: z.array(z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters'),
    email: z.string().email('Invalid email address'),
    role: z.enum(['ADMIN', 'INSTRUCTOR', 'PARTICIPANT']).default('PARTICIPANT'),
    roleInCohort: z.enum(['LEADER', 'MEMBER', 'MENTOR']).default('MEMBER').optional(),
  })).min(1, 'At least one user is required').max(100, 'Maximum 100 users can be invited at once'),
  cohortId: z.string().min(1, 'Cohort ID must be provided if specified').optional(),
  roleInCohort: z.enum(['LEADER', 'MEMBER', 'MENTOR']).default('MEMBER').optional(),
  sendWelcomeEmail: z.boolean().default(true),
});

// User Profile Routes (authenticated users)
router.get('/profile', requireAuth, asyncHandler(getProfile));
router.patch('/profile', requireAuth, validateBody(updateProfileSchema), asyncHandler(updateProfile));
router.post('/avatar', requireAuth, upload.single('avatar'), asyncHandler(uploadAvatar));
router.patch('/change-password', requireAuth, validateBody(changePasswordSchema), asyncHandler(changePassword));
router.get('/preferences', requireAuth, asyncHandler(getPreferences));
router.patch('/preferences', requireAuth, validateBody(updatePreferencesSchema), asyncHandler(updatePreferences));

// Admin User Management Routes (admin only)
router.post('/invite', requireAuth, requireAdmin, validateBody(inviteUserSchema), asyncHandler(inviteUser));
router.post('/bulk-invite', requireAuth, requireAdmin, validateBody(bulkInviteSchema), asyncHandler(bulkInviteUsers));
router.post('/bulk-invite-excel', requireAuth, requireAdmin, excelUpload.single('excelFile'), asyncHandler(bulkInviteUsersFromExcel));

// Public routes (no authentication required)
router.get('/bulk-invite-template', asyncHandler(downloadBulkInviteTemplate));

// Admin-only routes (require authentication)
router.get('/', requireAuth, requireAdmin, asyncHandler(getAllUsers));
router.get('/search', requireAuth, requireAdmin, asyncHandler(searchUsers));
router.get('/:id', requireAuth, requireAdmin, asyncHandler(getUserById));
router.patch('/:id', requireAuth, requireAdmin, validateBody(updateUserSchema), asyncHandler(updateUser));
router.delete('/:id', requireAuth, requireAdmin, asyncHandler(deleteUser));
router.post('/bulk-actions', requireAuth, requireAdmin, validateBody(bulkActionsSchema), asyncHandler(bulkActions));
router.post('/:id/verify', requireAuth, requireAdmin, asyncHandler(verifyInstructor));

export default router;
