import express from "express";
import { z } from "zod";
import { requireAuth } from "../../../middleware/auth.js";
import { requireAdmin, requireInstructor } from "../../../middleware/rbac.js";
import { validateBody, validateQuery } from "../../../middleware/validation.js";
import { asyncHandler } from "../../../middleware/error.js";
import {
  getAllPrograms,
  getProgramById,
  createProgram,
  updateProgram,
  deleteProgram,
  getProgramCourses,
  getProgramCohorts,
  getProgramStatistics,
  enrollInProgram,
} from "../controllers/programController.js";

const router = express.Router();

// Validation schemas
const createProgramSchema = z.object({
  name: z
    .string()
    .min(2, "Program name must be at least 2 characters")
    .max(100, "Program name cannot exceed 100 characters"),
  description: z
    .string()
    .min(10, "Program description must be at least 10 characters")
    .max(1000, "Program description cannot exceed 1000 characters"),
  code: z
    .string()
    .min(2, "Program code must be at least 2 characters")
    .max(20, "Program code cannot exceed 20 characters")
    .regex(
      /^[A-Z0-9_-]+$/,
      "Program code can only contain uppercase letters, numbers, hyphens, and underscores"
    ),
  startDate: z.string().datetime("Invalid start date format"),
  endDate: z.string().datetime("Invalid end date format"),
  duration: z
    .number()
    .int()
    .min(1, "Program duration must be at least 1 week")
    .max(104, "Program duration cannot exceed 104 weeks"),
  maxParticipants: z
    .number()
    .int()
    .min(1, "Maximum participants must be at least 1")
    .max(10000, "Maximum participants cannot exceed 10,000"),
  coordinatorId: z.string().min(1, "Coordinator ID is required"),
  tags: z
    .array(z.string().max(50, "Tag cannot exceed 50 characters"))
    .optional(),
  objectives: z
    .array(z.string().max(200, "Objective cannot exceed 200 characters"))
    .optional(),
  requirements: z
    .array(z.string().max(200, "Requirement cannot exceed 200 characters"))
    .optional(),
  isPublic: z.boolean().optional(),
  enrollmentOpen: z.boolean().optional(),
  enrollmentEndDate: z.string().datetime("Invalid enrollment end date format"),
  cost: z
    .object({
      amount: z.number().min(0, "Cost cannot be negative").optional(),
      currency: z.enum(["USD", "EUR", "GBP", "NGN", "CAD", "AUD"]).optional(),
      isFree: z.boolean().optional(),
    })
    .optional(),
  location: z
    .object({
      type: z.enum(["ONLINE", "ONSITE", "HYBRID"]).optional(),
      address: z
        .string()
        .max(200, "Address cannot exceed 200 characters")
        .optional(),
      city: z.string().max(50, "City cannot exceed 50 characters").optional(),
      country: z
        .string()
        .max(50, "Country cannot exceed 50 characters")
        .optional(),
    })
    .optional(),
  settings: z
    .object({
      allowSelfEnrollment: z.boolean().optional(),
      requireApproval: z.boolean().optional(),
      maxCoursesPerUser: z
        .number()
        .int()
        .min(1, "Max courses per user must be at least 1")
        .optional(),
      allowCohortCreation: z.boolean().optional(),
      maxCohorts: z
        .number()
        .int()
        .min(1, "Max cohorts must be at least 1")
        .optional(),
    })
    .optional(),
});

