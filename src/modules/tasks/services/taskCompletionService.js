import { Task } from "../models/Task.js";
import { TaskSubmission } from "../models/TaskSubmission.js";

/**
 * Ensures every required task for the lesson has at least a SUBMITTED submission.
 */
export async function assertRequiredTasksSubmitted(userId, lessonId) {
  const requiredTasks = await Task.find({ lessonId, required: true }).select("_id");
  if (requiredTasks.length === 0) return;

  const taskIds = requiredTasks.map((t) => t._id);
  const submitted = await TaskSubmission.countDocuments({
    userId,
    taskId: { $in: taskIds },
    status: { $in: ["SUBMITTED", "REVIEWED"] },
  });

  if (submitted < taskIds.length) {
    const err = new Error(
      "Complete all required tasks before marking this lesson complete"
    );
    err.code = "REQUIRED_TASKS_INCOMPLETE";
    err.details = { requiredCount: taskIds.length, submittedCount: submitted };
    throw err;
  }
}
