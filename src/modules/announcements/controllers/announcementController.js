import { Announcement } from '../models/Announcement.js';
import { Course } from '../../courses/models/Course.js';
import { Cohort } from '../../cohorts/models/Cohort.js';
import { Enrollment } from '../../enrollments/models/Enrollment.js';
import { successResponse, errorResponse, notFoundResponse, forbiddenResponse } from '../../../utils/response.js';
import { getPaginationParams, createPaginationResult } from '../../../utils/pagination.js';
import { logger } from '../../../utils/logger.js';

// GET /announcements - Get announcements for current user
export const getAnnouncements = async (req, res) => {
  try {
    const { page, limit } = getPaginationParams(req.query);
    const { type, priority, courseId, unreadOnly, status } = req.query;
    const userId = req.user._id;
    const userRole = req.user.role;

    // Get user's enrolled courses
    const enrollments = await Enrollment.find({ 
      userId, 
      status: { $in: ['ACTIVE', 'COMPLETED'] } 
    });
    const enrolledCourseIds = enrollments.map(enrollment => enrollment.courseId);

    const options = {
      page,
      limit,
      type,
      priority,
      courseId,
      unreadOnly: unreadOnly === 'true',
      status: status || 'PUBLISHED'
    };

    const result = await Announcement.getAnnouncementsForUser(
      userId,
      userRole,
      enrolledCourseIds,
      options
    );

    return successResponse(res, result, 'Announcements retrieved successfully');
  } catch (error) {
    logger.error('Get announcements error:', error);
    return errorResponse(res, error);
  }
};

// GET /announcements/unread-count - Get unread announcements count
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    // Get user's enrolled courses
    const enrollments = await Enrollment.find({ 
      userId, 
      status: { $in: ['ACTIVE', 'COMPLETED'] } 
    });
    const enrolledCourseIds = enrollments.map(enrollment => enrollment.courseId);

    const unreadCount = await Announcement.getUnreadCount(
      userId,
      userRole,
      enrolledCourseIds
    );

    return successResponse(res, { unreadCount }, 'Unread count retrieved successfully');
  } catch (error) {
    logger.error('Get unread count error:', error);
    return errorResponse(res, error);
  }
};

// GET /announcements/:id - Get specific announcement
export const getAnnouncementById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const announcement = await Announcement.findById(id)
      .populate('authorId', 'name email')
      .populate('targetAudience.courseId', 'title')
      .populate('targetAudience.cohortId', 'name');

    if (!announcement) {
      return notFoundResponse(res, 'Announcement');
    }

    // Check if user has access to this announcement
    const hasAccess = await checkAnnouncementAccess(announcement, userId, userRole);
    if (!hasAccess) {
      return forbiddenResponse(res, 'You do not have access to this announcement');
    }

    // Add read status
    const announcementObj = announcement.toObject();
    announcementObj.isRead = announcement.readBy.some(read => 
      read.userId.toString() === userId.toString()
    );

    return successResponse(res, announcementObj, 'Announcement retrieved successfully');
  } catch (error) {
    logger.error('Get announcement by ID error:', error);
    return errorResponse(res, error);
  }
};

// POST /announcements - Create new announcement (instructor/admin)
export const createAnnouncement = async (req, res) => {
  try {
    const {
      title,
      content,
      type,
      priority,
      visibility,
      targetAudience,
      attachments,
      scheduledAt,
      expiresAt,
      isPinned,
      allowComments,
      tags
    } = req.body;

    // Validate target audience based on visibility
    if (visibility === 'ENROLLED_USERS' && !targetAudience?.courseId) {
      return errorResponse(res, new Error('Course ID is required for enrolled users visibility'), 400);
    }

    if (visibility === 'SPECIFIC_USERS' && (!targetAudience?.userIds || targetAudience.userIds.length === 0)) {
      return errorResponse(res, new Error('User IDs are required for specific users visibility'), 400);
    }

    // Validate course exists if specified
    if (targetAudience?.courseId) {
      const course = await Course.findById(targetAudience.courseId);
      if (!course) {
        return notFoundResponse(res, 'Course');
      }
    }

    // Validate cohort exists if specified
    if (targetAudience?.cohortId) {
      const cohort = await Cohort.findById(targetAudience.cohortId);
      if (!cohort) {
        return notFoundResponse(res, 'Cohort');
      }
    }

    const announcement = new Announcement({
      title,
      content,
      type: type || 'GENERAL',
      priority: priority || 'MEDIUM',
      visibility: visibility || 'PUBLIC',
      targetAudience: targetAudience || {},
      attachments: attachments || [],
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      isPinned: isPinned || false,
      allowComments: allowComments !== false,
      tags: tags || [],
      authorId: req.user._id,
    });

    await announcement.save();

    // Populate the response
    await announcement.populate([
      { path: 'authorId', select: 'name email' },
      { path: 'targetAudience.courseId', select: 'title' },
      { path: 'targetAudience.cohortId', select: 'name' }
    ]);

    return successResponse(res, announcement, 'Announcement created successfully', 201);
  } catch (error) {
    logger.error('Create announcement error:', error);
    return errorResponse(res, error);
  }
};

