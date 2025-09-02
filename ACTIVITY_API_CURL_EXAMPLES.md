# 📊 Activity Monitoring API - CURL Examples

This document provides comprehensive CURL examples for all activity monitoring endpoints in the CONFAB LMS API. These endpoints help track user actions, system events, and provide analytics for the platform.

## 🔑 **Authentication Setup**

First, get your admin access token:

```bash
# Login as admin
curl -X POST http://localhost:9092/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@theconfab.org",
    "password": "admin123"
  }'

# Extract the access token from the response
export ACCESS_TOKEN="your_access_token_here"
```

## 📋 **Activity Monitoring Endpoints**

### **1. Get All Activities (Admin Only)**
**GET** `/api/v1/activities`

Get all platform activities with filtering and pagination.

```bash
curl -X GET http://localhost:9092/api/v1/activities \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**With Pagination:**
```bash
curl -X GET "http://localhost:9092/api/v1/activities?page=1&limit=20" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**With Filters:**
```bash
curl -X GET "http://localhost:9092/api/v1/activities?action=enrollment&actorRole=PARTICIPANT&startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**With Search:**
```bash
curl -X GET "http://localhost:9092/api/v1/activities?search=Alex Johnson" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Expected Response:**
```json
{
  "ok": true,
  "data": {
    "activities": [
      {
        "_id": "68b4b490f5fbc4ca3098cbdb",
        "action": "ENROLLMENT",
        "actor": {
          "userId": "68b4b490f5fbc4ca3098cbdc",
          "name": "Alex Johnson",
          "email": "alex.johnson@example.com",
          "role": "PARTICIPANT"
        },
        "target": {
          "type": "COURSE",
          "id": "68b4b490f5fbc4ca3098cbdd",
          "name": "Purpose Discovery Fundamentals"
        },
        "details": {
          "courseId": "68b4b490f5fbc4ca3098cbdd",
          "courseTitle": "Purpose Discovery Fundamentals"
        },
        "status": "SUCCESS",
        "performedAt": "2024-01-20T10:30:00.000Z",
        "ipAddress": "192.168.1.100",
        "userAgent": "Mozilla/5.0..."
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  },
  "message": "Activities retrieved successfully"
}
```

### **2. Get Dashboard Summary (Admin Only)**
**GET** `/api/v1/activities/dashboard`

Get activity summary for dashboard analytics.

```bash
curl -X GET http://localhost:9092/api/v1/activities/dashboard \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**With Custom Date Range:**
```bash
curl -X GET "http://localhost:9092/api/v1/activities/dashboard?days=7" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Expected Response:**
```json
{
  "ok": true,
  "data": {
    "period": "30 days",
    "totalActivities": 1250,
    "uniqueUsers": 89,
    "activityBreakdown": {
      "ENROLLMENT": 45,
      "COMPLETION": 23,
      "ASSESSMENT": 67,
      "LOGIN": 234,
      "COURSE_VIEW": 456,
      "LESSON_COMPLETE": 234,
      "ASSESSMENT_SUBMIT": 89,
      "PROFILE_UPDATE": 12
    },
    "topUsers": [
      {
        "userId": "68b4b490f5fbc4ca3098cbdc",
        "name": "Alex Johnson",
        "email": "alex.johnson@example.com",
        "activityCount": 23
      }
    ],
    "topCourses": [
      {
        "courseId": "68b4b490f5fbc4ca3098cbdd",
        "title": "Purpose Discovery Fundamentals",
        "activityCount": 156
      }
    ],
    "dailyActivity": [
      {
        "date": "2024-01-20",
        "count": 45
      }
    ]
  },
  "message": "Dashboard summary retrieved successfully"
}
```

### **3. Get User Activities**
**GET** `/api/v1/activities/user/:userId`

Get activities for a specific user (admin or self).

