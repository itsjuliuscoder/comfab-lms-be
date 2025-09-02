import express from 'express';
import { requireAuth } from '../../../middleware/auth.js';
import { requireAdmin } from '../../../middleware/rbac.js';
import { asyncHandler } from '../../../middleware/error.js';
import {
  getPlatformAnalytics,
  getUserAnalytics,
  getCourseAnalytics,
  getEnrollmentAnalytics,
  getCohortAnalytics,
} from '../controllers/analyticsController.js';

const router = express.Router();

// All analytics routes require authentication and admin privileges
router.use(requireAuth);
router.use(requireAdmin);

// Analytics Routes
router.get('/platform', asyncHandler(getPlatformAnalytics));
router.get('/users', asyncHandler(getUserAnalytics));
router.get('/courses', asyncHandler(getCourseAnalytics));
router.get('/enrollments', asyncHandler(getEnrollmentAnalytics));
router.get('/cohorts', asyncHandler(getCohortAnalytics));

export default router;
