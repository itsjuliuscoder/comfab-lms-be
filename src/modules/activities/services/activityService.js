import { Activity } from '../models/Activity.js';
import { logger } from '../../../utils/logger.js';

/**
 * Activity Service for logging and tracking user actions
 */
class ActivityService {
  /**
   * Log an activity
   * @param {Object} options - Activity options
   * @param {string} options.action - The action performed
   * @param {Object} options.actor - Actor information
   * @param {Object} options.target - Target information
   * @param {Object} options.context - Context information
   * @param {Object} options.changes - Changes made
   * @param {Object} options.metadata - Additional metadata
   * @param {string} options.status - Activity status
   * @param {Object} options.error - Error information
   * @param {number} options.duration - Duration in milliseconds
   */
  static async logActivity(options) {
    try {
      const {
        action,
        actor,
        target,
        context = {},
        changes = {},
        metadata = {},
        status = 'SUCCESS',
        error = null,
        duration = null,
      } = options;

      // Validate required fields
      if (!action || !actor || !target) {
        logger.error('Missing required fields for activity logging', { action, actor, target });
        return null;
      }

      // Create activity record
      const activity = new Activity({
        action,
        actor,
        target,
        context,
        changes,
        metadata,
        status,
        error,
        duration,
        performedAt: new Date(),
      });

      await activity.save();
      
      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        logger.info(`Activity logged: ${action} by ${actor.name}`, {
          action,
          actor: actor.name,
          target: target.name || target.type,
          status,
        });
      }

      return activity;
    } catch (error) {
      logger.error('Failed to log activity', error);
      return null;
    }
  }

  /**
   * Log user registration
   */
  static async logUserRegistration(user, context = {}) {
    return this.logActivity({
      action: 'USER_REGISTERED',
      actor: {
        userId: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      target: {
        type: 'USER',
        id: user._id,
        model: 'User',
        name: user.name,
      },
      context,
      metadata: {
        registrationMethod: context.registrationMethod || 'direct',
        source: context.source || 'api',
      },
    });
  }

  /**
   * Log user login
   */
  static async logUserLogin(user, context = {}) {
    return this.logActivity({
      action: 'USER_LOGIN',
      actor: {
        userId: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      target: {
        type: 'USER',
        id: user._id,
        model: 'User',
        name: user.name,
      },
      context,
      metadata: {
        loginMethod: context.loginMethod || 'email',
        device: context.userAgent ? this.extractDeviceInfo(context.userAgent) : null,
      },
    });
  }

  /**
   * Log user logout
   */
  static async logUserLogout(user, context = {}) {
    return this.logActivity({
      action: 'USER_LOGOUT',
      actor: {
        userId: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      target: {
        type: 'USER',
        id: user._id,
        model: 'User',
        name: user.name,
      },
      context,
    });
  }

  /**
   * Log profile update
   */
  static async logProfileUpdate(user, changes, context = {}) {
    return this.logActivity({
      action: 'USER_PROFILE_UPDATED',
      actor: {
        userId: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      target: {
        type: 'USER',
        id: user._id,
        model: 'User',
        name: user.name,
      },
      context,
      changes: {
        fields: Object.keys(changes),
        after: changes,
      },
      metadata: {
        updateType: 'profile',
      },
    });
  }

  /**
   * Log course creation
   */
  static async logCourseCreation(user, course, context = {}) {
    return this.logActivity({
      action: 'COURSE_CREATED',
      actor: {
        userId: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      target: {
        type: 'COURSE',
        id: course._id,
        model: 'Course',
        name: course.title,
      },
      context,
      metadata: {
        courseId: course._id,
        difficulty: course.difficulty,
        isPublic: course.isPublic,
      },
    });
  }

  /**
   * Log course update
   */
  static async logCourseUpdate(user, course, changes, context = {}) {
    return this.logActivity({
      action: 'COURSE_UPDATED',
      actor: {
        userId: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      target: {
        type: 'COURSE',
        id: course._id,
        model: 'Course',
        name: course.title,
      },
      context,
      changes: {
        fields: Object.keys(changes),
        before: changes.before,
        after: changes.after,
      },
      metadata: {
        courseId: course._id,
      },
    });
  }

  /**
   * Log course deletion
   */
  static async logCourseDeletion(user, course, context = {}) {
    return this.logActivity({
      action: 'COURSE_DELETED',
      actor: {
        userId: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      target: {
        type: 'COURSE',
        id: course._id,
        model: 'Course',
        name: course.title,
      },
      context,
      metadata: {
        courseId: course._id,
        hadEnrollments: course.enrollmentCount > 0,
      },
    });
  }

  /**
   * Log enrollment creation
   */
  static async logEnrollmentCreation(user, enrollment, course, context = {}) {
    return this.logActivity({
      action: 'ENROLLMENT_CREATED',
      actor: {
        userId: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      target: {
        type: 'ENROLLMENT',
        id: enrollment._id,
        model: 'Enrollment',
        name: `Enrollment in ${course.title}`,
      },
      context,
      metadata: {
        courseId: course._id,
        courseName: course.title,
        enrollmentId: enrollment._id,
      },
    });
  }

  /**
   * Log cohort creation
   */
  static async logCohortCreation(user, cohort, context = {}) {
    return this.logActivity({
      action: 'COHORT_CREATED',
      actor: {
        userId: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      target: {
        type: 'COHORT',
        id: cohort._id,
        model: 'Cohort',
        name: cohort.name,
      },
      context,
      metadata: {
        cohortId: cohort._id,
        year: cohort.year,
        maxParticipants: cohort.maxParticipants,
      },
    });
  }

  /**
   * Log cohort member addition
   */
  static async logCohortMemberAddition(user, cohort, memberUser, roleInCohort, context = {}) {
    return this.logActivity({
      action: 'COHORT_MEMBER_ADDED',
      actor: {
        userId: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      target: {
        type: 'COHORT',
        id: cohort._id,
        model: 'Cohort',
        name: cohort.name,
      },
      context,
      metadata: {
        cohortId: cohort._id,
        memberId: memberUser._id,
        memberName: memberUser.name,
        memberEmail: memberUser.email,
        roleInCohort,
      },
    });
  }

  /**
   * Log file upload
   */
  static async logFileUpload(user, file, context = {}) {
    return this.logActivity({
      action: 'FILE_UPLOADED',
      actor: {
        userId: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      target: {
        type: 'FILE',
        id: file._id,
        model: 'File',
        name: file.originalName || file.filename,
      },
      context,
      metadata: {
        fileId: file._id,
        fileSize: file.size,
        fileType: file.mimetype,
        uploadType: context.uploadType || 'general',
      },
    });
  }

  /**
   * Log lesson completion
   */
  static async logLessonCompletion(user, lesson, course, context = {}) {
    return this.logActivity({
      action: 'LESSON_COMPLETED',
      actor: {
        userId: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      target: {
        type: 'LESSON',
        id: lesson._id,
        model: 'Lesson',
        name: lesson.title,
      },
      context,
      metadata: {
        lessonId: lesson._id,
        courseId: course._id,
        courseName: course.title,
        timeSpent: context.timeSpent,
      },
    });
  }

  /**
   * Log system error
   */
  static async logSystemError(error, context = {}) {
    return this.logActivity({
      action: 'SYSTEM_ERROR',
      actor: {
        userId: null,
        name: 'System',
        email: 'system@confab.org',
        role: 'SYSTEM',
      },
      target: {
        type: 'SYSTEM',
        id: null,
        model: null,
        name: 'System Error',
      },
      context,
      status: 'FAILURE',
      error: {
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message,
        stack: error.stack,
      },
      metadata: {
        errorType: error.name,
        timestamp: new Date(),
      },
    });
  }

  /**
   * Log system warning
   */
  static async logSystemWarning(message, context = {}) {
    return this.logActivity({
      action: 'SYSTEM_WARNING',
      actor: {
        userId: null,
        name: 'System',
        email: 'system@confab.org',
        role: 'SYSTEM',
      },
      target: {
        type: 'SYSTEM',
        id: null,
        model: null,
        name: 'System Warning',
      },
      context,
      metadata: {
        message,
        timestamp: new Date(),
      },
    });
  }

  /**
   * Extract device information from user agent
   */
  static extractDeviceInfo(userAgent) {
    try {
      // Simple device detection (you can use a library like ua-parser-js for more accurate detection)
      const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
      const isTablet = /iPad|Android(?=.*\bMobile\b)(?=.*\bSafari\b)/.test(userAgent);
      const isDesktop = !isMobile && !isTablet;
      
      return {
        isMobile,
        isTablet,
        isDesktop,
        userAgent: userAgent.substring(0, 200), // Truncate for storage
      };
    } catch (error) {
      return { userAgent: 'Unknown' };
    }
  }

  /**
   * Get activity summary for dashboard
   */
  static async getDashboardSummary(days = 30) {
    try {
      const summary = await Activity.getActivitySummary({ days });
      
      // Get recent activities
      const recentActivities = await Activity.findRecent({ days, limit: 10 });
      
      // Get top users by activity
      const topUsers = await Activity.aggregate([
        {
          $match: {
            performedAt: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
            'actor.userId': { $ne: null },
          },
        },
        {
          $group: {
            _id: '$actor.userId',
            name: { $first: '$actor.name' },
            email: { $first: '$actor.email' },
            role: { $first: '$actor.role' },
            activityCount: { $sum: 1 },
          },
        },
        { $sort: { activityCount: -1 } },
        { $limit: 10 },
      ]);

      return {
        summary,
        recentActivities,
        topUsers,
        totalActivities: recentActivities.length,
      };
    } catch (error) {
      logger.error('Failed to get dashboard summary', error);
      return {
        summary: [],
        recentActivities: [],
        topUsers: [],
        totalActivities: 0,
      };
    }
  }


  /**
   * Clean up old activities (for maintenance)
   */
  static async cleanupOldActivities(daysToKeep = 365) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await Activity.deleteMany({
        performedAt: { $lt: cutoffDate },
      });

      logger.info(`Cleaned up ${result.deletedCount} old activities`);
      return result.deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup old activities', error);
      return 0;
    }
  }
}

export default ActivityService;
