import mongoose from "mongoose";
import { Task } from "../models/Task.js";
import { TaskSubmission } from "../models/TaskSubmission.js";
import { Course } from "../../courses/models/Course.js";
import { createNotification } from "../../notifications/services/notificationService.js";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  forbiddenResponse,
  validationErrorResponse,
} from "../../../utils/response.js";
import { logger } from "../../../utils/logger.js";
import { canAccessLessonProgress } from "../../courses/services/lessonProgressService.js";

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function validateSubmissionPayload(task, body) {
  const { textContent = "", linkUrl = "", file } = body;

  if (task.type === "TEXT") {
    const len = textContent.trim().length;
    if (task.minTextLength != null && len < task.minTextLength) {
      return `Text must be at least ${task.minTextLength} characters`;
    }
    if (len === 0) {
      return "Text content is required for this task";
    }
  }

  if (task.type === "LINK") {
    if (!isNonEmptyString(linkUrl)) {
      return "Link URL is required for this task";
    }
    try {
      new URL(linkUrl.trim());
    } catch {
      return "Invalid link URL";
    }
  }

  if (task.type === "FILE") {
    if (!file || !isNonEmptyString(file.url)) {
      return "File upload (url) is required for this task";
    }
    if (
      task.allowedMimeTypes?.length > 0 &&
      file.mime &&
      !task.allowedMimeTypes.includes(file.mime)
    ) {
      return `File type not allowed. Allowed: ${task.allowedMimeTypes.join(", ")}`;
    }
  }

  return null;
}

export const createSubmission = async (req, res) => {
  try {
    const { taskId, textContent = "", linkUrl = "", file } = req.body;

    if (!mongoose.isValidObjectId(taskId)) {
      return res.status(400).json({
        ok: false,
        error: { code: "INVALID_ID", message: "Invalid taskId" },
      });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return notFoundResponse(res, "Task");
    }

    const course = await Course.findById(task.courseId).select("ownerId title");

    const allowed = await canAccessLessonProgress(req.user, task.courseId);
    if (!allowed) {
      return forbiddenResponse(res, "You cannot submit for this task");
    }

    const validationError = validateSubmissionPayload(task, {
      textContent,
      linkUrl,
      file,
    });
    if (validationError) {
      return validationErrorResponse(res, [
        { field: "submission", message: validationError },
      ]);
    }

    const existing = await TaskSubmission.findOne({
      userId: req.user._id,
      taskId: task._id,
    });

    if (existing && existing.status === "REVIEWED") {
      return forbiddenResponse(
        res,
        "This submission was reviewed and cannot be changed"
      );
    }

    const payload = {
      userId: req.user._id,
      taskId: task._id,
      lessonId: task.lessonId,
      courseId: task.courseId,
      status: "SUBMITTED",
      textContent: textContent.trim(),
      linkUrl: linkUrl.trim(),
      file: file
        ? {
            publicId: file.publicId || "",
            url: file.url || "",
            mime: file.mime || "",
            name: file.name || "",
            size: file.size ?? 0,
          }
        : {},
    };

    let submission;
    let created = false;
    if (existing) {
      submission = existing;
      submission.textContent = payload.textContent;
      submission.linkUrl = payload.linkUrl;
      submission.file = payload.file;
      submission.status = "SUBMITTED";
      await submission.save();
    } else {
      submission = await TaskSubmission.create(payload);
      created = true;
    }

    if (course?.ownerId) {
      try {
        await createNotification({
          userId: course.ownerId,
          type: "TASK_SUBMISSION",
          title: "New task submission",
          message: `${req.user.name} submitted "${task.title}".`,
          link: `/dashboard/courses/${task.courseId}/learn?lesson=${task.lessonId}`,
          data: {
            taskId: task._id.toString(),
            submissionId: submission._id.toString(),
            courseId: task.courseId.toString(),
            lessonId: task.lessonId.toString(),
            participantId: req.user._id.toString(),
          },
          priority: "MEDIUM",
        });
      } catch (notificationError) {
        logger.error("Failed to send task submission notification:", notificationError);
      }
    }

    return successResponse(
      res,
      { submission },
      "Submission saved successfully",
      created ? 201 : 200
    );
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        ok: false,
        error: {
          code: "DUPLICATE_SUBMISSION",
          message: "A submission already exists for this task",
        },
      });
    }
    logger.error("createSubmission error:", error);
    return errorResponse(res, error);
  }
};

