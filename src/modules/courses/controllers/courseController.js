import { Course } from '../models/Course.js';
import { Section } from '../models/Section.js';
import { Lesson } from '../models/Lesson.js';
import { Enrollment } from '../../enrollments/models/Enrollment.js';
import { uploadToCloudinary } from '../../../config/cloudinary.js';
import { successResponse, errorResponse, notFoundResponse, forbiddenResponse } from '../../../utils/response.js';
import { getPaginationParams, createPaginationResult } from '../../../utils/pagination.js';
import { logger } from '../../../utils/logger.js';

// GET /courses - Get all courses
export const getAllCourses = async (req, res) => {
  try {
    const { page, limit } = getPaginationParams(req.query);
    const { status, difficulty, featured, search, ownerId } = req.query;

    // Build query
    const query = {};
    if (status) query.status = status;
    if (difficulty) query.difficulty = difficulty;
    if (featured) query.featured = featured === 'true';
    if (ownerId) query.ownerId = ownerId;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { summary: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    // For non-admin users, only show published courses in production
    // In development, show all courses for easier testing
    if (req.user?.role !== 'ADMIN' && process.env.NODE_ENV === 'production') {
      query.status = 'PUBLISHED';
    }

    // Get total count
    const total = await Course.countDocuments(query);

    // Get courses with pagination
    const courses = await Course.find(query)
      .populate('ownerId', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const result = createPaginationResult(courses, total, page, limit);
    return successResponse(res, result, 'Courses retrieved successfully');
  } catch (error) {
    logger.error('Get all courses error:', error);
    return errorResponse(res, error);
  }
};

// POST /courses - Create course (instructor/admin)
export const createCourse = async (req, res) => {
  try {
    const { title, summary, description, outcomes, tags, difficulty, estimatedDuration, isPublic, enrollmentLimit, prerequisites } = req.body;

    const course = new Course({
      title,
      summary,
      description,
      outcomes,
      tags,
      difficulty,
      estimatedDuration,
      isPublic,
      enrollmentLimit,
      prerequisites,
      ownerId: req.user._id,
    });

    await course.save();

    const populatedCourse = await Course.findById(course._id).populate('ownerId', 'name email');

    return successResponse(res, { course: populatedCourse }, 'Course created successfully', 201);
  } catch (error) {
    logger.error('Create course error:', error);
    return errorResponse(res, error);
  }
};

// GET /courses/:id - Get course by ID
export const getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('ownerId', 'name email')
      .populate('prerequisites', 'title summary');

    if (!course) {
      return notFoundResponse(res, 'Course');
    }

    // Check if user can access this course
    // In development, allow access to all courses for easier testing
    // In production, only allow access to published courses for non-admin users
    if (course.status !== 'PUBLISHED' && 
        req.user?.role !== 'ADMIN' && 
        course.ownerId._id.toString() !== req.user?._id.toString() &&
        process.env.NODE_ENV === 'production') {
      return forbiddenResponse(res, 'Access denied');
    }

    return successResponse(res, { course }, 'Course retrieved successfully');
  } catch (error) {
    logger.error('Get course by ID error:', error);
    return errorResponse(res, error);
  }
};

// PUT /courses/:id - Update course
export const updateCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return notFoundResponse(res, 'Course');
    }

    // Check if user can update this course
    if (req.user.role !== 'ADMIN' && course.ownerId.toString() !== req.user._id.toString()) {
      return forbiddenResponse(res, 'Access denied');
    }

    const updates = req.body;
    const updatedCourse = await Course.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('ownerId', 'name email');

    return successResponse(res, { course: updatedCourse }, 'Course updated successfully');
  } catch (error) {
    logger.error('Update course error:', error);
    return errorResponse(res, error);
  }
};

// DELETE /courses/:id - Delete course
export const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return notFoundResponse(res, 'Course');
    }

    // Check if user can delete this course
    if (req.user.role !== 'ADMIN' && course.ownerId.toString() !== req.user._id.toString()) {
      return forbiddenResponse(res, 'Access denied');
    }

    await Course.findByIdAndDelete(req.params.id);

    return successResponse(res, null, 'Course deleted successfully');
  } catch (error) {
    logger.error('Delete course error:', error);
    return errorResponse(res, error);
  }
};

