# 🎯 Program Management API - CURL Examples

This document provides comprehensive CURL examples for the Program Management API in the CONFAB LMS. Programs serve as parent containers for Courses and Cohorts, creating a hierarchical structure.

## 🔑 **Authentication Setup**

First, get your access token:

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

## 📋 **Program Management Endpoints**

### **1. Get All Programs**

**GET** `/api/v1/programs`

Retrieve all programs with optional filtering and pagination.

```bash
# Get all programs
curl -X GET http://localhost:9092/api/v1/programs \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Get programs with pagination
curl -X GET "http://localhost:9092/api/v1/programs?page=1&limit=10" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Filter by status
curl -X GET "http://localhost:9092/api/v1/programs?status=ACTIVE" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Filter by public/private
curl -X GET "http://localhost:9092/api/v1/programs?isPublic=true" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Search programs
curl -X GET "http://localhost:9092/api/v1/programs?search=Purpose Discovery" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Filter by enrollment status
curl -X GET "http://localhost:9092/api/v1/programs?enrollmentOpen=true" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Expected Response:**

```json
{
  "ok": true,
  "data": {
    "programs": [
      {
        "_id": "68b4b490f5fbc4ca3098cbde",
        "name": "Purpose Discovery Program",
        "description": "A comprehensive program to help individuals discover their life purpose",
        "code": "PDP-2024",
        "status": "ACTIVE",
        "startDate": "2024-01-15T00:00:00.000Z",
        "endDate": "2024-12-15T00:00:00.000Z",
        "duration": 48,
        "maxParticipants": 100,
        "currentParticipants": 25,
        "ownerId": {
          "_id": "68b4b490f5fbc4ca3098cbda",
          "name": "Admin User",
          "email": "admin@theconfab.org"
        },
        "coordinatorId": {
          "_id": "68b4b490f5fbc4ca3098cbd9",
          "name": "Program Coordinator",
          "email": "coordinator@theconfab.org"
        },
        "enrollmentStatus": "OPEN",
        "progress": 45,
        "capacityPercentage": 25,
        "isPublic": true,
        "enrollmentOpen": true,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-15T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "pages": 1
    }
  },
  "message": "Programs retrieved successfully"
}
```

### **2. Get Program by ID**

**GET** `/api/v1/programs/:id`

Retrieve a specific program with its courses and cohorts.

```bash
curl -X GET http://localhost:9092/api/v1/programs/68b4b490f5fbc4ca3098cbde \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Expected Response:**

```json
{
  "ok": true,
  "data": {
    "_id": "68b4b490f5fbc4ca3098cbde",
    "name": "Purpose Discovery Program",
    "description": "A comprehensive program to help individuals discover their life purpose",
    "code": "PDP-2024",
    "status": "ACTIVE",
    "startDate": "2024-01-15T00:00:00.000Z",
    "endDate": "2024-12-15T00:00:00.000Z",
    "duration": 48,
    "maxParticipants": 100,
    "currentParticipants": 25,
    "ownerId": {
      "_id": "68b4b490f5fbc4ca3098cbda",
      "name": "Admin User",
      "email": "admin@theconfab.org"
    },
    "coordinatorId": {
      "_id": "68b4b490f5fbc4ca3098cbd9",
      "name": "Program Coordinator",
      "email": "coordinator@theconfab.org"
    },
    "courses": [
      {
        "_id": "68b4b490f5fbc4ca3098cbdc",
        "title": "Self-Discovery Fundamentals",
        "status": "PUBLISHED",
        "ownerId": {
          "_id": "68b4b490f5fbc4ca3098cbda",
          "name": "Admin User"
        }
      }
    ],
    "cohorts": [
      {
        "_id": "68b4b490f5fbc4ca3098cbdd",
        "name": "PDP Cohort 1",
        "status": "ACTIVE",
        "coordinatorId": {
          "_id": "68b4b490f5fbc4ca3098cbd9",
          "name": "Program Coordinator"
        }
      }
    ],
    "enrollmentStatus": "OPEN",
    "progress": 45,
    "capacityPercentage": 25,
    "isPublic": true,
    "enrollmentOpen": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-15T00:00:00.000Z"
  },
  "message": "Program retrieved successfully"
}
```

### **3. Create Program**

**POST** `/api/v1/programs`

Create a new program (instructor or admin only).

```bash
curl -X POST http://localhost:9092/api/v1/programs \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Purpose Discovery Program",
    "description": "A comprehensive program to help individuals discover their life purpose through guided exercises and mentorship",
    "code": "PDP-2024",
    "startDate": "2024-01-15T00:00:00.000Z",
    "endDate": "2024-12-15T00:00:00.000Z",
    "duration": 48,
    "maxParticipants": 100,
    "coordinatorId": "68b4b490f5fbc4ca3098cbd9",
    "tags": ["purpose", "discovery", "life-coaching"],
    "objectives": [
      "Help participants identify their core values",
      "Guide them through life purpose discovery",
      "Provide mentorship and support"
    ],
    "requirements": [
      "Commitment to 6-month program",
      "Weekly group sessions attendance",
      "Completion of self-reflection exercises"
    ],
    "isPublic": true,
    "enrollmentOpen": true,
    "enrollmentEndDate": "2024-03-15T00:00:00.000Z",
    "cost": {
      "amount": 500,
      "currency": "USD",
      "isFree": false
    },
    "location": {
      "type": "ONLINE",
      "city": "Remote",
      "country": "Global"
    },
    "settings": {
      "allowSelfEnrollment": true,
      "requireApproval": false,
      "maxCoursesPerUser": 5,
      "allowCohortCreation": true,
      "maxCohorts": 10
    }
  }'
```

**Expected Response:**

```json
{
  "ok": true,
  "data": {
    "_id": "68b4b490f5fbc4ca3098cbde",
    "name": "Purpose Discovery Program",
    "description": "A comprehensive program to help individuals discover their life purpose through guided exercises and mentorship",
    "code": "PDP-2024",
    "status": "ACTIVE",
    "startDate": "2024-01-15T00:00:00.000Z",
    "endDate": "2024-12-15T00:00:00.000Z",
    "duration": 48,
    "maxParticipants": 100,
    "currentParticipants": 0,
    "ownerId": {
      "_id": "68b4b490f5fbc4ca3098cbda",
      "name": "Admin User",
      "email": "admin@theconfab.org"
    },
    "coordinatorId": {
      "_id": "68b4b490f5fbc4ca3098cbd9",
      "name": "Program Coordinator",
      "email": "coordinator@theconfab.org"
    },
    "enrollmentStatus": "OPEN",
    "progress": 0,
    "capacityPercentage": 0,
    "isPublic": true,
    "enrollmentOpen": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Program created successfully"
}
```

### **4. Update Program**

**PUT** `/api/v1/programs/:id`

Update an existing program (owner or admin only).

```bash
curl -X PUT http://localhost:9092/api/v1/programs/68b4b490f5fbc4ca3098cbde \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Purpose Discovery Program - Updated",
    "description": "An enhanced comprehensive program to help individuals discover their life purpose",
    "maxParticipants": 150,
    "status": "ACTIVE",
    "enrollmentOpen": true
  }'
```

**Expected Response:**

```json
{
  "ok": true,
  "data": {
    "_id": "68b4b490f5fbc4ca3098cbde",
    "name": "Purpose Discovery Program - Updated",
    "description": "An enhanced comprehensive program to help individuals discover their life purpose",
    "maxParticipants": 150,
    "status": "ACTIVE",
    "enrollmentOpen": true,
    "updatedAt": "2024-01-15T00:00:00.000Z"
  },
  "message": "Program updated successfully"
}
```

### **5. Delete Program**

**DELETE** `/api/v1/programs/:id`

Delete a program (owner or admin only).

```bash
curl -X DELETE http://localhost:9092/api/v1/programs/68b4b490f5fbc4ca3098cbde \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Expected Response:**

```json
{
  "ok": true,
  "data": null,
  "message": "Program deleted successfully"
}
```

### **6. Get Program Courses**

**GET** `/api/v1/programs/:id/courses`

Retrieve all courses within a program.

```bash
curl -X GET http://localhost:9092/api/v1/programs/68b4b490f5fbc4ca3098cbde/courses \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# With pagination
curl -X GET "http://localhost:9092/api/v1/programs/68b4b490f5fbc4ca3098cbde/courses?page=1&limit=5" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Expected Response:**

```json
{
  "ok": true,
  "data": {
    "courses": [
      {
        "_id": "68b4b490f5fbc4ca3098cbdc",
        "title": "Self-Discovery Fundamentals",
        "summary": "Introduction to self-discovery concepts",
        "status": "PUBLISHED",
        "difficulty": "BEGINNER",
        "ownerId": {
          "_id": "68b4b490f5fbc4ca3098cbda",
          "name": "Admin User",
          "email": "admin@theconfab.org"
        },
        "sections": [
          {
            "_id": "68b4b490f5fbc4ca3098cbdb",
            "title": "Introduction",
            "order": 1
          }
        ],
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "pages": 1
    }
  },
  "message": "Program courses retrieved successfully"
}
```

### **7. Get Program Cohorts**

**GET** `/api/v1/programs/:id/cohorts`

Retrieve all cohorts within a program.

```bash
curl -X GET http://localhost:9092/api/v1/programs/68b4b490f5fbc4ca3098cbde/cohorts \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# With pagination
curl -X GET "http://localhost:9092/api/v1/programs/68b4b490f5fbc4ca3098cbde/cohorts?page=1&limit=5" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Expected Response:**

```json
{
  "ok": true,
  "data": {
    "cohorts": [
      {
        "_id": "68b4b490f5fbc4ca3098cbdd",
        "name": "PDP Cohort 1",
        "description": "First cohort of the Purpose Discovery Program",
        "status": "ACTIVE",
        "maxParticipants": 20,
        "currentParticipants": 15,
        "coordinatorId": {
          "_id": "68b4b490f5fbc4ca3098cbd9",
          "name": "Program Coordinator",
          "email": "coordinator@theconfab.org"
        },
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "pages": 1
    }
  },
  "message": "Program cohorts retrieved successfully"
}
```

### **8. Get Program Statistics**

**GET** `/api/v1/programs/:id/statistics`

Retrieve detailed statistics for a program (owner, coordinator, or admin only).

```bash
curl -X GET http://localhost:9092/api/v1/programs/68b4b490f5fbc4ca3098cbde/statistics \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Expected Response:**

```json
{
  "ok": true,
  "data": {
    "program": {
      "name": "Purpose Discovery Program",
      "code": "PDP-2024",
      "status": "ACTIVE",
      "currentParticipants": 25,
      "maxParticipants": 100,
      "capacityPercentage": 25,
      "enrollmentStatus": "OPEN",
      "progress": 45
    },
    "courses": {
      "PUBLISHED": 5,
      "DRAFT": 2,
      "ARCHIVED": 1
    },
    "cohorts": {
      "ACTIVE": 3,
      "INACTIVE": 1,
      "COMPLETED": 2
    },
    "enrollments": {
      "ACTIVE": 25,
      "COMPLETED": 10,
      "WITHDRAWN": 3
    }
  },
  "message": "Program statistics retrieved successfully"
}
```

### **9. Enroll in Program**

**POST** `/api/v1/programs/:id/enroll`

Enroll a user in a program.

```bash
curl -X POST http://localhost:9092/api/v1/programs/68b4b490f5fbc4ca3098cbde/enroll \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Expected Response:**

```json
{
  "ok": true,
  "data": {
    "program": {
      "_id": "68b4b490f5fbc4ca3098cbde",
      "name": "Purpose Discovery Program",
      "currentParticipants": 26,
      "enrollmentStatus": "OPEN"
    },
    "enrollment": {
      "_id": "68b4b490f5fbc4ca3098cbdf",
      "userId": "68b4b490f5fbc4ca3098cbda",
      "programId": "68b4b490f5fbc4ca3098cbde",
      "enrolledAt": "2024-01-15T00:00:00.000Z",
      "status": "ACTIVE"
    }
  },
  "message": "Successfully enrolled in program"
}
```

## 🔍 **Error Handling Examples**

### **1. Program Not Found**

```bash
curl -X GET http://localhost:9092/api/v1/programs/68b4b490f5fbc4ca3098cb99 \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Expected Response:**

```json
{
  "ok": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Program not found"
  }
}
```

### **2. Access Denied**

```bash
# Try to access private program without permission
curl -X GET http://localhost:9092/api/v1/programs/68b4b490f5fbc4ca3098cbde \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Expected Response:**

```json
{
  "ok": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to this program"
  }
}
```

### **3. Program Code Already Exists**

```bash
curl -X POST http://localhost:9092/api/v1/programs \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Another Program",
    "description": "A program with existing code",
    "code": "PDP-2024",
    "startDate": "2024-01-15T00:00:00.000Z",
    "endDate": "2024-12-15T00:00:00.000Z",
    "duration": 48,
    "maxParticipants": 100,
    "coordinatorId": "68b4b490f5fbc4ca3098cbd9"
  }'
