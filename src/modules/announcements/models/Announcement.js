import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Announcement title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  content: {
    type: String,
    required: [true, 'Announcement content is required'],
    trim: true,
    maxlength: [5000, 'Content cannot exceed 5000 characters'],
  },
  type: {
    type: String,
    enum: ['GENERAL', 'COURSE', 'SYSTEM', 'MAINTENANCE', 'EVENT', 'URGENT'],
    default: 'GENERAL',
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
    default: 'MEDIUM',
  },
  status: {
    type: String,
    enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
    default: 'DRAFT',
  },
  visibility: {
    type: String,
    enum: ['PUBLIC', 'ENROLLED_USERS', 'INSTRUCTORS', 'ADMINS', 'SPECIFIC_USERS'],
    default: 'PUBLIC',
  },
  targetAudience: {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
    },
    cohortId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cohort',
    },
    userIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    roles: [{
      type: String,
      enum: ['ADMIN', 'INSTRUCTOR', 'PARTICIPANT'],
    }],
  },
  attachments: [{
    publicId: String,
    url: String,
    name: String,
    mime: String,
    size: Number,
  }],
  scheduledAt: {
    type: Date,
  },
  expiresAt: {
    type: Date,
  },
  isPinned: {
    type: Boolean,
    default: false,
  },
  allowComments: {
    type: Boolean,
    default: true,
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag cannot exceed 50 characters'],
  }],
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  publishedAt: {
    type: Date,
  },
  readBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    readAt: {
      type: Date,
      default: Date.now,
    },
  }],
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes for better query performance
announcementSchema.index({ status: 1, publishedAt: -1 });
announcementSchema.index({ type: 1, priority: 1 });
announcementSchema.index({ visibility: 1, 'targetAudience.courseId': 1 });
announcementSchema.index({ isPinned: 1, publishedAt: -1 });
announcementSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for read count
announcementSchema.virtual('readCount').get(function() {
  return this.readBy.length;
});

// Virtual for isExpired
announcementSchema.virtual('isExpired').get(function() {
  return this.expiresAt && new Date() > this.expiresAt;
});

// Virtual for isScheduled
announcementSchema.virtual('isScheduled').get(function() {
  return this.scheduledAt && new Date() < this.scheduledAt;
});

// Pre-save middleware to set publishedAt when status changes to PUBLISHED
announcementSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'PUBLISHED' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

// Static method to get announcements for a specific user
announcementSchema.statics.getAnnouncementsForUser = async function(userId, userRole, enrolledCourses = [], options = {}) {
  const {
    page = 1,
    limit = 20,
    type,
    priority,
    status = 'PUBLISHED',
    courseId,
    unreadOnly = false
  } = options;

  const query = {
    status,
    $or: [
      { visibility: 'PUBLIC' },
      { visibility: 'ENROLLED_USERS', 'targetAudience.courseId': { $in: enrolledCourses } },
      { visibility: 'INSTRUCTORS', 'targetAudience.roles': { $in: ['INSTRUCTOR', 'ADMIN'] } },
      { visibility: 'ADMINS', 'targetAudience.roles': 'ADMIN' },
      { visibility: 'SPECIFIC_USERS', 'targetAudience.userIds': userId },
    ],
    $and: [
      {
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: null },
          { expiresAt: { $gt: new Date() } }
        ]
      },
      {
        $or: [
          { scheduledAt: { $exists: false } },
          { scheduledAt: null },
          { scheduledAt: { $lte: new Date() } }
        ]
      }
    ]
  };

  // Add role-based filtering
  if (userRole === 'PARTICIPANT') {
    query.$or = query.$or.filter(condition => 
      condition.visibility !== 'INSTRUCTORS' && condition.visibility !== 'ADMINS'
    );
  } else if (userRole === 'INSTRUCTOR') {
    query.$or = query.$or.filter(condition => 
      condition.visibility !== 'ADMINS'
    );
  }

  if (type) query.type = type;
  if (priority) query.priority = priority;
  if (courseId) query['targetAudience.courseId'] = courseId;

  const skip = (page - 1) * limit;
  
  const announcements = await this.find(query)
    .populate('authorId', 'name email')
    .populate('targetAudience.courseId', 'title')
    .populate('targetAudience.cohortId', 'name')
    .sort({ isPinned: -1, publishedAt: -1 })
    .skip(skip)
    .limit(limit);

  // Add read status for each announcement
  const announcementsWithReadStatus = announcements.map(announcement => {
    const announcementObj = announcement.toObject();
    announcementObj.isRead = announcement.readBy.some(read => 
      read.userId.toString() === userId.toString()
    );
    return announcementObj;
  });

  // Filter unread only if requested
  const filteredAnnouncements = unreadOnly 
    ? announcementsWithReadStatus.filter(a => !a.isRead)
    : announcementsWithReadStatus;

  const total = await this.countDocuments(query);
  
  return {
    announcements: filteredAnnouncements,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      itemsPerPage: limit,
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
    }
  };
};

// Static method to mark announcement as read
announcementSchema.statics.markAsRead = async function(announcementId, userId) {
  return this.findByIdAndUpdate(
    announcementId,
    {
      $addToSet: {
        readBy: {
          userId,
          readAt: new Date()
        }
      }
    },
    { new: true }
  );
};

// Static method to get unread count for user
announcementSchema.statics.getUnreadCount = async function(userId, userRole, enrolledCourses = []) {
  const query = {
    status: 'PUBLISHED',
    $or: [
      { visibility: 'PUBLIC' },
      { visibility: 'ENROLLED_USERS', 'targetAudience.courseId': { $in: enrolledCourses } },
      { visibility: 'INSTRUCTORS', 'targetAudience.roles': { $in: ['INSTRUCTOR', 'ADMIN'] } },
      { visibility: 'ADMINS', 'targetAudience.roles': 'ADMIN' },
      { visibility: 'SPECIFIC_USERS', 'targetAudience.userIds': userId },
    ],
    'readBy.userId': { $ne: userId },
    $and: [
      {
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: null },
          { expiresAt: { $gt: new Date() } }
        ]
      },
      {
        $or: [
          { scheduledAt: { $exists: false } },
          { scheduledAt: null },
          { scheduledAt: { $lte: new Date() } }
        ]
      }
    ]
  };

  // Add role-based filtering
  if (userRole === 'PARTICIPANT') {
    query.$or = query.$or.filter(condition => 
      condition.visibility !== 'INSTRUCTORS' && condition.visibility !== 'ADMINS'
    );
  } else if (userRole === 'INSTRUCTOR') {
    query.$or = query.$or.filter(condition => 
      condition.visibility !== 'ADMINS'
    );
  }

  return this.countDocuments(query);
};

const Announcement = mongoose.model('Announcement', announcementSchema);

export { Announcement };
