import mongoose from 'mongoose';

const sectionSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  title: {
    type: String,
    required: [true, 'Section title is required'],
    trim: true,
    maxlength: [200, 'Section title cannot exceed 200 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Section description cannot exceed 1000 characters'],
  },
  order: {
    type: Number,
    required: [true, 'Section order is required'],
    min: [1, 'Section order must be at least 1'],
  },
  isPublished: {
    type: Boolean,
    default: false,
  },
  estimatedDuration: {
    type: Number, // in minutes
    min: [1, 'Estimated duration must be at least 1 minute'],
    default: null,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual for lesson count
sectionSchema.virtual('lessonCount', {
  ref: 'Lesson',
  localField: '_id',
  foreignField: 'sectionId',
  count: true,
});

// Virtual for published lesson count
sectionSchema.virtual('publishedLessonCount', {
  ref: 'Lesson',
  localField: '_id',
  foreignField: 'sectionId',
  match: { isPublished: true },
  count: true,
});

// Virtual for lessons array
sectionSchema.virtual('lessons', {
  ref: 'Lesson',
  localField: '_id',
  foreignField: 'sectionId',
});

// Compound unique index to prevent duplicate order within same course
sectionSchema.index({ courseId: 1, order: 1 }, { unique: true });

// Indexes for better query performance
sectionSchema.index({ courseId: 1 });
sectionSchema.index({ isPublished: 1 });
sectionSchema.index({ order: 1 });

// Pre-save middleware to validate order uniqueness
sectionSchema.pre('save', async function(next) {
  if (this.isModified('order') || this.isNew) {
    const existingSection = await this.constructor.findOne({
      courseId: this.courseId,
      order: this.order,
      _id: { $ne: this._id },
    });
    
    if (existingSection) {
      return next(new Error('Section order must be unique within a course'));
    }
  }
  next();
});

// Static method to find by course
sectionSchema.statics.findByCourse = function(courseId) {
  return this.find({ courseId }).sort({ order: 1 });
};

// Static method to find published sections
sectionSchema.statics.findPublished = function(courseId) {
  return this.find({ courseId, isPublished: true }).sort({ order: 1 });
};

// Static method to get next order for a course
sectionSchema.statics.getNextOrder = async function(courseId) {
  const lastSection = await this.findOne({ courseId }).sort({ order: -1 });
  return lastSection ? lastSection.order + 1 : 1;
};

// Instance method to reorder sections
sectionSchema.methods.reorder = async function(newOrder) {
  const oldOrder = this.order;
  
  if (oldOrder === newOrder) return this;
  
  // Update other sections' orders
  if (oldOrder < newOrder) {
    // Moving down: decrease orders of sections in between
    await this.constructor.updateMany(
      { courseId: this.courseId, order: { $gt: oldOrder, $lte: newOrder } },
      { $inc: { order: -1 } }
    );
  } else {
    // Moving up: increase orders of sections in between
    await this.constructor.updateMany(
      { courseId: this.courseId, order: { $gte: newOrder, $lt: oldOrder } },
      { $inc: { order: 1 } }
    );
  }
  
  this.order = newOrder;
  return this.save();
};

export const Section = mongoose.model('Section', sectionSchema);
