import mongoose from 'mongoose';

const courseMaterialSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Material title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course reference is required']
  },
  lesson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson',
    required: false // Optional - materials can be course-level or lesson-level
  },
  type: {
    type: String,
    enum: [
      'PDF',
      'POWERPOINT',
      'VIDEO',
      'AUDIO',
      'IMAGE',
      'DOCUMENT',
      'SPREADSHEET',
      'PRESENTATION',
      'ARCHIVE',
      'OTHER'
    ],
    required: [true, 'Material type is required']
  },
  file: {
    publicId: {
      type: String,
      required: [true, 'File public ID is required']
    },
    url: {
      type: String,
      required: [true, 'File URL is required']
    },
    originalName: {
      type: String,
      required: [true, 'Original file name is required']
    },
    mimeType: {
      type: String,
      required: [true, 'File MIME type is required']
    },
    size: {
      type: Number,
      required: [true, 'File size is required']
    },
    format: {
      type: String,
      required: [true, 'File format is required']
    }
  },
  thumbnail: {
    publicId: String,
    url: String
  },
  duration: {
    type: Number, // Duration in seconds for videos/audio
    default: null
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  viewCount: {
    type: Number,
    default: 0
  },
  isRequired: {
    type: Boolean,
    default: false
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  },
  tags: [{
    type: String,
    trim: true
  }],
  metadata: {
    author: String,
    version: String,
    language: {
      type: String,
      default: 'en'
    },
    accessibility: {
      hasTranscript: { type: Boolean, default: false },
      hasSubtitles: { type: Boolean, default: false },
      hasAudioDescription: { type: Boolean, default: false }
    }
  },
  status: {
    type: String,
    enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
    default: 'DRAFT'
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Uploader reference is required']
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
courseMaterialSchema.index({ course: 1, lesson: 1 });
courseMaterialSchema.index({ course: 1, type: 1 });
courseMaterialSchema.index({ uploadedBy: 1 });
courseMaterialSchema.index({ status: 1 });
courseMaterialSchema.index({ createdAt: -1 });

// Virtual for file size in human readable format
courseMaterialSchema.virtual('fileSizeFormatted').get(function() {
  const bytes = this.file.size;
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Virtual for duration in human readable format
courseMaterialSchema.virtual('durationFormatted').get(function() {
  if (!this.duration) return null;
  
  const hours = Math.floor(this.duration / 3600);
  const minutes = Math.floor((this.duration % 3600) / 60);
  const seconds = this.duration % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

// Pre-save middleware to update lastModifiedBy
courseMaterialSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.lastModifiedBy = this.uploadedBy; // You can pass this from the controller
  }
  next();
});

// Static method to get materials by course
courseMaterialSchema.statics.getByCourse = function(courseId, options = {}) {
  const query = { course: courseId, status: 'PUBLISHED' };
  
  if (options.lessonId) {
    query.lesson = options.lessonId;
  }
  
  if (options.type) {
    query.type = options.type;
  }
  
  return this.find(query)
    .populate('uploadedBy', 'name email')
    .populate('lastModifiedBy', 'name email')
    .sort({ order: 1, createdAt: -1 });
};

// Static method to get materials by type
courseMaterialSchema.statics.getByType = function(type, options = {}) {
  const query = { type, status: 'PUBLISHED' };
  
  if (options.courseId) {
    query.course = options.courseId;
  }
  
  return this.find(query)
    .populate('course', 'title')
    .populate('uploadedBy', 'name email')
    .sort({ createdAt: -1 });
};

// Instance method to increment view count
courseMaterialSchema.methods.incrementViewCount = function() {
  this.viewCount += 1;
  return this.save();
};

// Instance method to increment download count
courseMaterialSchema.methods.incrementDownloadCount = function() {
  this.downloadCount += 1;
  return this.save();
};

export const CourseMaterial = mongoose.model('CourseMaterial', courseMaterialSchema);
