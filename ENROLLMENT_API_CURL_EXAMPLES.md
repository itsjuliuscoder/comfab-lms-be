# 📚 Course Enrollment API - CURL Examples

This document provides comprehensive CURL examples for all course enrollment endpoints in the CONFAB LMS API.

## 🔑 **Authentication Setup**

First, get your access token:

```bash
# Login as user
curl -X POST http://localhost:9092/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'

# Extract the access token from the response
export ACCESS_TOKEN="your_access_token_here"

# For admin operations, login as admin
curl -X POST http://localhost:9092/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@theconfab.org",
    "password": "admin123"
  }'

export ADMIN_TOKEN="your_admin_token_here"
```

## 📋 **Enrollment Endpoints**

### **1. Get User Enrollments**
**GET** `/api/v1/enrollments`

Get all courses the current user is enrolled in.

```bash
curl -X GET http://localhost:9092/api/v1/enrollments \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**With Pagination:**
```bash
curl -X GET "http://localhost:9092/api/v1/enrollments?page=1&limit=10" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**With Status Filter:**
```bash
curl -X GET "http://localhost:9092/api/v1/enrollments?status=ACTIVE" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Expected Response:**
```json
{
  "ok": true,
  "data": {
    "enrollments": [
      {
        "_id": "68b4b490f5fbc4ca3098cbdb",
        "userId": "68b4b490f5fbc4ca3098cbdc",
        "courseId": {
          "_id": "68b4b490f5fbc4ca3098cbdd",
          "title": "Introduction to Purpose Discovery",
          "summary": "Learn the fundamentals of discovering your life purpose",
          "thumbnailUrl": "https://example.com/thumbnail.jpg",
          "difficulty": "BEGINNER",
          "estimatedDuration": 120
        },
        "status": "ACTIVE",
        "progressPct": 25,
        "enrolledAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "pages": 1
    }
  },
  "message": "Enrollments retrieved successfully"
}
```

### **2. Enroll in Course**
**POST** `/api/v1/enrollments`

Enroll the current user in a course.

```bash
curl -X POST http://localhost:9092/api/v1/enrollments \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "courseId": "68b4b490f5fbc4ca3098cbdd"
  }'
