import mongoose from 'mongoose';

const lessonSchema = new mongoose.Schema({
  sectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section',
    required: true,
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  title: {
    type: String,
    required: [true, 'Lesson title is required'],
    trim: true,
    maxlength: [200, 'Lesson title cannot exceed 200 characters'],
  },
  type: {
    type: String,
    enum: ['VIDEO', 'TEXT', 'FILE', 'LINK', 'QUIZ'],
    required: true,
  },
  content: {
    type: String,
    trim: true,
    maxlength: [10000, 'Lesson content cannot exceed 10000 characters'],
  },
  media: {
    publicId: String,
    url: String,
    mime: String,
    size: Number,
    duration: Number, // for videos, in seconds
  },
  youtubeVideoId: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        if (this.type === 'VIDEO' && !v && !this.media?.url) return false;
        return true;
      },
      message: 'YouTube video ID is required for VIDEO type lessons without media upload',
    },
  },
  externalUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        if (this.type === 'LINK' && !v) return false;
        return true;
      },
      message: 'External URL is required for LINK type lessons',
    },
  },
  order: {
    type: Number,
    required: [true, 'Lesson order is required'],
    min: [1, 'Lesson order must be at least 1'],
  },
  durationSec: {
    type: Number,
    min: [1, 'Duration must be at least 1 second'],
    default: null,
  },
  isPublished: {
    type: Boolean,
    default: false,
  },
  isFree: {
    type: Boolean,
    default: false,
  },
  attachments: [{
    publicId: String,
    url: String,
    name: String,
    mime: String,
    size: Number,
  }],
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters'],
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual for completion count
lessonSchema.virtual('completionCount', {
  ref: 'LessonProgress',
  localField: '_id',
  foreignField: 'lessonId',
  match: { status: 'COMPLETED' },
  count: true,
});

// Compound unique index to prevent duplicate order within same section
lessonSchema.index({ sectionId: 1, order: 1 }, { unique: true });

// Indexes for better query performance
lessonSchema.index({ sectionId: 1 });
lessonSchema.index({ courseId: 1 });
lessonSchema.index({ type: 1 });
lessonSchema.index({ isPublished: 1 });
lessonSchema.index({ order: 1 });

// Pre-save middleware to validate order uniqueness
lessonSchema.pre('save', async function(next) {
  if (this.isModified('order') || this.isNew) {
    const existingLesson = await this.constructor.findOne({
      sectionId: this.sectionId,
      order: this.order,
      _id: { $ne: this._id },
    });
    
    if (existingLesson) {
      return next(new Error('Lesson order must be unique within a section'));
    }
  }
  next();
});

// Static method to find by section
lessonSchema.statics.findBySection = function(sectionId) {
  return this.find({ sectionId }).sort({ order: 1 });
};

// Static method to find published lessons
lessonSchema.statics.findPublished = function(sectionId) {
  return this.find({ sectionId, isPublished: true }).sort({ order: 1 });
};

// Static method to find by course
lessonSchema.statics.findByCourse = function(courseId) {
  return this.find({ courseId }).sort({ order: 1 });
};

// Static method to get next order for a section
lessonSchema.statics.getNextOrder = async function(sectionId) {
  const lastLesson = await this.findOne({ sectionId }).sort({ order: -1 });
  return lastLesson ? lastLesson.order + 1 : 1;
};

// Instance method to reorder lessons
lessonSchema.methods.reorder = async function(newOrder) {
  const oldOrder = this.order;
  
  if (oldOrder === newOrder) return this;
  
  // Update other lessons' orders
  if (oldOrder < newOrder) {
    // Moving down: decrease orders of lessons in between
    await this.constructor.updateMany(
      { sectionId: this.sectionId, order: { $gt: oldOrder, $lte: newOrder } },
      { $inc: { order: -1 } }
    );
  } else {
    // Moving up: increase orders of lessons in between
    await this.constructor.updateMany(
      { sectionId: this.sectionId, order: { $gte: newOrder, $lt: oldOrder } },
      { $inc: { order: 1 } }
    );
  }
  
  this.order = newOrder;
  return this.save();
};

// Instance method to get lesson summary
lessonSchema.methods.getSummary = function() {
  return {
    id: this._id,
    title: this.title,
    type: this.type,
    order: this.order,
    durationSec: this.durationSec,
    isPublished: this.isPublished,
    isFree: this.isFree,
    hasMedia: !!this.media?.url,
    hasAttachments: this.attachments?.length > 0,
  };
};

export const Lesson = mongoose.model('Lesson', lessonSchema);
