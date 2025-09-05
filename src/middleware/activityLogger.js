import { v4 as uuidv4 } from 'uuid';
import ActivityService from '../modules/activities/services/activityService.js';
import { logger } from '../utils/logger.js';

/**
 * Activity Logging Middleware
 * Automatically logs all API actions for audit and analytics purposes
 */
export const activityLogger = (options = {}) => {
  const {
    // Actions to exclude from logging
    excludeActions = [
      'GET /health',
      'GET /api/v1/activities', // Prevent infinite loops
      'GET /api/v1/analytics',
      'GET /api/v1/statistics'
    ],
    // Actions to include only for specific roles
    roleBasedLogging = {
      'ADMIN': ['*'], // Log everything for admins
      'INSTRUCTOR': ['*'], // Log everything for instructors
      'PARTICIPANT': ['POST', 'PUT', 'PATCH', 'DELETE'] // Log only write operations for participants
    },
    // Whether to log request/response bodies (be careful with sensitive data)
    logBodies = false,
    // Maximum body size to log (in characters)
    maxBodySize = 1000,
    // Whether to log successful operations
    logSuccess = true,
    // Whether to log failed operations
    logFailure = true,
    // Custom action mapping
    customActionMapping = {}
  } = options;

  return async (req, res, next) => {
    const startTime = Date.now();
    const requestId = uuidv4();
    
    // Add request ID to request object for tracking
    req.requestId = requestId;
    
    // Skip logging for excluded actions
    const actionKey = `${req.method} ${req.path}`;
    if (excludeActions.some(excluded => 
      excluded === actionKey || 
      (excluded.endsWith('*') && actionKey.startsWith(excluded.slice(0, -1)))
    )) {
      return next();
    }

    // Check role-based logging
    if (req.user) {
      const userRole = req.user.role;
      const roleRules = roleBasedLogging[userRole];
      
      if (roleRules && !roleRules.includes('*') && !roleRules.includes(req.method)) {
        return next();
      }
    }

    // Capture request data
    const requestData = {
      method: req.method,
      path: req.path,
      query: req.query,
      params: req.params,
      headers: {
        'user-agent': req.get('User-Agent'),
        'content-type': req.get('Content-Type'),
        'authorization': req.get('Authorization') ? '[REDACTED]' : undefined
      },
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionID,
      requestId
    };

    // Capture request body (if enabled and not too large)
    if (logBodies && req.body && Object.keys(req.body).length > 0) {
      const bodyStr = JSON.stringify(req.body);
      if (bodyStr.length <= maxBodySize) {
        requestData.body = req.body;
      } else {
        requestData.body = { 
          message: `Body too large (${bodyStr.length} chars), truncated`,
          size: bodyStr.length
        };
      }
    }

    // Store original response methods
    const originalSend = res.send;
    const originalJson = res.json;
    const originalEnd = res.end;

    let responseData = {};
    let responseBody = null;

    // Override response methods to capture response data
    res.send = function(data) {
      responseBody = data;
      return originalSend.call(this, data);
    };

    res.json = function(data) {
      responseBody = data;
      return originalJson.call(this, data);
    };

    res.end = function(data) {
      if (data) responseBody = data;
      return originalEnd.call(this, data);
    };

    // Log the activity after response is sent
    res.on('finish', async () => {
      try {
        const duration = Date.now() - startTime;
        const isSuccess = res.statusCode >= 200 && res.statusCode < 400;
        
        // Determine if we should log this response
        const shouldLog = (isSuccess && logSuccess) || (!isSuccess && logFailure);
        
        if (!shouldLog) return;

        // Capture response data
        responseData = {
          statusCode: res.statusCode,
          headers: {
            'content-type': res.get('Content-Type'),
            'content-length': res.get('Content-Length')
          }
        };

        // Capture response body (if enabled and not too large)
        if (logBodies && responseBody) {
          const bodyStr = typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody);
          if (bodyStr.length <= maxBodySize) {
            responseData.body = responseBody;
          } else {
            responseData.body = { 
              message: `Response body too large (${bodyStr.length} chars), truncated`,
              size: bodyStr.length
            };
          }
        }

        // Determine action type
        const action = getActionType(req, customActionMapping);
        
        // Get target information
        const target = getTargetInfo(req, responseData);
        
        // Get actor information
        const actor = getActorInfo(req);
        
        // Get context information
        const context = {
          ipAddress: requestData.ip,
          userAgent: requestData.userAgent,
          sessionId: requestData.sessionId,
          requestId: requestData.requestId,
          endpoint: `${req.method} ${req.path}`,
          method: req.method
        };

        // Get changes information (for write operations)
        const changes = getChangesInfo(req, responseData);

        // Get metadata
        const metadata = {
          requestData,
          responseData,
          duration,
          statusCode: res.statusCode,
          isSuccess,
          timestamp: new Date().toISOString()
        };

        // Log the activity
        const activityResult = await ActivityService.logActivity({
          action,
          actor,
          target,
          context,
          changes,
          metadata,
          status: isSuccess ? 'SUCCESS' : 'FAILURE',
          error: !isSuccess ? {
            code: res.statusCode.toString(),
            message: responseData.body?.message || 'Request failed'
          } : null,
          duration
        });

        if (!activityResult) {
          logger.warn('Activity logging returned null', {
            action,
            actor: actor?.name,
            target: target?.name || target?.type,
            endpoint: context.endpoint
          });
        }

      } catch (error) {
        logger.error('Failed to log activity in middleware', {
          error: error.message,
          stack: error.stack,
          action,
          actor: actor?.name,
          target: target?.name || target?.type,
          endpoint: context?.endpoint
        });
      }
    });

    next();
  };
};

