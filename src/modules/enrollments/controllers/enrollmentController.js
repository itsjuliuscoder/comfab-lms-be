import { Enrollment } from '../models/Enrollment.js';
import { Course } from '../../courses/models/Course.js';
import { User } from '../../users/models/User.js';
import { sendEnrollmentEmail } from '../../../config/email.js';
import { notifyEnrollmentCompletedIfNeeded } from '../services/enrollmentNotificationService.js';
import { createNotification } from '../../notifications/services/notificationService.js';
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

// GET /enrollments/me/courses/:courseId - Get the current user's enrollment.
export const getMyCourseEnrollment = async (req, res) => {
  try {
    const enrollment = await Enrollment.findOne({
      userId: req.user._id,
      courseId: req.params.courseId,
      status: { $in: ['ACTIVE', 'COMPLETED'] },
    }).populate('courseId', 'title summary thumbnailUrl difficulty estimatedDuration');

    if (!enrollment) {
      return notFoundResponse(res, 'Enrollment');
    }

    return successResponse(res, { enrollment }, 'Enrollment retrieved successfully');
  } catch (error) {
    logger.error('Get current course enrollment error:', error);
    return errorResponse(res, error);
  }
};

// GET /enrollments/courses/:courseId - Get enrollments for a specific course
export const getCourseEnrollments = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { page, limit } = getPaginationParams(req.query);
    const { status, search } = req.query;

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return notFoundResponse(res, 'Course');
    }

    // Check if user has access to view enrollments for this course
    // Only allow if user is admin, instructor, or enrolled in the course
    const userEnrollment = await Enrollment.findOne({ 
      userId: req.user._id, 
      courseId: courseId 
    });
    
    if (req.user.role !== 'ADMIN' && req.user.role !== 'INSTRUCTOR' && !userEnrollment) {
      return forbiddenResponse(res, 'Access denied. You must be enrolled in this course to view enrollments.');
    }

    // Build query
    const query = { courseId: courseId };
    if (status) query.status = status;

    // Add search functionality
    if (search) {
      // Search in user names and emails
      const users = await User.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      
      const userIds = users.map(user => user._id);
      query.userId = { $in: userIds };
    }

    // Get total count
    const total = await Enrollment.countDocuments(query);

    // Get enrollments with pagination
    const enrollments = await Enrollment.find(query)
      .populate('userId', 'name email avatar')
      .populate('courseId', 'title summary thumbnailUrl')
      .sort({ enrolledAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const result = createPaginationResult(enrollments, total, page, limit);
    
    // Add course information to response
    result.course = {
      _id: course._id,
      title: course.title,
      summary: course.summary,
      thumbnailUrl: course.thumbnailUrl
    };

    return successResponse(res, result, 'Course enrollments retrieved successfully');
  } catch (error) {
    logger.error('Get course enrollments error:', error);
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

    try {
      await createNotification({
        userId: req.user._id,
        type: 'ENROLLMENT',
        title: 'Enrollment confirmed',
        message: `You enrolled in "${course.title}".`,
        link: `/dashboard/courses/${course._id}/learn`,
        data: { courseId: course._id.toString(), enrollmentId: enrollment._id.toString() },
        priority: 'MEDIUM',
      });

      if (course.ownerId) {
        await createNotification({
          userId: course.ownerId,
          type: 'ENROLLMENT',
          title: 'New course enrollment',
          message: `${req.user.name} enrolled in "${course.title}".`,
          link: `/dashboard/courses/${course._id}`,
          data: {
            courseId: course._id.toString(),
            enrollmentId: enrollment._id.toString(),
            participantId: req.user._id.toString(),
          },
          priority: 'MEDIUM',
        });
      }
    } catch (notificationError) {
      logger.error('Failed to send enrollment notifications:', notificationError);
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

    const previousStatus = enrollment.status;

    if (status) enrollment.status = status;
    if (progressPct !== undefined) enrollment.progressPct = progressPct;

    await enrollment.save();

    const updatedEnrollment = await Enrollment.findById(id)
      .populate('courseId', 'title summary thumbnailUrl difficulty estimatedDuration');

    await notifyEnrollmentCompletedIfNeeded(previousStatus, enrollment);

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
