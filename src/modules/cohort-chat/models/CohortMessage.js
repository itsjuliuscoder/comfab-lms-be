import mongoose from "mongoose";

const cohortMessageSchema = new mongoose.Schema(
  {
    cohortId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cohort",
      required: true,
      index: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: [true, "Message content is required"],
      trim: true,
      maxlength: [2000, "Message cannot exceed 2000 characters"],
    },
    messageType: {
      type: String,
      enum: ["TEXT"],
      default: "TEXT",
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

cohortMessageSchema.index({ cohortId: 1, createdAt: -1 });
cohortMessageSchema.index({ cohortId: 1, deletedAt: 1, createdAt: -1 });

cohortMessageSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  return this.save();
};

cohortMessageSchema.methods.toChatPayload = function () {
  const author = this.authorId;
  const authorObj =
    author && typeof author === "object" && author._id
      ? {
          id: author._id.toString(),
          name: author.name,
          email: author.email,
          role: author.role,
          avatarUrl: author.avatarUrl || null,
        }
      : { id: this.authorId?.toString() };

  return {
    id: this._id.toString(),
    cohortId: this.cohortId.toString(),
    content: this.deletedAt ? "[Message deleted]" : this.content,
    messageType: this.messageType,
    author: authorObj,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    deletedAt: this.deletedAt,
  };
};

export const CohortMessage = mongoose.model("CohortMessage", cohortMessageSchema);