```bash
curl -X GET http://localhost:9092/api/v1/activities/user/68b4b490f5fbc4ca3098cbdc \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**With Filters:**
```bash
curl -X GET "http://localhost:9092/api/v1/activities/user/68b4b490f5fbc4ca3098cbdc?action=enrollment&startDate=2024-01-01" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Expected Response:**
```json
{
  "ok": true,
  "data": {
    "activities": [
      {
        "_id": "68b4b490f5fbc4ca3098cbdb",
        "action": "ENROLLMENT",
        "actor": {
          "userId": "68b4b490f5fbc4ca3098cbdc",
          "name": "Alex Johnson",
          "email": "alex.johnson@example.com",
          "role": "PARTICIPANT"
        },
        "target": {
          "type": "COURSE",
          "id": "68b4b490f5fbc4ca3098cbdd",
          "name": "Purpose Discovery Fundamentals"
        },
        "details": {
          "courseId": "68b4b490f5fbc4ca3098cbdd",
          "courseTitle": "Purpose Discovery Fundamentals"
        },
        "status": "SUCCESS",
        "performedAt": "2024-01-20T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 23,
      "pages": 2
    }
  },
  "message": "User activities retrieved successfully"
}
```

### **4. Get Target Activities (Admin Only)**
**GET** `/api/v1/activities/target/:type/:id`

Get activities related to a specific target (course, user, etc.).

