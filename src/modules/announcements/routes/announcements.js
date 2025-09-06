import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middleware/auth.js';
import { requireAdmin, requireInstructor } from '../../../middleware/rbac.js';
import { validateBody, validateParams } from '../../../middleware/validation.js';
import { asyncHandler } from '../../../middleware/error.js';
import {
  getAnnouncements,
  getUnreadCount,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  markAsRead,
  getAllAnnouncements,
} from '../controllers/announcementController.js';

const router = express.Router();

// Validation schemas
const createAnnouncementSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title cannot exceed 200 characters'),
  content: z.string().min(1, 'Content is required').max(5000, 'Content cannot exceed 5000 characters'),
  type: z.enum(['GENERAL', 'COURSE', 'SYSTEM', 'MAINTENANCE', 'EVENT', 'URGENT']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  visibility: z.enum(['PUBLIC', 'ENROLLED_USERS', 'INSTRUCTORS', 'ADMINS', 'SPECIFIC_USERS']).optional(),
  targetAudience: z.object({
    courseId: z.string().optional(),
    cohortId: z.string().optional(),
    userIds: z.array(z.string()).optional(),
    roles: z.array(z.enum(['ADMIN', 'INSTRUCTOR', 'PARTICIPANT'])).optional(),
  }).optional(),
  attachments: z.array(z.object({
    publicId: z.string().optional(),
    url: z.string().url().optional(),
    name: z.string().optional(),
    mime: z.string().optional(),
    size: z.number().optional(),
  })).optional(),
  scheduledAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  isPinned: z.boolean().optional(),
  allowComments: z.boolean().optional(),
  tags: z.array(z.string().max(50, 'Tag cannot exceed 50 characters')).optional(),
});

const updateAnnouncementSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title cannot exceed 200 characters').optional(),
  content: z.string().min(1, 'Content is required').max(5000, 'Content cannot exceed 5000 characters').optional(),
  type: z.enum(['GENERAL', 'COURSE', 'SYSTEM', 'MAINTENANCE', 'EVENT', 'URGENT']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  visibility: z.enum(['PUBLIC', 'ENROLLED_USERS', 'INSTRUCTORS', 'ADMINS', 'SPECIFIC_USERS']).optional(),
  targetAudience: z.object({
    courseId: z.string().optional(),
    cohortId: z.string().optional(),
    userIds: z.array(z.string()).optional(),
    roles: z.array(z.enum(['ADMIN', 'INSTRUCTOR', 'PARTICIPANT'])).optional(),
  }).optional(),
  attachments: z.array(z.object({
    publicId: z.string().optional(),
    url: z.string().url().optional(),
    name: z.string().optional(),
    mime: z.string().optional(),
    size: z.number().optional(),
  })).optional(),
  scheduledAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  isPinned: z.boolean().optional(),
  allowComments: z.boolean().optional(),
  tags: z.array(z.string().max(50, 'Tag cannot exceed 50 characters')).optional(),
});

const announcementIdSchema = z.object({
  id: z.string().min(1, 'Announcement ID is required'),
});

// Public routes (require authentication)
router.get('/', requireAuth, asyncHandler(getAnnouncements));
router.get('/unread-count', requireAuth, asyncHandler(getUnreadCount));
router.get('/:id', requireAuth, validateParams(announcementIdSchema), asyncHandler(getAnnouncementById));
router.post('/:id/read', requireAuth, validateParams(announcementIdSchema), asyncHandler(markAsRead));

// Instructor/Admin routes
router.post('/', requireAuth, requireInstructor, validateBody(createAnnouncementSchema), asyncHandler(createAnnouncement));
router.put('/:id', requireAuth, validateParams(announcementIdSchema), validateBody(updateAnnouncementSchema), asyncHandler(updateAnnouncement));
router.delete('/:id', requireAuth, validateParams(announcementIdSchema), asyncHandler(deleteAnnouncement));

// Admin-only routes
router.get('/admin/all', requireAuth, requireAdmin, asyncHandler(getAllAnnouncements));

export default router;