/**
 * Determine the action type based on the request
 */
function getActionType(req, customMapping = {}) {
  const { method, path } = req;
  
  // Check custom mapping first
  const customAction = customMapping[`${method} ${path}`];
  if (customAction) return customAction;

  // Extract resource and action from path
  const pathParts = path.split('/').filter(part => part && part !== 'api' && part !== 'v1');
  const resource = pathParts[0]?.toUpperCase() || 'UNKNOWN';
  const resourceId = pathParts[1];
  const subResource = pathParts[2]?.toUpperCase();
  const subResourceId = pathParts[3];

  // Map HTTP methods to actions
  const methodActions = {
    'GET': 'VIEWED',
    'POST': 'CREATED',
    'PUT': 'UPDATED',
    'PATCH': 'UPDATED',
    'DELETE': 'DELETED'
  };

  const baseAction = methodActions[method] || 'ACCESSED';

  // Handle special cases
  if (path.includes('/login')) return 'USER_LOGIN';
  if (path.includes('/logout')) return 'USER_LOGOUT';
  if (path.includes('/register')) return 'USER_REGISTERED';
  if (path.includes('/password')) return 'USER_PASSWORD_CHANGED';
  if (path.includes('/avatar')) return 'USER_AVATAR_UPLOADED';
  if (path.includes('/enroll')) return 'ENROLLMENT_CREATED';
  if (path.includes('/complete')) return 'LESSON_COMPLETED';
  if (path.includes('/progress')) return 'LESSON_PROGRESS_UPDATED';
  if (path.includes('/upload')) return 'FILE_UPLOADED';
  if (path.includes('/download')) return 'FILE_DOWNLOADED';
  if (path.includes('/bulk')) return 'BULK_ACTION_PERFORMED';

  // Handle nested resources
  if (subResource) {
    return `${subResource}_${baseAction}`;
  }

  // Handle main resources
  return `${resource}_${baseAction}`;
}

/**
 * Get target information from the request
 */
function getTargetInfo(req, responseData) {
  const { method, path, params, body } = req;
  
  // Extract resource information
  const pathParts = path.split('/').filter(part => part && part !== 'api' && part !== 'v1');
  const resource = pathParts[0];
  const resourceId = params.id || params.courseId || params.userId || params.lessonId || params.enrollmentId;

  // Determine target type
  const targetTypeMap = {
    'users': 'USER',
    'courses': 'COURSE',
    'lessons': 'LESSON',
    'enrollments': 'ENROLLMENT',
    'cohorts': 'COHORT',
    'activities': 'ACTIVITY',
    'analytics': 'ANALYTICS',
    'statistics': 'STATISTICS',
    'upload': 'FILE',
    'course-materials': 'FILE'
  };

  const targetType = targetTypeMap[resource] || 'OTHER';
  
  // Get target name from response or params
  let targetName = resource;
  if (responseData.body && responseData.body.data) {
    if (responseData.body.data.title) targetName = responseData.body.data.title;
    else if (responseData.body.data.name) targetName = responseData.body.data.name;
    else if (responseData.body.data.email) targetName = responseData.body.data.email;
  }

  return {
    type: targetType,
    id: resourceId,
    model: resource ? resource.charAt(0).toUpperCase() + resource.slice(1) : null,
    name: targetName
  };
}

/**
 * Get actor information from the request
 */
function getActorInfo(req) {
  if (req.user) {
    return {
      userId: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role
    };
  }

  // For unauthenticated requests
  return {
    userId: null,
    name: 'Anonymous',
    email: 'anonymous@system',
    role: 'ANONYMOUS'
  };
}

/**
 * Get changes information for write operations
 */
function getChangesInfo(req, responseData) {
  const { method, body } = req;
  
  if (!['POST', 'PUT', 'PATCH'].includes(method) || !body) {
    return {};
  }

  // For creation operations
  if (method === 'POST') {
    return {
      fields: Object.keys(body),
      after: body
    };
  }

  // For update operations
  if (['PUT', 'PATCH'].includes(method)) {
    return {
      fields: Object.keys(body),
      after: body
    };
  }

  return {};
}

/**
 * Create a simplified activity logger for specific endpoints
 */
export const createEndpointLogger = (action, targetType, options = {}) => {
  return async (req, res, next) => {
    const startTime = Date.now();
    
    res.on('finish', async () => {
      try {
        const duration = Date.now() - startTime;
        const isSuccess = res.statusCode >= 200 && res.statusCode < 400;
        
        if (!isSuccess && !options.logFailures) return;

        const actor = getActorInfo(req);
        const target = {
          type: targetType,
          id: req.params.id || req.body?.id,
          name: req.body?.title || req.body?.name || targetType
        };

        const context = {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          endpoint: `${req.method} ${req.path}`,
          method: req.method
        };

        await ActivityService.logActivity({
          action,
          actor,
          target,
          context,
          status: isSuccess ? 'SUCCESS' : 'FAILURE',
          duration
        });

      } catch (error) {
        logger.error('Failed to log endpoint activity', error);
      }
    });

    next();
  };
};

export default activityLogger;
