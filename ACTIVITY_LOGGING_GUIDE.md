# Activity Logging System Guide

This guide explains the comprehensive activity logging system implemented in the CONFAB LMS backend. The system automatically tracks all API actions and user activities for audit trails, analytics, and security monitoring.

## 📋 Overview

The activity logging system provides:
- **Automatic API Tracking**: Every API call is automatically logged
- **User Activity Monitoring**: Track user actions across the platform
- **Security Audit Trail**: Monitor authentication failures and suspicious activities
- **Performance Analytics**: Track response times and system performance
- **Compliance Support**: Maintain detailed audit logs for regulatory compliance

## 🚀 Features

### Core Features
- ✅ **Automatic Logging**: No manual intervention required
- ✅ **Role-Based Logging**: Different logging levels for different user roles
- ✅ **Performance Tracking**: Monitor API response times
- ✅ **Error Tracking**: Log all failures and errors
- ✅ **Security Monitoring**: Track authentication and authorization events
- ✅ **Data Privacy**: Sensitive data is automatically sanitized
- ✅ **Configurable**: Highly configurable for different environments

### Logged Information
- **Actor Information**: Who performed the action
- **Target Information**: What was acted upon
- **Context Information**: When, where, and how the action was performed
- **Changes Made**: What data was modified (for write operations)
- **Performance Metrics**: Response times and system performance
- **Error Details**: Complete error information for failed operations

## 🔧 Configuration

### Environment Variables

```bash
# Enable/disable activity logging
ACTIVITY_LOGGING_ENABLED=true

# Log request/response bodies (development only)
LOG_REQUEST_BODIES=false
LOG_RESPONSE_BODIES=false

# Performance thresholds
SLOW_REQUEST_THRESHOLD=5000

# Storage settings
ACTIVITY_MAX_AGE_DAYS=365
ACTIVITY_CLEANUP_INTERVAL=86400000
```

### Configuration File

The main configuration is in `src/config/activityLogging.js`:

```javascript
export const activityLoggingConfig = {
  enabled: true,
  excludeActions: [
    'GET /health',
    'GET /api/v1/activities',
    'GET /api/v1/analytics'
  ],
  roleBasedLogging: {
    'ADMIN': { methods: ['*'], includeReads: true, includeWrites: true },
    'INSTRUCTOR': { methods: ['*'], includeReads: true, includeWrites: true },
    'PARTICIPANT': { methods: ['POST', 'PUT', 'PATCH', 'DELETE'], includeReads: false, includeWrites: true }
  }
};
```

## 📊 Activity Types

### User Actions
- `USER_REGISTERED` - New user registration
- `USER_LOGIN` - User login
- `USER_LOGOUT` - User logout
- `USER_PROFILE_UPDATED` - Profile updates
- `USER_PASSWORD_CHANGED` - Password changes
- `USER_AVATAR_UPLOADED` - Avatar uploads

### Course Actions
- `COURSE_CREATED` - Course creation
- `COURSE_UPDATED` - Course updates
- `COURSE_DELETED` - Course deletion
- `COURSE_PUBLISHED` - Course publishing
- `COURSE_VIEWED` - Course views

### Lesson Actions
- `LESSON_CREATED` - Lesson creation
- `LESSON_UPDATED` - Lesson updates
- `LESSON_DELETED` - Lesson deletion
- `LESSON_COMPLETED` - Lesson completion
- `LESSON_VIEWED` - Lesson views

### Enrollment Actions
- `ENROLLMENT_CREATED` - Course enrollment
- `ENROLLMENT_UPDATED` - Enrollment updates
- `ENROLLMENT_WITHDRAWN` - Course withdrawal
- `ENROLLMENT_COMPLETED` - Course completion

### File Actions
- `FILE_UPLOADED` - File uploads
- `FILE_DELETED` - File deletion
- `FILE_DOWNLOADED` - File downloads
- `COURSE_MATERIAL_UPLOADED` - Course material uploads
- `COURSE_MATERIAL_DOWNLOADED` - Course material downloads

