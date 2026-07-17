import mongoose from "mongoose";
import { Course } from "../models/Course.js";
import { Section } from "../models/Section.js";
import { Lesson } from "../models/Lesson.js";
import { LessonNote } from "../models/LessonNote.js";
import { LessonDiscussion } from "../models/LessonDiscussion.js";
import { LessonProgress } from "../models/LessonProgress.js";
import { InteractiveStepSubmission } from "../models/InteractiveStepSubmission.js";
import { CourseMaterial } from "../models/CourseMaterial.js";
import { Enrollment } from "../../enrollments/models/Enrollment.js";
import { Task } from "../../tasks/models/Task.js";
import { TaskSubmission } from "../../tasks/models/TaskSubmission.js";
import {
  assertObjectIds,
  getLessonInCourse,
  canAccessLessonProgress,
  getCourseProgressForUser,
  syncEnrollmentProgressFromLessons,
} from "../services/lessonProgressService.js";
import { assertRequiredTasksSubmitted } from "../../tasks/services/taskCompletionService.js";
import { uploadToCloudinary } from "../../../config/cloudinary.js";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  forbiddenResponse,
} from "../../../utils/response.js";
import {
  getPaginationParams,
  createPaginationResult,
} from "../../../utils/pagination.js";
import { logger } from "../../../utils/logger.js";
import { deleteCourseMaterial as deleteCourseMaterialFile } from "../services/cloudinaryService.js";

const COURSE_LEVEL_MAP = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
};

const normalizeCohortIds = (cohortIds) =>
  Array.from(
    new Set(
      (cohortIds || [])
        .map((cohortId) => cohortId?.toString().trim())
        .filter(Boolean)
    )
  );

const buildCohortSummary = (cohortDoc) => {
  if (!cohortDoc) return null;

  const cohort =
    typeof cohortDoc.toObject === "function"
      ? cohortDoc.toObject({ virtuals: true })
      : { ...cohortDoc };

  return {
    id: cohort.id || cohort._id?.toString(),
    name: cohort.name,
    status: cohort.status,
    programId: cohort.programId?.toString?.() || cohort.programId,
  };
};

const emptyCourseStats = () => ({
  enrollmentCount: 0,
  activeEnrollmentCount: 0,
  completedEnrollmentCount: 0,
  completionRate: 0,
  averageProgress: 0,
});

const getCourseId = (course) => course?._id?.toString?.() || course?.id?.toString?.() || course?.toString?.();

const getCourseStatsMap = async (courseIds = []) => {
  const normalizedIds = Array.from(
    new Set(
      courseIds
        .map((courseId) => courseId?.toString?.() || courseId)
        .filter((courseId) => mongoose.isValidObjectId(courseId))
    )
  );

  if (normalizedIds.length === 0) {
    return new Map();
  }

  const stats = await Enrollment.aggregate([
    {
      $match: {
        courseId: {
          $in: normalizedIds.map((courseId) => new mongoose.Types.ObjectId(courseId)),
        },
        status: { $in: ["ACTIVE", "COMPLETED"] },
      },
    },
    {
      $group: {
        _id: "$courseId",
        enrollmentCount: { $sum: 1 },
        activeEnrollmentCount: {
          $sum: { $cond: [{ $eq: ["$status", "ACTIVE"] }, 1, 0] },
        },
        completedEnrollmentCount: {
          $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] },
        },
        averageProgress: { $avg: "$progressPct" },
      },
    },
  ]);

  return new Map(
    stats.map((item) => {
      const enrollmentCount = item.enrollmentCount || 0;
      const completedEnrollmentCount = item.completedEnrollmentCount || 0;
      return [
        item._id.toString(),
        {
          enrollmentCount,
          activeEnrollmentCount: item.activeEnrollmentCount || 0,
          completedEnrollmentCount,
          completionRate:
            enrollmentCount > 0
              ? Math.round((completedEnrollmentCount / enrollmentCount) * 100)
              : 0,
          averageProgress: Math.round(item.averageProgress || 0),
        },
      ];
    })
  );
};

