import mongoose from "mongoose";
import { Task } from "../models/Task.js";
import { Lesson } from "../../courses/models/Lesson.js";
import { Course } from "../../courses/models/Course.js";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  forbiddenResponse,
} from "../../../utils/response.js";
import { logger } from "../../../utils/logger.js";
import {
  canAccessLessonProgress,
  assertObjectIds,
} from "../../courses/services/lessonProgressService.js";

export const createTask = async (req, res) => {
  try {
    const {
      lessonId,
      title,
      type,
      instructions = "",
      required = false,
      order: orderInput,
      minTextLength,
      allowedMimeTypes = [],
    } = req.body;

    if (!mongoose.isValidObjectId(lessonId)) {
      return res.status(400).json({
        ok: false,
        error: { code: "INVALID_ID", message: "Invalid lessonId" },
      });
    }

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return notFoundResponse(res, "Lesson");
    }

    const course = await Course.findById(lesson.courseId).select("ownerId");
    if (!course) {
      return notFoundResponse(res, "Course");
    }

    if (
      req.user.role !== "ADMIN" &&
      course.ownerId.toString() !== req.user._id.toString()
    ) {
      return forbiddenResponse(
        res,
        "Only course owners or admins can create tasks"
      );
    }

    let order = orderInput;
    if (order == null) {
      const last = await Task.findOne({ lessonId }).sort({ order: -1 });
      order = last ? last.order + 1 : 1;
    }

    const task = await Task.create({
      lessonId,
      courseId: lesson.courseId,
      title,
      type,
      instructions,
      required,
      order,
      minTextLength: minTextLength ?? null,
      allowedMimeTypes,
    });

    return successResponse(res, { task }, "Task created successfully", 201);
  } catch (error) {
    logger.error("createTask error:", error);
    return errorResponse(res, error);
  }
};

export const listTasksForLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;

    assertObjectIds(lessonId);

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return notFoundResponse(res, "Lesson");
    }

    const allowed = await canAccessLessonProgress(req.user, lesson.courseId);
    if (!allowed) {
      return forbiddenResponse(res, "You cannot access tasks for this lesson");
    }

    const tasks = await Task.find({ lessonId }).sort({ order: 1 });

    return successResponse(res, { tasks }, "Tasks retrieved successfully");
  } catch (error) {
    if (error.code === "INVALID_ID") {
      return res.status(400).json({
        ok: false,
        error: { code: "INVALID_ID", message: "Invalid lesson id" },
      });
    }
    logger.error("listTasksForLesson error:", error);
    return errorResponse(res, error);
  }
};
