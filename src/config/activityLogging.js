/**
 * Activity Logging Configuration
 * Centralized configuration for activity logging across the application
 */

export const activityLoggingConfig = {
  // Global settings
  enabled: process.env.ACTIVITY_LOGGING_ENABLED !== 'false',
  
  // Actions to exclude from logging
  excludeActions: [
    'GET /health',
    'GET /api/v1/activities',
    'GET /api/v1/analytics',
    'GET /api/v1/statistics',
    'GET /api/v1/courses/*/materials', // Exclude material downloads to reduce noise
    'GET /api/v1/upload/*' // Exclude file downloads
  ],
  
  // Role-based logging configuration
  roleBasedLogging: {
    'ADMIN': {
      methods: ['*'], // Log all HTTP methods
      includeReads: true,
      includeWrites: true,
      includeSystem: true
    },
    'INSTRUCTOR': {
      methods: ['*'], // Log all HTTP methods
      includeReads: true,
      includeWrites: true,
      includeSystem: false
    },
    'PARTICIPANT': {
      methods: ['POST', 'PUT', 'PATCH', 'DELETE'], // Only log write operations
      includeReads: false,
      includeWrites: true,
      includeSystem: false
    },
    'ANONYMOUS': {
      methods: ['POST', 'PUT', 'PATCH', 'DELETE'], // Only log write operations
      includeReads: false,
      includeWrites: true,
      includeSystem: false
    }
  },
  
  // Request/response logging settings
  requestLogging: {
    logBodies: process.env.NODE_ENV === 'development', // Only log bodies in development
    maxBodySize: 1000, // Maximum body size to log (in characters)
    logHeaders: true,
    logQuery: true,
    logParams: true,
    sensitiveFields: ['password', 'token', 'secret', 'key', 'authorization']
  },
  
  // Response logging settings
  responseLogging: {
    logBodies: process.env.NODE_ENV === 'development',
    maxBodySize: 1000,
    logHeaders: false,
    logStatusCodes: true
  },
  
  // Performance settings
  performance: {
    logDuration: true,
    logSlowRequests: true,
    slowRequestThreshold: 5000, // 5 seconds
    logMemoryUsage: false
  },
  
  // Error logging settings
  errorLogging: {
    logFailures: true,
    logErrors: true,
    logStackTraces: process.env.NODE_ENV === 'development',
    includeErrorDetails: true
  },
  
  // Custom action mappings
  customActionMapping: {
    // Authentication actions
    'POST /api/v1/auth/login': 'USER_LOGIN',
    'POST /api/v1/auth/logout': 'USER_LOGOUT',
    'POST /api/v1/auth/register': 'USER_REGISTERED',
    'POST /api/v1/auth/forgot-password': 'USER_PASSWORD_RESET_REQUESTED',
    'POST /api/v1/auth/reset-password': 'USER_PASSWORD_CHANGED',
    
    // User actions
    'GET /api/v1/users/profile': 'USER_PROFILE_VIEWED',
    'PUT /api/v1/users/profile': 'USER_PROFILE_UPDATED',
    'POST /api/v1/users/avatar': 'USER_AVATAR_UPLOADED',
    'POST /api/v1/users/bulk-invite': 'BULK_USER_INVITED',
    
    // Course actions
    'GET /api/v1/courses/:id': 'COURSE_VIEWED',
    'POST /api/v1/courses': 'COURSE_CREATED',
    'PUT /api/v1/courses/:id': 'COURSE_UPDATED',
    'DELETE /api/v1/courses/:id': 'COURSE_DELETED',
    'PATCH /api/v1/courses/:id/publish': 'COURSE_PUBLISHED',
    
    // Lesson actions
    'GET /api/v1/courses/:id/lessons/:lessonId': 'LESSON_VIEWED',
    'POST /api/v1/courses/:id/lessons': 'LESSON_CREATED',
    'PUT /api/v1/courses/:id/lessons/:lessonId': 'LESSON_UPDATED',
    'DELETE /api/v1/courses/:id/lessons/:lessonId': 'LESSON_DELETED',
    'POST /api/v1/courses/:id/lessons/:lessonId/complete': 'LESSON_COMPLETED',
    
    // Enrollment actions
    'POST /api/v1/enrollments': 'ENROLLMENT_CREATED',
    'PUT /api/v1/enrollments/:id': 'ENROLLMENT_UPDATED',
    'DELETE /api/v1/enrollments/:id': 'ENROLLMENT_WITHDRAWN',
    
    // Course material actions
    'POST /api/v1/course-materials': 'COURSE_MATERIAL_UPLOADED',
    'PUT /api/v1/course-materials/:id': 'COURSE_MATERIAL_UPDATED',
    'DELETE /api/v1/course-materials/:id': 'COURSE_MATERIAL_DELETED',
    'POST /api/v1/course-materials/:id/download': 'COURSE_MATERIAL_DOWNLOADED',
    
    // File upload actions
    'POST /api/v1/upload': 'FILE_UPLOADED',
    'DELETE /api/v1/upload/:id': 'FILE_DELETED',
    
    // Assessment actions
    'POST /api/v1/assessments/:id/submit': 'ASSESSMENT_SUBMITTED',
    'GET /api/v1/assessments/:id': 'ASSESSMENT_VIEWED',
    
    // Cohort actions
    'POST /api/v1/cohorts': 'COHORT_CREATED',
    'PUT /api/v1/cohorts/:id': 'COHORT_UPDATED',
    'DELETE /api/v1/cohorts/:id': 'COHORT_DELETED',
    'POST /api/v1/cohorts/:id/members': 'COHORT_MEMBER_ADDED',
    'DELETE /api/v1/cohorts/:id/members/:memberId': 'COHORT_MEMBER_REMOVED'
  },
  
  // Target type mappings
  targetTypeMapping: {
    'users': 'USER',
    'courses': 'COURSE',
    'lessons': 'LESSON',
    'enrollments': 'ENROLLMENT',
    'cohorts': 'COHORT',
    'activities': 'ACTIVITY',
    'analytics': 'ANALYTICS',
    'statistics': 'STATISTICS',
    'upload': 'FILE',
    'course-materials': 'FILE',
    'assessments': 'ASSESSMENT',
    'auth': 'SYSTEM'
  },
  
  // Batch processing settings
  batchProcessing: {
    enabled: true,
    batchSize: 100,
    flushInterval: 5000, // 5 seconds
    maxRetries: 3
  },
  
  // Storage settings
  storage: {
    maxAge: 365, // Days to keep activities
    cleanupInterval: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    archiveOldActivities: true,
    archiveAfterDays: 90
  },
  
  // Security settings
  security: {
    sanitizeData: true,
    hashSensitiveData: false, // Set to true to hash sensitive data
    encryptLogs: false, // Set to true to encrypt log data
    auditTrail: true
  }
};

