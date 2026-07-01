import mongoose from "mongoose";
import { Lesson } from "../models/Lesson.js";
import { Course } from "../models/Course.js";
import { Enrollment } from "../../enrollments/models/Enrollment.js";
import { LessonProgress } from "../models/LessonProgress.js";
import { notifyEnrollmentCompletedIfNeeded } from "../../enrollments/services/enrollmentNotificationService.js";

export function assertObjectIds(...ids) {
  for (const id of ids) {
    if (!id || !mongoose.isValidObjectId(id)) {
      const err = new Error("Invalid id");
      err.code = "INVALID_ID";
      throw err;
    }
  }
}

export async function getLessonInCourse(lessonId, courseId) {
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) {
    const err = new Error("Lesson not found");
    err.code = "NOT_FOUND";
    throw err;
  }
  if (lesson.courseId.toString() !== courseId.toString()) {
    const err = new Error("Lesson does not belong to this course");
    err.code = "LESSON_COURSE_MISMATCH";
    throw err;
  }
  return lesson;
}

/**
 * Participant: active enrollment. Admin: always. Instructor: course owner.
 */
export async function canAccessLessonProgress(user, courseId) {
  if (!user) return false;
  if (user.role === "ADMIN") return true;

  const course = await Course.findById(courseId).select("ownerId");
  if (!course) return false;

  if (
    user.role === "INSTRUCTOR" &&
    course.ownerId.toString() === user._id.toString()
  ) {
    return true;
  }

  const enrollment = await Enrollment.findOne({
    userId: user._id,
    courseId,
    status: { $in: ["ACTIVE", "COMPLETED"] },
  });
  return !!enrollment;
}

export async function syncEnrollmentProgressFromLessons(userId, courseId) {
  const enrollment = await Enrollment.findOne({
    userId,
    courseId,
    status: { $in: ["ACTIVE", "COMPLETED"] },
  });
  if (!enrollment) return;

  const total = await Lesson.countDocuments({ courseId, isPublished: true });
  if (total === 0) return;

  const completed = await LessonProgress.countDocuments({
    userId,
    courseId,
    completed: true,
  });
  const pct = Math.min(100, Math.round((completed / total) * 100));
  const previousStatus = enrollment.status;
  enrollment.progressPct = pct;
  enrollment.lastAccessedAt = new Date();
  await enrollment.save();
  await notifyEnrollmentCompletedIfNeeded(previousStatus, enrollment);
}