const updateProgramSchema = z.object({
  name: z
    .string()
    .min(2, "Program name must be at least 2 characters")
    .max(100, "Program name cannot exceed 100 characters")
    .optional(),
  description: z
    .string()
    .min(10, "Program description must be at least 10 characters")
    .max(1000, "Program description cannot exceed 1000 characters")
    .optional(),
  code: z
    .string()
    .min(2, "Program code must be at least 2 characters")
    .max(20, "Program code cannot exceed 20 characters")
    .regex(
      /^[A-Z0-9_-]+$/,
      "Program code can only contain uppercase letters, numbers, hyphens, and underscores"
    )
    .optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
  startDate: z.string().datetime("Invalid start date format").optional(),
  endDate: z.string().datetime("Invalid end date format").optional(),
  duration: z
    .number()
    .int()
    .min(1, "Program duration must be at least 1 week")
    .max(104, "Program duration cannot exceed 104 weeks")
    .optional(),
  maxParticipants: z
    .number()
    .int()
    .min(1, "Maximum participants must be at least 1")
    .max(10000, "Maximum participants cannot exceed 10,000")
    .optional(),
  coordinatorId: z.string().min(1, "Coordinator ID is required").optional(),
  tags: z
    .array(z.string().max(50, "Tag cannot exceed 50 characters"))
    .optional(),
  objectives: z
    .array(z.string().max(200, "Objective cannot exceed 200 characters"))
    .optional(),
  requirements: z
    .array(z.string().max(200, "Requirement cannot exceed 200 characters"))
    .optional(),
  isPublic: z.boolean().optional(),
  enrollmentOpen: z.boolean().optional(),
  enrollmentEndDate: z
    .string()
    .datetime("Invalid enrollment end date format")
    .optional(),
  cost: z
    .object({
      amount: z.number().min(0, "Cost cannot be negative").optional(),
      currency: z.enum(["USD", "EUR", "GBP", "NGN", "CAD", "AUD"]).optional(),
      isFree: z.boolean().optional(),
    })
    .optional(),
  location: z
    .object({
      type: z.enum(["ONLINE", "ONSITE", "HYBRID"]).optional(),
      address: z
        .string()
        .max(200, "Address cannot exceed 200 characters")
        .optional(),
      city: z.string().max(50, "City cannot exceed 50 characters").optional(),
      country: z
        .string()
        .max(50, "Country cannot exceed 50 characters")
        .optional(),
    })
    .optional(),
  settings: z
    .object({
      allowSelfEnrollment: z.boolean().optional(),
      requireApproval: z.boolean().optional(),
      maxCoursesPerUser: z
        .number()
        .int()
        .min(1, "Max courses per user must be at least 1")
        .optional(),
      allowCohortCreation: z.boolean().optional(),
      maxCohorts: z
        .number()
        .int()
        .min(1, "Max cohorts must be at least 1")
        .optional(),
    })
    .optional(),
});

// Public routes (no authentication required)
router.get(
  "/",
  validateQuery(
    z.object({
      page: z.string().optional(),
      limit: z.string().optional(),
      status: z.string().optional(),
      isPublic: z.string().optional(),
      search: z.string().optional(),
      enrollmentOpen: z.string().optional(),
    })
  ),
  asyncHandler(getAllPrograms)
);

router.get("/:id", asyncHandler(getProgramById));

// Protected routes (authentication required)
router.post(
  "/",
  requireAuth,
  requireInstructor,
  validateBody(createProgramSchema),
  asyncHandler(createProgram)
);
router.put(
  "/:id",
  requireAuth,
  validateBody(updateProgramSchema),
  asyncHandler(updateProgram)
);
router.delete("/:id", requireAuth, asyncHandler(deleteProgram));

// Program content routes
router.get(
  "/:id/courses",
  requireAuth,
  validateQuery(
    z.object({
      page: z.string().optional(),
      limit: z.string().optional(),
    })
  ),
  asyncHandler(getProgramCourses)
);

router.get(
  "/:id/cohorts",
  requireAuth,
  validateQuery(
    z.object({
      page: z.string().optional(),
      limit: z.string().optional(),
    })
  ),
  asyncHandler(getProgramCohorts)
);

router.get("/:id/statistics", requireAuth, asyncHandler(getProgramStatistics));

// Program enrollment routes
router.post("/:id/enroll", requireAuth, asyncHandler(enrollInProgram));

export default router;
