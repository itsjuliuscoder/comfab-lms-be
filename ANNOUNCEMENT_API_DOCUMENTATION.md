# Announcement API Documentation

## Overview
The Announcement API provides comprehensive functionality for creating, managing, and accessing announcements in the LMS. It supports role-based access control, targeted messaging, scheduling, and read tracking.

## Base URL
```
/api/v1/announcements
```

## Authentication
All endpoints require authentication via Bearer token in the Authorization header.

## Endpoints

### 1. Get Announcements for Current User
**GET** `/api/v1/announcements`

Get announcements visible to the current authenticated user based on their role and enrollment status.

**Query Parameters:**
- `page` (number): Page number for pagination (default: 1)
- `limit` (number): Items per page (default: 20)
- `type` (string): Filter by announcement type
- `priority` (string): Filter by priority level
- `courseId` (string): Filter by specific course
- `unreadOnly` (boolean): Show only unread announcements
- `status` (string): Filter by status (default: PUBLISHED)

**Example Request:**
```bash
curl -X GET "http://localhost:9092/api/v1/announcements?type=COURSE&priority=HIGH&unreadOnly=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "announcements": [
      {
        "_id": "68ba5cdc809c41ef914ad23c",
        "title": "New Course Material Available",
        "content": "Check out the new video lessons in Module 3...",
        "type": "COURSE",
        "priority": "HIGH",
        "status": "PUBLISHED",
        "visibility": "ENROLLED_USERS",
        "isPinned": true,
        "isRead": false,
        "readCount": 45,
        "authorId": {
          "_id": "68ba5cdc809c41ef914ad23d",
          "name": "Dr. Smith",
          "email": "dr.smith@example.com"
        },
        "targetAudience": {
          "courseId": {
            "_id": "68ba5cdc809c41ef914ad23e",
            "title": "Mathematics 101"
          }
        },
        "publishedAt": "2024-01-15T10:00:00.000Z",
        "createdAt": "2024-01-15T10:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalItems": 15,
      "itemsPerPage": 20,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  },
  "message": "Announcements retrieved successfully"
}
```

### 2. Get Unread Count
**GET** `/api/v1/announcements/unread-count`

Get the count of unread announcements for the current user.

**Response:**
```json
{
  "ok": true,
  "data": {
    "unreadCount": 5
  },
  "message": "Unread count retrieved successfully"
}
```

### 3. Get Specific Announcement
**GET** `/api/v1/announcements/:id`

Get a specific announcement by ID.

**Path Parameters:**
- `id` (string): Announcement ID

**Response:**
```json
{
  "ok": true,
  "data": {
    "_id": "68ba5cdc809c41ef914ad23c",
    "title": "System Maintenance Notice",
    "content": "The system will be under maintenance...",
    "type": "SYSTEM",
    "priority": "URGENT",
    "status": "PUBLISHED",
    "visibility": "PUBLIC",
    "isPinned": true,
    "isRead": false,
    "readCount": 120,
    "authorId": {
      "_id": "68ba5cdc809c41ef914ad23d",
      "name": "System Admin",
      "email": "admin@example.com"
    },
    "attachments": [
      {
        "url": "https://example.com/maintenance-schedule.pdf",
        "name": "Maintenance Schedule",
        "mime": "application/pdf",
        "size": 1024000
      }
    ],
    "publishedAt": "2024-01-15T10:00:00.000Z",
    "createdAt": "2024-01-15T10:00:00.000Z"
  },
  "message": "Announcement retrieved successfully"
}
```

### 4. Create Announcement (Instructor/Admin)
**POST** `/api/v1/announcements`

Create a new announcement.

**Request Body:**
```json
{
  "title": "Welcome to the New Semester",
  "content": "We're excited to welcome you to the new semester...",
  "type": "GENERAL",
  "priority": "MEDIUM",
  "visibility": "PUBLIC",
  "targetAudience": {
    "courseId": "68ba5cdc809c41ef914ad23c",
    "roles": ["PARTICIPANT"]
  },
  "attachments": [
    {
      "url": "https://example.com/welcome-guide.pdf",
      "name": "Welcome Guide",
      "mime": "application/pdf",
      "size": 2048000
    }
  ],
  "scheduledAt": "2024-01-20T09:00:00.000Z",
  "expiresAt": "2024-02-20T23:59:59.000Z",
  "isPinned": false,
  "allowComments": true,
  "tags": ["welcome", "semester", "orientation"]
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "_id": "68ba5cdc809c41ef914ad23f",
    "title": "Welcome to the New Semester",
    "content": "We're excited to welcome you to the new semester...",
    "type": "GENERAL",
    "priority": "MEDIUM",
    "status": "DRAFT",
    "visibility": "PUBLIC",
    "authorId": {
      "_id": "68ba5cdc809c41ef914ad23d",
      "name": "Dr. Smith",
      "email": "dr.smith@example.com"
    },
    "createdAt": "2024-01-15T10:00:00.000Z"
  },
  "message": "Announcement created successfully"
}
```

