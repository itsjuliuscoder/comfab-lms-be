import mongoose from "mongoose";

const interactiveStepSubmissionSchema = new mongoose.Schema(
  {
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    lessonId: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson", required: true },
    stepId: { type: String, required: true, trim: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    stepType: {
      type: String,
      enum: ["reflect", "quiz", "task", "peer_share"],
      required: true,
    },
    responseText: { type: String, trim: true, maxlength: 5000, default: "" },
    responseLink: { type: String, trim: true, default: "" },
    file: {
      publicId: String,
      url: String,
      name: String,
      mime: String,
      size: Number,
    },
    selectedAnswer: { type: String, trim: true, default: "" },
    isCorrect: { type: Boolean, default: null },
    status: {
      type: String,
      enum: ["submitted", "pending_review", "completed"],
      default: "submitted",
    },
    visibility: {
      type: String,
      enum: ["private", "cohort"],
      default: "private",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

interactiveStepSubmissionSchema.index(
  { courseId: 1, lessonId: 1, stepId: 1, userId: 1 },
  { unique: true }
);
interactiveStepSubmissionSchema.index({ courseId: 1, lessonId: 1, stepId: 1, visibility: 1 });
interactiveStepSubmissionSchema.index({ userId: 1, lessonId: 1 });

export const InteractiveStepSubmission = mongoose.model(
  "InteractiveStepSubmission",
  interactiveStepSubmissionSchema
);
