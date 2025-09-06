# Activity Creation API Documentation

## Overview
The Activity Creation API allows authenticated users to manually log activities in the system. This is useful for frontend integration, custom activity tracking, and administrative logging.

## Endpoint

### POST /api/v1/activities
Create a new activity log entry.

**Authentication:** Required (Bearer Token)
**Authorization:** Any authenticated user

## Request Body

```json
{
  "action": "string (required)",
  "actor": {
    "userId": "string (optional)",
    "name": "string (required if actor provided)",
    "email": "string (required if actor provided)",
    "role": "ADMIN | INSTRUCTOR | PARTICIPANT (optional)"
  },
  "target": {
    "type": "USER | COURSE | LESSON | ENROLLMENT | COHORT | FILE | NOTE | DISCUSSION | SYSTEM | OTHER (required)",
    "id": "string (optional)",
    "model": "User | Course | Lesson | Enrollment | Cohort | File | Note | Discussion (optional)",
    "name": "string (optional)"
  },
  "context": {
    "description": "string (optional)",
    "source": "string (optional)",
    "additionalInfo": "object (optional)"
  },
  "metadata": "object (optional)"
}
```

## Field Descriptions

### Required Fields
- **action**: The action being performed (e.g., "VIEW_COURSE", "DOWNLOAD_FILE", "LOGIN")
- **target.type**: The type of entity being acted upon

### Optional Fields
- **actor**: If not provided, uses current authenticated user's information
- **target.id**: ID of the target entity (if applicable)
- **target.model**: Mongoose model name for the target (if applicable)
- **target.name**: Human-readable name of the target
- **context.description**: Additional description of the activity
- **context.source**: Source of the activity (e.g., "WEB_APP", "MOBILE_APP")
- **context.additionalInfo**: Additional context information
- **metadata**: Any additional metadata for the activity

## Example Requests

### 1. Simple Activity Log
```bash
curl -X POST http://localhost:9092/api/v1/activities \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "action": "VIEW_COURSE",
    "target": {
      "type": "COURSE",
      "id": "68ba5cdc809c41ef914ad23c",
      "name": "Introduction to Purpose Discovery"
    }
  }'
```

### 2. Activity with Custom Actor
```bash
curl -X POST http://localhost:9092/api/v1/activities \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "action": "SYSTEM_MAINTENANCE",
    "actor": {
      "name": "System Administrator",
      "email": "admin@example.com",
      "role": "ADMIN"
    },
    "target": {
      "type": "SYSTEM",
      "name": "Database Backup"
    },
    "context": {
      "description": "Automated database backup completed",
      "source": "CRON_JOB"
    }
  }'
```

### 3. File Download Activity
```bash
curl -X POST http://localhost:9092/api/v1/activities \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "action": "DOWNLOAD_FILE",
    "target": {
      "type": "FILE",
      "id": "68ba5cdc809c41ef914ad23d",
      "name": "Course Material.pdf"
    },
    "context": {
      "description": "Downloaded course material",
      "source": "WEB_APP"
    },
    "metadata": {
      "fileSize": "2.5MB",
      "downloadTime": "3.2s"
    }
  }'
```

## Response Format

### Success Response (201 Created)
```json
{
  "ok": true,
  "data": {
    "_id": "68ba5cdc809c41ef914ad23e",
    "action": "VIEW_COURSE",
    "actor": {
      "userId": "68ba5cdc809c41ef914ad23f",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "PARTICIPANT"
    },
    "target": {
      "type": "COURSE",
      "id": "68ba5cdc809c41ef914ad23c",
      "model": "Course",
      "name": "Introduction to Purpose Discovery"
    },
    "context": {
      "description": null,
      "source": null,
      "additionalInfo": {}
    },
    "metadata": {},
    "status": "SUCCESS",
    "performedAt": "2024-01-15T10:30:00.000Z",
    "ipAddress": "192.168.1.100",
    "userAgent": "Mozilla/5.0...",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "message": "Activity created successfully"
}
```

### Error Response (400 Bad Request)
```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Action is required",
    "details": null
  }
}
```

### Error Response (401 Unauthorized)
```json
{
  "ok": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Access token required",
    "details": null
  }
}
```

## Validation Rules

- **action**: Required, 1-100 characters
- **actor.name**: Required if actor provided, 1-100 characters
- **actor.email**: Required if actor provided, valid email format, max 100 characters
- **actor.role**: Must be one of: ADMIN, INSTRUCTOR, PARTICIPANT
- **target.type**: Required, must be one of the allowed types
- **target.name**: Max 200 characters
- **context.description**: Max 500 characters
- **context.source**: Max 100 characters

## Use Cases

1. **Frontend Integration**: Log user interactions from the frontend
2. **Custom Tracking**: Track specific business events
3. **Administrative Logging**: Log system events and maintenance activities
4. **Analytics**: Track user behavior and engagement
5. **Audit Trail**: Maintain detailed logs for compliance

## Notes

- If `actor` is not provided, the system automatically uses the current authenticated user's information
- The API automatically captures IP address and User-Agent from the request
- All activities are timestamped with `performedAt` and `createdAt` fields
- The system validates all input data according to the Activity model schema
- Failed activity creation attempts are logged for debugging purposes
