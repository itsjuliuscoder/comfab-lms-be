import express from "express";
import multer from "multer";
import { z } from "zod";
import { optionalAuth, requireAuth } from "../../../middleware/auth.js";
import { requireInstructor, requireRole } from "../../../middleware/rbac.js";
import {
  validateBody,
  validateParams,
} from "../../../middleware/validation.js";
import { asyncHandler } from "../../../middleware/error.js";
import {
  getAllCourses,
  createCourse,
  getCourseById,
  updateCourse,
  deleteCourse,
  publishCourse,
  unpublishCourse,
  createSection,
  getCourseSections,
  updateSection,
  deleteSection,
  getSectionLessons,
  createLesson,
  getLesson,
  updateLesson,
  deleteLesson,
  completeLesson,
  getCourseProgress,
  getLessonProgress,
  updateLessonProgress,
  getInteractiveStepSubmissions,
  submitInteractiveStep,
  getSharedInteractiveStepSubmissions,
  createNote,
  getLessonNotes,
  updateNote,
  deleteNote,
  getDiscussions,
  createDiscussion,
  updateDiscussion,
  deleteDiscussion,
  addReply,
} from "../controllers/courseController.js";

const router = express.Router();
const interactiveSubmissionUpload = multer({ dest: "/tmp" });

// Validation schemas
const createCourseSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title cannot exceed 200 characters"),
  summary: z
    .string()
    .min(10, "Summary must be at least 10 characters")
    .max(1000, "Summary cannot exceed 1000 characters"),
  programId: z.string().min(1, "Program ID is required"),
  description: z
    .string()
    .max(5000, "Description cannot exceed 5000 characters")
    .optional(),
  outcomes: z
    .array(z.string().max(200, "Learning outcome cannot exceed 200 characters"))
    .optional(),
  tags: z
    .array(z.string().max(50, "Tag cannot exceed 50 characters"))
    .optional(),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
  estimatedDuration: z
    .number()
    .min(1, "Estimated duration must be at least 1 minute")
    .optional(),
  isPublic: z.boolean().optional(),
  enrollmentLimit: z
    .number()
    .min(1, "Enrollment limit must be at least 1")
    .optional(),
  prerequisites: z.array(z.string()).optional(),
  cohortIds: z.array(z.string().min(1)).optional(),
});

const updateCourseSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title cannot exceed 200 characters")
    .optional(),
  summary: z
    .string()
    .min(10, "Summary must be at least 10 characters")
    .max(1000, "Summary cannot exceed 1000 characters")
    .optional(),
  programId: z.string().min(1, "Program ID is required").optional(),
  description: z
    .string()
    .max(5000, "Description cannot exceed 5000 characters")
    .optional(),
  outcomes: z
    .array(z.string().max(200, "Learning outcome cannot exceed 200 characters"))
    .optional(),
  tags: z
    .array(z.string().max(50, "Tag cannot exceed 50 characters"))
    .optional(),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
  estimatedDuration: z
    .number()
    .min(1, "Estimated duration must be at least 1 minute")
    .optional(),
  isPublic: z.boolean().optional(),
  enrollmentLimit: z
    .number()
    .min(1, "Enrollment limit must be at least 1")
    .optional(),
  prerequisites: z.array(z.string()).optional(),
  cohortIds: z.array(z.string().min(1)).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  featured: z.boolean().optional(),
});

const interactiveConfigSchema = z.object({
  introduction: z.string().max(2000).optional(),
  steps: z
    .array(
      z.object({
        id: z.string().min(1),
        step_type: z.enum(["reflect", "quiz", "task", "peer_share"]).optional(),
        title: z.string().min(1).max(200),
        description: z.string().max(2000).optional(),
        quiz_type: z.enum(["multiple_choice", "true_false"]).optional(),
        options: z
          .array(
            z.object({
              id: z.string().min(1),
              label: z.string().min(1).max(500),
            })
          )
          .optional(),
        correct_answer: z.string().optional(),
        feedback_correct: z.string().max(1000).optional(),
        feedback_incorrect: z.string().max(1000).optional(),
        submission_type: z.enum(["text", "file", "link"]).optional(),
        visibility: z.enum(["private", "cohort"]).optional(),
        order: z.number().int().min(0),
      })
    )
    .min(1),
});