const toFrontendNote = (noteDoc) => {
  if (!noteDoc) return null;
  const note =
    typeof noteDoc.toObject === "function"
      ? noteDoc.toObject({ virtuals: true })
      : { ...noteDoc };

  return {
    id: note.id || note._id?.toString(),
    courseId: note.courseId?.toString?.() || note.courseId,
    lessonId: note.lessonId?.toString?.() || note.lessonId,
    userId: note.userId?.toString?.() || note.userId,
    content: note.content,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
};

const toFrontendAuthor = (author) => {
  if (!author) return undefined;
  if (typeof author === "object" && author._id) {
    return {
      id: author._id.toString(),
      name: author.name,
      email: author.email,
      role: author.role,
      avatarUrl: author.avatarUrl || null,
    };
  }
  return { id: author.toString?.() || author };
};

const toFrontendDiscussion = (discussionDoc) => {
  if (!discussionDoc) return null;
  const discussion =
    typeof discussionDoc.toObject === "function"
      ? discussionDoc.toObject({ virtuals: true })
      : { ...discussionDoc };

  return {
    id: discussion.id || discussion._id?.toString(),
    courseId: discussion.courseId?.toString?.() || discussion.courseId,
    lessonId: discussion.lessonId?.toString?.() || discussion.lessonId,
    title: discussion.title,
    content: discussion.deletedAt ? "[Discussion deleted]" : discussion.content,
    author: toFrontendAuthor(discussion.authorId),
    createdAt: discussion.createdAt,
    updatedAt: discussion.updatedAt,
    deletedAt: discussion.deletedAt,
    replies: (discussion.replies || []).map((reply) => ({
      id: reply.id || reply._id?.toString(),
      content: reply.content,
      author: toFrontendAuthor(reply.authorId),
      createdAt: reply.createdAt,
      updatedAt: reply.updatedAt,
    })),
  };
};

const userOwnsDocument = (user, doc) =>
  Boolean(user?._id && doc?.authorId?.toString?.() === user._id.toString());

const canModerateCourse = async (user, courseId) => {
  if (!user) return false;
  if (["SUPER_ADMIN", "ADMIN"].includes(user.role)) return true;
  if (user.role !== "INSTRUCTOR") return false;
  const course = await Course.findById(courseId).select("ownerId");
  return course?.ownerId?.toString() === user._id.toString();
};

const assertCanAccessLessonDiscussion = async (user, courseId, lessonId) => {
  try {
    assertObjectIds(courseId, lessonId);
    await getLessonInCourse(lessonId, courseId);
  } catch (e) {
    e.statusCode = e.code === "NOT_FOUND" ? 404 : 400;
    throw e;
  }

  const allowed = await canAccessLessonProgress(user, courseId);
  if (!allowed) {
    const error = new Error("You must be enrolled in this course to join lesson discussions");
    error.statusCode = 403;
    error.code = "FORBIDDEN";
    throw error;
  }
};

const getLessonForNoteRequest = async (courseId, lessonId) => {
  const lesson = await Lesson.findOne({ _id: lessonId, courseId });
  if (!lesson) {
    const error = new Error("Lesson not found in this course");
    error.statusCode = 404;
    error.code = "LESSON_NOT_FOUND";
    throw error;
  }
  return lesson;
};

const normalizeInteractiveStep = (step, index = 0) => {
  const stepType = step.step_type || "reflect";
  const normalized = {
    ...step,
    id: step.id,
    title: String(step.title || "").trim(),
    description: String(step.description || "").trim(),
    order: Number.isFinite(Number(step.order)) ? Number(step.order) : index,
    step_type: stepType,
  };

  if (stepType === "quiz") {
    normalized.quiz_type = step.quiz_type || "multiple_choice";
    normalized.options = (step.options || []).map((option, optionIndex) => ({
      id: option.id || `option-${optionIndex + 1}`,
      label: String(option.label || "").trim(),
    }));
    normalized.correct_answer = step.correct_answer || "";
    normalized.feedback_correct = step.feedback_correct || "";
    normalized.feedback_incorrect = step.feedback_incorrect || "";
  } else {
    normalized.options = [];
    normalized.correct_answer = undefined;
    normalized.quiz_type = undefined;
  }

  if (stepType === "task" || stepType === "peer_share") {
    normalized.submission_type = step.submission_type || "text";
    normalized.visibility = stepType === "peer_share" ? "cohort" : "private";
  } else {
    normalized.submission_type = undefined;
    normalized.visibility = "private";
  }

  return normalized;
};

const normalizeInteractiveConfig = (interactiveConfig = {}) => ({
  introduction: String(interactiveConfig.introduction || "").trim(),
  steps: (interactiveConfig.steps || []).map(normalizeInteractiveStep),
});

const validateInteractiveConfig = (interactiveConfig) => {
  const normalized = normalizeInteractiveConfig(interactiveConfig);
  if (!normalized.steps.length) {
    const error = new Error("Interactive lessons require at least one step");
    error.statusCode = 400;
    throw error;
  }

  for (const step of normalized.steps) {
    if (!step.id || !step.title) {
      const error = new Error("Interactive steps require an id and title");
      error.statusCode = 400;
      throw error;
    }
    if (step.step_type === "quiz") {
      const options = step.options || [];
      if (
        !options.length ||
        options.some((option) => !option.id || !option.label) ||
        !step.correct_answer ||
        !options.some((option) => option.id === step.correct_answer)
      ) {
        const error = new Error("Quiz steps require options and a correct answer");
        error.statusCode = 400;
        throw error;
      }
    }
    if (
      (step.step_type === "task" || step.step_type === "peer_share") &&
      !["text", "file", "link"].includes(step.submission_type)
    ) {
      const error = new Error("Task steps require a valid submission type");
      error.statusCode = 400;
      throw error;
    }
  }

  return normalized;
};

const toFrontendSubmission = (submissionDoc) => {
  if (!submissionDoc) return null;
  const submission =
    typeof submissionDoc.toObject === "function"
      ? submissionDoc.toObject({ virtuals: true })
      : { ...submissionDoc };

  return {
    id: submission.id || submission._id?.toString(),
    courseId: submission.courseId?.toString?.() || submission.courseId,
    lessonId: submission.lessonId?.toString?.() || submission.lessonId,
    stepId: submission.stepId,
    userId: submission.userId?._id?.toString?.() || submission.userId?.toString?.() || submission.userId,
    user:
      submission.userId && typeof submission.userId === "object"
        ? {
            id: submission.userId._id?.toString?.() || submission.userId.id,
            name: submission.userId.name,
            email: submission.userId.email,
          }
        : undefined,
    stepType: submission.stepType,
    responseText: submission.responseText || "",
    responseLink: submission.responseLink || "",
    file: submission.file,
    selectedAnswer: submission.selectedAnswer || "",
    isCorrect: submission.isCorrect,
    status: submission.status,
    visibility: submission.visibility,
    createdAt: submission.createdAt,
    updatedAt: submission.updatedAt,
  };
};

const getInteractiveLessonAndStep = async (courseId, lessonId, stepId) => {
  const lesson = await Lesson.findOne({ _id: lessonId, courseId });
  if (!lesson || lesson.type !== "INTERACTIVE") {
    const error = new Error("Interactive lesson not found in this course");
    error.statusCode = 404;
    error.code = "LESSON_NOT_FOUND";
    throw error;
  }

  const steps = (lesson.interactiveConfig?.steps || []).map(normalizeInteractiveStep);
  const step = steps.find((item) => item.id === stepId);
  if (!step) {
    const error = new Error("Interactive step not found");
    error.statusCode = 404;
    error.code = "STEP_NOT_FOUND";
    throw error;
  }

  return { lesson, step };
};

const loadValidatedCohorts = async (programId, cohortIds = []) => {
  const uniqueCohortIds = normalizeCohortIds(cohortIds);

  if (uniqueCohortIds.length === 0) {
    return { cohortIds: [], cohorts: [] };
  }

  const invalidIds = uniqueCohortIds.filter(
    (cohortId) => !mongoose.isValidObjectId(cohortId)
  );

  if (invalidIds.length > 0) {
    const error = new Error("One or more selected cohorts are invalid");
    error.statusCode = 400;
    error.code = "INVALID_COHORT_IDS";
    throw error;
  }

  const { Cohort } = await import("../../cohorts/models/Cohort.js");
  const cohorts = await Cohort.find({
    _id: { $in: uniqueCohortIds },
    programId,
  }).select("_id name status programId");

  if (cohorts.length !== uniqueCohortIds.length) {
    const error = new Error(
      "One or more selected cohorts do not belong to this program"
    );
    error.statusCode = 400;
    error.code = "INVALID_COHORT_PROGRAM";
    throw error;
  }

  const cohortMap = new Map(
    cohorts.map((cohort) => [cohort._id.toString(), cohort])
  );

  return {
    cohortIds: uniqueCohortIds,
    cohorts: uniqueCohortIds
      .map((cohortId) => cohortMap.get(cohortId))
      .filter(Boolean),
  };
};

export const toFrontendCourse = (courseDoc, options = {}) => {
  if (!courseDoc) return null;

  const course = typeof courseDoc.toObject === "function"
    ? courseDoc.toObject({ virtuals: true })
    : { ...courseDoc };

  const includeCohorts = Boolean(options.includeCohorts);
  const courseId = course.id || course._id?.toString();
  const stats =
    options.stats ||
    options.statsByCourseId?.get(courseId) ||
    emptyCourseStats();
  const cohortSummaries = Array.isArray(course.cohortIds)
    ? course.cohortIds
        .map((cohort) => buildCohortSummary(cohort))
        .filter(Boolean)
    : [];
  const { cohortIds, ...restCourse } = course;

  return {
    ...restCourse,
    id: courseId,
    description: course.description || course.summary || "",
    level: course.level || COURSE_LEVEL_MAP[course.difficulty] || undefined,
    duration: course.duration ?? course.estimatedDuration ?? 0,
    enrollmentCount: stats.enrollmentCount,
    activeEnrollmentCount: stats.activeEnrollmentCount,
    completedEnrollmentCount: stats.completedEnrollmentCount,
    completionRate: stats.completionRate,
    averageProgress: stats.averageProgress,
    ...(includeCohorts
      ? {
          cohortIds: normalizeCohortIds(cohortIds),
          cohortCount: cohortSummaries.length,
          cohorts: cohortSummaries,
        }
      : {}),
  };
};

// GET /courses - Get all courses with enrollment status
export const getAllCourses = async (req, res) => {
  try {
    const { page, limit } = getPaginationParams(req.query);
    const {
      status,
      difficulty,
      featured,
      search,
      ownerId,
      programId,
      isPublic,
      includeEnrollmentStatus,
    } = req.query;

    // Build query
    const query = {};
    if (status) query.status = status;
    if (difficulty) query.difficulty = difficulty;
    if (featured) query.featured = featured === "true";
    if (ownerId) query.ownerId = ownerId;
    if (programId) query.programId = programId;
    if (isPublic !== undefined) query.isPublic = isPublic === "true";
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { summary: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    const isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(req.user?.role);
    const isOwnerFilter =
      req.user?.role === "INSTRUCTOR" &&
      ownerId &&
      ownerId === req.user._id.toString();
    const includeCohorts = Boolean(req.user && (isAdmin || isOwnerFilter));

    // Public and participant catalog requests never expose drafts or private courses.
    if (!isAdmin && !isOwnerFilter) {
      query.status = "PUBLISHED";
      query.isPublic = true;
    }

    // Get total count
    const total = await Course.countDocuments(query);

    // Get courses with pagination
    let courseQuery = Course.find(query)
      .populate("ownerId", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    if (includeCohorts) {
      courseQuery = courseQuery.populate("cohortIds", "name status programId");
    }

    const courses = await courseQuery;
    const courseStatsById = await getCourseStatsMap(courses.map(getCourseId));

    // If user is authenticated and enrollment status is requested, check enrollment for each course
    let coursesWithEnrollment = courses.map((course) =>
      toFrontendCourse(course, { includeCohorts, statsByCourseId: courseStatsById })
    );
    if (req.user && includeEnrollmentStatus === "true") {
      const courseIds = courses.map((course) => course._id);

      // Get user's enrollments for these courses
      const enrollments = await Enrollment.find({
        userId: req.user._id,
        courseId: { $in: courseIds },
        status: { $in: ["ACTIVE", "COMPLETED"] },
      });

      // Create a map of courseId to enrollment
      const enrollmentMap = {};
      enrollments.forEach((enrollment) => {
        enrollmentMap[enrollment.courseId.toString()] = enrollment;
      });

      // Add enrollment status to each course
      coursesWithEnrollment = courses.map((course) => {
        const enrollment = enrollmentMap[course._id.toString()];
        return {
          ...toFrontendCourse(course, { includeCohorts, statsByCourseId: courseStatsById }),
          enrollmentStatus: enrollment
            ? {
                isEnrolled: true,
                enrollmentId: enrollment._id,
                status: enrollment.status,
                enrolledAt: enrollment.enrolledAt,
                progress: enrollment.progressPct || 0,
                completedAt: enrollment.completedAt,
              }
            : {
                isEnrolled: false,
                enrollmentId: null,
                status: null,
                enrolledAt: null,
                progress: 0,
                completedAt: null,
              },
        };
      });
    }

    const result = createPaginationResult(
      coursesWithEnrollment,
      total,
      page,
      limit
    );
    result.courses = result.data;
    return successResponse(res, result, "Courses retrieved successfully");
  } catch (error) {
    logger.error("Get all courses error:", error);
    return errorResponse(res, error);
  }
};

// GET /courses/catalog - Get courses for catalog with enrollment status
export const getCourseCatalog = async (req, res) => {
  try {
    const { page, limit } = getPaginationParams(req.query);
    const { difficulty, featured, search, topic } = req.query;

    // Build query for published courses only
    const query = { status: "PUBLISHED" };

    if (difficulty) query.difficulty = difficulty;
    if (featured) query.featured = featured === "true";
    if (topic) query.tags = { $in: [new RegExp(topic, "i")] };
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { summary: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    // Get total count
    const total = await Course.countDocuments(query);

    // Get courses with pagination
    const courses = await Course.find(query)
      .populate("ownerId", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    const courseStatsById = await getCourseStatsMap(courses.map(getCourseId));

    // Always check enrollment status for authenticated users
    let coursesWithEnrollment = courses;
    if (req.user) {
      const courseIds = courses.map((course) => course._id);

      // Get user's enrollments for these courses
      const enrollments = await Enrollment.find({
        userId: req.user._id,
        courseId: { $in: courseIds },
        status: { $in: ["ACTIVE", "COMPLETED"] },
      });

      // Create a map of courseId to enrollment
      const enrollmentMap = {};
      enrollments.forEach((enrollment) => {
        enrollmentMap[enrollment.courseId.toString()] = enrollment;
      });

      // Add enrollment status to each course
      coursesWithEnrollment = courses.map((course) => {
        const enrollment = enrollmentMap[course._id.toString()];
        return {
          ...toFrontendCourse(course, { statsByCourseId: courseStatsById }),
          enrollmentStatus: enrollment
            ? {
                isEnrolled: true,
                enrollmentId: enrollment._id,
                status: enrollment.status,
                enrolledAt: enrollment.enrolledAt,
                progress: enrollment.progressPct || 0,
                completedAt: enrollment.completedAt,
              }
            : {
                isEnrolled: false,
                enrollmentId: null,
                status: null,
                enrolledAt: null,
                progress: 0,
                completedAt: null,
              },
        };
      });
    } else {
      // For unauthenticated users, add default enrollment status
      coursesWithEnrollment = courses.map((course) => ({
        ...toFrontendCourse(course, { statsByCourseId: courseStatsById }),
        enrollmentStatus: {
          isEnrolled: false,
          enrollmentId: null,
          status: null,
          enrolledAt: null,
          progress: 0,
          completedAt: null,
        },
      }));
    }

    const result = createPaginationResult(
      coursesWithEnrollment,
      total,
      page,
      limit
    );
    return successResponse(
      res,
      result,
      "Course catalog retrieved successfully"
    );
  } catch (error) {
    logger.error("Get course catalog error:", error);
    return errorResponse(res, error);
  }
};

// POST /courses - Create course (instructor/admin)
export const createCourse = async (req, res) => {
  try {
    const {
      title,
      summary,
      programId,
      description,
      outcomes,
      tags,
      difficulty,
      estimatedDuration,
      isPublic,
      enrollmentLimit,
      prerequisites,
      cohortIds,
    } = req.body;

    const Program = (await import("../../programs/models/Program.js")).default;
    const program = await Program.findById(programId);
    if (!program) {
      return notFoundResponse(res, "Program");
    }

    const validatedCohorts = await loadValidatedCohorts(programId, cohortIds);

    const course = new Course({
      title,
      summary,
      programId,
      description,
      outcomes,
      tags,
      difficulty,
      estimatedDuration,
      isPublic,
      enrollmentLimit,
      prerequisites,
      cohortIds: validatedCohorts.cohortIds,
      ownerId: req.user._id,
    });

    await course.save();

    const populatedCourse = await Course.findById(course._id).populate(
      "ownerId",
      "name email"
    ).populate("cohortIds", "name status programId");

    return successResponse(
      res,
      toFrontendCourse(populatedCourse, { includeCohorts: true }),
      "Course created successfully",
      201
    );
  } catch (error) {
    logger.error("Create course error:", error);
    return errorResponse(res, error, error.statusCode || 500);
  }
};

// GET /courses/:id - Get course by ID
export const getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate("ownerId", "name email")
      .populate("prerequisites", "title summary");

    if (!course) {
      return notFoundResponse(res, "Course");
    }

    const userId = req.user?._id?.toString();
    const isOwner = userId && course.ownerId?._id?.toString() === userId;
    const isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(req.user?.role);

    if (
      (!course.isPublic || course.status !== "PUBLISHED") &&
      !isAdmin &&
      !isOwner
    ) {
      return forbiddenResponse(res, "Access denied");
    }

    const canSeeCohorts = Boolean(isAdmin || isOwner);

    if (canSeeCohorts) {
      await course.populate("cohortIds", "name status programId");
    }
    const courseStatsById = await getCourseStatsMap([course._id]);

    return successResponse(
      res,
      {
        course: toFrontendCourse(course, {
          includeCohorts: canSeeCohorts,
          statsByCourseId: courseStatsById,
        }),
      },
      "Course retrieved successfully"
    );
  } catch (error) {
    logger.error("Get course by ID error:", error);
    return errorResponse(res, error);
  }
};

// PUT /courses/:id - Update course
export const updateCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return notFoundResponse(res, "Course");
    }

    // Check if user can update this course
    if (
      !["SUPER_ADMIN", "ADMIN"].includes(req.user.role) &&
      course.ownerId.toString() !== req.user._id.toString()
    ) {
      return forbiddenResponse(res, "Access denied");
    }

    const updates = req.body;
    const nextProgramId = updates.programId || course.programId.toString();
    const nextCohortIds =
      updates.cohortIds !== undefined ? updates.cohortIds : course.cohortIds;
    const validatedCohorts = await loadValidatedCohorts(
      nextProgramId,
      nextCohortIds
    );
    const updatedCourse = await Course.findByIdAndUpdate(
      req.params.id,
      {
        ...updates,
        cohortIds: validatedCohorts.cohortIds,
      },
      { new: true, runValidators: true }
    )
      .populate("ownerId", "name email")
      .populate("cohortIds", "name status programId");

    return successResponse(
      res,
      toFrontendCourse(updatedCourse, { includeCohorts: true }),
      "Course updated successfully"
    );
  } catch (error) {
    logger.error("Update course error:", error);
    return errorResponse(res, error, error.statusCode || 500);
  }
};

