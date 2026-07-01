import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middleware/auth.js';
import { requireAdmin } from '../../../middleware/rbac.js';
import { validateBody } from '../../../middleware/validation.js';
import { asyncHandler } from '../../../middleware/error.js';
import {
  getUserEnrollments,
  getMyCourseEnrollment,
  enrollInCourse,
  updateEnrollment,
  withdrawFromCourse,
  getEnrollmentDetails,
  getAllEnrollments,
  getCourseEnrollmentStats,
  getCourseEnrollments,
} from '../controllers/enrollmentController.js';

const router = express.Router();

// Validation schemas
const enrollInCourseSchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
});

const updateEnrollmentSchema = z.object({
  status: z.enum(['ACTIVE', 'COMPLETED', 'WITHDRAWN', 'SUSPENDED']).optional(),
  progressPct: z.number().min(0, 'Progress percentage cannot be negative').max(100, 'Progress percentage cannot exceed 100').optional(),
});

// Admin Routes. Keep these before /:id so static admin paths are not captured
// as enrollment ids.
router.get('/admin/all', requireAuth, requireAdmin, asyncHandler(getAllEnrollments));
router.get('/admin/courses/:courseId/stats', requireAuth, requireAdmin, asyncHandler(getCourseEnrollmentStats));

// User Enrollment Routes
router.get('/', requireAuth, asyncHandler(getUserEnrollments));
router.post('/', requireAuth, validateBody(enrollInCourseSchema), asyncHandler(enrollInCourse));
router.get('/me/courses/:courseId', requireAuth, asyncHandler(getMyCourseEnrollment));
router.get('/courses/:courseId', requireAuth, asyncHandler(getCourseEnrollments));
router.get('/:id', requireAuth, asyncHandler(getEnrollmentDetails));
router.put('/:id', requireAuth, validateBody(updateEnrollmentSchema), asyncHandler(updateEnrollment));
router.delete('/:id', requireAuth, asyncHandler(withdrawFromCourse));

export default router;