```

**Expected Response:**

```json
{
  "ok": false,
  "error": {
    "code": "PROGRAM_CODE_EXISTS",
    "message": "Program code already exists"
  }
}
```

### **4. Cannot Delete Program with Active Content**

```bash
curl -X DELETE http://localhost:9092/api/v1/programs/68b4b490f5fbc4ca3098cbde \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Expected Response:**

```json
{
  "ok": false,
  "error": {
    "code": "PROGRAM_HAS_ACTIVE_CONTENT",
    "message": "Cannot delete program with active courses or cohorts"
  }
}
```

### **5. Enrollment Closed**

```bash
curl -X POST http://localhost:9092/api/v1/programs/68b4b490f5fbc4ca3098cbde/enroll \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Expected Response:**

```json
{
  "ok": false,
  "error": {
    "code": "ENROLLMENT_CLOSED",
    "message": "Program enrollment is not open"
  }
}
```

### **6. Already Enrolled**

```bash
curl -X POST http://localhost:9092/api/v1/programs/68b4b490f5fbc4ca3098cbde/enroll \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Expected Response:**

```json
{
  "ok": false,
  "error": {
    "code": "ALREADY_ENROLLED",
    "message": "User is already enrolled in this program"
  }
}
```

### **7. Program Full**

```bash
curl -X POST http://localhost:9092/api/v1/programs/68b4b490f5fbc4ca3098cbde/enroll \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Expected Response:**

```json
{
  "ok": false,
  "error": {
    "code": "PROGRAM_FULL",
    "message": "Program has reached maximum capacity"
  }
}
```

## 🔧 **Advanced Usage Examples**

### **1. Create Business Mentorship Program**

```bash
curl -X POST http://localhost:9092/api/v1/programs \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Business Mentorship Program",
    "description": "A comprehensive business mentorship program for entrepreneurs and business leaders",
    "code": "BMP-2024",
    "startDate": "2024-02-01T00:00:00.000Z",
    "endDate": "2024-11-30T00:00:00.000Z",
    "duration": 40,
    "maxParticipants": 50,
    "coordinatorId": "68b4b490f5fbc4ca3098cbd9",
    "tags": ["business", "mentorship", "entrepreneurship"],
    "objectives": [
      "Provide business mentorship",
      "Connect entrepreneurs with experienced mentors",
      "Facilitate business growth and development"
    ],
    "requirements": [
      "Active business or startup",
      "Commitment to 6-month program",
      "Monthly mentor meetings"
    ],
    "isPublic": true,
    "enrollmentOpen": true,
    "enrollmentEndDate": "2024-04-01T00:00:00.000Z",
    "cost": {
      "amount": 1000,
      "currency": "USD",
      "isFree": false
    },
    "location": {
      "type": "HYBRID",
      "address": "123 Business Center, Suite 100",
      "city": "New York",
      "country": "USA"
    },
    "settings": {
      "allowSelfEnrollment": false,
      "requireApproval": true,
      "maxCoursesPerUser": 3,
      "allowCohortCreation": true,
      "maxCohorts": 5
    }
  }'