function stripHtmlContent(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function refineLessonPayload(data, ctx) {
  if (data.type === "TEXT") {
    const text = stripHtmlContent(data.content);
    if (!text || text.length < 20) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Text lessons require at least 20 characters of content",
        path: ["content"],
      });
    }
  }

  if (data.type === "INTERACTIVE") {
    if (!data.interactiveConfig?.steps?.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Interactive lessons require at least one step",
        path: ["interactiveConfig"],
      });
    }
  }

  if (data.type === "VIDEO" && !String(data.youtubeVideoId || "").trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "YouTube video ID is required for video lessons",
      path: ["youtubeVideoId"],
    });
  }
}

const updateLessonSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title cannot exceed 200 characters")
    .optional(),
  content: z
    .string()
    .max(50000, "Content cannot exceed 50000 characters")
    .optional(),
  interactiveConfig: interactiveConfigSchema.optional(),
  youtubeVideoId: z.string().optional(),
  externalUrl: z.string().url("Invalid external URL").optional(),
  durationSec: z
    .number()
    .min(1, "Duration must be at least 1 second")
    .optional(),
  isPublished: z.boolean().optional(),
  isFree: z.boolean().optional(),
  notes: z.string().max(1000, "Notes cannot exceed 1000 characters").optional(),
});

const updateProgressSchema = z.object({
  additionalTimeSec: z
    .number()
    .min(0, "additionalTimeSec cannot be negative")
    .optional(),
  completedStepIds: z.array(z.string().min(1)).optional(),
});

const createNoteSchema = z.object({
  content: z
    .string()
    .min(1, "Note content is required")
    .max(2000, "Note content cannot exceed 2000 characters"),
});

const updateNoteSchema = z.object({
  content: z
    .string()
    .min(1, "Note content is required")
    .max(2000, "Note content cannot exceed 2000 characters"),
});

const createDiscussionSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title cannot exceed 200 characters"),
  content: z
    .string()
    .min(10, "Content must be at least 10 characters")
    .max(5000, "Content cannot exceed 5000 characters"),
});

const updateDiscussionSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title cannot exceed 200 characters")
    .optional(),
  content: z
    .string()
    .min(10, "Content must be at least 10 characters")
    .max(5000, "Content cannot exceed 5000 characters")
    .optional(),
});

const addReplySchema = z.object({
  content: z
    .string()
    .min(1, "Reply content is required")
    .max(2000, "Reply content cannot exceed 2000 characters"),
});

const createSectionSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title cannot exceed 200 characters"),
  description: z
    .string()
    .max(1000, "Description cannot exceed 1000 characters")
    .optional(),
  order: z.number().min(1, "Order must be at least 1").optional(),
});

const updateSectionSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title cannot exceed 200 characters")
    .optional(),
  description: z
    .string()
    .max(1000, "Description cannot exceed 1000 characters")
    .optional(),
  order: z.number().min(1, "Order must be at least 1").optional(),
  isPublished: z.boolean().optional(),
});

const createLessonSchema = z
  .object({
    title: z
      .string()
      .min(3, "Title must be at least 3 characters")
      .max(200, "Title cannot exceed 200 characters"),
    type: z.enum([
      "TEXT",
      "VIDEO",
      "INTERACTIVE",
      "PRESENTATION",
      "AUDIO",
      "RESOURCE",
      "FILE",
      "LINK",
    ]),
    content: z
      .string()
      .max(50000, "Content cannot exceed 50000 characters")
      .optional(),
    interactiveConfig: interactiveConfigSchema.optional(),
    youtubeVideoId: z.string().optional(),
    externalUrl: z.string().url("Invalid external URL").optional(),
    order: z.number().min(1, "Order must be at least 1").optional(),
    durationSec: z
      .number()
      .min(1, "Duration must be at least 1 second")
      .optional(),
    isPublished: z.boolean().optional(),
    isFree: z.boolean().optional(),
    notes: z.string().max(1000, "Notes cannot exceed 1000 characters").optional(),
  })
  .superRefine(refineLessonPayload);