// DELETE /courses/:id - Delete course
export const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return notFoundResponse(res, "Course");
    }

    // Check if user can delete this course
    if (
      !["SUPER_ADMIN", "ADMIN"].includes(req.user.role) &&
      course.ownerId.toString() !== req.user._id.toString()
    ) {
      return forbiddenResponse(res, "Access denied");
    }

    await Course.findByIdAndDelete(req.params.id);

    return successResponse(res, null, "Course deleted successfully");
  } catch (error) {
    logger.error("Delete course error:", error);
    return errorResponse(res, error);
  }
};

// POST /courses/:id/publish - Publish course
export const publishCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return notFoundResponse(res, "Course");
    }

    if (
      !["SUPER_ADMIN", "ADMIN"].includes(req.user.role) &&
      course.ownerId.toString() !== req.user._id.toString()
    ) {
      return forbiddenResponse(res, "Access denied");
    }

    const calculatedDuration = await calculateCourseDuration(course._id || req.params.id);
    course.estimatedDuration =
      calculatedDuration >= 1 ? calculatedDuration : null;
    course.status = "PUBLISHED";
    await course.save();
    await course.populate("ownerId", "name email");

    return successResponse(
      res,
      toFrontendCourse(course),
      "Course published successfully"
    );
  } catch (error) {
    logger.error("Publish course error:", error);
    return errorResponse(res, error);
  }
};

