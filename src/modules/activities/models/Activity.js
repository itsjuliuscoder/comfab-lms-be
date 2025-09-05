import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
  // Core activity information
  action: {
    type: String,
    required: [true, 'Action is required'],
    enum: [
      // User actions
      'USER_REGISTERED',
      'USER_LOGIN',
      'USER_LOGOUT',
      'USER_PROFILE_UPDATED',
      'USER_PASSWORD_CHANGED',
      'USER_AVATAR_UPLOADED',
      'USER_INVITED',
      'USER_VERIFIED',
      'USER_SUSPENDED',
      'USER_ACTIVATED',
      'USER_DELETED',
      
      // Course actions
      'COURSE_CREATED',
      'COURSE_UPDATED',
      'COURSE_DELETED',
      'COURSE_PUBLISHED',
      'COURSE_ARCHIVED',
      'COURSE_VIEWED',
      
      // Lesson actions
      'LESSON_CREATED',
      'LESSON_UPDATED',
      'LESSON_DELETED',
      'LESSON_COMPLETED',
      'LESSON_PROGRESS_UPDATED',
      'LESSON_VIEWED',
      
      // Enrollment actions
      'ENROLLMENT_CREATED',
      'ENROLLMENT_UPDATED',
      'ENROLLMENT_WITHDRAWN',
      'ENROLLMENT_COMPLETED',
      
      // Cohort actions
      'COHORT_CREATED',
      'COHORT_UPDATED',
      'COHORT_DELETED',
      'COHORT_MEMBER_ADDED',
      'COHORT_MEMBER_REMOVED',
      'COHORT_MEMBER_ROLE_UPDATED',
      
      // File actions
      'FILE_UPLOADED',
      'FILE_DELETED',
      'FILE_DOWNLOADED',
      
      // Note and discussion actions
      'NOTE_CREATED',
      'NOTE_UPDATED',
      'NOTE_DELETED',
      'DISCUSSION_CREATED',
      'DISCUSSION_UPDATED',
      'DISCUSSION_DELETED',
      'REPLY_ADDED',
      
      // System actions
      'SYSTEM_ERROR',
      'SYSTEM_WARNING',
      'SYSTEM_MAINTENANCE',
      'BACKUP_CREATED',
      'CLEANUP_PERFORMED',
      
      // Admin actions
      'BULK_ACTION_PERFORMED',
      'SETTINGS_UPDATED',
      'REPORT_GENERATED',
      'EXPORT_PERFORMED',
      
      // API and access actions
      'API_ACCESSED',
      'AUTH_FAILURE',
      'RATE_LIMIT_EXCEEDED',
      
      // Course material actions
      'COURSE_MATERIAL_UPLOADED',
      'COURSE_MATERIAL_DOWNLOADED',
      'COURSE_MATERIAL_DELETED',
      
      // Assessment actions
      'ASSESSMENT_SUBMITTED',
      'ASSESSMENT_GRADED',
      'ASSESSMENT_VIEWED',
      
      // Bulk operations
      'BULK_USER_INVITED',
      'BULK_USER_UPDATED',
      'BULK_USER_DELETED',
      'BULK_COURSE_UPDATED',
      'BULK_ENROLLMENT_CREATED',
      
      // Data operations
      'DATA_EXPORTED',
      'DATA_IMPORTED',
      'DATA_BACKUP_CREATED',
      'DATA_RESTORED',
    ],
  },
  
  // Actor information (who performed the action)
  actor: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false, // Allow null for system/anonymous actions
    },
    name: {
      type: String,
      required: [true, 'Actor name is required'],
    },
    email: {
      type: String,
      required: [true, 'Actor email is required'],
    },
    role: {
      type: String,
      enum: ['ADMIN', 'INSTRUCTOR', 'PARTICIPANT', 'ANONYMOUS', 'SYSTEM'],
      required: [true, 'Actor role is required'],
    },
  },
  
  // Target information (what was acted upon)
  target: {
    type: {
      type: String,
      enum: ['USER', 'COURSE', 'LESSON', 'ENROLLMENT', 'COHORT', 'FILE', 'NOTE', 'DISCUSSION', 'SYSTEM', 'API', 'ASSESSMENT', 'ACTIVITY', 'ANALYTICS', 'STATISTICS', 'OTHER'],
      required: [true, 'Target type is required'],
    },
    id: {
      type: mongoose.Schema.Types.ObjectId,
      required: false, // Allow null for system actions
    },
    model: {
      type: String,
      enum: ['User', 'Course', 'Lesson', 'Enrollment', 'Cohort', 'File', 'Note', 'Discussion', 'CourseMaterial', 'Assessment', 'Activity'],
    },
    name: {
      type: String,
      description: 'Human-readable name of the target',
    },
  },
  
  // Additional context and metadata
  context: {
    ipAddress: {
      type: String,
      description: 'IP address of the actor',
    },
    userAgent: {
      type: String,
      description: 'User agent string',
    },
    sessionId: {
      type: String,
      description: 'Session identifier',
    },
    requestId: {
      type: String,
      description: 'Unique request identifier',
    },
    endpoint: {
      type: String,
      description: 'API endpoint that was called',
    },
    method: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      description: 'HTTP method used',
    },
  },
  
  // Changes made (for update actions)
  changes: {
    before: {
      type: mongoose.Schema.Types.Mixed,
      description: 'State before the action',
    },
    after: {
      type: mongoose.Schema.Types.Mixed,
      description: 'State after the action',
    },
    fields: [{
      type: String,
      description: 'Fields that were changed',
    }],
  },
  
  // Additional data
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    description: 'Additional contextual data',
  },
  
  // Status and outcome
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILURE', 'PENDING', 'CANCELLED'],
    default: 'SUCCESS',
  },
  
  error: {
    code: {
      type: String,
      description: 'Error code if action failed',
    },
    message: {
      type: String,
      description: 'Error message if action failed',
    },
    stack: {
      type: String,
      description: 'Error stack trace if available',
    },
  },
  
  // Timestamps
  performedAt: {
    type: Date,
    default: Date.now,
    required: true,
  },
  
  duration: {
    type: Number,
    description: 'Duration of the action in milliseconds',
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes for better query performance
activitySchema.index({ action: 1 });
activitySchema.index({ 'actor.userId': 1 });
activitySchema.index({ 'actor.role': 1 });
activitySchema.index({ 'target.type': 1 });
activitySchema.index({ 'target.id': 1 });
activitySchema.index({ status: 1 });
activitySchema.index({ performedAt: -1 });
activitySchema.index({ createdAt: -1 });

// Compound indexes for common queries
activitySchema.index({ 'actor.userId': 1, performedAt: -1 });
activitySchema.index({ action: 1, performedAt: -1 });
activitySchema.index({ 'target.type': 1, 'target.id': 1 });

// Virtual for human-readable description
activitySchema.virtual('description').get(function() {
  const descriptions = {
    USER_REGISTERED: `${this.actor.name} registered as a new user`,
    USER_LOGIN: `${this.actor.name} logged in`,
    USER_LOGOUT: `${this.actor.name} logged out`,
    USER_PROFILE_UPDATED: `${this.actor.name} updated their profile`,
    USER_PASSWORD_CHANGED: `${this.actor.name} changed their password`,
    USER_AVATAR_UPLOADED: `${this.actor.name} uploaded a new avatar`,
    USER_INVITED: `${this.actor.name} was invited by ${this.metadata?.invitedBy || 'an admin'}`,
    USER_VERIFIED: `${this.actor.name} was verified`,
    USER_SUSPENDED: `${this.actor.name} was suspended`,
    USER_ACTIVATED: `${this.actor.name} was activated`,
    USER_DELETED: `${this.actor.name} was deleted`,
    
    COURSE_CREATED: `${this.actor.name} created course "${this.target.name}"`,
    COURSE_UPDATED: `${this.actor.name} updated course "${this.target.name}"`,
    COURSE_DELETED: `${this.actor.name} deleted course "${this.target.name}"`,
    COURSE_PUBLISHED: `${this.actor.name} published course "${this.target.name}"`,
    COURSE_ARCHIVED: `${this.actor.name} archived course "${this.target.name}"`,
    COURSE_VIEWED: `${this.actor.name} viewed course "${this.target.name}"`,
    
    LESSON_CREATED: `${this.actor.name} created lesson in course "${this.metadata?.courseName || 'Unknown'}"`,
    LESSON_UPDATED: `${this.actor.name} updated lesson "${this.target.name}"`,
    LESSON_DELETED: `${this.actor.name} deleted lesson "${this.target.name}"`,
    LESSON_COMPLETED: `${this.actor.name} completed lesson "${this.target.name}"`,
    LESSON_PROGRESS_UPDATED: `${this.actor.name} updated progress for lesson "${this.target.name}"`,
    LESSON_VIEWED: `${this.actor.name} viewed lesson "${this.target.name}"`,
    
    ENROLLMENT_CREATED: `${this.actor.name} enrolled in course "${this.metadata?.courseName || 'Unknown'}"`,
    ENROLLMENT_UPDATED: `${this.actor.name} updated enrollment in course "${this.metadata?.courseName || 'Unknown'}"`,
    ENROLLMENT_WITHDRAWN: `${this.actor.name} withdrew from course "${this.metadata?.courseName || 'Unknown'}"`,
    ENROLLMENT_COMPLETED: `${this.actor.name} completed course "${this.metadata?.courseName || 'Unknown'}"`,
    
    COHORT_CREATED: `${this.actor.name} created cohort "${this.target.name}"`,
    COHORT_UPDATED: `${this.actor.name} updated cohort "${this.target.name}"`,
    COHORT_DELETED: `${this.actor.name} deleted cohort "${this.target.name}"`,
    COHORT_MEMBER_ADDED: `${this.actor.name} added member to cohort "${this.target.name}"`,
    COHORT_MEMBER_REMOVED: `${this.actor.name} removed member from cohort "${this.target.name}"`,
    COHORT_MEMBER_ROLE_UPDATED: `${this.actor.name} updated member role in cohort "${this.target.name}"`,
    
    FILE_UPLOADED: `${this.actor.name} uploaded file "${this.target.name}"`,
    FILE_DELETED: `${this.actor.name} deleted file "${this.target.name}"`,
    FILE_DOWNLOADED: `${this.actor.name} downloaded file "${this.target.name}"`,
    
    NOTE_CREATED: `${this.actor.name} created a note`,
    NOTE_UPDATED: `${this.actor.name} updated a note`,
    NOTE_DELETED: `${this.actor.name} deleted a note`,
    DISCUSSION_CREATED: `${this.actor.name} created a discussion`,
    DISCUSSION_UPDATED: `${this.actor.name} updated a discussion`,
    DISCUSSION_DELETED: `${this.actor.name} deleted a discussion`,
    REPLY_ADDED: `${this.actor.name} added a reply to a discussion`,
    
    SYSTEM_ERROR: `System error occurred: ${this.error?.message || 'Unknown error'}`,
    SYSTEM_WARNING: `System warning: ${this.metadata?.message || 'Unknown warning'}`,
    SYSTEM_MAINTENANCE: `System maintenance performed`,
    BACKUP_CREATED: `System backup created`,
    CLEANUP_PERFORMED: `System cleanup performed`,
    
    BULK_ACTION_PERFORMED: `${this.actor.name} performed bulk action: ${this.metadata?.action || 'Unknown'}`,
    SETTINGS_UPDATED: `${this.actor.name} updated system settings`,
    REPORT_GENERATED: `${this.actor.name} generated a report`,
    EXPORT_PERFORMED: `${this.actor.name} performed data export`,
  };
  
  return descriptions[this.action] || `${this.actor.name} performed ${this.action}`;
});

// Static methods for common queries
activitySchema.statics.findByUser = function(userId, options = {}) {
  const query = { 'actor.userId': userId };
  return this.find(query)
    .sort({ performedAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

activitySchema.statics.findByAction = function(action, options = {}) {
  const query = { action };
  return this.find(query)
    .sort({ performedAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

activitySchema.statics.findByTarget = function(targetType, targetId, options = {}) {
  const query = { 'target.type': targetType, 'target.id': targetId };
  return this.find(query)
    .sort({ performedAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

activitySchema.statics.findRecent = function(options = {}) {
  const query = {};
  if (options.days) {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - options.days);
    query.performedAt = { $gte: daysAgo };
  }
  
  return this.find(query)
    .sort({ performedAt: -1 })
    .limit(options.limit || 100)
    .skip(options.skip || 0);
};

activitySchema.statics.getActivitySummary = async function(options = {}) {
  const query = {};
  if (options.days) {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - options.days);
    query.performedAt = { $gte: daysAgo };
  }
  
  const pipeline = [
    { $match: query },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
        lastPerformed: { $max: '$performedAt' },
        users: { $addToSet: '$actor.userId' }
      }
    },
    {
      $project: {
        action: '$_id',
        count: 1,
        lastPerformed: 1,
        uniqueUsers: { $size: '$users' }
      }
    },
    { $sort: { count: -1 } }
  ];
  
  return this.aggregate(pipeline);
};

export const Activity = mongoose.model('Activity', activitySchema);