### System Actions
- `SYSTEM_ERROR` - System errors
- `SYSTEM_WARNING` - System warnings
- `AUTH_FAILURE` - Authentication failures
- `RATE_LIMIT_EXCEEDED` - Rate limit violations
- `API_ACCESSED` - General API access

### Admin Actions
- `BULK_ACTION_PERFORMED` - Bulk operations
- `SETTINGS_UPDATED` - System settings updates
- `REPORT_GENERATED` - Report generation
- `DATA_EXPORTED` - Data exports

## 🔍 API Endpoints

### Get All Activities
```http
GET /api/v1/activities
```

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `action` (string): Filter by action type
- `userId` (string): Filter by user ID
- `targetType` (string): Filter by target type
- `status` (string): Filter by status (SUCCESS, FAILURE, PENDING, CANCELLED)
- `startDate` (string): Start date filter (ISO format)
- `endDate` (string): End date filter (ISO format)

**Response:**
```json
{
  "ok": true,
  "data": {
    "activities": [
      {
        "_id": "64a1b2c3d4e5f6789012345",
        "action": "USER_LOGIN",
        "actor": {
          "userId": "64a1b2c3d4e5f6789012346",
          "name": "John Doe",
          "email": "john@example.com",
          "role": "PARTICIPANT"
        },
        "target": {
          "type": "USER",
          "id": "64a1b2c3d4e5f6789012346",
          "name": "John Doe"
        },
        "context": {
          "ipAddress": "192.168.1.1",
          "userAgent": "Mozilla/5.0...",
          "endpoint": "POST /api/v1/auth/login",
          "method": "POST"
        },
        "status": "SUCCESS",
        "performedAt": "2023-07-01T10:00:00.000Z",
        "duration": 150
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalItems": 200,
      "itemsPerPage": 20
    }
  },
  "message": "Activities retrieved successfully"
}
```

### Get Activity by ID
```http
GET /api/v1/activities/:id
```

### Get Activities by User
```http
GET /api/v1/activities/user/:userId
```

### Get Activities by Action
```http
GET /api/v1/activities/action/:action
```

### Get Activity Statistics
```http
GET /api/v1/activities/stats
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "totalActivities": 1500,
    "activitiesByAction": [
      {
        "action": "USER_LOGIN",
        "count": 450,
        "uniqueUsers": 120
      },
      {
        "action": "COURSE_VIEWED",
        "count": 300,
        "uniqueUsers": 80
      }
    ],
    "activitiesByUser": [
      {
        "userId": "64a1b2c3d4e5f6789012346",
        "name": "John Doe",
        "activityCount": 25
      }
    ],
    "recentActivities": [...],
    "errorRate": 0.02,
    "averageResponseTime": 250
  }
}
```

## 🛠️ Usage Examples

### Manual Activity Logging

```javascript
import { ActivityService } from '../modules/activities/services/activityService.js';

// Log a custom activity
await ActivityService.logActivity({
  action: 'CUSTOM_ACTION',
  actor: {
    userId: user._id,
    name: user.name,
    email: user.email,
    role: user.role
  },
  target: {
    type: 'CUSTOM',
    id: targetId,
    name: 'Custom Target'
  },
  context: {
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  },
  metadata: {
    customData: 'value'
  }
});
```

### Logging in Controllers

```javascript
// In a controller
export const createCourse = async (req, res) => {
  try {
    const course = await Course.create(req.body);
    
    // Log the activity
    await ActivityService.logCourseCreation(req.user, course, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    return successResponse(res, course, 'Course created successfully');
  } catch (error) {
    // Log the error
    await ActivityService.logSystemError(error, {
      endpoint: req.path,
      method: req.method,
      userId: req.user?._id
    });
    
    return errorResponse(res, error);
  }
};
```

