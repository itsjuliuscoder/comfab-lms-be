import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  questionIndex: {
    type: Number,
    required: true,
  },
  answer: {
    type: mongoose.Schema.Types.Mixed, // Can be string, array, file URL, etc.
    required: true,
  },
  isCorrect: {
    type: Boolean,
    default: null, // null for pending manual review
  },
  score: {
    type: Number,
    default: 0,
  },
  feedback: {
    type: String,
    trim: true,
    maxlength: [1000, 'Feedback cannot exceed 1000 characters'],
  },
  explanation: {
    type: String,
    trim: true,
    maxlength: [1000, 'Explanation cannot exceed 1000 characters'],
  },
  timeSpent: {
    type: Number, // in seconds
    default: 0,
  },
}, {
  timestamps: true,
});

const assessmentSubmissionSchema = new mongoose.Schema({
  assessmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assessment',
    required: true,
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  attemptNumber: {
    type: Number,
    required: true,
    min: [1, 'Attempt number must be at least 1'],
  },
  answers: [answerSchema],
  totalScore: {
    type: Number,
    default: 0,
  },
  maxPossibleScore: {
    type: Number,
    required: true,
  },
  percentage: {
    type: Number,
    min: [0, 'Percentage cannot be negative'],
    max: [100, 'Percentage cannot exceed 100'],
    default: 0,
  },
  passed: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ['IN_PROGRESS', 'SUBMITTED', 'GRADED', 'REVIEWED'],
    default: 'IN_PROGRESS',
  },
  startTime: {
    type: Date,
    required: true,
  },
  submitTime: {
    type: Date,
  },
  timeSpent: {
    type: Number, // total time spent in seconds
    default: 0,
  },
  isTimeLimitExceeded: {
    type: Boolean,
    default: false,
  },
  gradedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  gradedAt: {
    type: Date,
  },
  comments: {
    type: String,
    trim: true,
    maxlength: [2000, 'Comments cannot exceed 2000 characters'],
  },
  ipAddress: {
    type: String,
    trim: true,
  },
  userAgent: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual for time remaining
assessmentSubmissionSchema.virtual('timeRemaining').get(function() {
  if (!this.assessmentId || !this.startTime) return null;
  // This would need to be calculated based on assessment timeLimit
  return null;
});

// Indexes
assessmentSubmissionSchema.index({ assessmentId: 1, userId: 1 });
assessmentSubmissionSchema.index({ courseId: 1, userId: 1 });
assessmentSubmissionSchema.index({ userId: 1, status: 1 });
assessmentSubmissionSchema.index({ status: 1 });
assessmentSubmissionSchema.index({ submitTime: -1 });

// Compound index for unique attempts
assessmentSubmissionSchema.index({ assessmentId: 1, userId: 1, attemptNumber: 1 }, { unique: true });

// Static method to find user submissions for an assessment
assessmentSubmissionSchema.statics.findUserSubmissions = function(assessmentId, userId) {
  return this.find({ assessmentId, userId }).sort({ attemptNumber: -1 });
};

// Static method to find best submission for a user
assessmentSubmissionSchema.statics.findBestSubmission = function(assessmentId, userId) {
  return this.findOne({ assessmentId, userId, status: { $in: ['GRADED', 'REVIEWED'] } })
    .sort({ percentage: -1, submitTime: -1 });
};

// Static method to get submission statistics
assessmentSubmissionSchema.statics.getSubmissionStats = function(assessmentId) {
  return this.aggregate([
    { $match: { assessmentId: new mongoose.Types.ObjectId(assessmentId) } },
    {
      $group: {
        _id: null,
        totalSubmissions: { $sum: 1 },
        avgScore: { $avg: '$percentage' },
        maxScore: { $max: '$percentage' },
        minScore: { $min: '$percentage' },
        passedCount: { $sum: { $cond: ['$passed', 1, 0] } },
        avgTimeSpent: { $avg: '$timeSpent' },
      },
    },
  ]);
};

// Instance method to calculate final score
assessmentSubmissionSchema.methods.calculateScore = function() {
  let totalScore = 0;
  let maxPossibleScore = 0;

  this.answers.forEach(answer => {
    maxPossibleScore += answer.score || 0;
    if (answer.isCorrect !== null) {
      totalScore += answer.score || 0;
    }
  });

  this.totalScore = totalScore;
  this.maxPossibleScore = maxPossibleScore;
  this.percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
  
  return {
    totalScore,
    maxPossibleScore,
    percentage: this.percentage,
  };
};

// Instance method to check if passed
assessmentSubmissionSchema.methods.checkPassed = function(passingScore) {
  this.passed = this.percentage >= passingScore;
  return this.passed;
};

// Instance method to get submission summary
assessmentSubmissionSchema.methods.getSummary = function() {
  return {
    id: this._id,
    assessmentId: this.assessmentId,
    attemptNumber: this.attemptNumber,
    totalScore: this.totalScore,
    maxPossibleScore: this.maxPossibleScore,
    percentage: this.percentage,
    passed: this.passed,
    status: this.status,
    submitTime: this.submitTime,
    timeSpent: this.timeSpent,
  };
};

export const AssessmentSubmission = mongoose.model('AssessmentSubmission', assessmentSubmissionSchema);