// GET /courses/:courseId/lessons/:lessonId - Get lesson details
export const getLesson = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;

    const lesson = await Lesson.findById(lessonId)
      .populate('sectionId', 'title order')
      .populate('courseId', 'title status');

    if (!lesson) {
      return notFoundResponse(res, 'Lesson');
    }

    // Check if user can access this lesson
    if (lesson.courseId.status !== 'PUBLISHED' && req.user?.role !== 'ADMIN' && lesson.courseId.ownerId?.toString() !== req.user?._id.toString()) {
      return forbiddenResponse(res, 'Access denied');
    }

    return successResponse(res, { lesson }, 'Lesson retrieved successfully');
  } catch (error) {
    logger.error('Get lesson error:', error);
    return errorResponse(res, error);
  }
};

// PATCH /courses/:courseId/lessons/:lessonId - Update lesson (instructor)
export const updateLesson = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;

    const lesson = await Lesson.findById(lessonId).populate('courseId', 'ownerId');

    if (!lesson) {
      return notFoundResponse(res, 'Lesson');
    }

    // Check if user can update this lesson
    if (req.user.role !== 'ADMIN' && lesson.courseId.ownerId.toString() !== req.user._id.toString()) {
      return forbiddenResponse(res, 'Access denied');
    }

    const updates = req.body;
    
    // Handle YouTube video ID validation if provided
    if (updates.youtubeVideoId) {
      const { isValidYouTubeVideoId } = await import('../../../utils/youtube.js');
      if (!isValidYouTubeVideoId(updates.youtubeVideoId)) {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'INVALID_YOUTUBE_ID',
            message: 'Invalid YouTube video ID',
          },
        });
      }
    }

    const updatedLesson = await Lesson.findByIdAndUpdate(
      lessonId,
      updates,
      { new: true, runValidators: true }
    ).populate('sectionId', 'title order');

    return successResponse(res, { lesson: updatedLesson }, 'Lesson updated successfully');
  } catch (error) {
    logger.error('Update lesson error:', error);
    return errorResponse(res, error);
  }
};

// POST /courses/:courseId/lessons/:lessonId/complete - Mark lesson complete
export const completeLesson = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;

    // Check if user is enrolled in the course
    const enrollment = await Enrollment.isUserEnrolled(req.user._id, courseId);
    if (!enrollment && req.user.role !== 'ADMIN') {
      return forbiddenResponse(res, 'You must be enrolled in this course to complete lessons');
    }

    // In a real implementation, you would update lesson progress
    // For now, we'll just return success
    return successResponse(res, null, 'Lesson marked as complete');
  } catch (error) {
    logger.error('Complete lesson error:', error);
    return errorResponse(res, error);
  }
};

// GET /courses/:courseId/lessons/:lessonId/progress - Get lesson progress
export const getLessonProgress = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;

    // In a real implementation, you would get lesson progress from a progress model
    // For now, we'll return default progress
    const progress = {
      completed: false,
      timeSpent: 0,
      lastAccessed: null,
    };

    return successResponse(res, { progress }, 'Lesson progress retrieved successfully');
  } catch (error) {
    logger.error('Get lesson progress error:', error);
    return errorResponse(res, error);
  }
};

// PATCH /courses/:courseId/lessons/:lessonId/progress - Update lesson progress
export const updateLessonProgress = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const { timeSpent, completed } = req.body;

    // In a real implementation, you would update lesson progress in a progress model
    // For now, we'll just return success
    return successResponse(res, null, 'Lesson progress updated successfully');
  } catch (error) {
    logger.error('Update lesson progress error:', error);
    return errorResponse(res, error);
  }
};

// POST /courses/:courseId/lessons/:lessonId/notes - Create note
export const createNote = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const { content } = req.body;

    // In a real implementation, you would create a note in a notes model
    // For now, we'll just return success
    const note = {
      id: 'temp-id',
      content,
      lessonId,
      userId: req.user._id,
      createdAt: new Date(),
    };

    return successResponse(res, { note }, 'Note created successfully', 201);
  } catch (error) {
    logger.error('Create note error:', error);
    return errorResponse(res, error);
  }
};