/**
 * Get activity logging configuration for a specific environment
 */
export const getActivityLoggingConfig = (environment = process.env.NODE_ENV) => {
  const config = { ...activityLoggingConfig };
  
  switch (environment) {
    case 'development':
      config.requestLogging.logBodies = true;
      config.responseLogging.logBodies = true;
      config.errorLogging.logStackTraces = true;
      config.performance.logMemoryUsage = true;
      break;
      
    case 'production':
      config.requestLogging.logBodies = false;
      config.responseLogging.logBodies = false;
      config.errorLogging.logStackTraces = false;
      config.performance.logMemoryUsage = false;
      config.security.encryptLogs = true;
      break;
      
    case 'test':
      config.enabled = false; // Disable logging in tests
      break;
  }
  
  return config;
};

/**
 * Check if an action should be logged based on configuration
 */
export const shouldLogAction = (method, path, userRole = 'ANONYMOUS', config = activityLoggingConfig) => {
  if (!config.enabled) return false;
  
  const actionKey = `${method} ${path}`;
  
  // Check if action is explicitly excluded
  if (config.excludeActions.some(excluded => 
    excluded === actionKey || 
    (excluded.endsWith('*') && actionKey.startsWith(excluded.slice(0, -1)))
  )) {
    return false;
  }
  
  // Check role-based logging
  const roleConfig = config.roleBasedLogging[userRole];
  if (!roleConfig) return false;
  
  // Check if method is allowed for this role
  if (!roleConfig.methods.includes('*') && !roleConfig.methods.includes(method)) {
    return false;
  }
  
  // Check if read operations should be logged
  if (['GET', 'HEAD', 'OPTIONS'].includes(method) && !roleConfig.includeReads) {
    return false;
  }
  
  // Check if write operations should be logged
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && !roleConfig.includeWrites) {
    return false;
  }
  
  return true;
};

export default activityLoggingConfig;
