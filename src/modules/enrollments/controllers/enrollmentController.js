import { Enrollment } from '../models/Enrollment.js';
import { Course } from '../../courses/models/Course.js';
import { sendEnrollmentEmail } from '../../../config/email.js';
import { successResponse, errorResponse, notFoundResponse, forbiddenResponse } from '../../../utils/response.js';
import { getPaginationParams, createPaginationResult } from '../../../utils/pagination.js';
import { logger } from '../../../utils/logger.js';

// GET /enrollments - Get user enrollments
export const getUserEnrollments = async (req, res) => {
  try {
    const { page, limit } = getPaginationParams(req.query);
    const { status } = req.query;

    // Build query
    const query = { userId: req.user._id };
    if (status) query.status = status;

    // Get total count
    const total = await Enrollment.countDocuments(query);

    // Get enrollments with pagination
    const enrollments = await Enrollment.find(query)
      .populate('courseId', 'title summary thumbnailUrl difficulty estimatedDuration')
      .sort({ enrolledAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const result = createPaginationResult(enrollments, total, page, limit);
    return successResponse(res, result, 'Enrollments retrieved successfully');
  } catch (error) {
    logger.error('Get user enrollments error:', error);
    return errorResponse(res, error);
  }
};

// POST /enrollments - Enroll in course
export const enrollInCourse = async (req, res) => {
  try {
    const { courseId } = req.body;

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return notFoundResponse(res, 'Course');
    }

    // Check if course is published
    if (course.status !== 'PUBLISHED') {
      return forbiddenResponse(res, 'Cannot enroll in unpublished course');
    }

    // Check if course is full
    if (course.isFull()) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'COURSE_FULL',
          message: 'Course is full',
        },
      });
    }

    // Check if user is already enrolled
    const existingEnrollment = await Enrollment.isUserEnrolled(req.user._id, courseId);
    if (existingEnrollment) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'ALREADY_ENROLLED',
          message: 'You are already enrolled in this course',
        },
      });
    }

    // Create enrollment
    const enrollment = new Enrollment({
      userId: req.user._id,
      courseId,
      status: 'ACTIVE',
    });

    await enrollment.save();

    // Populate course details
    const populatedEnrollment = await Enrollment.findById(enrollment._id)
      .populate('courseId', 'title summary thumbnailUrl difficulty estimatedDuration');

    // Send enrollment email
    try {
      await sendEnrollmentEmail(req.user, course);
    } catch (emailError) {
      logger.error('Failed to send enrollment email:', emailError);
    }

    return successResponse(res, { enrollment: populatedEnrollment }, 'Enrolled successfully', 201);
  } catch (error) {
    logger.error('Enroll in course error:', error);
    return errorResponse(res, error);
  }
};

// PUT /enrollments/:id - Update enrollment
export const updateEnrollment = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, progressPct } = req.body;

    const enrollment = await Enrollment.findById(id);

    if (!enrollment) {
      return notFoundResponse(res, 'Enrollment');
    }

    // Check if user owns this enrollment or is admin
    if (enrollment.userId.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return forbiddenResponse(res, 'Access denied');
    }

    // Update enrollment
    const updates = {};
    if (status) updates.status = status;
    if (progressPct !== undefined) updates.progressPct = progressPct;

    const updatedEnrollment = await Enrollment.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).populate('courseId', 'title summary thumbnailUrl difficulty estimatedDuration');

    return successResponse(res, { enrollment: updatedEnrollment }, 'Enrollment updated successfully');
  } catch (error) {
    logger.error('Update enrollment error:', error);
    return errorResponse(res, error);
  }
};

// DELETE /enrollments/:id - Withdraw from course
export const withdrawFromCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const enrollment = await Enrollment.findById(id);

    if (!enrollment) {
      return notFoundResponse(res, 'Enrollment');
    }

    // Check if user owns this enrollment or is admin
    if (enrollment.userId.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return forbiddenResponse(res, 'Access denied');
    }

    // Withdraw enrollment
    await enrollment.withdraw();

    return successResponse(res, null, 'Withdrawn from course successfully');
  } catch (error) {
    logger.error('Withdraw from course error:', error);
    return errorResponse(res, error);
  }
};

// GET /enrollments/:id - Get enrollment details
export const getEnrollmentDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const enrollment = await Enrollment.findById(id)
      .populate('courseId', 'title summary thumbnailUrl difficulty estimatedDuration')
      .populate('userId', 'name email');

    if (!enrollment) {
      return notFoundResponse(res, 'Enrollment');
    }

    // Check if user can access this enrollment
    if (enrollment.userId._id.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return forbiddenResponse(res, 'Access denied');
    }

    return successResponse(res, { enrollment }, 'Enrollment details retrieved successfully');
  } catch (error) {
    logger.error('Get enrollment details error:', error);
    return errorResponse(res, error);
  }
};

// Admin: Get all enrollments
export const getAllEnrollments = async (req, res) => {
  try {
    const { page, limit } = getPaginationParams(req.query);
    const { status, courseId, userId } = req.query;

    // Build query
    const query = {};
    if (status) query.status = status;
    if (courseId) query.courseId = courseId;
    if (userId) query.userId = userId;

    // Get total count
    const total = await Enrollment.countDocuments(query);

    // Get enrollments with pagination
    const enrollments = await Enrollment.find(query)
      .populate('courseId', 'title summary thumbnailUrl')
      .populate('userId', 'name email')
      .sort({ enrolledAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const result = createPaginationResult(enrollments, total, page, limit);
    return successResponse(res, result, 'Enrollments retrieved successfully');
  } catch (error) {
    logger.error('Get all enrollments error:', error);
    return errorResponse(res, error);
  }
};

// Admin: Get course enrollment statistics
export const getCourseEnrollmentStats = async (req, res) => {
  try {
    const { courseId } = req.params;

    const stats = await Enrollment.getStats(courseId);

    return successResponse(res, { stats }, 'Enrollment statistics retrieved successfully');
  } catch (error) {
    logger.error('Get enrollment stats error:', error);
    return errorResponse(res, error);
  }
};