// POST /courses/:id/unpublish - Unpublish course
export const unpublishCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return notFoundResponse(res, "Course");
    }

    if (
      !["SUPER_ADMIN", "ADMIN"].includes(req.user.role) &&
      course.ownerId.toString() !== req.user._id.toString()
    ) {
      return forbiddenResponse(res, "Access denied");
    }

    course.status = "DRAFT";
    course.publishedAt = null;
    await course.save();
    await course.populate("ownerId", "name email");

    return successResponse(
      res,
      toFrontendCourse(course),
      "Course unpublished successfully"
    );
  } catch (error) {
    logger.error("Unpublish course error:", error);
    return errorResponse(res, error);
  }
};

// GET /courses/:courseId/lessons/:lessonId - Get lesson details
export const getLesson = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;

    const lesson = await Lesson.findById(lessonId)
      .populate("sectionId", "title order")
      .populate("courseId", "title status ownerId");

    if (!lesson) {
      return notFoundResponse(res, "Lesson");
    }

    // Check if user can access this lesson
    if (
      lesson.courseId.status !== "PUBLISHED" &&
      !["SUPER_ADMIN", "ADMIN"].includes(req.user?.role) &&
      lesson.courseId.ownerId?.toString() !== req.user?._id?.toString()
    ) {
      return forbiddenResponse(res, "Access denied");
    }

    return successResponse(res, { lesson }, "Lesson retrieved successfully");
  } catch (error) {
    logger.error("Get lesson error:", error);
    return errorResponse(res, error);
  }
};

// PATCH /courses/:courseId/lessons/:lessonId - Update lesson (instructor)
export const updateLesson = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;

    const lesson = await Lesson.findById(lessonId).populate(
      "courseId",
      "ownerId"
    );

    if (!lesson) {
      return notFoundResponse(res, "Lesson");
    }

    // Check if user can update this lesson
    if (
      !["SUPER_ADMIN", "ADMIN"].includes(req.user.role) &&
      lesson.courseId.ownerId.toString() !== req.user._id.toString()
    ) {
      return forbiddenResponse(res, "Access denied");
    }

    const updates = req.body;

    if (lesson.type === "TEXT" && updates.content !== undefined) {
      const text = String(updates.content || "")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .trim();
      if (!text || text.length < 20) {
        return errorResponse(
          res,
          new Error("Text lessons require at least 20 characters of content"),
          400
        );
      }
    }

    if (lesson.type === "INTERACTIVE" && updates.interactiveConfig !== undefined) {
      try {
        updates.interactiveConfig = validateInteractiveConfig(updates.interactiveConfig);
      } catch (validationError) {
        return errorResponse(res, validationError, validationError.statusCode || 400);
      }
    }

    // Handle YouTube video ID validation if provided
    if (updates.youtubeVideoId) {
      const { isValidYouTubeVideoId } = await import(
        "../../../utils/youtube.js"
      );
      if (!isValidYouTubeVideoId(updates.youtubeVideoId)) {
        return res.status(400).json({
          ok: false,
          error: {
            code: "INVALID_YOUTUBE_ID",
            message: "Invalid YouTube video ID",
          },
        });
      }
    }

    const updatedLesson = await Lesson.findByIdAndUpdate(lessonId, updates, {
      new: true,
      runValidators: true,
    }).populate("sectionId", "title order");

    return successResponse(
      res,
      { lesson: updatedLesson },
      "Lesson updated successfully"
    );
  } catch (error) {
    logger.error("Update lesson error:", error);
    return errorResponse(res, error);
  }
};

