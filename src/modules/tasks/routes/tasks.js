import express from "express";
import { z } from "zod";
import { requireAuth } from "../../../middleware/auth.js";
import { requireInstructor } from "../../../middleware/rbac.js";
import { validateBody, validateParams } from "../../../middleware/validation.js";
import { asyncHandler } from "../../../middleware/error.js";
import {
  createTask,
  listTasksForLesson,
} from "../controllers/taskController.js";

const router = express.Router();

const createTaskSchema = z.object({
  lessonId: z.string().min(1, "lessonId is required"),
  title: z.string().min(1).max(200),
  type: z.enum(["TEXT", "FILE", "LINK"]),
  instructions: z.string().max(5000).optional(),
  required: z.boolean().optional(),
  order: z.number().min(1).optional(),
  minTextLength: z.number().min(0).nullable().optional(),
  allowedMimeTypes: z.array(z.string()).optional(),
});

const lessonIdParamSchema = z.object({
  lessonId: z.string().min(1),
});

router.post(
  "/",
  requireAuth,
  requireInstructor,
  validateBody(createTaskSchema),
  asyncHandler(createTask)
);

router.get(
  "/:lessonId",
  requireAuth,
  validateParams(lessonIdParamSchema),
  asyncHandler(listTasksForLesson)
);

export default router;
