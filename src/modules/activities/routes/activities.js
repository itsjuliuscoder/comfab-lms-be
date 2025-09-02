import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middleware/auth.js';
import { requireAdmin } from '../../../middleware/rbac.js';
import { validateBody, validateQuery } from '../../../middleware/validation.js';
import { asyncHandler } from '../../../middleware/error.js';
import {
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
