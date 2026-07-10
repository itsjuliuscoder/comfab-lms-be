import mongoose from "mongoose";

const programMessageSchema = new mongoose.Schema(
  {
    programId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Program",
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

programMessageSchema.index({ programId: 1, createdAt: -1 });
programMessageSchema.index({ programId: 1, deletedAt: 1, createdAt: -1 });

programMessageSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  return this.save();
};

programMessageSchema.methods.toChatPayload = function () {
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
    programId: this.programId.toString(),
    content: this.deletedAt ? "[Message deleted]" : this.content,
    messageType: this.messageType,
    author: authorObj,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    deletedAt: this.deletedAt,
  };
};

export const ProgramMessage = mongoose.model(
  "ProgramMessage",
  programMessageSchema
);