### Using Endpoint Logger

```javascript
import { createEndpointLogger } from '../middleware/activityLogger.js';

// Create a specific logger for an endpoint
const courseLogger = createEndpointLogger('COURSE_VIEWED', 'COURSE');

// Use in routes
router.get('/courses/:id', courseLogger, getCourse);
```

## 🔒 Security Considerations

### Data Privacy
- **Sensitive Data**: Passwords, tokens, and secrets are automatically redacted
- **PII Protection**: Personal information is handled according to privacy policies
- **Data Retention**: Activities are automatically cleaned up after the retention period

### Access Control
- **Role-Based Access**: Only admins can view all activities
- **User Privacy**: Users can only view their own activities
- **Audit Trail**: All access to activity logs is itself logged

### Performance Impact
- **Asynchronous Logging**: Activities are logged asynchronously to avoid blocking requests
- **Batch Processing**: Multiple activities can be processed in batches
- **Configurable Levels**: Logging can be configured based on environment needs

## 📈 Analytics and Reporting

### Dashboard Metrics
- **User Activity**: Most active users and their actions
- **Popular Actions**: Most frequently performed actions
- **Error Rates**: System error rates and trends
- **Performance Metrics**: Average response times and slow requests

### Custom Reports
```javascript
// Get activity summary for dashboard
const summary = await ActivityService.getDashboardSummary(30); // Last 30 days

// Get user activity report
const userActivities = await Activity.findByUser(userId, { limit: 100 });

// Get system performance report
const performance = await Activity.aggregate([
  {
    $match: {
      performedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }
  },
  {
    $group: {
      _id: '$action',
      avgDuration: { $avg: '$duration' },
      maxDuration: { $max: '$duration' },
      count: { $sum: 1 }
    }
  }
]);
```

## 🧹 Maintenance

### Cleanup Old Activities
```javascript
// Clean up activities older than 1 year
const deletedCount = await ActivityService.cleanupOldActivities(365);
console.log(`Cleaned up ${deletedCount} old activities`);
```

### Archive Activities
```javascript
// Archive activities older than 90 days
const archivedCount = await ActivityService.archiveOldActivities(90);
console.log(`Archived ${archivedCount} activities`);
```

### Performance Monitoring
```javascript
// Monitor slow requests
const slowRequests = await Activity.find({
  duration: { $gt: 5000 }, // Slower than 5 seconds
  performedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
});
```

## 🚨 Troubleshooting

### Common Issues

1. **High Memory Usage**
   - Reduce logging frequency
   - Increase cleanup intervals
   - Use batch processing

2. **Slow Performance**
   - Disable body logging in production
   - Reduce logging granularity
   - Use asynchronous processing

3. **Missing Activities**
   - Check exclude actions configuration
   - Verify role-based logging settings
   - Ensure middleware is properly configured

### Debug Mode
```javascript
// Enable debug logging
process.env.ACTIVITY_LOGGING_DEBUG = 'true';

// Check if logging is enabled
console.log('Activity logging enabled:', activityLoggingConfig.enabled);
```

## 📚 Best Practices

1. **Environment-Specific Configuration**
   - Use minimal logging in production
   - Enable detailed logging in development
   - Disable logging in tests

2. **Performance Optimization**
   - Use asynchronous logging
   - Implement batch processing
   - Regular cleanup of old data

3. **Security**
   - Sanitize sensitive data
   - Implement proper access controls
   - Regular security audits

4. **Monitoring**
   - Set up alerts for critical activities
   - Monitor error rates
   - Track performance metrics

## 🔮 Future Enhancements

- **Real-time Analytics**: Live activity dashboards
- **Machine Learning**: Anomaly detection and predictive analytics
- **Integration**: Third-party analytics and monitoring tools
- **Advanced Filtering**: More sophisticated query capabilities
- **Export Features**: Data export in various formats
- **Visualization**: Charts and graphs for activity data