```bash
# Get activities for a specific course
curl -X GET http://localhost:9092/api/v1/activities/target/course/68b4b490f5fbc4ca3098cbdd \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Get activities for a specific user
curl -X GET http://localhost:9092/api/v1/activities/target/user/68b4b490f5fbc4ca3098cbdc \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Expected Response:**
```json
{
  "ok": true,
  "data": {
    "target": {
      "type": "COURSE",
      "id": "68b4b490f5fbc4ca3098cbdd",
      "name": "Purpose Discovery Fundamentals"
    },
    "activities": [
      {
        "_id": "68b4b490f5fbc4ca3098cbdb",
        "action": "ENROLLMENT",
        "actor": {
          "userId": "68b4b490f5fbc4ca3098cbdc",
          "name": "Alex Johnson",
          "email": "alex.johnson@example.com",
          "role": "PARTICIPANT"
        },
        "details": {
          "courseId": "68b4b490f5fbc4ca3098cbdd",
          "courseTitle": "Purpose Discovery Fundamentals"
        },
        "status": "SUCCESS",
        "performedAt": "2024-01-20T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 156,
      "pages": 8
    }
  },
  "message": "Target activities retrieved successfully"
}
```

### **5. Get Activity Summary (Admin Only)**
**GET** `/api/v1/activities/summary`

Get overall activity statistics and trends.

```bash
curl -X GET http://localhost:9092/api/v1/activities/summary \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Expected Response:**
```json
{
  "ok": true,
  "data": {
    "totalActivities": 12500,
    "totalUsers": 450,
    "totalCourses": 25,
    "activityTrends": {
      "enrollments": {
        "total": 2340,
        "thisMonth": 156,
        "lastMonth": 134,
        "growth": 16.4
      },
      "completions": {
        "total": 890,
        "thisMonth": 67,
        "lastMonth": 45,
        "growth": 48.9
      },
      "assessments": {
        "total": 3450,
        "thisMonth": 234,
        "lastMonth": 198,
        "growth": 18.2
      }
    },
    "topActions": [
      {
        "action": "COURSE_VIEW",
        "count": 4560,
        "percentage": 36.5
      },
      {
        "action": "ENROLLMENT",
        "count": 2340,
        "percentage": 18.7
      }
    ],
    "userEngagement": {
      "activeUsers": 234,
      "newUsers": 45,
      "returningUsers": 189
    }
  },
  "message": "Activity summary retrieved successfully"
}
```

### **6. Get Activity by ID (Admin Only)**
**GET** `/api/v1/activities/:id`

Get detailed information about a specific activity.

```bash
curl -X GET http://localhost:9092/api/v1/activities/68b4b490f5fbc4ca3098cbdb \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Expected Response:**
```json
{
  "ok": true,
  "data": {
    "activity": {
      "_id": "68b4b490f5fbc4ca3098cbdb",
      "action": "ENROLLMENT",
      "actor": {
        "userId": "68b4b490f5fbc4ca3098cbdc",
        "name": "Alex Johnson",
        "email": "alex.johnson@example.com",
        "role": "PARTICIPANT"
      },
      "target": {
        "type": "COURSE",
        "id": "68b4b490f5fbc4ca3098cbdd",
        "name": "Purpose Discovery Fundamentals"
      },
      "details": {
        "courseId": "68b4b490f5fbc4ca3098cbdd",
        "courseTitle": "Purpose Discovery Fundamentals",
        "enrollmentMethod": "self",
        "previousEnrollments": 0
      },
      "status": "SUCCESS",
      "performedAt": "2024-01-20T10:30:00.000Z",
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      "metadata": {
        "sessionId": "session_123",
        "referrer": "https://example.com/courses"
      }
    }
  },
  "message": "Activity details retrieved successfully"
}
```

### **7. Delete Activity (Admin Only)**
**DELETE** `/api/v1/activities/:id`

Delete a specific activity.

```bash
curl -X DELETE http://localhost:9092/api/v1/activities/68b4b490f5fbc4ca3098cbdb \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Expected Response:**
```json
{
  "ok": true,
  "data": {
    "deletedActivity": {
      "_id": "68b4b490f5fbc4ca3098cbdb",
      "action": "ENROLLMENT"
    }
  },
  "message": "Activity deleted successfully"
}
```

### **8. Bulk Delete Activities (Admin Only)**
**POST** `/api/v1/activities/bulk-delete`

Delete multiple activities based on filters.

```bash
curl -X POST http://localhost:9092/api/v1/activities/bulk-delete \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "activityIds": ["68b4b490f5fbc4ca3098cbdb", "68b4b490f5fbc4ca3098cbdc"],
    "filters": {
      "action": "TEST_ACTION",
      "startDate": "2024-01-01",
      "endDate": "2024-01-31"
    }
  }'
```

**Expected Response:**
```json
{
  "ok": true,
  "data": {
    "deletedCount": 45,
    "deletedActivities": [
      {
        "_id": "68b4b490f5fbc4ca3098cbdb",
        "action": "TEST_ACTION"
      }
    ]
  },
  "message": "45 activities deleted successfully"
}
```

### **9. Export Activities (Admin Only)**
**POST** `/api/v1/activities/export`

Export activities to JSON or CSV format.

```bash
curl -X POST http://localhost:9092/api/v1/activities/export \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "csv",
    "filters": {
      "action": "ENROLLMENT",
      "startDate": "2024-01-01",
      "endDate": "2024-01-31"
    }
  }'
```

**Expected Response:**
```json
{
  "ok": true,
  "data": {
    "exportUrl": "https://example.com/exports/activities_20240120_123456.csv",
    "format": "csv",
    "recordCount": 156,
    "expiresAt": "2024-01-21T12:34:56.000Z"
  },
  "message": "Activities exported successfully"
}
```

### **10. Cleanup Activities (Admin Only)**
**POST** `/api/v1/activities/cleanup`

Clean up old activities to manage storage.

```bash
curl -X POST http://localhost:9092/api/v1/activities/cleanup \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "daysToKeep": 365
  }'
```

**Expected Response:**
```json
{
  "ok": true,
  "data": {
    "deletedCount": 1234,
    "daysKept": 365,
    "oldestActivityDate": "2023-01-20T10:30:00.000Z"
  },
  "message": "Cleanup completed successfully. 1234 activities deleted."
}
```

## 🔍 **Activity Types**

### **Available Activity Actions:**
- **ENROLLMENT** - User enrolled in a course
- **COMPLETION** - User completed a course
- **ASSESSMENT** - User submitted an assessment
- **ASSESSMENT_SUBMIT** - Assessment submission
- **LOGIN** - User login
- **LOGOUT** - User logout
- **COURSE_VIEW** - Course viewed
- **LESSON_COMPLETE** - Lesson completed
- **PROFILE_UPDATE** - Profile updated
- **PASSWORD_CHANGE** - Password changed
- **COURSE_CREATE** - Course created
- **COURSE_UPDATE** - Course updated
- **USER_CREATE** - User created
- **USER_UPDATE** - User updated
- **COHORT_CREATE** - Cohort created
- **COHORT_JOIN** - User joined cohort

### **Activity Status:**
- **SUCCESS** - Action completed successfully
- **FAILED** - Action failed
- **PENDING** - Action is pending
- **CANCELLED** - Action was cancelled

## 🔧 **Advanced Filtering**

### **1. Date Range Filtering:**
```bash
# Last 7 days
curl -X GET "http://localhost:9092/api/v1/activities?startDate=2024-01-13&endDate=2024-01-20" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Specific date range
curl -X GET "http://localhost:9092/api/v1/activities?startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### **2. Action Type Filtering:**
```bash
# Only enrollments
curl -X GET "http://localhost:9092/api/v1/activities?action=ENROLLMENT" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Multiple actions
curl -X GET "http://localhost:9092/api/v1/activities?action=ENROLLMENT&action=COMPLETION" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### **3. User Role Filtering:**
```bash
# Only participant activities
curl -X GET "http://localhost:9092/api/v1/activities?actorRole=PARTICIPANT" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Only instructor activities
curl -X GET "http://localhost:9092/api/v1/activities?actorRole=INSTRUCTOR" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### **4. Target Type Filtering:**
```bash
# Only course-related activities
curl -X GET "http://localhost:9092/api/v1/activities?targetType=COURSE" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Only user-related activities
curl -X GET "http://localhost:9092/api/v1/activities?targetType=USER" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

## 📊 **Analytics & Reporting**

### **1. User Engagement Analysis:**
```bash
# Get user activity patterns
curl -X GET "http://localhost:9092/api/v1/activities/user/68b4b490f5fbc4ca3098cbdc?action=LOGIN" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.data.activities | length'
```

### **2. Course Popularity Analysis:**
```bash
# Get course activity stats
curl -X GET "http://localhost:9092/api/v1/activities/target/course/68b4b490f5fbc4ca3098cbdd" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.data.activities | group_by(.action) | map({action: .[0].action, count: length})'
```

### **3. System Health Monitoring:**
```bash
# Get failed activities
curl -X GET "http://localhost:9092/api/v1/activities?status=FAILED" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

## ⚠️ **Important Notes**

1. **Admin Access Required** - Most endpoints require admin privileges
2. **Data Privacy** - Activity logs contain sensitive user information
3. **Storage Management** - Regular cleanup is recommended
4. **Performance** - Large datasets may require pagination
5. **Real-time Logging** - Activities are logged automatically
6. **Audit Trail** - All admin actions are also logged
7. **Export Limits** - Large exports may be queued
8. **Retention Policy** - Configure cleanup schedules
9. **Search Functionality** - Full-text search across activity data
10. **Filtering** - Multiple filter combinations supported

## 🚀 **Quick Reference**

### **Monitoring Operations:**
```bash
# Get recent activities
GET /api/v1/activities?limit=10

# Get dashboard summary
GET /api/v1/activities/dashboard

# Get user activities
GET /api/v1/activities/user/:userId

# Get course activities
GET /api/v1/activities/target/course/:courseId
```

### **Management Operations:**
```bash
# Delete activity
DELETE /api/v1/activities/:id

# Bulk delete
POST /api/v1/activities/bulk-delete

# Export data
POST /api/v1/activities/export

# Cleanup old data
POST /api/v1/activities/cleanup
```

The Activity API provides comprehensive monitoring capabilities for tracking user behavior, system performance, and platform analytics!