### 5. Update Announcement (Author/Admin)
**PUT** `/api/v1/announcements/:id`

Update an existing announcement.

**Path Parameters:**
- `id` (string): Announcement ID

**Request Body:** (Same as create, all fields optional)

**Response:**
```json
{
  "ok": true,
  "data": {
    "_id": "68ba5cdc809c41ef914ad23f",
    "title": "Updated Welcome Message",
    "content": "Updated content...",
    "status": "PUBLISHED",
    "publishedAt": "2024-01-15T11:00:00.000Z",
    "updatedAt": "2024-01-15T11:00:00.000Z"
  },
  "message": "Announcement updated successfully"
}
```

### 6. Delete Announcement (Author/Admin)
**DELETE** `/api/v1/announcements/:id`

Delete an announcement.

**Path Parameters:**
- `id` (string): Announcement ID

**Response:**
```json
{
  "ok": true,
  "data": null,
  "message": "Announcement deleted successfully"
}
```

### 7. Mark as Read
**POST** `/api/v1/announcements/:id/read`

Mark an announcement as read by the current user.

**Path Parameters:**
- `id` (string): Announcement ID

**Response:**
```json
{
  "ok": true,
  "data": {
    "isRead": true
  },
  "message": "Announcement marked as read"
}
```

### 8. Get All Announcements (Admin Only)
**GET** `/api/v1/announcements/admin/all`

Get all announcements in the system (admin only).

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `status` (string): Filter by status
- `type` (string): Filter by type
- `priority` (string): Filter by priority
- `authorId` (string): Filter by author
- `search` (string): Search in title, content, or tags

**Response:**
```json
{
  "ok": true,
  "data": {
    "items": [...],
    "pagination": {...}
  },
  "message": "All announcements retrieved successfully"
}
```

## Data Models

### Announcement Types
- `GENERAL` - General announcements
- `COURSE` - Course-specific announcements
- `SYSTEM` - System-related announcements
- `MAINTENANCE` - Maintenance notifications
- `EVENT` - Event announcements
- `URGENT` - Urgent notifications

### Priority Levels
- `LOW` - Low priority
- `MEDIUM` - Medium priority (default)
- `HIGH` - High priority
- `URGENT` - Urgent priority

### Visibility Options
- `PUBLIC` - Visible to all users
- `ENROLLED_USERS` - Visible to enrolled users of specific course
- `INSTRUCTORS` - Visible to instructors and admins
- `ADMINS` - Visible to admins only
- `SPECIFIC_USERS` - Visible to specific users

### Status Options
- `DRAFT` - Draft announcement
- `PUBLISHED` - Published announcement
- `ARCHIVED` - Archived announcement

## Access Control

### User Roles and Permissions
- **PARTICIPANT**: Can view announcements based on visibility rules
- **INSTRUCTOR**: Can create, update, delete their own announcements; can view all announcements
- **ADMIN**: Full access to all announcement operations

### Visibility Rules
1. **PUBLIC**: All authenticated users
2. **ENROLLED_USERS**: Users enrolled in the specified course
3. **INSTRUCTORS**: Users with INSTRUCTOR or ADMIN role
4. **ADMINS**: Users with ADMIN role only
5. **SPECIFIC_USERS**: Users specified in the userIds array

## Features

### Scheduling
- Announcements can be scheduled for future publication
- Automatic publication when scheduled time is reached

### Expiration
- Announcements can have expiration dates
- Expired announcements are automatically hidden

### Read Tracking
- Track which users have read each announcement
- Unread count functionality
- Read status per user

### Pinning
- Important announcements can be pinned to the top
- Pinned announcements appear first in lists

### Attachments
- Support for file attachments
- File metadata tracking (name, size, MIME type)

### Search and Filtering
- Search across title, content, and tags
- Filter by type, priority, status, author
- Pagination support

## Error Responses

### 400 Bad Request
```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Title is required",
    "details": null
  }
}
```

### 401 Unauthorized
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

### 403 Forbidden
```json
{
  "ok": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have access to this announcement",
    "details": null
  }
}
```

### 404 Not Found
```json
{
  "ok": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Announcement not found",
    "details": null
  }
}
```

## Use Cases

1. **Course Updates**: Instructors can announce new materials, assignments, or schedule changes
2. **System Notifications**: Admins can notify users about maintenance, updates, or issues
3. **Event Announcements**: Promote workshops, webinars, or special events
4. **Urgent Communications**: Send high-priority messages to specific user groups
5. **Welcome Messages**: Greet new users or provide orientation information
6. **Progress Updates**: Share achievements, milestones, or course completions