// GET /courses/:courseId/lessons/:lessonId/notes - Get lesson notes
export const getLessonNotes = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;

    // In a real implementation, you would get notes from a notes model
    // For now, we'll return empty array
    const notes = [];

    return successResponse(res, { notes }, 'Notes retrieved successfully');
  } catch (error) {
    logger.error('Get lesson notes error:', error);
    return errorResponse(res, error);
  }
};

// PATCH /courses/:courseId/lessons/:lessonId/notes/:id - Update note
export const updateNote = async (req, res) => {
  try {
    const { courseId, lessonId, id } = req.params;
    const { content } = req.body;

    // In a real implementation, you would update the note in a notes model
    // For now, we'll just return success
    return successResponse(res, null, 'Note updated successfully');
  } catch (error) {
    logger.error('Update note error:', error);
    return errorResponse(res, error);
  }
};

// DELETE /courses/:courseId/lessons/:lessonId/notes/:id - Delete note
export const deleteNote = async (req, res) => {
  try {
    const { courseId, lessonId, id } = req.params;

    // In a real implementation, you would delete the note from a notes model
    // For now, we'll just return success
    return successResponse(res, null, 'Note deleted successfully');
  } catch (error) {
    logger.error('Delete note error:', error);
    return errorResponse(res, error);
  }
};

// GET /courses/:courseId/lessons/:lessonId/discussions - Get discussions
export const getDiscussions = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;

    // In a real implementation, you would get discussions from a discussions model
    // For now, we'll return empty array
    const discussions = [];

    return successResponse(res, { discussions }, 'Discussions retrieved successfully');
  } catch (error) {
    logger.error('Get discussions error:', error);
    return errorResponse(res, error);
  }
};

// POST /courses/:courseId/lessons/:lessonId/discussions - Create discussion
export const createDiscussion = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const { title, content } = req.body;

    // In a real implementation, you would create a discussion in a discussions model
    // For now, we'll just return success
    const discussion = {
      id: 'temp-id',
      title,
      content,
      lessonId,
      userId: req.user._id,
      createdAt: new Date(),
    };

    return successResponse(res, { discussion }, 'Discussion created successfully', 201);
  } catch (error) {
    logger.error('Create discussion error:', error);
    return errorResponse(res, error);
  }
};

// PATCH /courses/:courseId/lessons/:lessonId/discussions/:id - Update discussion
export const updateDiscussion = async (req, res) => {
  try {
    const { courseId, lessonId, id } = req.params;
    const { title, content } = req.body;

    // In a real implementation, you would update the discussion in a discussions model
    // For now, we'll just return success
    return successResponse(res, null, 'Discussion updated successfully');
  } catch (error) {
    logger.error('Update discussion error:', error);
    return errorResponse(res, error);
  }
};

// DELETE /courses/:courseId/lessons/:lessonId/discussions/:id - Delete discussion
export const deleteDiscussion = async (req, res) => {
  try {
    const { courseId, lessonId, id } = req.params;

    // In a real implementation, you would delete the discussion from a discussions model
    // For now, we'll just return success
    return successResponse(res, null, 'Discussion deleted successfully');
  } catch (error) {
    logger.error('Delete discussion error:', error);
    return errorResponse(res, error);
  }
};

// POST /courses/:courseId/lessons/:lessonId/discussions/:id/replies - Add reply
export const addReply = async (req, res) => {
  try {
    const { courseId, lessonId, id } = req.params;
    const { content } = req.body;

    // In a real implementation, you would add a reply to the discussion in a discussions model
    // For now, we'll just return success
    const reply = {
      id: 'temp-reply-id',
      content,
      discussionId: id,
      userId: req.user._id,
      createdAt: new Date(),
    };

    return successResponse(res, { reply }, 'Reply added successfully', 201);
  } catch (error) {
    logger.error('Add reply error:', error);
    return errorResponse(res, error);
  }
};

