import mongoose from "mongoose";

const taskSubmissionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    status: {
      type: String,
      enum: ["SUBMITTED", "REVIEWED"],
      default: "SUBMITTED",
    },
    textContent: {
      type: String,
      maxlength: [20000, "Text cannot exceed 20000 characters"],
      default: "",
    },
    linkUrl: {
      type: String,
      trim: true,
      maxlength: [2000, "Link cannot exceed 2000 characters"],
      default: "",
    },
    file: {
      publicId: { type: String },
      url: { type: String },
      mime: { type: String },
      name: { type: String },
      size: { type: Number },
    },
    feedback: {
      type: String,
      maxlength: [5000, "Feedback cannot exceed 5000 characters"],
      default: "",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

taskSubmissionSchema.index({ userId: 1, taskId: 1 }, { unique: true });
taskSubmissionSchema.index({ taskId: 1, status: 1 });
taskSubmissionSchema.index({ courseId: 1, userId: 1 });

export const TaskSubmission = mongoose.model("TaskSubmission", taskSubmissionSchema);
