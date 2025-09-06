import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middleware/auth.js';
import { requireInstructor, requireRole } from '../../../middleware/rbac.js';
import { validateBody, validateParams } from '../../../middleware/validation.js';
import { asyncHandler } from '../../../middleware/error.js';
import {
  getCourseAssessments,
  createAssessment,
  getAssessmentById,
  updateAssessment,
  deleteAssessment,
  startAssessment,
  submitAssessment,
  getUserSubmissions,
  getAssessmentResults,
} from '../controllers/assessmentController.js';

const router = express.Router();

// Validation schemas
const createAssessmentSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title cannot exceed 200 characters'),
  description: z.string().max(2000, 'Description cannot exceed 2000 characters').optional(),
  type: z.enum(['QUIZ', 'ASSIGNMENT', 'EXAM', 'SURVEY']),
  questions: z.array(z.object({
    question: z.string().min(1, 'Question text is required').max(1000, 'Question cannot exceed 1000 characters'),
    type: z.enum(['MULTIPLE_CHOICE', 'SINGLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY', 'FILE_UPLOAD']),
    options: z.array(z.string().max(500, 'Option cannot exceed 500 characters')).optional(),
    correctAnswer: z.any().optional(),
    points: z.number().min(1, 'Points must be at least 1').max(100, 'Points cannot exceed 100'),
    explanation: z.string().max(1000, 'Explanation cannot exceed 1000 characters').optional(),
    isRequired: z.boolean().default(true),
    order: z.number().min(1, 'Order must be at least 1').optional(),
  })).min(1, 'At least one question is required'),
  timeLimit: z.number().min(1, 'Time limit must be at least 1 minute').max(480, 'Time limit cannot exceed 8 hours').optional(),
  passingScore: z.number().min(0, 'Passing score cannot be negative').max(100, 'Passing score cannot exceed 100').default(70),
  maxAttempts: z.number().min(1, 'Max attempts must be at least 1').default(1),
  isPublished: z.boolean().default(false),
  isAutoGraded: z.boolean().default(true),
  allowReview: z.boolean().default(true),
  showCorrectAnswers: z.boolean().default(false),
  dueDate: z.string().datetime().optional(),
  instructions: z.string().max(2000, 'Instructions cannot exceed 2000 characters').optional(),
  tags: z.array(z.string().max(50, 'Tag cannot exceed 50 characters')).optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
});

const updateAssessmentSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title cannot exceed 200 characters').optional(),
  description: z.string().max(2000, 'Description cannot exceed 2000 characters').optional(),
  type: z.enum(['QUIZ', 'ASSIGNMENT', 'EXAM', 'SURVEY']).optional(),
  questions: z.array(z.object({
    question: z.string().min(1, 'Question text is required').max(1000, 'Question cannot exceed 1000 characters'),
    type: z.enum(['MULTIPLE_CHOICE', 'SINGLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY', 'FILE_UPLOAD']),
    options: z.array(z.string().max(500, 'Option cannot exceed 500 characters')).optional(),
    correctAnswer: z.any().optional(),
    points: z.number().min(1, 'Points must be at least 1').max(100, 'Points cannot exceed 100'),
    explanation: z.string().max(1000, 'Explanation cannot exceed 1000 characters').optional(),
    isRequired: z.boolean().default(true),
    order: z.number().min(1, 'Order must be at least 1').optional(),
  })).min(1, 'At least one question is required').optional(),
  timeLimit: z.number().min(1, 'Time limit must be at least 1 minute').max(480, 'Time limit cannot exceed 8 hours').optional(),
  passingScore: z.number().min(0, 'Passing score cannot be negative').max(100, 'Passing score cannot exceed 100').optional(),
  maxAttempts: z.number().min(1, 'Max attempts must be at least 1').optional(),
  isPublished: z.boolean().optional(),
  isAutoGraded: z.boolean().optional(),
  allowReview: z.boolean().optional(),
  showCorrectAnswers: z.boolean().optional(),
  dueDate: z.string().datetime().optional(),
  instructions: z.string().max(2000, 'Instructions cannot exceed 2000 characters').optional(),
  tags: z.array(z.string().max(50, 'Tag cannot exceed 50 characters')).optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
});

const submitAssessmentSchema = z.object({
  submissionId: z.string().min(1, 'Submission ID is required'),
  answers: z.array(z.object({
    answer: z.any(),
    timeSpent: z.number().min(0, 'Time spent cannot be negative').optional(),
  })).min(1, 'At least one answer is required'),
});

// Assessment Routes
router.get('/courses/:courseId/assessments', asyncHandler(getCourseAssessments));
router.post('/courses/:courseId/assessments', requireAuth, requireInstructor, validateBody(createAssessmentSchema), asyncHandler(createAssessment));
router.get('/courses/:courseId/assessments/:assessmentId', requireAuth, asyncHandler(getAssessmentById));
router.put('/courses/:courseId/assessments/:assessmentId', requireAuth, requireInstructor, validateBody(updateAssessmentSchema), asyncHandler(updateAssessment));
router.delete('/courses/:courseId/assessments/:assessmentId', requireAuth, requireInstructor, asyncHandler(deleteAssessment));

// Assessment Submission Routes
router.post('/courses/:courseId/assessments/:assessmentId/start', requireAuth, asyncHandler(startAssessment));
router.post('/courses/:courseId/assessments/:assessmentId/submit', requireAuth, validateBody(submitAssessmentSchema), asyncHandler(submitAssessment));
router.get('/courses/:courseId/assessments/:assessmentId/submissions', requireAuth, asyncHandler(getUserSubmissions));
router.get('/courses/:courseId/assessments/:assessmentId/results', requireAuth, asyncHandler(getAssessmentResults));

export default router;
