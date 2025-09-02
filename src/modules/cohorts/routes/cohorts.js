import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middleware/auth.js';
import { requireAdmin, requireInstructor } from '../../../middleware/rbac.js';
import { validateBody, validateParams } from '../../../middleware/validation.js';
import { asyncHandler } from '../../../middleware/error.js';
import {
  getAllCohorts,
  createCohort,
  getCohortById,
  updateCohort,
  deleteCohort,
  getCohortMembers,
  addMemberToCohort,
  updateMemberRole,
  removeMemberFromCohort,
  getUserCohorts,
} from '../controllers/cohortController.js';

const router = express.Router();

// Validation schemas
const createCohortSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters'),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
  year: z.number().min(2020, 'Year must be 2020 or later').max(2030, 'Year cannot exceed 2030').optional(),
  tags: z.array(z.string().max(50, 'Tag cannot exceed 50 characters')).optional(),
  startDate: z.string().datetime('Invalid start date format').optional(),
  endDate: z.string().datetime('Invalid end date format').optional(),
  maxParticipants: z.number().min(1, 'Max participants must be at least 1').optional(),
});

const updateCohortSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters').optional(),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
  year: z.number().min(2020, 'Year must be 2020 or later').max(2030, 'Year cannot exceed 2030').optional(),
  tags: z.array(z.string().max(50, 'Tag cannot exceed 50 characters')).optional(),
  startDate: z.string().datetime('Invalid start date format').optional(),
  endDate: z.string().datetime('Invalid end date format').optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'COMPLETED']).optional(),
  maxParticipants: z.number().min(1, 'Max participants must be at least 1').optional(),
});

const addMemberSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  roleInCohort: z.enum(['LEADER', 'MEMBER', 'MENTOR']).default('MEMBER'),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional(),
});

const updateMemberSchema = z.object({
  roleInCohort: z.enum(['LEADER', 'MEMBER', 'MENTOR']).optional(),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional(),
});

// Public routes (no authentication required)
router.get('/', asyncHandler(getAllCohorts));

// Protected routes (authentication required)
router.get('/user/my', requireAuth, asyncHandler(getUserCohorts));
router.get('/:id', requireAuth, asyncHandler(getCohortById));

// Cohort management routes (instructor/admin only)
router.post('/', requireAuth, requireInstructor, validateBody(createCohortSchema), asyncHandler(createCohort));
router.put('/:id', requireAuth, requireInstructor, validateBody(updateCohortSchema), asyncHandler(updateCohort));
router.delete('/:id', requireAuth, requireInstructor, asyncHandler(deleteCohort));

// Member management routes
router.get('/:id/members', requireAuth, asyncHandler(getCohortMembers));
router.post('/:id/members', requireAuth, requireInstructor, validateBody(addMemberSchema), asyncHandler(addMemberToCohort));
router.put('/:id/members/:userId', requireAuth, requireInstructor, validateBody(updateMemberSchema), asyncHandler(updateMemberRole));
router.delete('/:id/members/:userId', requireAuth, requireInstructor, asyncHandler(removeMemberFromCohort));

export default router;
