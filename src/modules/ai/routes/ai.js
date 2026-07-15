import express from "express";
import { z } from "zod";
import { requireAuth } from "../../../middleware/auth.js";
import { validateBody } from "../../../middleware/validation.js";
import { asyncHandler } from "../../../middleware/error.js";
import { askTutor } from "../controllers/aiController.js";

const router = express.Router();

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const tutorSchema = z.object({
  courseId: z.string().min(1),
  lessonId: z.string().min(1),
  userQuestion: z.string().min(1).max(2000),
  intent: z.enum(["explain", "examples", "tasks", "simplify"]).optional(),
  context: z.string().max(14000).optional(),
  messages: z.array(messageSchema).max(12).optional(),
  userId: z.string().optional(),
});

router.post("/tutor", requireAuth, validateBody(tutorSchema), asyncHandler(askTutor));

export default router;