// Course Routes
router.get("/", optionalAuth, asyncHandler(getAllCourses));
router.post(
  "/",
  requireAuth,
  requireInstructor,
  validateBody(createCourseSchema),
  asyncHandler(createCourse)
);
router.get("/:id", optionalAuth, asyncHandler(getCourseById));
router.put(
  "/:id",
  requireAuth,
  requireInstructor,
  validateBody(updateCourseSchema),
  asyncHandler(updateCourse)
);
router.delete(
  "/:id",
  requireAuth,
  requireInstructor,
  asyncHandler(deleteCourse)
);
router.post("/:id/publish", requireAuth, requireInstructor, asyncHandler(publishCourse));
router.post("/:id/unpublish", requireAuth, requireInstructor, asyncHandler(unpublishCourse));
router.get("/:courseId/progress", requireAuth, asyncHandler(getCourseProgress));

// Section Routes
router.get("/:id/sections", optionalAuth, asyncHandler(getCourseSections));
router.post(
  "/:id/sections",
  requireAuth,
  requireInstructor,
  validateBody(createSectionSchema),
  asyncHandler(createSection)
);
router.put(
  "/:id/sections/:sectionId",
  requireAuth,
  requireInstructor,
  validateBody(updateSectionSchema),
  asyncHandler(updateSection)
);
router.delete(
  "/:id/sections/:sectionId",
  requireAuth,
  requireInstructor,
  asyncHandler(deleteSection)
);

// Lesson Routes
router.get("/:id/sections/:sectionId/lessons", optionalAuth, asyncHandler(getSectionLessons));
router.post(
  "/:id/sections/:sectionId/lessons",
  requireAuth,
  requireInstructor,
  validateBody(createLessonSchema),
  asyncHandler(createLesson)
);
router.get(
  "/:courseId/lessons/:lessonId",
  requireAuth,
  asyncHandler(getLesson)
);
router.patch(
  "/:courseId/lessons/:lessonId",
  requireAuth,
  requireInstructor,
  validateBody(updateLessonSchema),
  asyncHandler(updateLesson)
);
router.delete(
  "/:courseId/lessons/:lessonId",
  requireAuth,
  requireInstructor,
  asyncHandler(deleteLesson)
);
router.post(
  "/:courseId/lessons/:lessonId/complete",
  requireAuth,
  asyncHandler(completeLesson)
);
router.get(
  "/:courseId/lessons/:lessonId/progress",
  requireAuth,
  asyncHandler(getLessonProgress)
);
router.patch(
  "/:courseId/lessons/:lessonId/progress",
  requireAuth,
  validateBody(updateProgressSchema),
  asyncHandler(updateLessonProgress)
);

// Interactive Step Submission Routes
router.get(
  "/:courseId/lessons/:lessonId/interactive-submissions",
  requireAuth,
  asyncHandler(getInteractiveStepSubmissions)
);
router.post(
  "/:courseId/lessons/:lessonId/interactive-submissions/:stepId",
  requireAuth,
  interactiveSubmissionUpload.single("file"),
  asyncHandler(submitInteractiveStep)
);
router.get(
  "/:courseId/lessons/:lessonId/interactive-submissions/:stepId/shared",
  requireAuth,
  asyncHandler(getSharedInteractiveStepSubmissions)
);

// Notes Routes
router.get(
  "/:courseId/lessons/:lessonId/notes",
  requireAuth,
  asyncHandler(getLessonNotes)
);
router.post(
  "/:courseId/lessons/:lessonId/notes",
  requireAuth,
  validateBody(createNoteSchema),
  asyncHandler(createNote)
);
router.patch(
  "/:courseId/lessons/:lessonId/notes/:id",
  requireAuth,
  validateBody(updateNoteSchema),
  asyncHandler(updateNote)
);
router.delete(
  "/:courseId/lessons/:lessonId/notes/:id",
  requireAuth,
  asyncHandler(deleteNote)
);

// Discussions Routes
router.get(
  "/:courseId/lessons/:lessonId/discussions",
  requireAuth,
  asyncHandler(getDiscussions)
);
router.post(
  "/:courseId/lessons/:lessonId/discussions",
  requireAuth,
  validateBody(createDiscussionSchema),
  asyncHandler(createDiscussion)
);
router.patch(
  "/:courseId/lessons/:lessonId/discussions/:id",
  requireAuth,
  validateBody(updateDiscussionSchema),
  asyncHandler(updateDiscussion)
);
router.delete(
  "/:courseId/lessons/:lessonId/discussions/:id",
  requireAuth,
  asyncHandler(deleteDiscussion)
);
router.post(
  "/:courseId/lessons/:lessonId/discussions/:id/replies",
  requireAuth,
  validateBody(addReplySchema),
  asyncHandler(addReply)
);

export default router;
