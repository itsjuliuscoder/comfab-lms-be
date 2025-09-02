import mongoose from 'mongoose';

const enrollmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'COMPLETED', 'WITHDRAWN', 'SUSPENDED'],
    default: 'ACTIVE',
  },
  progressPct: {
    type: Number,
    min: [0, 'Progress percentage cannot be negative'],
    max: [100, 'Progress percentage cannot exceed 100'],
    default: 0,
  },
  enrolledAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: {
    type: Date,
    default: null,
  },
  withdrawnAt: {
    type: Date,
    default: null,
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now,
  },
  certificateIssued: {
    type: Boolean,
    default: false,
  },
  certificateIssuedAt: {
    type: Date,
    default: null,
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Compound unique index to prevent duplicate enrollments
enrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true });

// Indexes for better query performance
enrollmentSchema.index({ userId: 1 });
enrollmentSchema.index({ courseId: 1 });
enrollmentSchema.index({ status: 1 });
enrollmentSchema.index({ enrolledAt: -1 });
enrollmentSchema.index({ lastAccessedAt: -1 });

// Virtual for enrollment duration
enrollmentSchema.virtual('duration').get(function() {
  const endDate = this.completedAt || this.withdrawnAt || new Date();
  return Math.floor((endDate - this.enrolledAt) / (1000 * 60 * 60 * 24)); // days
});

// Pre-save middleware to update timestamps
enrollmentSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    if (this.status === 'COMPLETED' && !this.completedAt) {
      this.completedAt = new Date();
    } else if (this.status === 'WITHDRAWN' && !this.withdrawnAt) {
      this.withdrawnAt = new Date();
    }
  }
  
  if (this.isModified('progressPct') && this.progressPct >= 100) {
    this.status = 'COMPLETED';
    if (!this.completedAt) {
      this.completedAt = new Date();
    }
  }
  
  next();
});

// Static method to find active enrollments
enrollmentSchema.statics.findActive = function() {
  return this.find({ status: 'ACTIVE' });
};

// Static method to find by user
enrollmentSchema.statics.findByUser = function(userId) {
  return this.find({ userId }).populate('courseId');
};

// Static method to find by course
enrollmentSchema.statics.findByCourse = function(courseId) {
  return this.find({ courseId }).populate('userId');
};

// Static method to find completed enrollments
enrollmentSchema.statics.findCompleted = function() {
  return this.find({ status: 'COMPLETED' });
};

// Static method to check if user is enrolled
enrollmentSchema.statics.isUserEnrolled = function(userId, courseId) {
  return this.findOne({ userId, courseId, status: 'ACTIVE' });
};

// Static method to get enrollment statistics
enrollmentSchema.statics.getStats = async function(courseId) {
  const stats = await this.aggregate([
    { $match: { courseId: new mongoose.Types.ObjectId(courseId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgProgress: { $avg: '$progressPct' },
      },
    },
  ]);
  
  return stats.reduce((acc, stat) => {
    acc[stat._id] = {
      count: stat.count,
      avgProgress: Math.round(stat.avgProgress || 0),
    };
    return acc;
  }, {});
};

// Instance method to update progress
enrollmentSchema.methods.updateProgress = function(progressPct) {
  this.progressPct = Math.min(100, Math.max(0, progressPct));
  this.lastAccessedAt = new Date();
  
  if (this.progressPct >= 100) {
    this.status = 'COMPLETED';
    this.completedAt = new Date();
  }
  
  return this.save();
};

// Instance method to complete enrollment
enrollmentSchema.methods.complete = function() {
  this.status = 'COMPLETED';
  this.progressPct = 100;
  this.completedAt = new Date();
  return this.save();
};

// Instance method to withdraw enrollment
enrollmentSchema.methods.withdraw = function() {
  this.status = 'WITHDRAWN';
  this.withdrawnAt = new Date();
  return this.save();
};

// Instance method to reactivate enrollment
enrollmentSchema.methods.reactivate = function() {
  this.status = 'ACTIVE';
  this.withdrawnAt = null;
  return this.save();
};

// Instance method to issue certificate
enrollmentSchema.methods.issueCertificate = function() {
  if (this.status !== 'COMPLETED') {
    throw new Error('Cannot issue certificate for incomplete enrollment');
  }
  
  this.certificateIssued = true;
  this.certificateIssuedAt = new Date();
  return this.save();
};

export const Enrollment = mongoose.model('Enrollment', enrollmentSchema);
