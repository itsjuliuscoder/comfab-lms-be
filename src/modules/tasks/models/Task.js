import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
      required: [true, "lessonId is required"],
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "courseId is required"],
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    type: {
      type: String,
      enum: ["TEXT", "FILE", "LINK"],
      required: true,
    },
    instructions: {
      type: String,
      trim: true,
      maxlength: [5000, "Instructions cannot exceed 5000 characters"],
      default: "",
    },
    required: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      required: true,
      min: [1, "Order must be at least 1"],
      default: 1,
    },
    minTextLength: {
      type: Number,
      min: 0,
      default: null,
    },
    allowedMimeTypes: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

taskSchema.index({ lessonId: 1, order: 1 });
taskSchema.index({ courseId: 1, lessonId: 1 });

export const Task = mongoose.model("Task", taskSchema);