```

**Expected Response:**
```json
{
  "ok": true,
  "data": {
    "enrollment": {
      "_id": "68b4b490f5fbc4ca3098cbdb",
      "userId": "68b4b490f5fbc4ca3098cbdc",
      "courseId": {
        "_id": "68b4b490f5fbc4ca3098cbdd",
        "title": "Introduction to Purpose Discovery",
        "summary": "Learn the fundamentals of discovering your life purpose",
        "thumbnailUrl": "https://example.com/thumbnail.jpg",
        "difficulty": "BEGINNER",
        "estimatedDuration": 120
      },
      "status": "ACTIVE",
      "progressPct": 0,
      "enrolledAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  },
  "message": "Enrolled successfully"
}
```

### **3. Get Enrollment Details**
**GET** `/api/v1/enrollments/:id`

Get detailed information about a specific enrollment.

```bash
curl -X GET http://localhost:9092/api/v1/enrollments/68b4b490f5fbc4ca3098cbdb \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Expected Response:**
```json
{
  "ok": true,
  "data": {
    "enrollment": {
      "_id": "68b4b490f5fbc4ca3098cbdb",
      "userId": "68b4b490f5fbc4ca3098cbdc",
      "courseId": {
        "_id": "68b4b490f5fbc4ca3098cbdd",
        "title": "Introduction to Purpose Discovery",
        "summary": "Learn the fundamentals of discovering your life purpose",
        "description": "A comprehensive course on finding your life purpose...",
        "thumbnailUrl": "https://example.com/thumbnail.jpg",
        "difficulty": "BEGINNER",
        "estimatedDuration": 120,
        "outcomes": ["Understand purpose discovery", "Apply purpose principles"],
        "tags": ["purpose", "discovery", "life"]
      },
      "status": "ACTIVE",
      "progressPct": 25,
      "enrolledAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  },
  "message": "Enrollment details retrieved successfully"
}
```

### **4. Update Enrollment**
**PUT** `/api/v1/enrollments/:id`

Update enrollment status or progress.

```bash
curl -X PUT http://localhost:9092/api/v1/enrollments/68b4b490f5fbc4ca3098cbdb \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "COMPLETED",
    "progressPct": 100
  }'
```

**Update Progress Only:**
```bash
curl -X PUT http://localhost:9092/api/v1/enrollments/68b4b490f5fbc4ca3098cbdb \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "progressPct": 75
  }'
```

**Update Status Only:**
```bash
curl -X PUT http://localhost:9092/api/v1/enrollments/68b4b490f5fbc4ca3098cbdb \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "SUSPENDED"
  }'
```

**Expected Response:**
```json
{
  "ok": true,
  "data": {
    "enrollment": {
      "_id": "68b4b490f5fbc4ca3098cbdb",
      "userId": "68b4b490f5fbc4ca3098cbdc",
      "courseId": "68b4b490f5fbc4ca3098cbdd",
      "status": "COMPLETED",
      "progressPct": 100,
      "enrolledAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:35:00.000Z"
    }
  },
  "message": "Enrollment updated successfully"
}
```

### **5. Withdraw from Course**
**DELETE** `/api/v1/enrollments/:id`

Withdraw from a course (sets status to WITHDRAWN).

```bash
curl -X DELETE http://localhost:9092/api/v1/enrollments/68b4b490f5fbc4ca3098cbdb \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Expected Response:**
```json
{
  "ok": true,
  "data": {
    "enrollment": {
      "_id": "68b4b490f5fbc4ca3098cbdb",
      "userId": "68b4b490f5fbc4ca3098cbdc",
      "courseId": "68b4b490f5fbc4ca3098cbdd",
      "status": "WITHDRAWN",
      "progressPct": 25,
      "enrolledAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:40:00.000Z"
    }
  },
  "message": "Successfully withdrawn from course"
}
```

## 👨‍💼 **Admin Enrollment Endpoints**

### **6. Get All Enrollments (Admin Only)**
**GET** `/api/v1/enrollments/admin/all`

Get all enrollments across all users (admin only).

```bash
curl -X GET http://localhost:9092/api/v1/enrollments/admin/all \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**With Pagination:**
```bash
curl -X GET "http://localhost:9092/api/v1/enrollments/admin/all?page=1&limit=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**With Status Filter:**
```bash
curl -X GET "http://localhost:9092/api/v1/enrollments/admin/all?status=ACTIVE" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Expected Response:**
```json
{
  "ok": true,
  "data": {
    "enrollments": [
      {
        "_id": "68b4b490f5fbc4ca3098cbdb",
        "userId": {
          "_id": "68b4b490f5fbc4ca3098cbdc",
          "name": "John Doe",
          "email": "john@example.com"
        },
        "courseId": {
          "_id": "68b4b490f5fbc4ca3098cbdd",
          "title": "Introduction to Purpose Discovery"
        },
        "status": "ACTIVE",
        "progressPct": 25,
        "enrolledAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "pages": 1
    }
  },
  "message": "All enrollments retrieved successfully"
}
```

### **7. Get Course Enrollment Stats (Admin Only)**
**GET** `/api/v1/enrollments/admin/courses/:courseId/stats`

Get enrollment statistics for a specific course (admin only).

```bash
curl -X GET http://localhost:9092/api/v1/enrollments/admin/courses/68b4b490f5fbc4ca3098cbdd/stats \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Expected Response:**
```json
{
  "ok": true,
  "data": {
    "courseId": "68b4b490f5fbc4ca3098cbdd",
    "courseTitle": "Introduction to Purpose Discovery",
    "stats": {
      "totalEnrollments": 150,
      "activeEnrollments": 120,
      "completedEnrollments": 25,
      "withdrawnEnrollments": 5,
      "averageProgress": 45.5,
      "completionRate": 16.67
    },
    "statusBreakdown": {
      "ACTIVE": 120,
      "COMPLETED": 25,
      "WITHDRAWN": 5,
      "SUSPENDED": 0
    },
    "progressBreakdown": {
      "0-25%": 40,
      "26-50%": 35,
      "51-75%": 25,
      "76-99%": 15,
      "100%": 25
    }
  },
  "message": "Course enrollment statistics retrieved successfully"
}
```

## 🔍 **Error Handling Examples**

### **1. Course Not Found**
```bash
curl -X POST http://localhost:9092/api/v1/enrollments \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "courseId": "invalid_course_id"
  }'
```

**Expected Response:**
```json
{
  "ok": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Course not found"
  }
}
```

### **2. Already Enrolled**
```bash
curl -X POST http://localhost:9092/api/v1/enrollments \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "courseId": "68b4b490f5fbc4ca3098cbdd"
  }'
