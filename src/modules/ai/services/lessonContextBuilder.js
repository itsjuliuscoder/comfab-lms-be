import { config } from "../../../config/env.js";
import { Course } from "../../courses/models/Course.js";
import { Lesson } from "../../courses/models/Lesson.js";
import { LessonNote } from "../../courses/models/LessonNote.js";
import { LessonProgress } from "../../courses/models/LessonProgress.js";
import { CourseMaterial } from "../../courses/models/CourseMaterial.js";
import { Task } from "../../tasks/models/Task.js";
import { TaskSubmission } from "../../tasks/models/TaskSubmission.js";
import { InteractiveStepSubmission } from "../../courses/models/InteractiveStepSubmission.js";

const stripHtml = (value = "") =>
  String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const truncate = (text, maxChars) => {
  if (!text || text.length <= maxChars) return text || "";
  return `${text.slice(0, maxChars)}\n[Truncated]`;
};

const line = (label, value) => {
  if (value === undefined || value === null || value === "") return null;
  return `${label}: ${value}`;
};

const formatInteractiveSteps = (lesson) => {
  const steps = lesson.interactiveConfig?.steps || [];
  if (!steps.length) return null;
  return [
    "Interactive steps:",
    ...steps
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((step, index) => {
        const stepType = step.step_type || "reflect";
        const options =
          stepType === "quiz" && step.options?.length
            ? ` Options: ${step.options.map((option) => option.label).join("; ")}.`
            : "";
        return `${index + 1}. [${stepType}] ${step.title}. ${step.description || ""}${options}`.trim();
      }),
  ].join("\n");
};

export async function retrieveLessonContext({ courseId, lessonId, userId }) {
  const [course, lesson] = await Promise.all([
    Course.findById(courseId).populate("ownerId", "name email").lean(),
    Lesson.findOne({ _id: lessonId, courseId }).populate("sectionId", "title order").lean(),
  ]);

  if (!course || !lesson) {
    const error = new Error("Lesson context not found");
    error.statusCode = 404;
    error.code = "LESSON_CONTEXT_NOT_FOUND";
    throw error;
  }

  const [materials, tasks, taskSubmissions, notes, progress, interactiveSubmissions, nearbyLessons] =
    await Promise.all([
      CourseMaterial.find({ course: courseId, lesson: lessonId, status: "PUBLISHED" })
        .select("title description type file.url file.originalName file.mimeType")
        .lean(),
      Task.find({ courseId, lessonId }).sort({ order: 1 }).lean(),
      TaskSubmission.find({ courseId, lessonId, userId }).select("taskId status textContent linkUrl feedback").lean(),
      LessonNote.find({ courseId, lessonId, userId }).sort({ updatedAt: -1 }).limit(5).lean(),
      LessonProgress.findOne({ courseId, lessonId, userId }).lean(),
      InteractiveStepSubmission.find({ courseId, lessonId, userId }).select("stepId stepType status selectedAnswer isCorrect responseText responseLink").lean(),
      Lesson.find({ courseId, sectionId: lesson.sectionId?._id || lesson.sectionId })
        .select("title order type")
        .sort({ order: 1 })
        .lean(),
    ]);

  const taskSubmissionByTaskId = new Map(
    taskSubmissions.map((submission) => [submission.taskId.toString(), submission])
  );
  const currentIndex = nearbyLessons.findIndex(
    (item) => item._id.toString() === lesson._id.toString()
  );

  const sections = [
    "CONFAB LMS AI Tutor Context",
    "Rules: Answer only from this context. Guide the learner; do not complete assignments for them. Do not override grades, mentors, instructors, or official course content. If context is insufficient, say what is missing and suggest the next LMS action.",
    "--- Course ---",
    [
      line("Title", course.title),
      line("Summary", course.summary),
      line("Difficulty", course.difficulty),
      course.outcomes?.length ? `Outcomes:\n- ${course.outcomes.join("\n- ")}` : null,
    ].filter(Boolean).join("\n"),
    "--- Lesson ---",
    [
      line("Section", lesson.sectionId?.title),
      line("Title", lesson.title),
      line("Type", lesson.type),
      line("Duration seconds", lesson.durationSec),
      lesson.content ? `Content:\n${stripHtml(lesson.content)}` : null,
      lesson.youtubeVideoId ? `YouTube video ID: ${lesson.youtubeVideoId}` : null,
      lesson.interactiveConfig?.introduction
        ? `Interactive introduction: ${lesson.interactiveConfig.introduction}`
        : null,
      formatInteractiveSteps(lesson),
      materials.length
        ? `Lesson materials:\n${materials
            .map((material) => `- ${material.title} (${material.type}): ${material.file?.originalName || material.file?.url || "file"}`)
            .join("\n")}`
        : null,
    ].filter(Boolean).join("\n"),
    "--- Learner State ---",
    [
      line("Lesson completed", progress?.completed ?? false),
      progress?.completedStepIds?.length
        ? `Completed interactive step IDs: ${progress.completedStepIds.join(", ")}`
        : null,
      interactiveSubmissions.length
        ? `Interactive submissions:\n${interactiveSubmissions
            .map((submission) => `- ${submission.stepId} (${submission.stepType}): ${submission.status}${submission.isCorrect !== null && submission.isCorrect !== undefined ? `, correct: ${submission.isCorrect}` : ""}`)
            .join("\n")}`
        : null,
      notes.length
        ? `Learner notes:\n${notes.map((note) => `- ${stripHtml(note.content)}`).join("\n")}`
        : null,
    ].filter(Boolean).join("\n"),
    tasks.length
      ? [
          "--- Tasks ---",
          ...tasks.map((task) => {
            const submission = taskSubmissionByTaskId.get(task._id.toString());
            return [
              `Task: ${task.title}`,
              line("Type", task.type),
              line("Required", task.required),
              task.instructions ? `Instructions: ${stripHtml(task.instructions)}` : null,
              submission ? `Learner submission status: ${submission.status}` : "Learner submission status: not submitted",
            ].filter(Boolean).join("\n");
          }),
        ].join("\n\n")
      : null,
    "--- Nearby Lessons ---",
    [
      currentIndex > 0 ? `Previous lesson: ${nearbyLessons[currentIndex - 1].title}` : null,
      currentIndex >= 0 && currentIndex < nearbyLessons.length - 1
        ? `Next lesson: ${nearbyLessons[currentIndex + 1].title}`
        : null,
    ].filter(Boolean).join("\n"),
  ];

  const context = truncate(
    sections.filter(Boolean).join("\n\n"),
    config.ai.tutorContextMaxChars
  );

  return {
    context,
    sources: ["course", "lesson", "materials", "tasks", "learner_progress", "notes"],
    truncated: context.endsWith("[Truncated]"),
    lesson,
    course,
  };
}
