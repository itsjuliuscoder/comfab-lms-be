import mongoose from "mongoose";

const lessonDiscussionReplySchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: [true, "Reply content is required"],
      trim: true,
      maxlength: [2000, "Reply cannot exceed 2000 characters"],
    },
  },
  {
    timestamps: true,
  }
);

const lessonDiscussionSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
      required: true,
      index: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    content: {
      type: String,
      required: [true, "Content is required"],
      trim: true,
      minlength: [10, "Content must be at least 10 characters"],
      maxlength: [5000, "Content cannot exceed 5000 characters"],
    },
    replies: [lessonDiscussionReplySchema],
    deletedAt: {
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

lessonDiscussionSchema.index({ courseId: 1, lessonId: 1, createdAt: -1 });
lessonDiscussionSchema.index({ courseId: 1, lessonId: 1, deletedAt: 1 });

export const LessonDiscussion = mongoose.model(
  "LessonDiscussion",
  lessonDiscussionSchema
);