```

**Expected Response:**
```json
{
  "ok": false,
  "error": {
    "code": "ALREADY_ENROLLED",
    "message": "You are already enrolled in this course"
  }
}
```

### **3. Course Full**
```bash
curl -X POST http://localhost:9092/api/v1/enrollments \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "courseId": "full_course_id"
  }'
```

**Expected Response:**
```json
{
  "ok": false,
  "error": {
    "code": "COURSE_FULL",
    "message": "Course is full"
  }
}
```

### **4. Unpublished Course**
```bash
curl -X POST http://localhost:9092/api/v1/enrollments \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "courseId": "draft_course_id"
  }'
```

**Expected Response:**
```json
{
  "ok": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Cannot enroll in unpublished course"
  }
}
```

### **5. Unauthorized Access**
```bash
curl -X GET http://localhost:9092/api/v1/enrollments/admin/all
```

**Expected Response:**
```json
{
  "ok": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Access token required"
  }
}
```

## 📊 **Enrollment Status Types**

### **Available Statuses:**
- **ACTIVE** - User is actively enrolled and can access the course
- **COMPLETED** - User has completed the course
- **WITHDRAWN** - User has withdrawn from the course
- **SUSPENDED** - User's enrollment is suspended

### **Status Transitions:**
```bash
# Normal flow
ACTIVE → COMPLETED (when course is finished)
ACTIVE → WITHDRAWN (when user withdraws)
ACTIVE → SUSPENDED (admin action)

# Admin can change any status
SUSPENDED → ACTIVE (admin reactivation)
WITHDRAWN → ACTIVE (admin reactivation)
```

## 🔧 **Advanced Usage**

### **1. Bulk Enrollment Check**
```bash
# Check if user is enrolled in multiple courses
for courseId in "course1" "course2" "course3"; do
  curl -X GET "http://localhost:9092/api/v1/enrollments?courseId=$courseId" \
    -H "Authorization: Bearer $ACCESS_TOKEN"
done
```

### **2. Progress Tracking**
```bash
# Update progress as user completes lessons
curl -X PUT http://localhost:9092/api/v1/enrollments/68b4b490f5fbc4ca3098cbdb \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "progressPct": 50
  }'
```

### **3. Course Completion**
```bash
# Mark course as completed
curl -X PUT http://localhost:9092/api/v1/enrollments/68b4b490f5fbc4ca3098cbdb \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "COMPLETED",
    "progressPct": 100
  }'
```

## 📈 **Analytics & Reporting**

### **1. User Learning Progress**
```bash
# Get user's learning progress across all courses
curl -X GET http://localhost:9092/api/v1/enrollments \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.data.enrollments[] | {course: .courseId.title, progress: .progressPct, status: .status}'
```

### **2. Course Popularity (Admin)**
```bash
# Get enrollment stats for all courses
for courseId in $(curl -X GET http://localhost:9092/api/v1/courses -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.data.courses[]._id'); do
  curl -X GET "http://localhost:9092/api/v1/enrollments/admin/courses/$courseId/stats" \
    -H "Authorization: Bearer $ADMIN_TOKEN"
done
```

## ⚠️ **Important Notes**

1. **Authentication Required** - All endpoints require valid JWT token
2. **Admin Only** - Some endpoints require admin privileges
3. **Course Status** - Only published courses can be enrolled in
4. **Course Capacity** - Courses have enrollment limits
5. **Email Notifications** - Enrollment emails are sent automatically
6. **Progress Tracking** - Progress percentage is 0-100
7. **Status Management** - Only certain status transitions are allowed
8. **Pagination** - List endpoints support pagination
9. **Filtering** - Enrollments can be filtered by status
10. **Audit Trail** - All enrollment changes are logged

## 🚀 **Quick Reference**

### **User Operations:**
```bash
# Enroll in course
POST /api/v1/enrollments {"courseId": "..."}

# Get my enrollments
GET /api/v1/enrollments

# Update progress
PUT /api/v1/enrollments/:id {"progressPct": 75}

# Withdraw from course
DELETE /api/v1/enrollments/:id
```

### **Admin Operations:**
```bash
# Get all enrollments
GET /api/v1/enrollments/admin/all

# Get course stats
GET /api/v1/enrollments/admin/courses/:courseId/stats
```
