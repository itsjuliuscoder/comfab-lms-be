import express from "express";
import { z } from "zod";
import { requireAuth } from "../../../middleware/auth.js";
import { validateBody, validateParams } from "../../../middleware/validation.js";
import { asyncHandler } from "../../../middleware/error.js";
import {
  createSubmission,
  getSubmissionsByTask,
  reviewSubmission,
} from "../controllers/submissionController.js";

const router = express.Router();

const fileSchema = z
  .object({
    publicId: z.string().optional(),
    url: z.string().optional(),
    mime: z.string().optional(),
    name: z.string().optional(),
    size: z.number().optional(),
  })
  .optional();

const createSubmissionSchema = z.object({
  taskId: z.string().min(1),
  textContent: z.string().max(20000).optional(),
  linkUrl: z.string().max(2000).optional(),
  file: fileSchema,
});

const taskIdParamSchema = z.object({
  taskId: z.string().min(1),
});

const reviewParamSchema = z.object({
  id: z.string().min(1),
});

const reviewBodySchema = z.object({
  feedback: z.string().max(5000).optional(),
  status: z.literal("REVIEWED").optional(),
});

router.post(
  "/",
  requireAuth,
  validateBody(createSubmissionSchema),
  asyncHandler(createSubmission)
);

router.get(
  "/:taskId",
  requireAuth,
  validateParams(taskIdParamSchema),
  asyncHandler(getSubmissionsByTask)
);

router.patch(
  "/:id/review",
  requireAuth,
  validateParams(reviewParamSchema),
  validateBody(reviewBodySchema),
  asyncHandler(reviewSubmission)
);

export default router;