// POST /courses/:id/sections - Create section (instructor/admin)
export const createSection = async (req, res) => {
  try {
    const { title, description, order } = req.body;
    const courseId = req.params.id;

    // Check if course exists and user has permission
    const course = await Course.findById(courseId);
    if (!course) {
      return notFoundResponse(res, 'Course');
    }

    if (course.ownerId.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return forbiddenResponse(res, 'Only course owner or admin can create sections');
    }

    // Get the next order if not provided
    let sectionOrder = order;
    if (!sectionOrder) {
      const lastSection = await Section.findOne({ courseId }).sort({ order: -1 });
      sectionOrder = lastSection ? lastSection.order + 1 : 1;
    }

    const section = new Section({
      courseId,
      title,
      description,
      order: sectionOrder,
    });

    await section.save();

    // Update course's estimated duration if needed
    if (course.estimatedDuration) {
      // Recalculate based on sections and lessons
      const totalDuration = await calculateCourseDuration(courseId);
      await Course.findByIdAndUpdate(courseId, { estimatedDuration: totalDuration });
    }

    return successResponse(res, { section }, 'Section created successfully', 201);
  } catch (error) {
    logger.error('Create section error:', error);
    return errorResponse(res, error);
  }
};

// GET /courses/:id/sections - Get all sections for a course
export const getCourseSections = async (req, res) => {
  try {
    const courseId = req.params.id;

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return notFoundResponse(res, 'Course');
    }

    // Check access permissions
    // In development, allow access to all sections for easier testing
    // In production, only allow access to published courses for non-admin users
    if (course.status !== 'PUBLISHED' && 
        req.user?.role !== 'ADMIN' && 
        course.ownerId.toString() !== req.user?._id.toString() &&
        process.env.NODE_ENV === 'production') {
      return forbiddenResponse(res, 'Access denied');
    }

    const sections = await Section.find({ courseId })
      .sort({ order: 1 })
      .populate({
        path: 'lessons',
        select: 'title type durationSec isPublished isFree order',
        options: { sort: { order: 1 } }
      });

    return successResponse(res, { sections }, 'Sections retrieved successfully');
  } catch (error) {
    logger.error('Get course sections error:', error);
    return errorResponse(res, error);
  }
};

// PUT /courses/:id/sections/:sectionId - Update section
export const updateSection = async (req, res) => {
  try {
    const { title, description, order, isPublished } = req.body;
    const { id: courseId, sectionId } = req.params;

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return notFoundResponse(res, 'Course');
    }

    // Check if section exists
    const section = await Section.findById(sectionId);
    if (!section) {
      return notFoundResponse(res, 'Section');
    }

    // Check permissions
    if (course.ownerId.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return forbiddenResponse(res, 'Only course owner or admin can update sections');
    }

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (order !== undefined) updates.order = order;
    if (isPublished !== undefined) updates.isPublished = isPublished;

    const updatedSection = await Section.findByIdAndUpdate(
      sectionId,
      updates,
      { new: true, runValidators: true }
    );

    return successResponse(res, { section: updatedSection }, 'Section updated successfully');
  } catch (error) {
    logger.error('Update section error:', error);
    return errorResponse(res, error);
  }
};

// DELETE /courses/:id/sections/:sectionId - Delete section
export const deleteSection = async (req, res) => {
  try {
    const { id: courseId, sectionId } = req.params;

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return notFoundResponse(res, 'Course');
    }

    // Check if section exists
    const section = await Section.findById(sectionId);
    if (!section) {
      return notFoundResponse(res, 'Section');
    }

    // Check permissions
    if (course.ownerId.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return forbiddenResponse(res, 'Only course owner or admin can delete sections');
    }

    // Check if section has lessons
    const lessonCount = await Lesson.countDocuments({ sectionId });
    if (lessonCount > 0) {
      return errorResponse(res, new Error('Cannot delete section with existing lessons'), 400);
    }

    await Section.findByIdAndDelete(sectionId);

    return successResponse(res, null, 'Section deleted successfully');
  } catch (error) {
    logger.error('Delete section error:', error);
    return errorResponse(res, error);
  }
};

