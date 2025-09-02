import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Course title is required'],
    trim: true,
    maxlength: [200, 'Course title cannot exceed 200 characters'],
  },
  summary: {
    type: String,
    required: [true, 'Course summary is required'],
    trim: true,
    maxlength: [1000, 'Course summary cannot exceed 1000 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [5000, 'Course description cannot exceed 5000 characters'],
  },
  outcomes: [{
    type: String,
    trim: true,
    maxlength: [200, 'Learning outcome cannot exceed 200 characters'],
  }],
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag cannot exceed 50 characters'],
  }],
  thumbnailUrl: {
    type: String,
    default: null,
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
    default: 'DRAFT',
  },
  difficulty: {
    type: String,
    enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'],
    default: 'BEGINNER',
  },
  estimatedDuration: {
    type: Number, // in minutes
    min: [1, 'Estimated duration must be at least 1 minute'],
    default: null,
  },
  isPublic: {
    type: Boolean,
    default: false,
  },
  enrollmentLimit: {
    type: Number,
    min: [1, 'Enrollment limit must be at least 1'],
    default: null,
  },
  prerequisites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
  }],
  featured: {
    type: Boolean,
    default: false,
  },
  publishedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual for section count
courseSchema.virtual('sectionCount', {
  ref: 'Section',
  localField: '_id',
  foreignField: 'courseId',
  count: true,
});

// Virtual for lesson count
courseSchema.virtual('lessonCount', {
  ref: 'Lesson',
  localField: '_id',
  foreignField: 'courseId',
  count: true,
});

// Virtual for enrollment count
courseSchema.virtual('enrollmentCount', {
  ref: 'Enrollment',
  localField: '_id',
  foreignField: 'courseId',
  match: { status: 'ACTIVE' },
  count: true,
});

// Virtual for average rating
courseSchema.virtual('averageRating', {
  ref: 'CourseRating',
  localField: '_id',
  foreignField: 'courseId',
  pipeline: [
    { $group: { _id: null, avgRating: { $avg: '$rating' } } }
  ],
});

// Indexes for better query performance
courseSchema.index({ title: 'text', summary: 'text', description: 'text' });
courseSchema.index({ status: 1 });
courseSchema.index({ ownerId: 1 });
courseSchema.index({ difficulty: 1 });
courseSchema.index({ featured: 1 });
courseSchema.index({ isPublic: 1 });
courseSchema.index({ publishedAt: -1 });
courseSchema.index({ createdAt: -1 });

// Pre-save middleware to set publishedAt when status changes to PUBLISHED
courseSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'PUBLISHED' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

// Static method to find published courses
courseSchema.statics.findPublished = function() {
  return this.find({ status: 'PUBLISHED' });
};

// Static method to find public courses
courseSchema.statics.findPublic = function() {
  return this.find({ status: 'PUBLISHED', isPublic: true });
};

// Static method to find by owner
courseSchema.statics.findByOwner = function(ownerId) {
  return this.find({ ownerId });
};

// Static method to find featured courses
courseSchema.statics.findFeatured = function() {
  return this.find({ status: 'PUBLISHED', featured: true });
};

// Static method to search courses
courseSchema.statics.search = function(query) {
  return this.find({
    $text: { $search: query },
    status: 'PUBLISHED',
  });
};

// Instance method to check if course is full
courseSchema.methods.isFull = function() {
  if (!this.enrollmentLimit) return false;
  return this.enrollmentCount >= this.enrollmentLimit;
};

// Instance method to get course summary
courseSchema.methods.getSummary = function() {
  return {
    id: this._id,
    title: this.title,
    summary: this.summary,
    difficulty: this.difficulty,
    estimatedDuration: this.estimatedDuration,
    enrollmentCount: this.enrollmentCount,
    enrollmentLimit: this.enrollmentLimit,
    isFull: this.isFull(),
    featured: this.featured,
    publishedAt: this.publishedAt,
  };
};

export const Course = mongoose.model('Course', courseSchema);