export const getSubmissionsByTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    if (!mongoose.isValidObjectId(taskId)) {
      return res.status(400).json({
        ok: false,
        error: { code: "INVALID_ID", message: "Invalid taskId" },
      });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return notFoundResponse(res, "Task");
    }

    const course = await Course.findById(task.courseId).select("ownerId");
    if (!course) {
      return notFoundResponse(res, "Course");
    }

    const isStaff =
      ["SUPER_ADMIN", "ADMIN"].includes(req.user.role) ||
      (req.user.role === "INSTRUCTOR" &&
        course.ownerId.toString() === req.user._id.toString());

    if (isStaff) {
      const submissions = await TaskSubmission.find({ taskId })
        .populate("userId", "name email")
        .sort({ createdAt: -1 });
      return successResponse(
        res,
        { submissions },
        "Submissions retrieved successfully"
      );
    }

    const allowed = await canAccessLessonProgress(req.user, task.courseId);
    if (!allowed) {
      return forbiddenResponse(res, "You cannot view submissions for this task");
    }

    const submission = await TaskSubmission.findOne({
      taskId,
      userId: req.user._id,
    });

    return successResponse(
      res,
      { submission },
      "Submission retrieved successfully"
    );
  } catch (error) {
    logger.error("getSubmissionsByTask error:", error);
    return errorResponse(res, error);
  }
};

export const reviewSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const { feedback = "", status = "REVIEWED" } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        ok: false,
        error: { code: "INVALID_ID", message: "Invalid submission id" },
      });
    }

    if (status !== "REVIEWED") {
      return validationErrorResponse(res, [
        { field: "status", message: "Only REVIEWED is supported for review" },
      ]);
    }

    const submission = await TaskSubmission.findById(id);
    if (!submission) {
      return notFoundResponse(res, "Submission");
    }

    const task = await Task.findById(submission.taskId);
    const course = await Course.findById(submission.courseId).select("ownerId");
    if (!task) {
      return notFoundResponse(res, "Task");
    }
    if (!course) {
      return notFoundResponse(res, "Course");
    }

    if (
      !["SUPER_ADMIN", "ADMIN"].includes(req.user.role) &&
      (req.user.role !== "INSTRUCTOR" ||
        course.ownerId.toString() !== req.user._id.toString())
    ) {
      return forbiddenResponse(res, "Only instructors or admins can review");
    }

    submission.status = "REVIEWED";
    submission.feedback = feedback.trim();
    submission.reviewedBy = req.user._id;
    submission.reviewedAt = new Date();
    await submission.save();

    try {
      await createNotification({
        userId: submission.userId,
        type: "TASK_REVIEWED",
        title: "Task reviewed",
        message: `Your submission for "${task.title}" has been reviewed.`,
        link: `/dashboard/courses/${submission.courseId}/learn?lesson=${task.lessonId}`,
        data: {
          taskId: task._id.toString(),
          submissionId: submission._id.toString(),
          courseId: submission.courseId.toString(),
          lessonId: task.lessonId.toString(),
        },
        priority: "MEDIUM",
      });
    } catch (notificationError) {
      logger.error("Failed to send task reviewed notification:", notificationError);
    }

    return successResponse(
      res,
      { submission },
      "Submission reviewed successfully"
    );
  } catch (error) {
    logger.error("reviewSubmission error:", error);
    return errorResponse(res, error);
  }
};