// PUT /announcements/:id - Update announcement (author/admin)
export const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return notFoundResponse(res, 'Announcement');
    }

    // Check permissions
    if (announcement.authorId.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return forbiddenResponse(res, 'You can only update your own announcements');
    }

    // Validate target audience if being updated
    if (updateData.targetAudience?.courseId) {
      const course = await Course.findById(updateData.targetAudience.courseId);
      if (!course) {
        return notFoundResponse(res, 'Course');
      }
    }

    if (updateData.targetAudience?.cohortId) {
      const cohort = await Cohort.findById(updateData.targetAudience.cohortId);
      if (!cohort) {
        return notFoundResponse(res, 'Cohort');
      }
    }

    // Convert date strings to Date objects
    if (updateData.scheduledAt) {
      updateData.scheduledAt = new Date(updateData.scheduledAt);
    }
    if (updateData.expiresAt) {
      updateData.expiresAt = new Date(updateData.expiresAt);
    }

    const updatedAnnouncement = await Announcement.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate([
      { path: 'authorId', select: 'name email' },
      { path: 'targetAudience.courseId', select: 'title' },
      { path: 'targetAudience.cohortId', select: 'name' }
    ]);

    return successResponse(res, updatedAnnouncement, 'Announcement updated successfully');
  } catch (error) {
    logger.error('Update announcement error:', error);
    return errorResponse(res, error);
  }
};

// DELETE /announcements/:id - Delete announcement (author/admin)
export const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return notFoundResponse(res, 'Announcement');
    }

    // Check permissions
    if (announcement.authorId.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return forbiddenResponse(res, 'You can only delete your own announcements');
    }

    await Announcement.findByIdAndDelete(id);

    return successResponse(res, null, 'Announcement deleted successfully');
  } catch (error) {
    logger.error('Delete announcement error:', error);
    return errorResponse(res, error);
  }
};

// POST /announcements/:id/read - Mark announcement as read
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return notFoundResponse(res, 'Announcement');
    }

    // Check if user has access to this announcement
    const hasAccess = await checkAnnouncementAccess(announcement, userId, req.user.role);
    if (!hasAccess) {
      return forbiddenResponse(res, 'You do not have access to this announcement');
    }

    const updatedAnnouncement = await Announcement.markAsRead(id, userId);

    return successResponse(res, { isRead: true }, 'Announcement marked as read');
  } catch (error) {
    logger.error('Mark announcement as read error:', error);
    return errorResponse(res, error);
  }
};

// GET /announcements/admin/all - Get all announcements (admin only)
export const getAllAnnouncements = async (req, res) => {
  try {
    const { page, limit } = getPaginationParams(req.query);
    const { status, type, priority, authorId, search } = req.query;

    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;
    if (priority) query.priority = priority;
    if (authorId) query.authorId = authorId;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    const total = await Announcement.countDocuments(query);
    const announcements = await Announcement.find(query)
      .populate('authorId', 'name email')
      .populate('targetAudience.courseId', 'title')
      .populate('targetAudience.cohortId', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const result = createPaginationResult(announcements, total, page, limit);
    return successResponse(res, result, 'All announcements retrieved successfully');
  } catch (error) {
    logger.error('Get all announcements error:', error);
    return errorResponse(res, error);
  }
};

// Helper function to check announcement access
const checkAnnouncementAccess = async (announcement, userId, userRole) => {
  const { visibility, targetAudience } = announcement;

  switch (visibility) {
    case 'PUBLIC':
      return true;
    
    case 'ENROLLED_USERS':
      if (!targetAudience.courseId) return true;
      const enrollment = await Enrollment.findOne({
        userId,
        courseId: targetAudience.courseId,
        status: { $in: ['ACTIVE', 'COMPLETED'] }
      });
      return !!enrollment;
    
    case 'INSTRUCTORS':
      return ['INSTRUCTOR', 'ADMIN'].includes(userRole);
    
    case 'ADMINS':
      return userRole === 'ADMIN';
    
    case 'SPECIFIC_USERS':
      return targetAudience.userIds?.some(id => id.toString() === userId.toString());
    
    default:
      return false;
  }
};
