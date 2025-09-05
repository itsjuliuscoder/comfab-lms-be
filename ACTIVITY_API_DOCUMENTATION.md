# Activity API Documentation

This document describes the Activity API endpoints for managing and retrieving activity logs in the CONFAB LMS system.

## Base URL
```
http://localhost:9092/api/v1/activities
```

## Authentication
All endpoints require authentication. Admin-only endpoints require admin role.

## Endpoints

### 1. Get All Activities (Admin Only)
**GET** `/api/v1/activities`

Retrieve all activities with filtering and pagination.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)
- `action` (string, optional): Filter by action type
- `actorId` (string, optional): Filter by actor user ID
- `actorRole` (string, optional): Filter by actor role (ADMIN, INSTRUCTOR, PARTICIPANT)
- `targetType` (string, optional): Filter by target type
- `targetId` (string, optional): Filter by target ID
- `status` (string, optional): Filter by status (SUCCESS, FAILURE, PENDING, CANCELLED)
- `startDate` (string, optional): Start date filter (ISO format)
- `endDate` (string, optional): End date filter (ISO format)
- `search` (string, optional): Search in actor name, email, target name, or action

**Example Request:**
```bash
curl -X GET "http://localhost:9092/api/v1/activities?page=1&limit=10&action=USER_LOGIN" \
  -H "Authorization: Bearer <access_token>"
```

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
          "model": "User",
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
        "duration": 150,
        "description": "John Doe logged in"
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

### 2. Get Dashboard Summary (Admin Only)
**GET** `/api/v1/activities/dashboard`

Get activity summary for dashboard.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `days` (number, optional): Number of days to include (default: 30)

**Example Request:**
```bash
curl -X GET "http://localhost:9092/api/v1/activities/dashboard?days=7" \
  -H "Authorization: Bearer <access_token>"
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "summary": [
      {
        "action": "USER_LOGIN",
        "count": 450,
        "uniqueUsers": 120,
        "lastPerformed": "2023-07-01T10:00:00.000Z"
      }
    ],
    "recentActivities": [...],
    "topUsers": [
      {
        "userId": "64a1b2c3d4e5f6789012346",
        "name": "John Doe",
        "email": "john@example.com",
        "role": "PARTICIPANT",
        "activityCount": 25
      }
    ],
    "totalActivities": 1500
  },
  "message": "Dashboard summary retrieved successfully"
}
```

### 3. Get Activity Summary (Admin Only)
**GET** `/api/v1/activities/summary`

Get activity statistics and summary.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `days` (number, optional): Number of days to include (default: 30)

**Example Request:**
```bash
curl -X GET "http://localhost:9092/api/v1/activities/summary" \
  -H "Authorization: Bearer <access_token>"
```

### 4. Get Activity by ID (Admin Only)
**GET** `/api/v1/activities/:id`

Get a specific activity by its ID.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Example Request:**
```bash
curl -X GET "http://localhost:9092/api/v1/activities/64a1b2c3d4e5f6789012345" \
  -H "Authorization: Bearer <access_token>"
```

### 5. Get User Activities
**GET** `/api/v1/activities/user/:userId`

Get activities for a specific user.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page` (number, optional): Page number
- `limit` (number, optional): Items per page
- `action` (string, optional): Filter by action type
- `startDate` (string, optional): Start date filter
- `endDate` (string, optional): End date filter

**Example Request:**
```bash
curl -X GET "http://localhost:9092/api/v1/activities/user/64a1b2c3d4e5f6789012346" \
  -H "Authorization: Bearer <access_token>"
```

### 6. Get Target Activities (Admin Only)
**GET** `/api/v1/activities/target/:type/:id`

Get activities for a specific target (course, lesson, etc.).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Example Request:**
```bash
curl -X GET "http://localhost:9092/api/v1/activities/target/COURSE/64a1b2c3d4e5f6789012347" \
  -H "Authorization: Bearer <access_token>"
```

### 7. Delete Activity (Admin Only)
**DELETE** `/api/v1/activities/:id`

Delete a specific activity.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Example Request:**
```bash
curl -X DELETE "http://localhost:9092/api/v1/activities/64a1b2c3d4e5f6789012345" \
  -H "Authorization: Bearer <access_token>"
```

### 8. Bulk Delete Activities (Admin Only)
**POST** `/api/v1/activities/bulk-delete`

Delete multiple activities based on filters.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "activityIds": ["64a1b2c3d4e5f6789012345", "64a1b2c3d4e5f6789012346"],
  "filters": {
    "action": "USER_LOGIN",
    "startDate": "2023-01-01T00:00:00.000Z",
    "endDate": "2023-01-31T23:59:59.999Z"
  }
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:9092/api/v1/activities/bulk-delete" \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "filters": {
      "action": "USER_LOGIN",
      "startDate": "2023-01-01T00:00:00.000Z",
      "endDate": "2023-01-31T23:59:59.999Z"
    }
  }'
```

### 9. Export Activities (Admin Only)
**POST** `/api/v1/activities/export`

Export activities to JSON or CSV format.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "format": "csv",
  "filters": {
    "action": "USER_LOGIN",
    "startDate": "2023-01-01T00:00:00.000Z",
    "endDate": "2023-01-31T23:59:59.999Z"
  }
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:9092/api/v1/activities/export" \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "csv",
    "filters": {
      "startDate": "2023-01-01T00:00:00.000Z",
      "endDate": "2023-01-31T23:59:59.999Z"
    }
  }'
```

### 10. Cleanup Activities (Admin Only)
**POST** `/api/v1/activities/cleanup`

Clean up old activities.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "daysToKeep": 365
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:9092/api/v1/activities/cleanup" \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "daysToKeep": 365
  }'
```

## Activity Types

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

### System Actions
- `SYSTEM_ERROR` - System errors
- `SYSTEM_WARNING` - System warnings
- `BACKUP_CREATED` - System backups
- `CLEANUP_PERFORMED` - System cleanup

### Admin Actions
- `BULK_ACTION_PERFORMED` - Bulk operations
- `SETTINGS_UPDATED` - System settings updates
- `REPORT_GENERATED` - Report generation
- `EXPORT_PERFORMED` - Data exports

## Error Responses

All endpoints return consistent error responses:

```json
{
  "ok": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description"
  }
}
```

Common error codes:
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Invalid request data
- `INTERNAL_ERROR` - Server error

## Frontend Integration

The frontend can integrate with these endpoints to:

1. **Display Activity Logs**: Use `GET /activities` to show activity history
2. **Dashboard Analytics**: Use `GET /activities/dashboard` for dashboard metrics
3. **User Activity Tracking**: Use `GET /activities/user/:userId` for user-specific logs
4. **Data Export**: Use `POST /activities/export` to export activity data
5. **Admin Management**: Use admin endpoints for activity management

## Rate Limiting

All endpoints are subject to rate limiting:
- 100 requests per 15 minutes per IP address
- Additional rate limiting may apply based on user role

## Security

- All endpoints require authentication
- Admin endpoints require admin role
- Sensitive data is automatically sanitized
- IP addresses and user agents are logged for security