// DELETE /courses/:courseId/lessons/:lessonId - Delete lesson (instructor)
export const deleteLesson = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;

    const lesson = await Lesson.findOne({ _id: lessonId, courseId }).populate(
      "courseId",
      "ownerId"
    );

    if (!lesson) {
      return notFoundResponse(res, "Lesson");
    }

    if (
      !["SUPER_ADMIN", "ADMIN"].includes(req.user.role) &&
      lesson.courseId.ownerId.toString() !== req.user._id.toString()
    ) {
      return forbiddenResponse(res, "Access denied");
    }

    const lessonMaterials = await CourseMaterial.find({ course: courseId, lesson: lessonId });
    await Promise.all(
      lessonMaterials.map(async (material) => {
        if (!material.file?.publicId) return;
        try {
          await deleteCourseMaterialFile(material.file.publicId);
        } catch (error) {
          logger.warn("Failed to delete lesson material from Cloudinary", {
            materialId: material._id?.toString(),
            publicId: material.file.publicId,
            error: error.message,
          });
        }
      })
    );

    const taskIds = await Task.find({ courseId, lessonId }).distinct("_id");

    await Promise.all([
      LessonProgress.deleteMany({ courseId, lessonId }),
      LessonNote.deleteMany({ courseId, lessonId }),
      LessonDiscussion.deleteMany({ courseId, lessonId }),
      InteractiveStepSubmission.deleteMany({ courseId, lessonId }),
      TaskSubmission.deleteMany({ courseId, lessonId }),
      taskIds.length
        ? TaskSubmission.deleteMany({ taskId: { $in: taskIds } })
        : Promise.resolve(),
      Task.deleteMany({ courseId, lessonId }),
      CourseMaterial.deleteMany({ course: courseId, lesson: lessonId }),
      Lesson.deleteOne({ _id: lessonId }),
    ]);

    const totalDuration = await calculateCourseDuration(courseId);
    await Course.findByIdAndUpdate(courseId, {
      estimatedDuration: totalDuration,
    });

    return successResponse(res, null, "Lesson deleted successfully");
  } catch (error) {
    logger.error("Delete lesson error:", error);
    return errorResponse(res, error);
  }
};

function handleLessonProgressParamError(res, error) {
  if (error.code === "INVALID_ID") {
    return res.status(400).json({
      ok: false,
      error: { code: "INVALID_ID", message: error.message },
    });
  }
  if (error.code === "NOT_FOUND") {
    return notFoundResponse(res, "Lesson");
  }
  if (error.code === "LESSON_COURSE_MISMATCH") {
    return res.status(400).json({
      ok: false,
      error: { code: "LESSON_COURSE_MISMATCH", message: error.message },
    });
  }
  return null;
}

// POST /courses/:courseId/lessons/:lessonId/complete - Mark lesson complete
export const completeLesson = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;

    try {
      assertObjectIds(courseId, lessonId);
      await getLessonInCourse(lessonId, courseId);
    } catch (e) {
      const handled = handleLessonProgressParamError(res, e);
      if (handled) return handled;
      throw e;
    }

    const allowed = await canAccessLessonProgress(req.user, courseId);
    if (!allowed) {
      return forbiddenResponse(
        res,
        "You must be enrolled in this course to complete lessons"
      );
    }

    try {
      await assertRequiredTasksSubmitted(req.user._id, lessonId);
    } catch (e) {
      if (e.code === "REQUIRED_TASKS_INCOMPLETE") {
        return res.status(400).json({
          ok: false,
          error: {
            code: e.code,
            message: e.message,
            details: e.details,
          },
        });
      }
      throw e;
    }

    const now = new Date();
    const progress = await LessonProgress.findOneAndUpdate(
      { userId: req.user._id, lessonId },
      {
        $set: {
          courseId,
          completed: true,
          completedAt: now,
          lastAccessedAt: now,
        },
      },
      { new: true, upsert: true, runValidators: true }
    );

    await syncEnrollmentProgressFromLessons(req.user._id, courseId);

    const courseProgress = await getCourseProgressForUser(
      req.user._id,
      courseId
    );

    return successResponse(
      res,
      {
        progress,
        progressPct: courseProgress.progressPct,
        completedCount: courseProgress.completedCount,
        totalCount: courseProgress.totalCount,
      },
      "Lesson marked as complete"
    );
  } catch (error) {
    logger.error("Complete lesson error:", error);
    return errorResponse(res, error);
  }
};

// GET /courses/:courseId/progress - Get bulk course progress for current user
export const getCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;

    try {
      assertObjectIds(courseId);
    } catch (e) {
      const handled = handleLessonProgressParamError(res, e);
      if (handled) return handled;
      throw e;
    }

    const allowed = await canAccessLessonProgress(req.user, courseId);
    if (!allowed) {
      return forbiddenResponse(res, "Access denied");
    }

    const courseProgress = await getCourseProgressForUser(
      req.user._id,
      courseId
    );

    return successResponse(res, courseProgress, "Course progress retrieved");
  } catch (error) {
    logger.error("Get course progress error:", error);
    return errorResponse(res, error);
  }
};

// GET /courses/:courseId/lessons/:lessonId/progress - Get lesson progress
export const getLessonProgress = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;

    try {
      assertObjectIds(courseId, lessonId);
      await getLessonInCourse(lessonId, courseId);
    } catch (e) {
      const handled = handleLessonProgressParamError(res, e);
      if (handled) return handled;
      throw e;
    }

    const allowed = await canAccessLessonProgress(req.user, courseId);
    if (!allowed) {
      return forbiddenResponse(res, "Access denied");
    }

    const doc = await LessonProgress.findOne({
      userId: req.user._id,
      lessonId,
    });

    const progress = doc
      ? {
          completed: doc.completed,
          timeSpentSec: doc.timeSpentSec,
          lastAccessedAt: doc.lastAccessedAt,
          completedAt: doc.completedAt,
          completedStepIds: doc.completedStepIds || [],
        }
      : {
          completed: false,
          timeSpentSec: 0,
          lastAccessedAt: null,
          completedAt: null,
          completedStepIds: [],
        };

    return successResponse(
      res,
      { progress },
      "Lesson progress retrieved successfully"
    );
  } catch (error) {
    logger.error("Get lesson progress error:", error);
    return errorResponse(res, error);
  }
};

// PATCH /courses/:courseId/lessons/:lessonId/progress - Update lesson progress (time only; use POST .../complete to finish)
export const updateLessonProgress = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const { additionalTimeSec = 0, completedStepIds } = req.body;

    try {
      assertObjectIds(courseId, lessonId);
      await getLessonInCourse(lessonId, courseId);
    } catch (e) {
      const handled = handleLessonProgressParamError(res, e);
      if (handled) return handled;
      throw e;
    }

    const allowed = await canAccessLessonProgress(req.user, courseId);
    if (!allowed) {
      return forbiddenResponse(res, "Access denied");
    }

    const inc = Math.max(0, Number(additionalTimeSec) || 0);
    const now = new Date();
    const update = {
      $set: { courseId, lastAccessedAt: now },
      $inc: { timeSpentSec: inc },
    };

    if (Array.isArray(completedStepIds)) {
      update.$set.completedStepIds = completedStepIds;
    }

    const progress = await LessonProgress.findOneAndUpdate(
      { userId: req.user._id, lessonId },
      update,
      { new: true, upsert: true, runValidators: true }
    );

    return successResponse(
      res,
      {
        progress: {
          completed: progress.completed,
          timeSpentSec: progress.timeSpentSec,
          lastAccessedAt: progress.lastAccessedAt,
          completedAt: progress.completedAt,
          completedStepIds: progress.completedStepIds || [],
        },
      },
      "Lesson progress updated successfully"
    );
  } catch (error) {
    logger.error("Update lesson progress error:", error);
    return errorResponse(res, error);
  }
};

