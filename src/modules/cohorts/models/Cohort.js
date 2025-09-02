import mongoose from 'mongoose';

const cohortSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Cohort name is required'],
    trim: true,
    maxlength: [100, 'Cohort name cannot exceed 100 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  year: {
    type: Number,
    min: [2020, 'Year must be 2020 or later'],
    max: [2030, 'Year cannot exceed 2030'],
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag cannot exceed 50 characters'],
  }],
  startDate: {
    type: Date,
    default: null,
  },
  endDate: {
    type: Date,
    default: null,
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'COMPLETED'],
    default: 'ACTIVE',
  },
  maxParticipants: {
    type: Number,
    min: [1, 'Max participants must be at least 1'],
    default: null,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual for participant count
cohortSchema.virtual('participantCount', {
  ref: 'UserCohort',
  localField: '_id',
  foreignField: 'cohortId',
  count: true,
});

// Virtual for active participants
cohortSchema.virtual('activeParticipants', {
  ref: 'UserCohort',
  localField: '_id',
  foreignField: 'cohortId',
  match: { status: 'ACTIVE' },
  count: true,
});

// Indexes for better query performance
cohortSchema.index({ name: 1 });
cohortSchema.index({ status: 1 });
cohortSchema.index({ year: -1 });
cohortSchema.index({ createdBy: 1 });
cohortSchema.index({ createdAt: -1 });

// Pre-save middleware to validate dates
cohortSchema.pre('save', function(next) {
  if (this.startDate && this.endDate && this.startDate >= this.endDate) {
    return next(new Error('End date must be after start date'));
  }
  next();
});

// Static method to find active cohorts
cohortSchema.statics.findActive = function() {
  return this.find({ status: 'ACTIVE' });
};

// Static method to find by year
cohortSchema.statics.findByYear = function(year) {
  return this.find({ year, status: 'ACTIVE' });
};

// Static method to find by creator
cohortSchema.statics.findByCreator = function(creatorId) {
  return this.find({ createdBy: creatorId });
};

// Instance method to check if cohort is full
cohortSchema.methods.isFull = function() {
  if (!this.maxParticipants) return false;
  return this.participantCount >= this.maxParticipants;
};

// Instance method to get cohort summary
cohortSchema.methods.getSummary = function() {
  return {
    id: this._id,
    name: this.name,
    description: this.description,
    year: this.year,
    status: this.status,
    participantCount: this.participantCount,
    maxParticipants: this.maxParticipants,
    isFull: this.isFull(),
    startDate: this.startDate,
    endDate: this.endDate,
  };
};

export const Cohort = mongoose.model('Cohort', cohortSchema);
