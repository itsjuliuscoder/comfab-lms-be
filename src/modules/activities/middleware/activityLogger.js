import ActivityService from '../services/activityService.js';
import { logger } from '../../../utils/logger.js';

/**
 * Middleware to automatically log activities
 * @param {string} action - The action to log
 * @param {Function} getTarget - Function to get target information from request
 * @param {Function} getMetadata - Function to get additional metadata from request
 * @param {Function} shouldLog - Function to determine if activity should be logged
 */
export const activityLogger = (action, getTarget = null, getMetadata = null, shouldLog = null) => {
  return async (req, res, next) => {
    const startTime = Date.now();
    const originalSend = res.send;
    const originalJson = res.json;

    // Override response methods to capture the response
    res.send = function(data) {
      res.send = originalSend;
      return originalSend.call(this, data);
    };

    res.json = function(data) {
      res.json = originalJson;
      return originalJson.call(this, data);
    };

    // Store original end to capture when response is sent
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
      res.end = originalEnd;
      
      // Log activity after response is sent
      setTimeout(async () => {
        try {
          // Check if activity should be logged
          if (shouldLog && !shouldLog(req, res)) {
            return;
          }

          // Only log successful requests
          if (res.statusCode >= 400) {
            return;
          }

          // Get actor information
          const actor = req.user ? {
            userId: req.user._id,
            name: req.user.name,
            email: req.user.email,
            role: req.user.role,
          } : {
            userId: null,
            name: 'System',
            email: 'system@confab.org',
            role: 'SYSTEM',
          };

          // Get target information
          let target = {
            type: 'SYSTEM',
            id: null,
            model: null,
            name: 'API Request',
          };

          if (getTarget) {
            try {
              target = getTarget(req, res);
            } catch (error) {
              logger.error('Error getting target for activity log:', error);
            }
          }

          // Get metadata
          let metadata = {
            endpoint: req.originalUrl,
            method: req.method,
            statusCode: res.statusCode,
            duration: Date.now() - startTime,
          };

          if (getMetadata) {
            try {
              const additionalMetadata = getMetadata(req, res);
              metadata = { ...metadata, ...additionalMetadata };
            } catch (error) {
              logger.error('Error getting metadata for activity log:', error);
            }
          }

          // Get context information
          const context = {
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            sessionId: req.session?.id,
            requestId: req.headers['x-request-id'],
            endpoint: req.originalUrl,
            method: req.method,
          };

          // Log the activity
          await ActivityService.logActivity({
            action,
            actor,
            target,
            context,
            metadata,
            duration: Date.now() - startTime,
          });

        } catch (error) {
          logger.error('Error logging activity:', error);
        }
      }, 0);

      return originalEnd.call(this, chunk, encoding);
    };

    next();
  };
};

/**
 * Predefined activity loggers for common actions
 */

// User registration logger
export const logUserRegistration = activityLogger(
  'USER_REGISTERED',
  (req, res) => ({
    type: 'USER',
    id: res.locals?.user?._id,
    model: 'User',
    name: req.body.name,
  }),
  (req, res) => ({
    registrationMethod: 'direct',
    source: 'api',
  })
);

// User login logger
export const logUserLogin = activityLogger(
  'USER_LOGIN',
  (req, res) => ({
    type: 'USER',
    id: req.user?._id,
    model: 'User',
    name: req.user?.name,
  }),
  (req, res) => ({
    loginMethod: 'email',
    device: req.get('User-Agent') ? ActivityService.extractDeviceInfo(req.get('User-Agent')) : null,
  })
);

// User logout logger
export const logUserLogout = activityLogger(
  'USER_LOGOUT',
  (req, res) => ({
    type: 'USER',
    id: req.user?._id,
    model: 'User',
    name: req.user?.name,
  })
);

// Profile update logger
export const logProfileUpdate = activityLogger(
  'USER_PROFILE_UPDATED',
  (req, res) => ({
    type: 'USER',
    id: req.user?._id,
    model: 'User',
    name: req.user?.name,
  }),
  (req, res) => ({
    updateType: 'profile',
    changedFields: Object.keys(req.body),
  })
);

// Course creation logger
export const logCourseCreation = activityLogger(
  'COURSE_CREATED',
  (req, res) => ({
    type: 'COURSE',
    id: res.locals?.course?._id,
    model: 'Course',
    name: req.body.title,
  }),
  (req, res) => ({
    difficulty: req.body.difficulty,
    isPublic: req.body.isPublic,
  })
);

// Course update logger
export const logCourseUpdate = activityLogger(
  'COURSE_UPDATED',
  (req, res) => ({
    type: 'COURSE',
    id: req.params.id,
    model: 'Course',
    name: req.body.title || res.locals?.course?.title,
  }),
  (req, res) => ({
    changedFields: Object.keys(req.body),
  })
);