```

### **2. Search Programs by Tags**

```bash
curl -X GET "http://localhost:9092/api/v1/programs?search=mentorship" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### **3. Get Programs by Coordinator**

```bash
curl -X GET "http://localhost:9092/api/v1/programs?coordinatorId=68b4b490f5fbc4ca3098cbd9" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### **4. Get Public Programs Only**

```bash
curl -X GET "http://localhost:9092/api/v1/programs?isPublic=true&status=ACTIVE" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

## 📊 **Program Data Structure**

### **Program Fields:**

- **name** (required) - Program name
- **description** (required) - Program description
- **code** (required) - Unique program code
- **status** - ACTIVE, INACTIVE, ARCHIVED
- **startDate** (required) - Program start date
- **endDate** (required) - Program end date
- **duration** (required) - Program duration in weeks
- **maxParticipants** (required) - Maximum participants
- **currentParticipants** - Current participant count
- **ownerId** - Program owner (auto-set to creator)
- **coordinatorId** (required) - Program coordinator
- **tags** - Program tags
- **objectives** - Program objectives
- **requirements** - Program requirements
- **isPublic** - Whether program is public
- **enrollmentOpen** - Whether enrollment is open
- **enrollmentStartDate** - Enrollment start date
- **enrollmentEndDate** - Enrollment end date
- **cost** - Program cost information
- **location** - Program location details
- **settings** - Program settings

