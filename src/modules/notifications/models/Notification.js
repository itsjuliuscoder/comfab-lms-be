import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "ANNOUNCEMENT",
        "ENROLLMENT",
        "COURSE_COMPLETION",
        "TASK_SUBMISSION",
        "TASK_REVIEWED",
        "ASSESSMENT_RESULT",
        "COHORT_MENTION",
        "ADMIN_MESSAGE",
        "SYSTEM",
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: [1000, "Message cannot exceed 1000 characters"],
    },
    link: {
      type: String,
      trim: true,
      default: "",
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    readAt: {
      type: Date,
      default: null,
    },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      default: "MEDIUM",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, readAt: 1 });

notificationSchema.virtual("isRead").get(function isRead() {
  return Boolean(this.readAt);
});

export const Notification = mongoose.model("Notification", notificationSchema);
