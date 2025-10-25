import mongoose from "mongoose";

const userProgramSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    programId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Program",
      required: [true, "Program ID is required"],
    },
    enrolledAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "COMPLETED", "WITHDRAWN", "SUSPENDED"],
      default: "ACTIVE",
    },
    completedAt: {
      type: Date,
    },
    withdrawnAt: {
      type: Date,
    },
    completionPercentage: {
      type: Number,
      default: 0,
      min: [0, "Completion percentage cannot be negative"],
      max: [100, "Completion percentage cannot exceed 100"],
    },
    certificates: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Certificate",
      },
    ],
    achievements: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Achievement",
      },
    ],
    notes: {
      type: String,
      maxlength: [500, "Notes cannot exceed 500 characters"],
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index to ensure unique user-program combinations
userProgramSchema.index({ userId: 1, programId: 1 }, { unique: true });

// Indexes for efficient querying
userProgramSchema.index({ userId: 1 });
userProgramSchema.index({ programId: 1 });
userProgramSchema.index({ status: 1 });
userProgramSchema.index({ enrolledAt: 1 });

// Virtual for program details
userProgramSchema.virtual("program", {
  ref: "Program",
  localField: "programId",
  foreignField: "_id",
  justOne: true,
});

// Virtual for user details
userProgramSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

// Instance methods
userProgramSchema.methods.complete = function () {
  this.status = "COMPLETED";
  this.completedAt = new Date();
  this.completionPercentage = 100;
  return this.save();
};

userProgramSchema.methods.withdraw = function () {
  this.status = "WITHDRAWN";
  this.withdrawnAt = new Date();
  return this.save();
};

userProgramSchema.methods.suspend = function () {
  this.status = "SUSPENDED";
  return this.save();
};

userProgramSchema.methods.reactivate = function () {
  this.status = "ACTIVE";
  return this.save();
};

// Static methods
userProgramSchema.statics.findByUser = function (userId) {
  return this.find({ userId }).populate("programId");
};

userProgramSchema.statics.findByProgram = function (programId) {
  return this.find({ programId }).populate("userId");
};

userProgramSchema.statics.findActive = function () {
  return this.find({ status: "ACTIVE" });
};

userProgramSchema.statics.findCompleted = function () {
  return this.find({ status: "COMPLETED" });
};

userProgramSchema.statics.findByUserAndProgram = function (userId, programId) {
  return this.findOne({ userId, programId });
};

// Pre-save middleware
userProgramSchema.pre("save", function (next) {
  // Set completion date when status changes to completed
  if (
    this.isModified("status") &&
    this.status === "COMPLETED" &&
    !this.completedAt
  ) {
    this.completedAt = new Date();
  }

  // Set withdrawal date when status changes to withdrawn
  if (
    this.isModified("status") &&
    this.status === "WITHDRAWN" &&
    !this.withdrawnAt
  ) {
    this.withdrawnAt = new Date();
  }

  next();
});

// Export the model
const UserProgram = mongoose.model("UserProgram", userProgramSchema);

export default UserProgram;