// GET /courses/:courseId/lessons/:lessonId/interactive-submissions
export const getInteractiveStepSubmissions = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;

    try {
      assertObjectIds(courseId, lessonId);
      await getLessonInCourse(lessonId, courseId);
    } catch (e) {
      const handled = handleLessonProgressParamError(res, e);
      if (handled) return handled;
      throw e;
    }

    const allowed = await canAccessLessonProgress(req.user, courseId);
    if (!allowed) {
      return forbiddenResponse(res, "Access denied");
    }

    const submissions = await InteractiveStepSubmission.find({
      courseId,
      lessonId,
      userId: req.user._id,
    }).sort({ updatedAt: -1 });

    return successResponse(
      res,
      { submissions: submissions.map(toFrontendSubmission) },
      "Interactive submissions retrieved successfully"
    );
  } catch (error) {
    logger.error("Get interactive submissions error:", error);
    return errorResponse(res, error, error.statusCode || 500);
  }
};

// POST /courses/:courseId/lessons/:lessonId/interactive-submissions/:stepId
export const submitInteractiveStep = async (req, res) => {
  try {
    const { courseId, lessonId, stepId } = req.params;
    const { lesson, step } = await getInteractiveLessonAndStep(courseId, lessonId, stepId);

    const allowed = await canAccessLessonProgress(req.user, courseId);
    if (!allowed) {
      return forbiddenResponse(res, "Access denied");
    }

    const payload = req.body || {};
    const update = {
      courseId,
      lessonId,
      stepId,
      userId: req.user._id,
      stepType: step.step_type,
      visibility: step.step_type === "peer_share" ? "cohort" : "private",
    };

    let completed = false;
    let feedback = "";

    if (step.step_type === "quiz") {
      const selectedAnswer = String(payload.selectedAnswer || "");
      const isCorrect = selectedAnswer === step.correct_answer;
      update.selectedAnswer = selectedAnswer;
      update.isCorrect = isCorrect;
      update.status = isCorrect ? "completed" : "submitted";
      feedback = isCorrect
        ? step.feedback_correct || "Correct answer."
        : step.feedback_incorrect || "That answer is not correct yet. Try again.";
      completed = isCorrect;
    } else if (step.step_type === "task" || step.step_type === "peer_share") {
      if (step.submission_type === "text") {
        update.responseText = String(payload.responseText || "").trim();
        if (!update.responseText) {
          return errorResponse(res, new Error("Text response is required"), 400);
        }
      }
      if (step.submission_type === "link") {
        update.responseLink = String(payload.responseLink || "").trim();
        if (!update.responseLink) {
          return errorResponse(res, new Error("Link response is required"), 400);
        }
      }
      if (step.submission_type === "file") {
        if (!req.file) {
          return errorResponse(res, new Error("File proof is required"), 400);
        }
        const uploadResult = await uploadToCloudinary(req.file, "interactive-step-submissions");
        update.file = {
          publicId: uploadResult.publicId,
          url: uploadResult.url,
          name: req.file.originalname,
          mime: req.file.mimetype,
          size: req.file.size,
        };
      }
      update.status = "pending_review";
      completed = true;
    } else {
      update.responseText = String(payload.responseText || "").trim();
      if (!update.responseText) {
        return errorResponse(res, new Error("Reflection response is required"), 400);
      }
      update.status = "completed";
      completed = true;
    }

    const submission = await InteractiveStepSubmission.findOneAndUpdate(
      { courseId, lessonId, stepId, userId: req.user._id },
      { $set: update },
      { new: true, upsert: true, runValidators: true }
    );

    let progress = null;
    if (completed) {
      progress = await LessonProgress.findOneAndUpdate(
        { userId: req.user._id, lessonId },
        {
          $set: { courseId, lastAccessedAt: new Date() },
          $addToSet: { completedStepIds: stepId },
        },
        { new: true, upsert: true, runValidators: true }
      );
    }

    return successResponse(
      res,
      {
        submission: toFrontendSubmission(submission),
        completed,
        feedback,
        completedStepIds: progress?.completedStepIds || [],
        lessonId: lesson._id?.toString?.() || lessonId,
      },
      completed ? "Interactive step completed" : "Interactive step submitted"
    );
  } catch (error) {
    logger.error("Submit interactive step error:", error);
    return errorResponse(res, error, error.statusCode || 500);
  }
};

// GET /courses/:courseId/lessons/:lessonId/interactive-submissions/:stepId/shared
export const getSharedInteractiveStepSubmissions = async (req, res) => {
  try {
    const { courseId, lessonId, stepId } = req.params;
    const { step } = await getInteractiveLessonAndStep(courseId, lessonId, stepId);

    if (step.step_type !== "peer_share") {
      return successResponse(res, { submissions: [] }, "No shared submissions for this step");
    }

    const allowed = await canAccessLessonProgress(req.user, courseId);
    if (!allowed && !["ADMIN", "INSTRUCTOR"].includes(req.user.role)) {
      return forbiddenResponse(res, "Access denied");
    }

    const filter = { courseId, lessonId, stepId, visibility: "cohort" };

    if (!["ADMIN", "INSTRUCTOR"].includes(req.user.role)) {
      const course = await Course.findById(courseId).select("cohortIds");
      const { UserCohort } = await import("../../cohorts/models/UserCohort.js");
      const membership = await UserCohort.findOne({
        userId: req.user._id,
        cohortId: { $in: course?.cohortIds || [] },
        status: "ACTIVE",
      });
      if (!membership) {
        return forbiddenResponse(res, "You are not assigned to a cohort for this course");
      }

      const cohortMembers = await UserCohort.find({
        cohortId: membership.cohortId,
        status: "ACTIVE",
      }).select("userId");
      filter.userId = { $in: cohortMembers.map((member) => member.userId) };
    }

    const submissions = await InteractiveStepSubmission.find(filter)
      .populate("userId", "name email")
      .sort({ updatedAt: -1 })
      .limit(100);

    return successResponse(
      res,
      { submissions: submissions.map(toFrontendSubmission) },
      "Shared interactive submissions retrieved successfully"
    );
  } catch (error) {
    logger.error("Get shared interactive submissions error:", error);
    return errorResponse(res, error, error.statusCode || 500);
  }
};

// POST /courses/:courseId/lessons/:lessonId/notes - Create note
export const createNote = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const { content } = req.body;

    await getLessonForNoteRequest(courseId, lessonId);

    const note = new LessonNote({
      courseId,
      lessonId,
      content,
      userId: req.user._id,
    });
    await note.save();

    return successResponse(
      res,
      { note: toFrontendNote(note) },
      "Note created successfully",
      201
    );
  } catch (error) {
    logger.error("Create note error:", error);
    return errorResponse(res, error, error.statusCode || 500);
  }
};