// Course deletion logger
export const logCourseDeletion = activityLogger(
  'COURSE_DELETED',
  (req, res) => ({
    type: 'COURSE',
    id: req.params.id,
    model: 'Course',
    name: res.locals?.course?.title,
  }),
  (req, res) => ({
    hadEnrollments: res.locals?.course?.enrollmentCount > 0,
  })
);

// Enrollment creation logger
export const logEnrollmentCreation = activityLogger(
  'ENROLLMENT_CREATED',
  (req, res) => ({
    type: 'ENROLLMENT',
    id: res.locals?.enrollment?._id,
    model: 'Enrollment',
    name: `Enrollment in ${res.locals?.course?.title || 'Unknown Course'}`,
  }),
  (req, res) => ({
    courseId: req.body.courseId,
    courseName: res.locals?.course?.title,
  })
);

// Cohort creation logger
export const logCohortCreation = activityLogger(
  'COHORT_CREATED',
  (req, res) => ({
    type: 'COHORT',
    id: res.locals?.cohort?._id,
    model: 'Cohort',
    name: req.body.name,
  }),
  (req, res) => ({
    year: req.body.year,
    maxParticipants: req.body.maxParticipants,
  })
);

// File upload logger
export const logFileUpload = activityLogger(
  'FILE_UPLOADED',
  (req, res) => ({
    type: 'FILE',
    id: res.locals?.file?._id,
    model: 'File',
    name: req.file?.originalname || res.locals?.file?.filename,
  }),
  (req, res) => ({
    fileSize: req.file?.size,
    fileType: req.file?.mimetype,
    uploadType: req.baseUrl.includes('avatar') ? 'avatar' : 'general',
  })
);

// Lesson completion logger
export const logLessonCompletion = activityLogger(
  'LESSON_COMPLETED',
  (req, res) => ({
    type: 'LESSON',
    id: req.params.lessonId,
    model: 'Lesson',
    name: res.locals?.lesson?.title,
  }),
  (req, res) => ({
    courseId: req.params.courseId,
    courseName: res.locals?.course?.title,
    timeSpent: req.body.timeSpent,
  })
);

// System error logger
export const logSystemError = (error, req) => {
  return ActivityService.logSystemError(error, {
    ipAddress: req?.ip || req?.connection?.remoteAddress,
    userAgent: req?.get('User-Agent'),
    endpoint: req?.originalUrl,
    method: req?.method,
  });
};

/**
 * Conditional activity logger that only logs on success
 */
export const conditionalActivityLogger = (action, getTarget, getMetadata, condition) => {
  return activityLogger(action, getTarget, getMetadata, (req, res) => {
    return condition ? condition(req, res) : true;
  });
};

/**
 * Batch activity logger for multiple actions
 */
export const batchActivityLogger = (actions) => {
  return async (req, res, next) => {
    const startTime = Date.now();
    
    // Store original response methods
    const originalSend = res.send;
    const originalJson = res.json;
    const originalEnd = res.end;

    // Override response methods
    res.send = function(data) {
      res.send = originalSend;
      return originalSend.call(this, data);
    };

    res.json = function(data) {
      res.json = originalJson;
      return originalJson.call(this, data);
    };

    res.end = function(chunk, encoding) {
      res.end = originalEnd;
      
      // Log multiple activities
      setTimeout(async () => {
        try {
          if (res.statusCode >= 400) return;

          const actor = req.user ? {
            userId: req.user._id,
            name: req.user.name,
            email: req.user.email,
            role: req.user.role,
          } : {
            userId: null,
            name: 'System',
            email: 'system@confab.org',
            role: 'SYSTEM',
          };

          const context = {
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            endpoint: req.originalUrl,
            method: req.method,
          };

          // Log each action
          for (const actionConfig of actions) {
            try {
              const target = actionConfig.getTarget ? actionConfig.getTarget(req, res) : {
                type: 'SYSTEM',
                id: null,
                model: null,
                name: 'Batch Action',
              };

              const metadata = actionConfig.getMetadata ? actionConfig.getMetadata(req, res) : {};

              await ActivityService.logActivity({
                action: actionConfig.action,
                actor,
                target,
                context,
                metadata,
                duration: Date.now() - startTime,
              });
            } catch (error) {
              logger.error(`Error logging batch activity ${actionConfig.action}:`, error);
            }
          }
        } catch (error) {
          logger.error('Error in batch activity logger:', error);
        }
      }, 0);

      return originalEnd.call(this, chunk, encoding);
    };

    next();
  };
};
