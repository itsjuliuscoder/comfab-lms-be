import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middleware/auth.js';
import { requireAdmin } from '../../../middleware/rbac.js';
import { validateBody, validateQuery } from '../../../middleware/validation.js';
import { asyncHandler } from '../../../middleware/error.js';
import {
  createActivity,
  getAllActivities,
  getDashboardSummary,
  getUserActivities,
  getTargetActivities,
  getActivitySummary,
  getActivityById,
  deleteActivity,
  bulkDeleteActivities,
  exportActivities,
  cleanupActivities,
} from '../controllers/activityController.js';

const router = express.Router();

// Validation schemas
const bulkDeleteSchema = z.object({
  activityIds: z.array(z.string()).optional(),
  filters: z.object({
    action: z.string().optional(),
    actorId: z.string().optional(),
    targetType: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }).optional(),
});

const exportSchema = z.object({
  format: z.enum(['json', 'csv']).default('json'),
  filters: z.object({
    action: z.string().optional(),
    actorId: z.string().optional(),
    actorRole: z.string().optional(),
    targetType: z.string().optional(),
    targetId: z.string().optional(),
    status: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }).optional(),
});

const cleanupSchema = z.object({
  daysToKeep: z.number().min(1).max(3650).default(365), // Max 10 years
});

const createActivitySchema = z.object({
  action: z.string().min(1, 'Action is required').max(100, 'Action cannot exceed 100 characters'),
  actor: z.object({
    userId: z.string().optional(),
    name: z.string().min(1, 'Actor name is required').max(100, 'Actor name cannot exceed 100 characters'),
    email: z.string().email('Invalid email format').max(100, 'Email cannot exceed 100 characters'),
    role: z.enum(['ADMIN', 'INSTRUCTOR', 'PARTICIPANT']).optional(),
  }).optional(),
  target: z.object({
    type: z.enum(['USER', 'COURSE', 'LESSON', 'ENROLLMENT', 'COHORT', 'FILE', 'NOTE', 'DISCUSSION', 'SYSTEM', 'OTHER']),
    id: z.string().optional(),
    model: z.enum(['User', 'Course', 'Lesson', 'Enrollment', 'Cohort', 'File', 'Note', 'Discussion']).optional(),
    name: z.string().max(200, 'Target name cannot exceed 200 characters').optional(),
  }),
  context: z.object({
    description: z.string().max(500, 'Context description cannot exceed 500 characters').optional(),
    source: z.string().max(100, 'Source cannot exceed 100 characters').optional(),
    additionalInfo: z.record(z.any()).optional(),
  }).optional(),
  metadata: z.record(z.any()).optional(),
});

// Routes
router.post('/', requireAuth, validateBody(createActivitySchema), asyncHandler(createActivity));

// Admin-only routes
router.get('/', requireAuth, requireAdmin, asyncHandler(getAllActivities));
router.get('/dashboard', requireAuth, requireAdmin, asyncHandler(getDashboardSummary));
router.get('/summary', requireAuth, requireAdmin, asyncHandler(getActivitySummary));
router.get('/:id', requireAuth, requireAdmin, asyncHandler(getActivityById));
router.delete('/:id', requireAuth, requireAdmin, asyncHandler(deleteActivity));
router.post('/bulk-delete', requireAuth, requireAdmin, validateBody(bulkDeleteSchema), asyncHandler(bulkDeleteActivities));
router.post('/export', requireAuth, requireAdmin, validateBody(exportSchema), asyncHandler(exportActivities));
router.post('/cleanup', requireAuth, requireAdmin, validateBody(cleanupSchema), asyncHandler(cleanupActivities));

// User and target activity routes
router.get('/user/:userId', requireAuth, asyncHandler(getUserActivities));
router.get('/target/:type/:id', requireAuth, requireAdmin, asyncHandler(getTargetActivities));

export default router;
