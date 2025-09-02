import mongoose from 'mongoose';

const userCohortSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  cohortId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cohort',
    required: true,
  },
  roleInCohort: {
    type: String,
    enum: ['LEADER', 'MEMBER', 'MENTOR'],
    default: 'MEMBER',
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'GRADUATED', 'WITHDRAWN'],
    default: 'ACTIVE',
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
  graduatedAt: {
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
});

// Compound unique index to prevent duplicate user-cohort relationships
userCohortSchema.index({ userId: 1, cohortId: 1 }, { unique: true });

// Indexes for better query performance
userCohortSchema.index({ userId: 1 });
userCohortSchema.index({ cohortId: 1 });
userCohortSchema.index({ status: 1 });
userCohortSchema.index({ roleInCohort: 1 });
userCohortSchema.index({ joinedAt: -1 });

// Static method to find active memberships
userCohortSchema.statics.findActive = function() {
  return this.find({ status: 'ACTIVE' });
};

// Static method to find by user
userCohortSchema.statics.findByUser = function(userId) {
  return this.find({ userId, status: 'ACTIVE' }).populate('cohortId');
};

// Static method to find by cohort
userCohortSchema.statics.findByCohort = function(cohortId) {
  return this.find({ cohortId, status: 'ACTIVE' }).populate('userId');
};

// Static method to find cohort leaders
userCohortSchema.statics.findLeaders = function(cohortId) {
  return this.find({ cohortId, roleInCohort: 'LEADER', status: 'ACTIVE' }).populate('userId');
};

// Static method to find cohort mentors
userCohortSchema.statics.findMentors = function(cohortId) {
  return this.find({ cohortId, roleInCohort: 'MENTOR', status: 'ACTIVE' }).populate('userId');
};

// Static method to check if user is in cohort
userCohortSchema.statics.isUserInCohort = function(userId, cohortId) {
  return this.findOne({ userId, cohortId, status: 'ACTIVE' });
};

// Instance method to graduate user
userCohortSchema.methods.graduate = function() {
  this.status = 'GRADUATED';
  this.graduatedAt = new Date();
  return this.save();
};

// Instance method to withdraw user
userCohortSchema.methods.withdraw = function() {
  this.status = 'WITHDRAWN';
  return this.save();
};

// Instance method to reactivate user
userCohortSchema.methods.reactivate = function() {
  this.status = 'ACTIVE';
  this.graduatedAt = null;
  return this.save();
};

export const UserCohort = mongoose.model('UserCohort', userCohortSchema);
