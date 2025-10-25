# CONFAB Purpose Discovery LMS - API Documentation

## Base URL

```
http://localhost:9090/api/v1
```

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

## Response Format

All API responses follow this format:

```json
{
  "ok": true,
  "data": { ... },
  "message": "Success message"
}
```

---

## 🔐 Authentication Endpoints

### 1. Register User

**POST** `/auth/register`

Create a new user account.

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePassword123!",
  "role": "ADMIN",
  "cohortId": "64f8a1b2c3d4e5f6a7b8c9d0",
  "roleInCohort": "MEMBER"
}
```

**CURL Command:**

```bash
curl -X POST http://localhost:9090/api/v1/auth/register -H "Content-Type: application/json" -d '{"name": "Admin User", "email": "admin@example.com", "password": "SecurePassword123!", "role": "ADMIN", "cohortId": "64f8a1b2c3d4e5f6a7b8c9d0", "roleInCohort": "MEMBER"}'
```

**Response:**

```json
{
  "ok": true,
  "data": {
    "user": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "name": "Admin User",
      "email": "admin@example.com",
      "role": "ADMIN",
      "status": "ACTIVE",
      "emailVerified": false,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "User registered successfully"
}
```

### 2. Login

**POST** `/auth/login`

Authenticate user and get access tokens.

**Request Body:**

```json
{
  "email": "admin@example.com",
  "password": "SecurePassword123!"
}
```

**CURL Command:**

```bash
curl -X POST http://localhost:9090/api/v1/auth/login -H "Content-Type: application/json" -d '{"email": "admin@example.com", "password": "SecurePassword123!"}'
```

**Response:**

```json
{
  "ok": true,
  "data": {
    "user": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "name": "Admin User",
      "email": "admin@example.com",
      "role": "ADMIN"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Login successful"
}
```

### 3. Refresh Token

**POST** `/auth/refresh`

Get new access token using refresh token.

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**CURL Command:**

```bash
curl -X POST http://localhost:9090/api/v1/auth/refresh -H "Content-Type: application/json" -d '{"refreshToken": "your_refresh_token_here"}'
```

### 4. Logout

**POST** `/auth/logout`

Logout user and invalidate tokens.

**CURL Command:**

```bash
curl -X POST http://localhost:9090/api/v1/auth/logout -H "Authorization: Bearer your_access_token_here"
```

### 5. Forgot Password

**POST** `/auth/forgot-password`

Request password reset email.

**Request Body:**

```json
{
  "email": "admin@example.com"
}
```

**CURL Command:**

```bash
curl -X POST http://localhost:9090/api/v1/auth/forgot-password -H "Content-Type: application/json" -d '{"email": "admin@example.com"}'
```

### 6. Reset Password

**POST** `/auth/reset-password`

Reset password using token from email.

**Request Body:**

```json
{
  "token": "reset_token_from_email",
  "password": "NewSecurePassword123!"
}
```

**CURL Command:**

```bash
curl -X POST http://localhost:9090/api/v1/auth/reset-password -H "Content-Type: application/json" -d '{"token": "reset_token_here", "password": "NewSecurePassword123!"}'
```

### 7. Verify Email

**GET** `/auth/verify-email?token=verification_token`

Verify email address.

**CURL Command:**

```bash
curl -X GET "http://localhost:9090/api/v1/auth/verify-email?token=verification_token_here"
```

### 8. Resend Verification

**POST** `/auth/resend-verification`

Resend email verification.

**Request Body:**

```json
{
  "email": "admin@example.com"
}
```

**CURL Command:**

```bash
curl -X POST http://localhost:9090/api/v1/auth/resend-verification -H "Content-Type: application/json" -d '{"email": "admin@example.com"}'
```

### 9. Accept Invite

**GET** `/auth/accept-invite?token=invite_token`

Accept user invitation.

**CURL Command:**

```bash
curl -X GET "http://localhost:9090/api/v1/auth/accept-invite?token=invite_token_here"
```

### 10. Complete Invite

**POST** `/auth/complete-invite`

Complete invitation by setting password.

**Request Body:**

```json
{
  "token": "invite_token",
  "password": "SecurePassword123!"
}
```

**CURL Command:**

```bash
curl -X POST http://localhost:9090/api/v1/auth/complete-invite -H "Content-Type: application/json" -d '{"token": "invite_token_here", "password": "SecurePassword123!"}'
```

---

## 👤 User Management Endpoints

### 1. Get Profile

**GET** `/users/profile`

Get current user's profile.

**CURL Command:**

```bash
curl -X GET http://localhost:9090/api/v1/users/profile -H "Authorization: Bearer your_access_token_here"
```

### 2. Update Profile

**PATCH** `/users/profile`

Update current user's profile.

**Request Body:**

```json
{
  "name": "Updated Name",
  "email": "updated@example.com"
}
```

**CURL Command:**

```bash
curl -X PATCH http://localhost:9090/api/v1/users/profile -H "Authorization: Bearer your_access_token_here" -H "Content-Type: application/json" -d '{"name": "Updated Name", "email": "updated@example.com"}'
```

### 3. Upload Avatar

**POST** `/users/avatar`

Upload user avatar image.

**CURL Command:**

```bash
curl -X POST http://localhost:9090/api/v1/users/avatar -H "Authorization: Bearer your_access_token_here" -F "avatar=@/path/to/avatar.jpg"
```

### 4. Change Password

**PATCH** `/users/change-password`

Change user password.

**Request Body:**

```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}
```

**CURL Command:**

```bash
curl -X PATCH http://localhost:9090/api/v1/users/change-password -H "Authorization: Bearer your_access_token_here" -H "Content-Type: application/json" -d '{"currentPassword": "OldPassword123!", "newPassword": "NewPassword123!"}'
```

### 5. Get Preferences

**GET** `/users/preferences`

Get user preferences.

**CURL Command:**

```bash
curl -X GET http://localhost:9090/api/v1/users/preferences -H "Authorization: Bearer your_access_token_here"
```

### 6. Update Preferences

**PATCH** `/users/preferences`

Update user preferences.

**Request Body:**

```json
{
  "emailNotifications": true,
  "pushNotifications": false,
  "language": "en",
  "timezone": "UTC"
}
```

**CURL Command:**

```bash
curl -X PATCH http://localhost:9090/api/v1/users/preferences -H "Authorization: Bearer your_access_token_here" -H "Content-Type: application/json" -d '{"emailNotifications": true, "pushNotifications": false, "language": "en", "timezone": "UTC"}'
```

### 7. Get All Users (Admin Only)

**GET** `/users`

Get all users (admin only).

**CURL Command:**

```bash
curl -X GET http://localhost:9090/api/v1/users -H "Authorization: Bearer your_admin_token_here"
```

### 8. Search Users (Admin Only)

**GET** `/users/search?q=search_term`

Search users by name or email (admin only).

**CURL Command:**

```bash
curl -X GET "http://localhost:9090/api/v1/users/search?q=john" -H "Authorization: Bearer your_admin_token_here"
```

### 9. Get User by ID (Admin Only)

**GET** `/users/:id`

Get specific user by ID (admin only).

**CURL Command:**

```bash
curl -X GET http://localhost:9090/api/v1/users/64f8a1b2c3d4e5f6a7b8c9d0 -H "Authorization: Bearer your_admin_token_here"
```

### 10. Update User (Admin Only)

**PATCH** `/users/:id`

Update user details (admin only).

**Request Body:**

```json
{
  "name": "Updated Name",
  "email": "updated@example.com",
  "role": "INSTRUCTOR",
  "status": "ACTIVE"
}
```

**CURL Command:**

```bash
curl -X PATCH http://localhost:9090/api/v1/users/64f8a1b2c3d4e5f6a7b8c9d0 -H "Authorization: Bearer your_admin_token_here" -H "Content-Type: application/json" -d '{"name": "Updated Name", "role": "INSTRUCTOR", "status": "ACTIVE"}'
```

### 11. Delete User (Admin Only)

**DELETE** `/users/:id`

Delete user (admin only).

**CURL Command:**

```bash
curl -X DELETE http://localhost:9090/api/v1/users/64f8a1b2c3d4e5f6a7b8c9d0 -H "Authorization: Bearer your_admin_token_here"
```

### 12. Bulk Actions (Admin Only)

**POST** `/users/bulk-actions`

Perform bulk actions on users (admin only).

**Request Body:**

```json
{
  "action": "activate",
  "userIds": ["64f8a1b2c3d4e5f6a7b8c9d0", "64f8a1b2c3d4e5f6a7b8c9d1"]
}
```

**CURL Command:**

```bash
curl -X POST http://localhost:9090/api/v1/users/bulk-actions -H "Authorization: Bearer your_admin_token_here" -H "Content-Type: application/json" -d '{"action": "activate", "userIds": ["64f8a1b2c3d4e5f6a7b8c9d0", "64f8a1b2c3d4e5f6a7b8c9d1"]}'
```

### 13. Invite User (Admin Only)

**POST** `/users/invite`

Invite new user (admin only).

**Request Body:**

```json
{
  "name": "New User",
  "email": "newuser@example.com",
  "role": "PARTICIPANT",
  "cohortId": "64f8a1b2c3d4e5f6a7b8c9d0",
  "roleInCohort": "MEMBER"
}
```

**CURL Command:**

```bash
curl -X POST http://localhost:9090/api/v1/users/invite -H "Authorization: Bearer your_admin_token_here" -H "Content-Type: application/json" -d '{"name": "New User", "email": "newuser@example.com", "role": "PARTICIPANT", "cohortId": "64f8a1b2c3d4e5f6a7b8c9d0", "roleInCohort": "MEMBER"}'
```

### 14. Bulk Invite Users (Admin Only)

**POST** `/users/bulk-invite`

Invite multiple users at once (admin only). Maximum 100 users per request.

**Request Body:**

```json
{
  "users": [
    {
      "name": "John Doe",
      "email": "john.doe@example.com",
      "role": "PARTICIPANT",
      "roleInCohort": "MEMBER"
    },
    {
      "name": "Jane Smith",
      "email": "jane.smith@example.com",
      "role": "INSTRUCTOR",
      "roleInCohort": "MENTOR"
    }
  ],
  "cohortId": "64f8a1b2c3d4e5f6a7b8c9d0",
  "roleInCohort": "MEMBER",
  "sendWelcomeEmail": true
}
```

**CURL Command:**

```bash
curl -X POST http://localhost:9090/api/v1/users/bulk-invite -H "Authorization: Bearer your_admin_token_here" -H "Content-Type: application/json" -d '{"users": [{"name": "John Doe", "email": "john.doe@example.com", "role": "PARTICIPANT"}, {"name": "Jane Smith", "email": "jane.smith@example.com", "role": "INSTRUCTOR"}], "cohortId": "64f8a1b2c3d4e5f6a7b8c9d0", "sendWelcomeEmail": true}'
```

**Response:**

```json
{
  "ok": true,
  "data": {
    "results": {
      "successful": [
        {
          "email": "john.doe@example.com",
          "name": "John Doe",
          "role": "PARTICIPANT",
          "userId": "64f8a1b2c3d4e5f6a7b8c9d0"
        }
      ],
      "failed": [],
      "skipped": []
    },
    "summary": {
      "total": 2,
      "successful": 2,
      "failed": 0,
      "skipped": 0
    }
  },
  "message": "Bulk invite completed. 2 users invited successfully."
}
```

### 15. Download Excel Template (Public)

**GET** `/users/bulk-invite-template`

Download Excel template for bulk user invites. This endpoint is publicly accessible.

**CURL Command:**

```bash
curl -X GET http://localhost:9090/api/v1/users/bulk-invite-template --output bulk_invite_template.xlsx
```

**Response:**

- Downloads Excel file with sample data and instructions

### 16. Bulk Invite Users from Excel (Admin Only)

**POST** `/users/bulk-invite-excel`

Upload Excel file to invite multiple users (admin only). Maximum 1000 users per file.

**Request Body (multipart/form-data):**

```
excelFile: [Excel file (.xlsx or .xls)]
cohortId: "64f8a1b2c3d4e5f6a7b8c9d0" (optional)
roleInCohort: "MEMBER" (optional)
sendWelcomeEmail: "true" (optional)
```

**CURL Command:**

```bash
curl -X POST http://localhost:9090/api/v1/users/bulk-invite-excel -H "Authorization: Bearer your_admin_token_here" -F "excelFile=@users.xlsx" -F "cohortId=64f8a1b2c3d4e5f6a7b8c9d0" -F "roleInCohort=MEMBER" -F "sendWelcomeEmail=true"
```

**Response:**

```json
{
  "ok": true,
  "data": {
    "results": {
      "successful": [
        {
          "email": "john.doe@example.com",
          "name": "John Doe",
          "role": "PARTICIPANT",
          "userId": "64f8a1b2c3d4e5f6a7b8c9d0"
        }
      ],
      "failed": [],
      "skipped": [],
      "excelErrors": []
    },
    "excelProcessing": {
      "totalRows": 10,
      "validRows": 8,
      "invalidRows": 2,
      "errors": []
    },
    "summary": {
      "total": 8,
      "successful": 7,
      "failed": 0,
      "skipped": 1
    }
  },
  "message": "Excel bulk invite completed. 7 users invited successfully."
}
```

### 17. Verify Instructor (Admin Only)

**POST** `/users/:id/verify`

Verify instructor status (admin only).

**CURL Command:**

```bash
curl -X POST http://localhost:9090/api/v1/users/64f8a1b2c3d4e5f6a7b8c9d0/verify -H "Authorization: Bearer your_admin_token_here"
```

---

## 🎯 Program Management Endpoints

### 1. Get All Programs

**GET** `/programs`

Retrieve all programs with optional filtering and pagination.

**CURL Command:**

```bash
curl -X GET http://localhost:9090/api/v1/programs -H "Authorization: Bearer your_access_token_here"
```

### 2. Get Program by ID

**GET** `/programs/:id`

Retrieve a specific program with its courses and cohorts.

**CURL Command:**

```bash
curl -X GET http://localhost:9090/api/v1/programs/68b4b490f5fbc4ca3098cbde -H "Authorization: Bearer your_access_token_here"
```

### 3. Create Program

**POST** `/programs`

Create a new program (instructor or admin only).

**Request Body:**

```json
{
  "name": "Purpose Discovery Program",
  "description": "A comprehensive program to help individuals discover their life purpose",
  "code": "PDP-2024",
  "startDate": "2024-01-15T00:00:00.000Z",
  "endDate": "2024-12-15T00:00:00.000Z",
  "duration": 48,
  "maxParticipants": 100,
  "coordinatorId": "68b4b490f5fbc4ca3098cbd9",
  "tags": ["purpose", "discovery", "life-coaching"],
  "objectives": ["Help participants identify their core values"],
  "requirements": ["Commitment to 6-month program"],
  "isPublic": true,
  "enrollmentOpen": true,
  "enrollmentEndDate": "2024-03-15T00:00:00.000Z"
}
```

**CURL Command:**

```bash
curl -X POST http://localhost:9090/api/v1/programs -H "Authorization: Bearer your_instructor_token_here" -H "Content-Type: application/json" -d '{"name": "Purpose Discovery Program", "description": "A comprehensive program to help individuals discover their life purpose", "code": "PDP-2024", "startDate": "2024-01-15T00:00:00.000Z", "endDate": "2024-12-15T00:00:00.000Z", "duration": 48, "maxParticipants": 100, "coordinatorId": "68b4b490f5fbc4ca3098cbd9"}'
```

### 4. Update Program

**PUT** `/programs/:id`

Update an existing program (owner or admin only).

**CURL Command:**

```bash
curl -X PUT http://localhost:9090/api/v1/programs/68b4b490f5fbc4ca3098cbde -H "Authorization: Bearer your_access_token_here" -H "Content-Type: application/json" -d '{"name": "Purpose Discovery Program - Updated", "maxParticipants": 150}'
```

### 5. Delete Program

**DELETE** `/programs/:id`

Delete a program (owner or admin only).

**CURL Command:**

```bash
curl -X DELETE http://localhost:9090/api/v1/programs/68b4b490f5fbc4ca3098cbde -H "Authorization: Bearer your_access_token_here"
```

### 6. Get Program Courses

**GET** `/programs/:id/courses`

Retrieve all courses within a program.

**CURL Command:**

```bash
curl -X GET http://localhost:9090/api/v1/programs/68b4b490f5fbc4ca3098cbde/courses -H "Authorization: Bearer your_access_token_here"
```

### 7. Get Program Cohorts

**GET** `/programs/:id/cohorts`

Retrieve all cohorts within a program.

**CURL Command:**

```bash
curl -X GET http://localhost:9090/api/v1/programs/68b4b490f5fbc4ca3098cbde/cohorts -H "Authorization: Bearer your_access_token_here"
```

### 8. Get Program Statistics

**GET** `/programs/:id/statistics`

Retrieve detailed statistics for a program (owner, coordinator, or admin only).

**CURL Command:**

```bash
curl -X GET http://localhost:9090/api/v1/programs/68b4b490f5fbc4ca3098cbde/statistics -H "Authorization: Bearer your_access_token_here"
```

### 9. Enroll in Program

**POST** `/programs/:id/enroll`

Enroll a user in a program.

**CURL Command:**

```bash
curl -X POST http://localhost:9090/api/v1/programs/68b4b490f5fbc4ca3098cbde/enroll -H "Authorization: Bearer your_access_token_here"
```

---

## 📚 Course Management Endpoints

### 1. Get All Courses

**GET** `/courses`

Get all available courses.

**CURL Command:**

```bash
curl -X GET http://localhost:9090/api/v1/courses
```

### 2. Create Course (Instructor/Admin Only)

**POST** `/courses`

Create a new course.

**Request Body:**

```json
{
  "title": "Introduction to Purpose Discovery",
  "summary": "Learn the fundamentals of discovering your life purpose",
  "description": "A comprehensive course on finding your life purpose...",
  "outcomes": ["Understand purpose discovery", "Apply purpose principles"],
  "tags": ["purpose", "discovery", "life"],
  "difficulty": "BEGINNER",
  "estimatedDuration": 120,
  "isPublic": true,
  "enrollmentLimit": 100
}
```

**CURL Command:**

```bash
curl -X POST http://localhost:9090/api/v1/courses -H "Authorization: Bearer your_instructor_token_here" -H "Content-Type: application/json" -d '{"title": "Introduction to Purpose Discovery", "summary": "Learn the fundamentals of discovering your life purpose", "description": "A comprehensive course on finding your life purpose...", "outcomes": ["Understand purpose discovery", "Apply purpose principles"], "tags": ["purpose", "discovery", "life"], "difficulty": "BEGINNER", "estimatedDuration": 120, "isPublic": true, "enrollmentLimit": 100}'
```

### 3. Get Course by ID

**GET** `/courses/:id`

Get specific course details.

**CURL Command:**

```bash
curl -X GET http://localhost:9090/api/v1/courses/64f8a1b2c3d4e5f6a7b8c9d0
```

### 4. Update Course (Instructor/Admin Only)

**PUT** `/courses/:id`

Update course details.

**Request Body:**

```json
{
  "title": "Updated Course Title",
  "summary": "Updated course summary",
  "status": "PUBLISHED",
  "featured": true
}
```

**CURL Command:**

```bash
curl -X PUT http://localhost:9090/api/v1/courses/64f8a1b2c3d4e5f6a7b8c9d0 -H "Authorization: Bearer your_instructor_token_here" -H "Content-Type: application/json" -d '{"title": "Updated Course Title", "summary": "Updated course summary", "status": "PUBLISHED", "featured": true}'
```

### 5. Delete Course (Instructor/Admin Only)

**DELETE** `/courses/:id`

Delete a course.

**CURL Command:**

```bash
curl -X DELETE http://localhost:9090/api/v1/courses/64f8a1b2c3d4e5f6a7b8c9d0 -H "Authorization: Bearer your_instructor_token_here"
```

### 6. Get Lesson

**GET** `/courses/:courseId/lessons/:lessonId`

Get lesson details.

**CURL Command:**

```bash
curl -X GET http://localhost:9090/api/v1/courses/64f8a1b2c3d4e5f6a7b8c9d0/lessons/64f8a1b2c3d4e5f6a7b8c9d1 -H "Authorization: Bearer your_access_token_here"
```

### 7. Update Lesson (Instructor/Admin Only)

**PATCH** `/courses/:courseId/lessons/:lessonId`

Update lesson details.

**Request Body:**

```json
{
  "title": "Updated Lesson Title",
  "content": "Updated lesson content...",
  "youtubeVideoId": "dQw4w9WgXcQ",
  "durationSec": 1800,
  "isPublished": true
}
```

**CURL Command:**

```bash
curl -X PATCH http://localhost:9090/api/v1/courses/64f8a1b2c3d4e5f6a7b8c9d0/lessons/64f8a1b2c3d4e5f6a7b8c9d1 -H "Authorization: Bearer your_instructor_token_here" -H "Content-Type: application/json" -d '{"title": "Updated Lesson Title", "content": "Updated lesson content...", "youtubeVideoId": "dQw4w9WgXcQ", "durationSec": 1800, "isPublished": true}'
```

### 8. Complete Lesson

**POST** `/courses/:courseId/lessons/:lessonId/complete`

Mark lesson as completed.

**CURL Command:**

```bash
curl -X POST http://localhost:9090/api/v1/courses/64f8a1b2c3d4e5f6a7b8c9d0/lessons/64f8a1b2c3d4e5f6a7b8c9d1/complete -H "Authorization: Bearer your_access_token_here"
```

### 9. Get Lesson Progress

**GET** `/courses/:courseId/lessons/:lessonId/progress`

Get user's progress for a lesson.

**CURL Command:**

```bash
curl -X GET http://localhost:9090/api/v1/courses/64f8a1b2c3d4e5f6a7b8c9d0/lessons/64f8a1b2c3d4e5f6a7b8c9d1/progress -H "Authorization: Bearer your_access_token_here"
```

### 10. Update Lesson Progress

**PATCH** `/courses/:courseId/lessons/:lessonId/progress`

Update lesson progress.

**Request Body:**

```json
{
  "timeSpent": 900,
  "completed": true
}
```

**CURL Command:**

```bash
curl -X PATCH http://localhost:9090/api/v1/courses/64f8a1b2c3d4e5f6a7b8c9d0/lessons/64f8a1b2c3d4e5f6a7b8c9d1/progress -H "Authorization: Bearer your_access_token_here" -H "Content-Type: application/json" -d '{"timeSpent": 900, "completed": true}'
```

### 11. Get Lesson Notes

**GET** `/courses/:courseId/lessons/:lessonId/notes`

Get user's notes for a lesson.

**CURL Command:**

```bash
curl -X GET http://localhost:9090/api/v1/courses/64f8a1b2c3d4e5f6a7b8c9d0/lessons/64f8a1b2c3d4e5f6a7b8c9d1/notes -H "Authorization: Bearer your_access_token_here"
```

### 12. Create Note

**POST** `/courses/:courseId/lessons/:lessonId/notes`

Create a note for a lesson.

**Request Body:**

```json
{
  "content": "This is my note about the lesson content..."
}
```

**CURL Command:**

```bash
curl -X POST http://localhost:9090/api/v1/courses/64f8a1b2c3d4e5f6a7b8c9d0/lessons/64f8a1b2c3d4e5f6a7b8c9d1/notes -H "Authorization: Bearer your_access_token_here" -H "Content-Type: application/json" -d '{"content": "This is my note about the lesson content..."}'
```

### 13. Update Note

**PATCH** `/courses/:courseId/lessons/:lessonId/notes/:id`

Update a note.

**Request Body:**

```json
{
  "content": "Updated note content..."
}
```

**CURL Command:**

```bash
curl -X PATCH http://localhost:9090/api/v1/courses/64f8a1b2c3d4e5f6a7b8c9d0/lessons/64f8a1b2c3d4e5f6a7b8c9d1/notes/64f8a1b2c3d4e5f6a7b8c9d2 -H "Authorization: Bearer your_access_token_here" -H "Content-Type: application/json" -d '{"content": "Updated note content..."}'
```

### 14. Delete Note

**DELETE** `/courses/:courseId/lessons/:lessonId/notes/:id`

Delete a note.

**CURL Command:**

```bash
curl -X DELETE http://localhost:9090/api/v1/courses/64f8a1b2c3d4e5f6a7b8c9d0/lessons/64f8a1b2c3d4e5f6a7b8c9d1/notes/64f8a1b2c3d4e5f6a7b8c9d2 -H "Authorization: Bearer your_access_token_here"
```

### 15. Get Discussions

**GET** `/courses/:courseId/lessons/:lessonId/discussions`

Get discussions for a lesson.

**CURL Command:**

```bash
curl -X GET http://localhost:9090/api/v1/courses/64f8a1b2c3d4e5f6a7b8c9d0/lessons/64f8a1b2c3d4e5f6a7b8c9d1/discussions -H "Authorization: Bearer your_access_token_here"
```

### 16. Create Discussion

**POST** `/courses/:courseId/lessons/:lessonId/discussions`

Create a discussion.

**Request Body:**

```json
{
  "title": "Discussion Title",
  "content": "Discussion content..."
}
```

**CURL Command:**

```bash
curl -X POST http://localhost:9090/api/v1/courses/64f8a1b2c3d4e5f6a7b8c9d0/lessons/64f8a1b2c3d4e5f6a7b8c9d1/discussions -H "Authorization: Bearer your_access_token_here" -H "Content-Type: application/json" -d '{"title": "Discussion Title", "content": "Discussion content..."}'
```

### 17. Update Discussion

**PATCH** `/courses/:courseId/lessons/:lessonId/discussions/:id`

Update a discussion.

**Request Body:**

```json
{
  "title": "Updated Discussion Title",
  "content": "Updated discussion content..."
}
```

**CURL Command:**

```bash
curl -X PATCH http://localhost:9090/api/v1/courses/64f8a1b2c3d4e5f6a7b8c9d0/lessons/64f8a1b2c3d4e5f6a7b8c9d1/discussions/64f8a1b2c3d4e5f6a7b8c9d2 -H "Authorization: Bearer your_access_token_here" -H "Content-Type: application/json" -d '{"title": "Updated Discussion Title", "content": "Updated discussion content..."}'
```

### 18. Delete Discussion

**DELETE** `/courses/:courseId/lessons/:lessonId/discussions/:id`

Delete a discussion.

**CURL Command:**

```bash
curl -X DELETE http://localhost:9090/api/v1/courses/64f8a1b2c3d4e5f6a7b8c9d0/lessons/64f8a1b2c3d4e5f6a7b8c9d1/discussions/64f8a1b2c3d4e5f6a7b8c9d2 -H "Authorization: Bearer your_access_token_here"
```

### 19. Add Reply to Discussion

**POST** `/courses/:courseId/lessons/:lessonId/discussions/:id/replies`

Add a reply to a discussion.

**Request Body:**

```json
{
  "content": "This is my reply to the discussion..."
}
```

**CURL Command:**

```bash
curl -X POST http://localhost:9090/api/v1/courses/64f8a1b2c3d4e5f6a7b8c9d0/lessons/64f8a1b2c3d4e5f6a7b8c9d1/discussions/64f8a1b2c3d4e5f6a7b8c9d2/replies -H "Authorization: Bearer your_access_token_here" -H "Content-Type: application/json" -d '{"content": "This is my reply to the discussion..."}'
```

---

## 📝 Enrollment Management Endpoints

### 1. Get User Enrollments

**GET** `/enrollments`

Get current user's enrollments.

**CURL Command:**

```bash
curl -X GET http://localhost:9090/api/v1/enrollments -H "Authorization: Bearer your_access_token_here"
```

### 2. Enroll in Course

**POST** `/enrollments`

Enroll in a course.

**Request Body:**

```json
{
  "courseId": "64f8a1b2c3d4e5f6a7b8c9d0"
}
```

**CURL Command:**

```bash
curl -X POST http://localhost:9090/api/v1/enrollments -H "Authorization: Bearer your_access_token_here" -H "Content-Type: application/json" -d '{"courseId": "64f8a1b2c3d4e5f6a7b8c9d0"}'
```

### 3. Get Enrollment Details

**GET** `/enrollments/:id`

Get specific enrollment details.

**CURL Command:**

```bash
curl -X GET http://localhost:9090/api/v1/enrollments/64f8a1b2c3d4e5f6a7b8c9d0 -H "Authorization: Bearer your_access_token_here"
```

### 4. Update Enrollment

**PUT** `/enrollments/:id`

Update enrollment status or progress.

**Request Body:**

```json
{
  "status": "COMPLETED",
  "progressPct": 100
}
```

**CURL Command:**

```bash
curl -X PUT http://localhost:9090/api/v1/enrollments/64f8a1b2c3d4e5f6a7b8c9d0 -H "Authorization: Bearer your_access_token_here" -H "Content-Type: application/json" -d '{"status": "COMPLETED", "progressPct": 100}'
```

### 5. Withdraw from Course

**DELETE** `/enrollments/:id`

Withdraw from a course.

**CURL Command:**

```bash
curl -X DELETE http://localhost:9090/api/v1/enrollments/64f8a1b2c3d4e5f6a7b8c9d0 -H "Authorization: Bearer your_access_token_here"
```

### 6. Get All Enrollments (Admin Only)

**GET** `/enrollments/admin/all`

Get all enrollments (admin only).

**CURL Command:**

```bash
curl -X GET http://localhost:9090/api/v1/enrollments/admin/all -H "Authorization: Bearer your_admin_token_here"
```

### 7. Get Course Enrollment Stats (Admin Only)

**GET** `/enrollments/admin/courses/:courseId/stats`

Get enrollment statistics for a course (admin only).

**CURL Command:**

```bash
curl -X GET http://localhost:9090/api/v1/enrollments/admin/courses/64f8a1b2c3d4e5f6a7b8c9d0/stats -H "Authorization: Bearer your_admin_token_here"
```

---

## 📁 File Upload Endpoints

### 1. Upload File

**POST** `/upload`

Upload any file.

**CURL Command:**

```bash
curl -X POST http://localhost:9090/api/v1/upload -H "Authorization: Bearer your_access_token_here" -F "file=@/path/to/file.pdf"
```

### 2. Upload Image

**POST** `/upload/image`

Upload an image file.

**CURL Command:**

```bash
curl -X POST http://localhost:9090/api/v1/upload/image -H "Authorization: Bearer your_access_token_here" -F "image=@/path/to/image.jpg"
```

### 3. Upload Video

**POST** `/upload/video`

Upload a video file.

**CURL Command:**

```bash
curl -X POST http://localhost:9090/api/v1/upload/video -H "Authorization: Bearer your_access_token_here" -F "video=@/path/to/video.mp4"
```

### 4. Upload Document

**POST** `/upload/document`

Upload a document file.

**CURL Command:**

```bash
curl -X POST http://localhost:9090/api/v1/upload/document -H "Authorization: Bearer your_access_token_here" -F "document=@/path/to/document.pdf"
```

### 5. Delete File

**DELETE** `/upload/:id`

Delete an uploaded file.

**CURL Command:**

```bash
curl -X DELETE http://localhost:9090/api/v1/upload/64f8a1b2c3d4e5f6a7b8c9d0 -H "Authorization: Bearer your_access_token_here"
```

---

## 📊 Admin Statistics Endpoints (Admin Only)

### 1. Get Dashboard Statistics

**GET** `/admin/dashboard`

Get comprehensive admin dashboard statistics including user stats, course stats, enrollment stats, and completion rates.

**Query Parameters:**

- `days` (optional): Number of days to look back (default: 30)

**CURL Command:**

```bash
curl -X GET http://localhost:9090/api/v1/admin/dashboard?days=30 -H "Authorization: Bearer your_admin_token_here"
```

**Response:**

```json
{
  "ok": true,
  "data": {
    "overview": {
      "totalUsers": 150,
      "totalCourses": 25,
      "totalEnrollments": 450,
      "totalCohorts": 8,
      "totalLessons": 180,
      "totalSections": 75
    },
    "userStats": {
      "total": 150,
      "newUsers": 25,
      "activeUsers": 120,
      "usersByRole": {
        "ADMIN": { "total": 3, "newUsers": 0 },
        "INSTRUCTOR": { "total": 12, "newUsers": 2 },
        "PARTICIPANT": { "total": 135, "newUsers": 23 }
      },
      "usersByStatus": {
        "ACTIVE": 145,
        "SUSPENDED": 5
      },
      "userGrowth": [
        { "_id": "2024-01-10", "count": 5 },
        { "_id": "2024-01-11", "count": 3 },
        { "_id": "2024-01-12", "count": 7 }
      ],
      "averageUsersPerDay": 4
    },
    "courseStats": {
      "total": 25,
      "newCourses": 5,
      "publishedCourses": 18,
      "draftCourses": 5,
      "archivedCourses": 2,
      "coursesByDifficulty": {
        "BEGINNER": { "total": 12, "newCourses": 3 },
        "INTERMEDIATE": { "total": 8, "newCourses": 1 },
        "ADVANCED": { "total": 5, "newCourses": 1 }
      },
      "coursesByStatus": {
        "DRAFT": 5,
        "PUBLISHED": 18,
        "ARCHIVED": 2
      },
      "courseGrowth": [
        { "_id": "2024-01-10", "count": 1 },
        { "_id": "2024-01-12", "count": 2 }
      ],
      "averageMetrics": {
        "avgDuration": 120,
        "avgEnrollmentLimit": 100,
        "totalSections": 75,
        "totalLessons": 180
      }
    },
    "enrollmentStats": {
      "total": 450,
      "newEnrollments": 85,
      "activeEnrollments": 320,
      "completedEnrollments": 95,
      "withdrawnEnrollments": 35,
      "enrollmentsByStatus": {
        "ACTIVE": { "total": 320, "newEnrollments": 65 },
        "COMPLETED": { "total": 95, "newEnrollments": 15 },
        "WITHDRAWN": { "total": 35, "newEnrollments": 5 }
      },
      "enrollmentGrowth": [
        { "_id": "2024-01-10", "count": 12 },
        { "_id": "2024-01-11", "count": 8 },
        { "_id": "2024-01-12", "count": 15 }
      ],
      "averageProgress": {
        "avgProgress": 45.5,
        "avgActiveProgress": 52.3
      }
    },
    "completionStats": {
      "totalEnrollments": 450,
      "totalCompleted": 95,
      "recentCompleted": 15,
      "overallCompletionRate": 21.11,
      "recentCompletionRate": 3.33,
      "completionByCourse": [
        {
          "courseTitle": "JavaScript Fundamentals",
          "totalEnrollments": 120,
          "completedEnrollments": 35,
          "completionRate": 29.17,
          "avgProgress": 65.5
        }
      ],
      "completionGrowth": [
        { "_id": "2024-01-10", "count": 3 },
        { "_id": "2024-01-12", "count": 5 }
      ]
    },
    "recentActivity": [
      {
        "id": "64f8a1b2c3d4e5f6a7b8c9d0",
        "action": "USER_REGISTERED",
        "actor": {
          "userId": "64f8a1b2c3d4e5f6a7b8c9d1",
          "name": "John Doe",
          "email": "john@example.com",
          "role": "PARTICIPANT"
        },
        "performedAt": "2024-01-15T10:30:00.000Z",
        "status": "SUCCESS"
      }
    ],
    "topCourses": [
      {
        "courseTitle": "JavaScript Fundamentals",
        "courseId": "64f8a1b2c3d4e5f6a7b8c9d2",
        "enrollmentCount": 120,
        "avgProgress": 65.5,
        "completionCount": 35,
        "completionRate": 29.17
      }
    ],
    "topUsers": [
      {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
        "name": "John Doe",
        "email": "john@example.com",
        "role": "PARTICIPANT",
        "activityCount": 45,
        "lastActivity": "2024-01-15T10:30:00.000Z"
      }
    ],
    "generatedAt": "2024-01-15T10:30:00.000Z",
    "period": "30 days"
  },
  "message": "Dashboard statistics retrieved successfully"
}
```

### 2. Get User Statistics

**GET** `/admin/stats/users`

Get detailed user statistics.

**Query Parameters:**

- `days` (optional): Number of days to look back (default: 30)
- `groupBy` (optional): Group by field (default: 'role')

**CURL Command:**

```bash
curl -X GET http://localhost:9090/api/v1/admin/stats/users?days=30&groupBy=role -H "Authorization: Bearer your_admin_token_here"
```

### 3. Get Course Statistics

**GET** `/admin/stats/courses`

Get detailed course statistics.

**Query Parameters:**

- `days` (optional): Number of days to look back (default: 30)
- `status` (optional): Filter by course status

**CURL Command:**

```bash
curl -X GET http://localhost:9090/api/v1/admin/stats/courses?days=30&status=PUBLISHED -H "Authorization: Bearer your_admin_token_here"
```

### 4. Get Enrollment Statistics

**GET** `/admin/stats/enrollments`

Get detailed enrollment statistics.

**Query Parameters:**

- `days` (optional): Number of days to look back (default: 30)
- `status` (optional): Filter by enrollment status

**CURL Command:**

```bash
curl -X GET http://localhost:9090/api/v1/admin/stats/enrollments?days=30&status=ACTIVE -H "Authorization: Bearer your_admin_token_here"
```

### 5. Get Completion Statistics

**GET** `/admin/stats/completion`

Get completion rate statistics.

**Query Parameters:**

- `days` (optional): Number of days to look back (default: 30)
- `courseId` (optional): Filter by specific course

**CURL Command:**

```bash
curl -X GET http://localhost:9090/api/v1/admin/stats/completion?days=30&courseId=64f8a1b2c3d4e5f6a7b8c9d0 -H "Authorization: Bearer your_admin_token_here"
```

---

## 📧 Email Management Endpoints (Admin Only)

### 1. Get Current Email Provider

**GET** `/admin/email/provider`

Get the currently configured email provider.

**CURL Command:**

```bash
curl -X GET http://localhost:9090/api/v1/admin/email/provider -H "Authorization: Bearer your_admin_token_here"
```

**Response:**

```json
{
  "ok": true,
  "data": {
    "provider": "resend"
  },
  "message": "Current email provider retrieved successfully"
}
```

### 2. Switch Email Provider

**POST** `/admin/email/provider`

Switch between Resend and Nodemailer email providers.

**Request Body:**

```json
{
  "provider": "nodemailer"
}
```

**CURL Command:**

```bash
curl -X POST http://localhost:9090/api/v1/admin/email/provider -H "Authorization: Bearer your_admin_token_here" -H "Content-Type: application/json" -d '{"provider": "nodemailer"}'
```

**Response:**

```json
{
  "ok": true,
  "data": {
    "provider": "nodemailer"
  },
  "message": "Email provider switched to nodemailer successfully"
}
```

### 3. Test Email Service

**POST** `/admin/email/test`

Send a test email using the current or specified provider.

**Request Body:**

```json
{
  "email": "test@example.com",
  "provider": "nodemailer"
}
```

**CURL Command:**

```bash
curl -X POST http://localhost:9090/api/v1/admin/email/test -H "Authorization: Bearer your_admin_token_here" -H "Content-Type: application/json" -d '{"email": "test@example.com", "provider": "nodemailer"}'
```

**Response:**

```json
{
  "ok": true,
  "data": {
    "success": true,
    "messageId": "test-message-id",
    "provider": "nodemailer"
  },
  "message": "Test email sent successfully via nodemailer"
}
```

---

## 🔧 Health Check

### Health Check

**GET** `/health`

Check server health status.

**CURL Command:**

```bash
curl -X GET http://localhost:9090/health
```

**Response:**

```json
{
  "ok": true,
  "message": "Server is healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "environment": "development"
}
```

---

## 📋 Error Responses

### Validation Error

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email address"
      }
    ]
  }
}
```

### Authentication Error

```json
{
  "ok": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid email or password"
  }
}
```

### Authorization Error

```json
{
  "ok": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied"
  }
}
```

### Not Found Error

```json
{
  "ok": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  }
}
```

---

## 🔐 Role-Based Access Control

### User Roles

- **ADMIN**: Full system access
- **INSTRUCTOR**: Course creation and management
- **PARTICIPANT**: Course enrollment and learning

### Protected Endpoints

- Admin-only endpoints require `ADMIN` role
- Instructor endpoints require `INSTRUCTOR` or `ADMIN` role
- User profile endpoints require authentication
- Public endpoints (courses listing, health check) require no authentication

---

## 📝 Notes

1. **Base URL**: All endpoints are prefixed with `http://localhost:9090/api/v1`
2. **Authentication**: Protected endpoints require `Authorization: Bearer <token>` header
3. **Content-Type**: JSON requests should include `Content-Type: application/json` header
4. **File Uploads**: Use `multipart/form-data` for file uploads
5. **Pagination**: List endpoints support pagination with `page` and `limit` query parameters
6. **Rate Limiting**: API is rate-limited to 100 requests per 15 minutes per IP
7. **CORS**: Configured for `http://localhost:3000` by default

---

## 🚀 Quick Start Examples

### 1. Create Admin User

```bash
curl -X POST http://localhost:9090/api/v1/auth/register -H "Content-Type: application/json" -d '{"name": "Admin User", "email": "admin@example.com", "password": "SecurePassword123!", "role": "ADMIN"}'
```

### 2. Login and Get Token

```bash
curl -X POST http://localhost:9090/api/v1/auth/login -H "Content-Type: application/json" -d '{"email": "admin@example.com", "password": "SecurePassword123!"}'
```

### 3. Create Course (using token from login)

```bash
curl -X POST http://localhost:9090/api/v1/courses -H "Authorization: Bearer YOUR_TOKEN_HERE" -H "Content-Type: application/json" -d '{"title": "My Course", "summary": "Course description", "difficulty": "BEGINNER"}'
```

### 4. Get All Courses

```bash
curl -X GET http://localhost:9090/api/v1/courses
```

### 5. Create Cohort (using token from login)

```bash
curl -X POST http://localhost:9090/api/v1/cohorts -H "Authorization: Bearer YOUR_TOKEN_HERE" -H "Content-Type: application/json" -d '{"name": "My Cohort", "description": "A test cohort", "year": 2024, "maxParticipants": 25}'
```

### 6. Get All Cohorts

```bash
curl -X GET http://localhost:9090/api/v1/cohorts
```

---

## 📊 Activity Monitoring Endpoints

### 1. Get All Activities (Admin Only)

**GET** `/activities`

Get all platform activities with filtering and pagination.

**Query Parameters:**

- `action` - Filter by action type
- `actorId` - Filter by actor user ID
- `actorRole` - Filter by actor role
- `targetType` - Filter by target type
- `targetId` - Filter by target ID
- `status` - Filter by status
- `startDate` - Filter by start date
- `endDate` - Filter by end date
- `search` - Search in actor name, email, target name, or action

**CURL Command:**

```bash
curl -X GET "http://localhost:9090/api/v1/activities?action=USER_LOGIN&startDate=2024-01-01&endDate=2024-01-31" -H "Authorization: Bearer your_admin_token_here"
```

### 2. Get Dashboard Summary (Admin Only)

**GET** `/activities/dashboard`

Get activity summary for admin dashboard.

**Query Parameters:**

- `days` - Number of days to include (default: 30)

**CURL Command:**

```bash
curl -X GET "http://localhost:9090/api/v1/activities/dashboard?days=7" -H "Authorization: Bearer your_admin_token_here"
```

### 3. Get User Activities

**GET** `/activities/user/:userId`

Get activities for a specific user (admin or self).

**CURL Command:**

```bash
curl -X GET "http://localhost:9090/api/v1/activities/user/64f8a1b2c3d4e5f6a7b8c9d0" -H "Authorization: Bearer your_access_token_here"
```

### 4. Get Target Activities (Admin Only)

**GET** `/activities/target/:type/:id`

Get activities related to a specific target (course, user, etc.).

**CURL Command:**

```bash
curl -X GET "http://localhost:9090/api/v1/activities/target/COURSE/64f8a1b2c3d4e5f6a7b8c9d0" -H "Authorization: Bearer your_admin_token_here"
```

### 5. Get Activity Summary (Admin Only)

**GET** `/activities/summary`

Get aggregated activity summary with grouping options.

**Query Parameters:**

- `days` - Number of days to include (default: 30)
- `groupBy` - Group by: action, actor, target, date (default: action)

**CURL Command:**

```bash
curl -X GET "http://localhost:9090/api/v1/activities/summary?days=30&groupBy=actor" -H "Authorization: Bearer your_admin_token_here"
```

### 6. Get Activity by ID (Admin Only)

**GET** `/activities/:id`

Get specific activity details.

**CURL Command:**

```bash
curl -X GET http://localhost:9090/api/v1/activities/64f8a1b2c3d4e5f6a7b8c9d0 -H "Authorization: Bearer your_admin_token_here"
```

### 7. Delete Activity (Admin Only)

**DELETE** `/activities/:id`

Delete a specific activity.

**CURL Command:**

```bash
curl -X DELETE http://localhost:9090/api/v1/activities/64f8a1b2c3d4e5f6a7b8c9d0 -H "Authorization: Bearer your_admin_token_here"
```

### 8. Bulk Delete Activities (Admin Only)

**POST** `/activities/bulk-delete`

Delete multiple activities by IDs or filters.

**Request Body:**

```json
{
  "activityIds": ["64f8a1b2c3d4e5f6a7b8c9d0", "64f8a1b2c3d4e5f6a7b8c9d1"],
  "filters": {
    "action": "USER_LOGIN",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  }
}
```

**CURL Command:**

```bash
curl -X POST http://localhost:9090/api/v1/activities/bulk-delete -H "Authorization: Bearer your_admin_token_here" -H "Content-Type: application/json" -d '{"filters": {"action": "USER_LOGIN", "startDate": "2024-01-01", "endDate": "2024-01-31"}}'
```

### 9. Export Activities (Admin Only)

**POST** `/activities/export`

Export activities in JSON or CSV format.

**Request Body:**

```json
{
  "format": "csv",
  "filters": {
    "action": "USER_LOGIN",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  }
}
```

**CURL Command:**

```bash
curl -X POST http://localhost:9090/api/v1/activities/export -H "Authorization: Bearer your_admin_token_here" -H "Content-Type: application/json" -d '{"format": "csv", "filters": {"action": "USER_LOGIN", "startDate": "2024-01-01", "endDate": "2024-01-31"}}'
```

### 10. Cleanup Activities (Admin Only)

**POST** `/activities/cleanup`

Clean up old activities to free up storage.

**Request Body:**

```json
{
  "daysToKeep": 365
}
```

**CURL Command:**

```bash
curl -X POST http://localhost:9090/api/v1/activities/cleanup -H "Authorization: Bearer your_admin_token_here" -H "Content-Type: application/json" -d '{"daysToKeep": 365}'
```

---

## 🔍 Activity Monitoring Features

### **Tracked Actions:**

- **User Actions**: Registration, login, logout, profile updates, password changes
- **Course Actions**: Creation, updates, deletion, publishing, archiving
- **Lesson Actions**: Creation, updates, completion, progress tracking
- **Enrollment Actions**: Enrollment, withdrawal, completion
- **Cohort Actions**: Creation, member management, role updates
- **File Actions**: Uploads, downloads, deletions
- **System Actions**: Errors, warnings, maintenance, backups
- **Admin Actions**: Bulk operations, exports, settings updates

### **Activity Data Captured:**

- **Actor Information**: User ID, name, email, role
- **Target Information**: What was acted upon (course, user, file, etc.)
- **Context**: IP address, user agent, session ID, endpoint
- **Changes**: Before/after states for updates
- **Metadata**: Additional contextual information
- **Timing**: When action was performed and duration
- **Status**: Success, failure, pending, cancelled

### **Filtering & Search:**

- Filter by action type, actor, target, date range
- Search across actor names, emails, target names
- Group activities by action, actor, target, or date
- Pagination support for large datasets

### **Reporting & Analytics:**

- Dashboard summaries with activity counts
- Top users by activity level
- Activity trends over time
- Export capabilities (JSON/CSV)
- Bulk operations for data management

### **Security & Privacy:**

- Admin-only access to activity logs
- Users can only view their own activities
- Automatic cleanup of old activities
- Secure storage with proper indexing

---

## 👥 Cohort Management Endpoints

### 1. Get All Cohorts

**GET** `/cohorts`

Get all available cohorts.

**CURL Command:**

```bash
curl -X GET http://localhost:9090/api/v1/cohorts
```

### 2. Create Cohort (Instructor/Admin Only)

**POST** `/cohorts`

Create a new cohort.

**Request Body:**

```json
{
  "name": "Purpose Discovery 2024",
  "description": "A cohort focused on discovering life purpose",
  "year": 2024,
  "tags": ["purpose", "discovery", "2024"],
  "startDate": "2024-01-15T00:00:00.000Z",
  "endDate": "2024-12-31T23:59:59.000Z",
  "maxParticipants": 50
}
```

**CURL Command:**

```bash
curl -X POST http://localhost:9090/api/v1/cohorts -H "Authorization: Bearer your_instructor_token_here" -H "Content-Type: application/json" -d '{"name": "Purpose Discovery 2024", "description": "A cohort focused on discovering life purpose", "year": 2024, "tags": ["purpose", "discovery", "2024"], "startDate": "2024-01-15T00:00:00.000Z", "endDate": "2024-12-31T23:59:59.000Z", "maxParticipants": 50}'
```

### 3. Get Cohort by ID

**GET** `/cohorts/:id`

Get specific cohort details.

**CURL Command:**

```bash
curl -X GET http://localhost:9090/api/v1/cohorts/64f8a1b2c3d4e5f6a7b8c9d0 -H "Authorization: Bearer your_access_token_here"
```

### 4. Update Cohort (Instructor/Admin Only)

**PUT** `/cohorts/:id`

Update cohort details.

**Request Body:**

```json
{
  "name": "Updated Cohort Name",
  "description": "Updated cohort description",
  "status": "ACTIVE",
  "maxParticipants": 75
}
```

**CURL Command:**

```bash
curl -X PUT http://localhost:9090/api/v1/cohorts/64f8a1b2c3d4e5f6a7b8c9d0 -H "Authorization: Bearer your_instructor_token_here" -H "Content-Type: application/json" -d '{"name": "Updated Cohort Name", "description": "Updated cohort description", "status": "ACTIVE", "maxParticipants": 75}'
```

### 5. Delete Cohort (Instructor/Admin Only)

**DELETE** `/cohorts/:id`

Delete a cohort.

**CURL Command:**

```bash
curl -X DELETE http://localhost:9090/api/v1/cohorts/64f8a1b2c3d4e5f6a7b8c9d0 -H "Authorization: Bearer your_instructor_token_here"
```

### 6. Get Cohort Members

**GET** `/cohorts/:id/members`

Get all members of a cohort.

**CURL Command:**

```bash
curl -X GET http://localhost:9090/api/v1/cohorts/64f8a1b2c3d4e5f6a7b8c9d0/members -H "Authorization: Bearer your_access_token_here"
```

### 7. Add Member to Cohort (Instructor/Admin Only)

**POST** `/cohorts/:id/members`

Add a user to a cohort.

**Request Body:**

```json
{
  "userId": "64f8a1b2c3d4e5f6a7b8c9d1",
  "roleInCohort": "MEMBER",
  "notes": "Added as a new member"
}
```

**CURL Command:**

```bash
curl -X POST http://localhost:9090/api/v1/cohorts/64f8a1b2c3d4e5f6a7b8c9d0/members -H "Authorization: Bearer your_instructor_token_here" -H "Content-Type: application/json" -d '{"userId": "64f8a1b2c3d4e5f6a7b8c9d1", "roleInCohort": "MEMBER", "notes": "Added as a new member"}'
```

### 8. Update Member Role (Instructor/Admin Only)

**PUT** `/cohorts/:id/members/:userId`

Update a member's role in the cohort.

**Request Body:**

```json
{
  "roleInCohort": "MENTOR",
  "notes": "Promoted to mentor role"
}
```

**CURL Command:**

```bash
curl -X PUT http://localhost:9090/api/v1/cohorts/64f8a1b2c3d4e5f6a7b8c9d0/members/64f8a1b2c3d4e5f6a7b8c9d1 -H "Authorization: Bearer your_instructor_token_here" -H "Content-Type: application/json" -d '{"roleInCohort": "MENTOR", "notes": "Promoted to mentor role"}'
```

### 9. Remove Member from Cohort (Instructor/Admin Only)

**DELETE** `/cohorts/:id/members/:userId`

Remove a user from a cohort.

**CURL Command:**

```bash
curl -X DELETE http://localhost:9090/api/v1/cohorts/64f8a1b2c3d4e5f6a7b8c9d0/members/64f8a1b2c3d4e5f6a7b8c9d1 -H "Authorization: Bearer your_instructor_token_here"
```

### 10. Get User's Cohorts

**GET** `/cohorts/user/my`

Get all cohorts that the current user is a member of.

**CURL Command:**

```bash
curl -X GET http://localhost:9090/api/v1/cohorts/user/my -H "Authorization: Bearer your_access_token_here"
```

---

## 🎯 Cohort Assignment During User Creation

### Automatic Cohort Assignment

When creating users (especially participants), you can automatically assign them to a cohort during the registration or invitation process.

#### **During Registration:**

```bash
curl -X POST http://localhost:9090/api/v1/auth/register -H "Content-Type: application/json" -d '{"name": "New Participant", "email": "participant@example.com", "password": "SecurePassword123!", "role": "PARTICIPANT", "cohortId": "64f8a1b2c3d4e5f6a7b8c9d0", "roleInCohort": "MEMBER"}'
```

#### **During User Invitation:**

```bash
curl -X POST http://localhost:9090/api/v1/users/invite -H "Authorization: Bearer your_admin_token_here" -H "Content-Type: application/json" -d '{"name": "Invited Participant", "email": "invited@example.com", "role": "PARTICIPANT", "cohortId": "64f8a1b2c3d4e5f6a7b8c9d0", "roleInCohort": "MEMBER"}'
```

### **Features:**

- **Validation**: Checks if cohort exists and is not full
- **Automatic Assignment**: Users are automatically added to the specified cohort
- **Role Assignment**: Can specify the user's role within the cohort (LEADER, MEMBER, MENTOR)
- **Invitation Flow**: For invited users, cohort assignment happens when they complete their invitation

### **Error Handling:**

- `COHORT_NOT_FOUND`: If the specified cohort doesn't exist
- `COHORT_FULL`: If the cohort has reached its maximum capacity