// GET /courses/:courseId/lessons/:lessonId/notes - Get lesson notes
export const getLessonNotes = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;

    await getLessonForNoteRequest(courseId, lessonId);

    const notes = await LessonNote.find({
      courseId,
      lessonId,
      userId: req.user._id,
    }).sort({ updatedAt: -1 });

    return successResponse(
      res,
      { notes: notes.map(toFrontendNote) },
      "Notes retrieved successfully"
    );
  } catch (error) {
    logger.error("Get lesson notes error:", error);
    return errorResponse(res, error, error.statusCode || 500);
  }
};

// PATCH /courses/:courseId/lessons/:lessonId/notes/:id - Update note
export const updateNote = async (req, res) => {
  try {
    const { courseId, lessonId, id } = req.params;
    const { content } = req.body;

    await getLessonForNoteRequest(courseId, lessonId);

    const note = await LessonNote.findOneAndUpdate(
      {
        _id: id,
        courseId,
        lessonId,
        userId: req.user._id,
      },
      { content },
      { new: true, runValidators: true }
    );

    if (!note) {
      return notFoundResponse(res, "Note");
    }

    return successResponse(
      res,
      { note: toFrontendNote(note) },
      "Note updated successfully"
    );
  } catch (error) {
    logger.error("Update note error:", error);
    return errorResponse(res, error, error.statusCode || 500);
  }
};

// DELETE /courses/:courseId/lessons/:lessonId/notes/:id - Delete note
export const deleteNote = async (req, res) => {
  try {
    const { courseId, lessonId, id } = req.params;

    await getLessonForNoteRequest(courseId, lessonId);

    const note = await LessonNote.findOneAndDelete({
      _id: id,
      courseId,
      lessonId,
      userId: req.user._id,
    });

    if (!note) {
      return notFoundResponse(res, "Note");
    }

    return successResponse(res, null, "Note deleted successfully");
  } catch (error) {
    logger.error("Delete note error:", error);
    return errorResponse(res, error, error.statusCode || 500);
  }
};

// GET /courses/:courseId/lessons/:lessonId/discussions - Get discussions
export const getDiscussions = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;

    await assertCanAccessLessonDiscussion(req.user, courseId, lessonId);

    const discussions = await LessonDiscussion.find({
      courseId,
      lessonId,
      deletedAt: null,
    })
      .populate("authorId", "name email role avatarUrl")
      .populate("replies.authorId", "name email role avatarUrl")
      .sort({ createdAt: -1 });

    return successResponse(
      res,
      { discussions: discussions.map(toFrontendDiscussion) },
      "Discussions retrieved successfully"
    );
  } catch (error) {
    logger.error("Get discussions error:", error);
    return errorResponse(res, error, error.statusCode || 500);
  }
};

// POST /courses/:courseId/lessons/:lessonId/discussions - Create discussion
export const createDiscussion = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const { title, content } = req.body;

    await assertCanAccessLessonDiscussion(req.user, courseId, lessonId);

    const discussion = await LessonDiscussion.create({
      courseId,
      lessonId,
      title,
      content,
      authorId: req.user._id,
    });

    await discussion.populate("authorId", "name email role avatarUrl");

    return successResponse(
      res,
      { discussion: toFrontendDiscussion(discussion) },
      "Discussion created successfully",
      201
    );
  } catch (error) {
    logger.error("Create discussion error:", error);
    return errorResponse(res, error, error.statusCode || 500);
  }
};

// PATCH /courses/:courseId/lessons/:lessonId/discussions/:id - Update discussion
export const updateDiscussion = async (req, res) => {
  try {
    const { courseId, lessonId, id } = req.params;
    const updates = {};
    if (req.body.title !== undefined) updates.title = req.body.title;
    if (req.body.content !== undefined) updates.content = req.body.content;

    await assertCanAccessLessonDiscussion(req.user, courseId, lessonId);

    const discussion = await LessonDiscussion.findOne({
      _id: id,
      courseId,
      lessonId,
      deletedAt: null,
    });

    if (!discussion) {
      return notFoundResponse(res, "Discussion");
    }

    const canModerate = await canModerateCourse(req.user, courseId);
    if (!canModerate && !userOwnsDocument(req.user, discussion)) {
      return forbiddenResponse(res, "You cannot edit this discussion");
    }

    Object.assign(discussion, updates);
    await discussion.save();
    await discussion.populate("authorId", "name email role avatarUrl");
    await discussion.populate("replies.authorId", "name email role avatarUrl");

    return successResponse(
      res,
      { discussion: toFrontendDiscussion(discussion) },
      "Discussion updated successfully"
    );
  } catch (error) {
    logger.error("Update discussion error:", error);
    return errorResponse(res, error, error.statusCode || 500);
  }
};

// DELETE /courses/:courseId/lessons/:lessonId/discussions/:id - Delete discussion
export const deleteDiscussion = async (req, res) => {
  try {
    const { courseId, lessonId, id } = req.params;

    await assertCanAccessLessonDiscussion(req.user, courseId, lessonId);

    const discussion = await LessonDiscussion.findOne({
      _id: id,
      courseId,
      lessonId,
      deletedAt: null,
    });

    if (!discussion) {
      return notFoundResponse(res, "Discussion");
    }

    const canModerate = await canModerateCourse(req.user, courseId);
    if (!canModerate && !userOwnsDocument(req.user, discussion)) {
      return forbiddenResponse(res, "You cannot delete this discussion");
    }

    discussion.deletedAt = new Date();
    await discussion.save();

    return successResponse(res, null, "Discussion deleted successfully");
  } catch (error) {
    logger.error("Delete discussion error:", error);
    return errorResponse(res, error, error.statusCode || 500);
  }
};