### **Virtual Fields:**

- **enrollmentStatus** - Current enrollment status
- **progress** - Program progress percentage
- **capacityPercentage** - Capacity utilization percentage

## ⚠️ **Important Notes**

1. **Program Hierarchy** - Programs contain Courses and Cohorts
2. **Access Control** - Only owners, coordinators, and admins can manage programs
3. **Enrollment Limits** - Programs have participant limits
4. **Status Management** - Programs have lifecycle statuses
5. **Cohort Integration** - Cohorts are created within programs
6. **Course Integration** - Courses are assigned to programs
7. **Statistics** - Detailed analytics available for program owners
8. **Enrollment** - Users can enroll in programs directly
9. **Validation** - Comprehensive validation for all fields
10. **Permissions** - Role-based access control throughout

## 🚀 **Quick Reference**

### **Program Status Values:**

- `ACTIVE` - Program is currently running
- `INACTIVE` - Program is paused
- `ARCHIVED` - Program is completed/archived

### **Enrollment Status Values:**

- `OPEN` - Enrollment is open
- `CLOSED` - Enrollment is closed
- `FULL` - Program is at capacity
- `NOT_STARTED` - Enrollment hasn't started

### **Location Types:**

- `ONLINE` - Virtual/online program
- `ONSITE` - Physical location program
- `HYBRID` - Mixed online and onsite

The Program Management API provides a comprehensive system for managing educational programs with courses and cohorts!
