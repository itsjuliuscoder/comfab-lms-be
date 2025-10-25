import mongoose from "mongoose";
import { logger } from "../../../utils/logger.js";

const programSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Program name is required"],
      trim: true,
      minlength: [2, "Program name must be at least 2 characters"],
      maxlength: [100, "Program name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Program description is required"],
      trim: true,
      minlength: [10, "Program description must be at least 10 characters"],
      maxlength: [1000, "Program description cannot exceed 1000 characters"],
    },
    code: {
      type: String,
      required: [true, "Program code is required"],
      unique: true,
      trim: true,
      uppercase: true,
      minlength: [2, "Program code must be at least 2 characters"],
      maxlength: [20, "Program code cannot exceed 20 characters"],
      match: [
        /^[A-Z0-9_-]+$/,
        "Program code can only contain uppercase letters, numbers, hyphens, and underscores",
      ],
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "ARCHIVED"],
      default: "ACTIVE",
    },
    startDate: {
      type: Date,
      required: [true, "Program start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "Program end date is required"],
      validate: {
        validator: function (value) {
          return value > this.startDate;
        },
        message: "Program end date must be after start date",
      },
    },
    duration: {
      type: Number,
      required: [true, "Program duration is required"],
      min: [1, "Program duration must be at least 1 week"],
      max: [104, "Program duration cannot exceed 104 weeks (2 years)"],
    },
    maxParticipants: {
      type: Number,
      required: [true, "Maximum participants is required"],
      min: [1, "Maximum participants must be at least 1"],
      max: [10000, "Maximum participants cannot exceed 10,000"],
    },
    currentParticipants: {
      type: Number,
      default: 0,
      min: [0, "Current participants cannot be negative"],
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Program owner is required"],
    },
    coordinatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Program coordinator is required"],
    },
    tags: [
      {
        type: String,
        trim: true,
        maxlength: [50, "Tag cannot exceed 50 characters"],
      },
    ],
    objectives: [
      {
        type: String,
        trim: true,
        maxlength: [200, "Objective cannot exceed 200 characters"],
      },
    ],
    requirements: [
      {
        type: String,
        trim: true,
        maxlength: [200, "Requirement cannot exceed 200 characters"],
      },
    ],
    isPublic: {
      type: Boolean,
      default: true,
    },
    enrollmentOpen: {
      type: Boolean,
      default: true,
    },
    enrollmentStartDate: {
      type: Date,
      default: function () {
        return new Date();
      },
    },
    enrollmentEndDate: {
      type: Date,
      required: [true, "Enrollment end date is required"],
    },
    cost: {
      amount: {
        type: Number,
        default: 0,
        min: [0, "Cost cannot be negative"],
      },
      currency: {
        type: String,
        default: "USD",
        enum: ["USD", "EUR", "GBP", "NGN", "CAD", "AUD"],
      },
      isFree: {
        type: Boolean,
        default: true,
      },
    },
    location: {
      type: {
        type: String,
        enum: ["ONLINE", "ONSITE", "HYBRID"],
        default: "ONLINE",
      },
      address: {
        type: String,
        trim: true,
        maxlength: [200, "Address cannot exceed 200 characters"],
      },
      city: {
        type: String,
        trim: true,
        maxlength: [50, "City cannot exceed 50 characters"],
      },
      country: {
        type: String,
        trim: true,
        maxlength: [50, "Country cannot exceed 50 characters"],
      },
    },
    settings: {
      allowSelfEnrollment: {
        type: Boolean,
        default: true,
      },
      requireApproval: {
        type: Boolean,
        default: false,
      },
      maxCoursesPerUser: {
        type: Number,
        default: null,
        min: [1, "Max courses per user must be at least 1"],
      },
      allowCohortCreation: {
        type: Boolean,
        default: true,
      },
      maxCohorts: {
        type: Number,
        default: null,
        min: [1, "Max cohorts must be at least 1"],
      },
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

// Indexes
programSchema.index({ name: 1 });
programSchema.index({ code: 1 });
programSchema.index({ status: 1 });
programSchema.index({ ownerId: 1 });
programSchema.index({ coordinatorId: 1 });
programSchema.index({ startDate: 1, endDate: 1 });
programSchema.index({ isPublic: 1, status: 1 });

// Virtual for courses
programSchema.virtual("courses", {
  ref: "Course",
  localField: "_id",
  foreignField: "programId",
});

// Virtual for cohorts
programSchema.virtual("cohorts", {
  ref: "Cohort",
  localField: "_id",
  foreignField: "programId",
});

// Virtual for enrollment status
programSchema.virtual("enrollmentStatus").get(function () {
  const now = new Date();
  if (now < this.enrollmentStartDate) {
    return "NOT_STARTED";
  } else if (now > this.enrollmentEndDate) {
    return "CLOSED";
  } else if (this.currentParticipants >= this.maxParticipants) {
    return "FULL";
  } else if (!this.enrollmentOpen) {
    return "CLOSED";
  } else {
    return "OPEN";
  }
});

// Virtual for program progress
programSchema.virtual("progress").get(function () {
  const now = new Date();
  const totalDuration = this.endDate - this.startDate;
  const elapsed = now - this.startDate;

  if (elapsed < 0) return 0;
  if (elapsed > totalDuration) return 100;

  return Math.round((elapsed / totalDuration) * 100);
});

// Virtual for capacity
programSchema.virtual("capacityPercentage").get(function () {
  return Math.round((this.currentParticipants / this.maxParticipants) * 100);
});

// Pre-save middleware
programSchema.pre("save", function (next) {
  // Ensure enrollment end date is before program end date
  if (this.enrollmentEndDate > this.endDate) {
    this.enrollmentEndDate = this.endDate;
  }

  // Ensure current participants doesn't exceed max
  if (this.currentParticipants > this.maxParticipants) {
    this.currentParticipants = this.maxParticipants;
  }

  next();
});

// Instance methods
programSchema.methods.isEnrollmentOpen = function () {
  const now = new Date();
  return (
    this.enrollmentOpen &&
    now >= this.enrollmentStartDate &&
    now <= this.enrollmentEndDate &&
    this.currentParticipants < this.maxParticipants
  );
};

programSchema.methods.isActive = function () {
  const now = new Date();
  return (
    this.status === "ACTIVE" && now >= this.startDate && now <= this.endDate
  );
};

programSchema.methods.canEnroll = function () {
  return this.isEnrollmentOpen() && this.isActive();
};

programSchema.methods.addParticipant = function () {
  if (this.currentParticipants < this.maxParticipants) {
    this.currentParticipants += 1;
    return true;
  }
  return false;
};

programSchema.methods.removeParticipant = function () {
  if (this.currentParticipants > 0) {
    this.currentParticipants -= 1;
    return true;
  }
  return false;
};

// Static methods
programSchema.statics.findByCode = function (code) {
  return this.findOne({ code: code.toUpperCase() });
};

programSchema.statics.findActive = function () {
  const now = new Date();
  return this.find({
    status: "ACTIVE",
    startDate: { $lte: now },
    endDate: { $gte: now },
  });
};

programSchema.statics.findPublic = function () {
  return this.find({ isPublic: true, status: "ACTIVE" });
};

programSchema.statics.findByOwner = function (ownerId) {
  return this.find({ ownerId });
};

programSchema.statics.findByCoordinator = function (coordinatorId) {
  return this.find({ coordinatorId });
};

programSchema.statics.findEnrollmentOpen = function () {
  const now = new Date();
  return this.find({
    enrollmentOpen: true,
    enrollmentStartDate: { $lte: now },
    enrollmentEndDate: { $gte: now },
    currentParticipants: { $lt: "$maxParticipants" },
  });
};

// Export the model
const Program = mongoose.model("Program", programSchema);

export default Program;