// POST /courses/:courseId/lessons/:lessonId/discussions/:id/replies - Add reply
export const addReply = async (req, res) => {
  try {
    const { courseId, lessonId, id } = req.params;
    const { content } = req.body;

    await assertCanAccessLessonDiscussion(req.user, courseId, lessonId);

    const discussion = await LessonDiscussion.findOne({
      _id: id,
      courseId,
      lessonId,
      deletedAt: null,
    });

    if (!discussion) {
      return notFoundResponse(res, "Discussion");
    }

    discussion.replies.push({
      content,
      authorId: req.user._id,
    });
    await discussion.save();
    await discussion.populate("authorId", "name email role avatarUrl");
    await discussion.populate("replies.authorId", "name email role avatarUrl");

    const reply = discussion.replies[discussion.replies.length - 1];

    return successResponse(
      res,
      {
        reply: {
          id: reply.id || reply._id?.toString(),
          content: reply.content,
          author: toFrontendAuthor(reply.authorId),
          createdAt: reply.createdAt,
          updatedAt: reply.updatedAt,
        },
        discussion: toFrontendDiscussion(discussion),
      },
      "Reply added successfully",
      201
    );
  } catch (error) {
    logger.error("Add reply error:", error);
    return errorResponse(res, error, error.statusCode || 500);
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
      return notFoundResponse(res, "Course");
    }

    if (
      course.ownerId.toString() !== req.user._id.toString() &&
      !["SUPER_ADMIN", "ADMIN"].includes(req.user.role)
    ) {
      return forbiddenResponse(
        res,
        "Only course owner or admin can create sections"
      );
    }

    // Get the next order if not provided
    let sectionOrder = order;
    if (!sectionOrder) {
      const lastSection = await Section.findOne({ courseId }).sort({
        order: -1,
      });
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
      await Course.findByIdAndUpdate(courseId, {
        estimatedDuration: totalDuration,
      });
    }

    return successResponse(
      res,
      { section },
      "Section created successfully",
      201
    );
  } catch (error) {
    logger.error("Create section error:", error);
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
      return notFoundResponse(res, "Course");
    }

    const userId = req.user?._id?.toString();
    const isOwner = userId && course.ownerId.toString() === userId;
    const isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(req.user?.role);
    const isPrivileged = isAdmin || isOwner;

    if (
      (!course.isPublic || course.status !== "PUBLISHED") &&
      !isPrivileged
    ) {
      return forbiddenResponse(res, "Access denied");
    }

    const sections = await Section.find({ courseId })
      .sort({ order: 1 })
      .populate({
        path: "lessons",
        select:
          "title type durationSec isPublished isFree order youtubeVideoId contentUrl thumbnailUrl description",
        options: { sort: { order: 1 } },
      });

    const responseSections = isPrivileged
      ? sections
      : sections.map((section) => {
          const sectionObject = section.toObject({ virtuals: true });
          const publishedLessons = (sectionObject.lessons || []).filter(
            (lesson) => lesson.isPublished
          );
          return {
            id: sectionObject.id || sectionObject._id?.toString(),
            title: sectionObject.title,
            description: sectionObject.description,
            order: sectionObject.order,
            lessonCount: publishedLessons.length,
            estimatedDuration: Math.ceil(
              publishedLessons.reduce(
                (total, lesson) => total + (lesson.durationSec || 0),
                0
              ) / 60
            ),
          };
        });

    return successResponse(
      res,
      { sections: responseSections, data: { sections: responseSections } },
      "Sections retrieved successfully"
    );
  } catch (error) {
    logger.error("Get course sections error:", error);
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
      return notFoundResponse(res, "Course");
    }

    // Check if section exists
    const section = await Section.findById(sectionId);
    if (!section) {
      return notFoundResponse(res, "Section");
    }

    // Check permissions
    if (
      course.ownerId.toString() !== req.user._id.toString() &&
      !["SUPER_ADMIN", "ADMIN"].includes(req.user.role)
    ) {
      return forbiddenResponse(
        res,
        "Only course owner or admin can update sections"
      );
    }

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (order !== undefined) updates.order = order;
    if (isPublished !== undefined) updates.isPublished = isPublished;

    const updatedSection = await Section.findByIdAndUpdate(sectionId, updates, {
      new: true,
      runValidators: true,
    });

    return successResponse(
      res,
      { section: updatedSection },
      "Section updated successfully"
    );
  } catch (error) {
    logger.error("Update section error:", error);
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
      return notFoundResponse(res, "Course");
    }

    // Check if section exists
    const section = await Section.findById(sectionId);
    if (!section) {
      return notFoundResponse(res, "Section");
    }

    // Check permissions
    if (
      course.ownerId.toString() !== req.user._id.toString() &&
      !["SUPER_ADMIN", "ADMIN"].includes(req.user.role)
    ) {
      return forbiddenResponse(
        res,
        "Only course owner or admin can delete sections"
      );
    }

    // Check if section has lessons
    const lessonCount = await Lesson.countDocuments({ sectionId });
    if (lessonCount > 0) {
      return errorResponse(
        res,
        new Error("Cannot delete section with existing lessons"),
        400
      );
    }

    await Section.findByIdAndDelete(sectionId);

    return successResponse(res, null, "Section deleted successfully");
  } catch (error) {
    logger.error("Delete section error:", error);
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
      return notFoundResponse(res, "Course");
    }

    // Check if section exists
    const section = await Section.findById(sectionId);
    if (!section) {
      return notFoundResponse(res, "Section");
    }

    // Check if section belongs to the course
    if (section.courseId.toString() !== courseId) {
      return notFoundResponse(res, "Section not found in this course");
    }

    const userId = req.user?._id?.toString();
    const isOwner = userId && course.ownerId.toString() === userId;
    const isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(req.user?.role);
    const isPrivileged = isAdmin || isOwner;

    if (
      (!course.isPublic || course.status !== "PUBLISHED") &&
      !isPrivileged
    ) {
      return forbiddenResponse(res, "Access denied");
    }

    const query = { sectionId };
    if (!isPrivileged) {
      query.isPublished = true;
    }

    const lessons = await Lesson.find(query)
      .populate("sectionId", "title order")
      .sort({ order: 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const responseLessons = lessons.map((lesson) => {
      const lessonObject = lesson.toObject({ virtuals: true });
      if (isPrivileged) return lessonObject;
      return {
        id: lessonObject.id || lessonObject._id?.toString(),
        title: lessonObject.title,
        type: lessonObject.type,
        youtubeVideoId:
          lessonObject.type === "VIDEO" ? lessonObject.youtubeVideoId : undefined,
        durationSec: lessonObject.durationSec,
        isFree: lessonObject.isFree,
        order: lessonObject.order,
      };
    });

    return successResponse(
      res,
      responseLessons,
      "Lessons retrieved successfully"
    );
  } catch (error) {
    logger.error("Get section lessons error:", error);
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
      interactiveConfig,
      youtubeVideoId,
      externalUrl,
      order,
      durationSec,
      isPublished,
      isFree,
      notes,
    } = req.body;

    const { id: courseId, sectionId } = req.params;

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return notFoundResponse(res, "Course");
    }

    // Check if section exists
    const section = await Section.findById(sectionId);
    if (!section) {
      return notFoundResponse(res, "Section");
    }

    // Check permissions
    if (
      course.ownerId.toString() !== req.user._id.toString() &&
      !["SUPER_ADMIN", "ADMIN"].includes(req.user.role)
    ) {
      return forbiddenResponse(
        res,
        "Only course owner or admin can create lessons"
      );
    }

    // Validate YouTube video ID if provided
    if (youtubeVideoId) {
      const { isValidYouTubeVideoId } = await import(
        "../../../utils/youtube.js"
      );
      if (!isValidYouTubeVideoId(youtubeVideoId)) {
        return errorResponse(res, new Error("Invalid YouTube video ID"), 400);
      }
    }

    // Get the next order if not provided
    let lessonOrder = order;
    if (!lessonOrder) {
      const lastLesson = await Lesson.findOne({ sectionId }).sort({
        order: -1,
      });
      lessonOrder = lastLesson ? lastLesson.order + 1 : 1;
    }

    let normalizedInteractiveConfig = interactiveConfig;
    if (type === "INTERACTIVE") {
      try {
        normalizedInteractiveConfig = validateInteractiveConfig(interactiveConfig);
      } catch (validationError) {
        return errorResponse(res, validationError, validationError.statusCode || 400);
      }
    }

    const lesson = new Lesson({
      sectionId,
      courseId,
      title,
      type,
      content,
      interactiveConfig: normalizedInteractiveConfig,
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
      await Course.findByIdAndUpdate(courseId, {
        estimatedDuration: totalDuration,
      });
    }

    return successResponse(res, { lesson }, "Lesson created successfully", 201);
  } catch (error) {
    logger.error("Create lesson error:", error);
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
    logger.error("Calculate course duration error:", error);
    return 0;
  }
};
