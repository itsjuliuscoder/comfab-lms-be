import express from 'express';
import { requireAuth } from '../../../middleware/auth.js';
import { requireAdmin } from '../../../middleware/rbac.js';
import { asyncHandler } from '../../../middleware/error.js';
import {
  getPlatformOverview,
  getUserStatistics,
  getCourseStatistics,
  getEnrollmentStatistics,
  getCohortStatistics,
} from '../controllers/statisticsController.js';

const router = express.Router();

// All statistics routes require authentication and admin privileges
router.use(requireAuth);
router.use(requireAdmin);

// Statistics Routes
router.get('/overview', asyncHandler(getPlatformOverview));
router.get('/users', asyncHandler(getUserStatistics));
router.get('/courses', asyncHandler(getCourseStatistics));
router.get('/enrollments', asyncHandler(getEnrollmentStatistics));
router.get('/cohorts', asyncHandler(getCohortStatistics));

export default router;