// GET /courses/:id/sections/:sectionId/lessons - Get all lessons for a section
export const getSectionLessons = async (req, res) => {
  try {
    const { id: courseId, sectionId } = req.params;
    const { page, limit } = getPaginationParams(req.query);

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return notFoundResponse(res, 'Course');
    }

    // Check if section exists
    const section = await Section.findById(sectionId);
    if (!section) {
      return notFoundResponse(res, 'Section');
    }

    // Check if section belongs to the course
    if (section.courseId.toString() !== courseId) {
      return notFoundResponse(res, 'Section not found in this course');
    }

    // Check permissions - in development, allow access to all lessons for easier testing
    // In production, only allow access to published lessons for non-admin users
    const query = { sectionId };
    if (req.user?.role !== 'ADMIN' && 
        course.ownerId.toString() !== req.user?._id.toString() &&
        process.env.NODE_ENV === 'production') {
      query.isPublished = true;
    }

    // Get total count
    const total = await Lesson.countDocuments(query);

    // Get lessons with pagination
    const lessons = await Lesson.find(query)
      .populate('sectionId', 'title order')
      .sort({ order: 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const result = createPaginationResult(lessons, total, page, limit);
    return successResponse(res, result, 'Lessons retrieved successfully');
  } catch (error) {
    logger.error('Get section lessons error:', error);
    return errorResponse(res, error);
  }
};

// POST /courses/:id/sections/:sectionId/lessons - Create lesson
export const createLesson = async (req, res) => {
  try {
    const { 
      title, 
      type, 
      content, 
      youtubeVideoId, 
      externalUrl, 
      order, 
      durationSec, 
      isPublished, 
      isFree, 
      notes 
    } = req.body;
    
    const { id: courseId, sectionId } = req.params;

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return notFoundResponse(res, 'Course');
    }

    // Check if section exists
    const section = await Section.findById(sectionId);
    if (!section) {
      return notFoundResponse(res, 'Section');
    }

    // Check permissions
    if (course.ownerId.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return forbiddenResponse(res, 'Only course owner or admin can create lessons');
    }

    // Validate YouTube video ID if provided
    if (youtubeVideoId) {
      const { isValidYouTubeVideoId } = await import('../../../utils/youtube.js');
      if (!isValidYouTubeVideoId(youtubeVideoId)) {
        return errorResponse(res, new Error('Invalid YouTube video ID'), 400);
      }
    }

    // Get the next order if not provided
    let lessonOrder = order;
    if (!lessonOrder) {
      const lastLesson = await Lesson.findOne({ sectionId }).sort({ order: -1 });
      lessonOrder = lastLesson ? lastLesson.order + 1 : 1;
    }

    const lesson = new Lesson({
      sectionId,
      courseId,
      title,
      type,
      content,
      youtubeVideoId,
      externalUrl,
      order: lessonOrder,
      durationSec,
      isPublished: isPublished !== undefined ? isPublished : false,
      isFree: isFree !== undefined ? isFree : false,
      notes,
    });

    await lesson.save();

    // Update course's estimated duration
    if (course.estimatedDuration) {
      const totalDuration = await calculateCourseDuration(courseId);
      await Course.findByIdAndUpdate(courseId, { estimatedDuration: totalDuration });
    }

    return successResponse(res, { lesson }, 'Lesson created successfully', 201);
  } catch (error) {
    logger.error('Create lesson error:', error);
    return errorResponse(res, error);
  }
};

// Helper function to calculate course duration
const calculateCourseDuration = async (courseId) => {
  try {
    const sections = await Section.find({ courseId });
    let totalDuration = 0;

    for (const section of sections) {
      const lessons = await Lesson.find({ sectionId: section._id });
      for (const lesson of lessons) {
        if (lesson.durationSec) {
          totalDuration += lesson.durationSec;
        }
      }
    }

    return Math.ceil(totalDuration / 60); // Convert to minutes
  } catch (error) {
    logger.error('Calculate course duration error:', error);
    return 0;
  }
};
