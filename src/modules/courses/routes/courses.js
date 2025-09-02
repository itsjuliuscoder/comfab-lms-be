import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middleware/auth.js';
import { requireInstructor, requireRole } from '../../../middleware/rbac.js';
import { validateBody, validateParams } from '../../../middleware/validation.js';
import { asyncHandler } from '../../../middleware/error.js';
import {
  getAllCourses,
  createCourse,
  getCourseById,
  updateCourse,
  deleteCourse,
  createSection,
  getCourseSections,
  updateSection,
  deleteSection,
  getSectionLessons,
  createLesson,
  getLesson,
  updateLesson,
  completeLesson,
  getLessonProgress,
  updateLessonProgress,
  createNote,
  getLessonNotes,
  updateNote,
  deleteNote,
  getDiscussions,
  createDiscussion,
  updateDiscussion,
  deleteDiscussion,
  addReply,
} from '../controllers/courseController.js';

const router = express.Router();

// Validation schemas
const createCourseSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title cannot exceed 200 characters'),
  summary: z.string().min(10, 'Summary must be at least 10 characters').max(1000, 'Summary cannot exceed 1000 characters'),
  description: z.string().max(5000, 'Description cannot exceed 5000 characters').optional(),
  outcomes: z.array(z.string().max(200, 'Learning outcome cannot exceed 200 characters')).optional(),
  tags: z.array(z.string().max(50, 'Tag cannot exceed 50 characters')).optional(),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
  estimatedDuration: z.number().min(1, 'Estimated duration must be at least 1 minute').optional(),
  isPublic: z.boolean().optional(),
  enrollmentLimit: z.number().min(1, 'Enrollment limit must be at least 1').optional(),
  prerequisites: z.array(z.string()).optional(),
});

const updateCourseSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title cannot exceed 200 characters').optional(),
  summary: z.string().min(10, 'Summary must be at least 10 characters').max(1000, 'Summary cannot exceed 1000 characters').optional(),
  description: z.string().max(5000, 'Description cannot exceed 5000 characters').optional(),
  outcomes: z.array(z.string().max(200, 'Learning outcome cannot exceed 200 characters')).optional(),
  tags: z.array(z.string().max(50, 'Tag cannot exceed 50 characters')).optional(),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
  estimatedDuration: z.number().min(1, 'Estimated duration must be at least 1 minute').optional(),
  isPublic: z.boolean().optional(),
  enrollmentLimit: z.number().min(1, 'Enrollment limit must be at least 1').optional(),
  prerequisites: z.array(z.string()).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  featured: z.boolean().optional(),
});

const updateLessonSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title cannot exceed 200 characters').optional(),
  content: z.string().max(10000, 'Content cannot exceed 10000 characters').optional(),
  youtubeVideoId: z.string().optional(),
  externalUrl: z.string().url('Invalid external URL').optional(),
  durationSec: z.number().min(1, 'Duration must be at least 1 second').optional(),
  isPublished: z.boolean().optional(),
  isFree: z.boolean().optional(),
  notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional(),
});

const updateProgressSchema = z.object({
  timeSpent: z.number().min(0, 'Time spent cannot be negative').optional(),
  completed: z.boolean().optional(),
});

const createNoteSchema = z.object({
  content: z.string().min(1, 'Note content is required').max(2000, 'Note content cannot exceed 2000 characters'),
});

const updateNoteSchema = z.object({
  content: z.string().min(1, 'Note content is required').max(2000, 'Note content cannot exceed 2000 characters'),
});

const createDiscussionSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title cannot exceed 200 characters'),
  content: z.string().min(10, 'Content must be at least 10 characters').max(5000, 'Content cannot exceed 5000 characters'),
});

const updateDiscussionSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title cannot exceed 200 characters').optional(),
  content: z.string().min(10, 'Content must be at least 10 characters').max(5000, 'Content cannot exceed 5000 characters').optional(),
});

const addReplySchema = z.object({
  content: z.string().min(1, 'Reply content is required').max(2000, 'Reply content cannot exceed 2000 characters'),
});

const createSectionSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title cannot exceed 200 characters'),
  description: z.string().max(1000, 'Description cannot exceed 1000 characters').optional(),
  order: z.number().min(1, 'Order must be at least 1').optional(),
});

const updateSectionSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title cannot exceed 200 characters').optional(),
  description: z.string().max(1000, 'Description cannot exceed 1000 characters').optional(),
  order: z.number().min(1, 'Order must be at least 1').optional(),
  isPublished: z.boolean().optional(),
});

const createLessonSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title cannot exceed 200 characters'),
  type: z.enum(['TEXT', 'VIDEO', 'AUDIO', 'QUIZ', 'ASSIGNMENT', 'RESOURCE']),
  content: z.string().max(10000, 'Content cannot exceed 10000 characters').optional(),
  youtubeVideoId: z.string().optional(),
  externalUrl: z.string().url('Invalid external URL').optional(),
  order: z.number().min(1, 'Order must be at least 1').optional(),
  durationSec: z.number().min(1, 'Duration must be at least 1 second').optional(),
  isPublished: z.boolean().optional(),
  isFree: z.boolean().optional(),
  notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional(),
});

// Course Routes
router.get('/', asyncHandler(getAllCourses));
router.post('/', requireAuth, requireInstructor, validateBody(createCourseSchema), asyncHandler(createCourse));
router.get('/:id', asyncHandler(getCourseById));
router.put('/:id', requireAuth, requireInstructor, validateBody(updateCourseSchema), asyncHandler(updateCourse));
router.delete('/:id', requireAuth, requireInstructor, asyncHandler(deleteCourse));

// Section Routes
router.get('/:id/sections', asyncHandler(getCourseSections));
router.post('/:id/sections', requireAuth, requireInstructor, validateBody(createSectionSchema), asyncHandler(createSection));
router.put('/:id/sections/:sectionId', requireAuth, requireInstructor, validateBody(updateSectionSchema), asyncHandler(updateSection));
router.delete('/:id/sections/:sectionId', requireAuth, requireInstructor, asyncHandler(deleteSection));

// Lesson Routes
router.get('/:id/sections/:sectionId/lessons', asyncHandler(getSectionLessons));
router.post('/:id/sections/:sectionId/lessons', requireAuth, requireInstructor, validateBody(createLessonSchema), asyncHandler(createLesson));
router.get('/:courseId/lessons/:lessonId', requireAuth, asyncHandler(getLesson));
router.patch('/:courseId/lessons/:lessonId', requireAuth, requireInstructor, validateBody(updateLessonSchema), asyncHandler(updateLesson));
router.post('/:courseId/lessons/:lessonId/complete', requireAuth, asyncHandler(completeLesson));
router.get('/:courseId/lessons/:lessonId/progress', requireAuth, asyncHandler(getLessonProgress));
router.patch('/:courseId/lessons/:lessonId/progress', requireAuth, validateBody(updateProgressSchema), asyncHandler(updateLessonProgress));

// Notes Routes
router.get('/:courseId/lessons/:lessonId/notes', requireAuth, asyncHandler(getLessonNotes));
router.post('/:courseId/lessons/:lessonId/notes', requireAuth, validateBody(createNoteSchema), asyncHandler(createNote));
router.patch('/:courseId/lessons/:lessonId/notes/:id', requireAuth, validateBody(updateNoteSchema), asyncHandler(updateNote));
router.delete('/:courseId/lessons/:lessonId/notes/:id', requireAuth, asyncHandler(deleteNote));

// Discussions Routes
router.get('/:courseId/lessons/:lessonId/discussions', requireAuth, asyncHandler(getDiscussions));
router.post('/:courseId/lessons/:lessonId/discussions', requireAuth, validateBody(createDiscussionSchema), asyncHandler(createDiscussion));
router.patch('/:courseId/lessons/:lessonId/discussions/:id', requireAuth, validateBody(updateDiscussionSchema), asyncHandler(updateDiscussion));
router.delete('/:courseId/lessons/:lessonId/discussions/:id', requireAuth, asyncHandler(deleteDiscussion));
router.post('/:courseId/lessons/:lessonId/discussions/:id/replies', requireAuth, validateBody(addReplySchema), asyncHandler(addReply));

export default router;
