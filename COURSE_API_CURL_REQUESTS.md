# 📚 Course API - CURL Requests

This document contains all the CURL requests for the Course API endpoints including Courses, Sections, and Lessons.

## 🔑 **Authentication Setup**

Before using these APIs, you'll need to authenticate:

### 1. **Register/Login to get a token:**
```bash
# Register as Instructor
curl -X POST http://localhost:9092/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Instructor",
    "email": "instructor@example.com",
    "password": "SecurePassword123!",
    "role": "INSTRUCTOR"
  }'

# Login
curl -X POST http://localhost:9092/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "instructor@example.com",
    "password": "SecurePassword123!"
  }'
```

### 2. **Use the returned token in subsequent requests:**
```bash
-H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

---

## 📚 **COURSES**

### 1. **Get All Courses**
```bash
curl -X GET http://localhost:9092/api/v1/courses
```

**Query Parameters:**
- `status` - Filter by status (DRAFT, PUBLISHED, ARCHIVED)
- `difficulty` - Filter by difficulty (BEGINNER, INTERMEDIATE, ADVANCED)
- `featured` - Filter by featured status (true/false)
- `search` - Search in title, summary, or tags
- `ownerId` - Filter by course owner
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

**Example with filters:**
```bash
curl -X GET "http://localhost:9092/api/v1/courses?status=PUBLISHED&difficulty=BEGINNER&search=purpose&page=1&limit=10"
```

### 2. **Create Course (Instructor/Admin Only)**
```bash
curl -X POST http://localhost:9092/api/v1/courses \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Introduction to Purpose Discovery",
    "summary": "Learn the fundamentals of discovering your life purpose",
    "description": "A comprehensive course on finding your life purpose through structured learning and reflection",
    "outcomes": ["Understand purpose discovery", "Apply purpose principles", "Create life vision"],
    "tags": ["purpose", "discovery", "life", "vision"],
    "difficulty": "BEGINNER",
    "estimatedDuration": 120,
    "isPublic": true,
    "enrollmentLimit": 100
  }'
```

### 3. **Get Course by ID**
```bash
curl -X GET http://localhost:9092/api/v1/courses/COURSE_ID_HERE
```

### 4. **Update Course (Instructor/Admin Only)**
```bash
curl -X PUT http://localhost:9092/api/v1/courses/COURSE_ID_HERE \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Course Title",
    "summary": "Updated course summary",
    "status": "PUBLISHED",
    "featured": true
  }'
```

### 5. **Delete Course (Instructor/Admin Only)**
```bash
curl -X DELETE http://localhost:9092/api/v1/courses/COURSE_ID_HERE \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 📁 **SECTIONS**

### 6. **Get Course Sections**
```bash
curl -X GET http://localhost:9092/api/v1/courses/COURSE_ID_HERE/sections
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

### 7. **Create Section (Instructor/Admin Only)**
```bash
curl -X POST http://localhost:9092/api/v1/courses/COURSE_ID_HERE/sections \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Understanding Your Core Values",
    "description": "Learn to identify and articulate your fundamental values",
    "order": 1
  }'
```

### 8. **Update Section (Instructor/Admin Only)**
```bash
curl -X PUT http://localhost:9092/api/v1/courses/COURSE_ID_HERE/sections/SECTION_ID_HERE \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Section Title",
    "description": "Updated section description",
    "order": 2,
    "isPublished": true
  }'
```

### 9. **Delete Section (Instructor/Admin Only)**
```bash
curl -X DELETE http://localhost:9092/api/v1/courses/COURSE_ID_HERE/sections/SECTION_ID_HERE \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 📝 **LESSONS**

### 10. **Get Section Lessons** ⭐ **NEW ROUTE**
```bash
curl -X GET http://localhost:9092/api/v1/courses/COURSE_ID_HERE/sections/SECTION_ID_HERE/lessons
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

### 11. **Create Lesson (Instructor/Admin Only)**
```bash
curl -X POST http://localhost:9092/api/v1/courses/COURSE_ID_HERE/sections/SECTION_ID_HERE/lessons \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "What Are Core Values?",
    "type": "VIDEO",
    "content": "Core values are the fundamental beliefs that guide your behavior and decision-making...",
    "youtubeVideoId": "dQw4w9WgXcQ",
    "order": 1,
    "durationSec": 1800,
    "isPublished": true,
    "isFree": false,
    "notes": "This lesson introduces the concept of core values"
  }'
```

### 12. **Get Lesson Details**
```bash
curl -X GET http://localhost:9092/api/v1/courses/COURSE_ID_HERE/lessons/LESSON_ID_HERE \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 13. **Update Lesson (Instructor/Admin Only)**
```bash
curl -X PATCH http://localhost:9092/api/v1/courses/COURSE_ID_HERE/lessons/LESSON_ID_HERE \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Lesson Title",
    "content": "Updated lesson content...",
    "youtubeVideoId": "dQw4w9WgXcQ",
    "durationSec": 1800,
    "isPublished": true
  }'
```

### 14. **Complete Lesson**
```bash
curl -X POST http://localhost:9092/api/v1/courses/COURSE_ID_HERE/lessons/LESSON_ID_HERE/complete \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 15. **Get Lesson Progress**
```bash
curl -X GET http://localhost:9092/api/v1/courses/COURSE_ID_HERE/lessons/LESSON_ID_HERE/progress \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 16. **Update Lesson Progress**
```bash
curl -X PATCH http://localhost:9092/api/v1/courses/COURSE_ID_HERE/lessons/LESSON_ID_HERE/progress \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "timeSpent": 900,
    "completed": true
  }'
```

---

## 📝 **LESSON NOTES**

### 17. **Get Lesson Notes**
```bash
curl -X GET http://localhost:9092/api/v1/courses/COURSE_ID_HERE/lessons/LESSON_ID_HERE/notes \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 18. **Create Note**
```bash
curl -X POST http://localhost:9092/api/v1/courses/COURSE_ID_HERE/lessons/LESSON_ID_HERE/notes \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "This is my note about the lesson content..."
  }'
```

### 19. **Update Note**
```bash
curl -X PATCH http://localhost:9092/api/v1/courses/COURSE_ID_HERE/lessons/LESSON_ID_HERE/notes/NOTE_ID_HERE \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Updated note content..."
  }'
```

### 20. **Delete Note**
```bash
curl -X DELETE http://localhost:9092/api/v1/courses/COURSE_ID_HERE/lessons/LESSON_ID_HERE/notes/NOTE_ID_HERE \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 💬 **LESSON DISCUSSIONS**

### 21. **Get Discussions**
```bash
curl -X GET http://localhost:9092/api/v1/courses/COURSE_ID_HERE/lessons/LESSON_ID_HERE/discussions \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 22. **Create Discussion**
```bash
curl -X POST http://localhost:9092/api/v1/courses/COURSE_ID_HERE/lessons/LESSON_ID_HERE/discussions \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Discussion Topic",
    "content": "What are your thoughts on this lesson?"
  }'
```

### 23. **Update Discussion**
```bash
curl -X PATCH http://localhost:9092/api/v1/courses/COURSE_ID_HERE/lessons/LESSON_ID_HERE/discussions/DISCUSSION_ID_HERE \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Discussion Title",
    "content": "Updated discussion content..."
  }'
```

### 24. **Delete Discussion**
```bash
curl -X DELETE http://localhost:9092/api/v1/courses/COURSE_ID_HERE/lessons/LESSON_ID_HERE/discussions/DISCUSSION_ID_HERE \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 25. **Add Reply to Discussion**
```bash
curl -X POST http://localhost:9092/api/v1/courses/COURSE_ID_HERE/lessons/LESSON_ID_HERE/discussions/DISCUSSION_ID_HERE/replies \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "This is my reply to the discussion..."
  }'
```

---

## 🎯 **Lesson Types Supported**

- **TEXT** - Text-based lessons
- **VIDEO** - Video lessons (with YouTube video ID)
- **AUDIO** - Audio lessons
- **QUIZ** - Quiz lessons
- **ASSIGNMENT** - Assignment lessons
- **RESOURCE** - Resource/file lessons

---

## 🔄 **Complete Workflow Example**

### **Step 1: Create Course**
```bash
curl -X POST http://localhost:9092/api/v1/courses \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Purpose Discovery Course",
    "summary": "Learn to discover your life purpose",
    "description": "A comprehensive course on finding your life purpose",
    "difficulty": "BEGINNER",
    "estimatedDuration": 120,
    "isPublic": true
  }'
```

### **Step 2: Create Section**
```bash
curl -X POST http://localhost:9092/api/v1/courses/COURSE_ID_HERE/sections \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Understanding Core Values",
    "description": "Learn to identify your core values",
    "order": 1
  }'
```

### **Step 3: Create Lesson**
```bash
curl -X POST http://localhost:9092/api/v1/courses/COURSE_ID_HERE/sections/SECTION_ID_HERE/lessons \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "What Are Core Values?",
    "type": "VIDEO",
    "youtubeVideoId": "dQw4w9WgXcQ",
    "order": 1,
    "durationSec": 1800,
    "isPublished": true
  }'
```

### **Step 4: Get Section Lessons** ⭐ **NEW**
```bash
curl -X GET http://localhost:9092/api/v1/courses/COURSE_ID_HERE/sections/SECTION_ID_HERE/lessons
```

### **Step 5: Get Lesson Details**
```bash
curl -X GET http://localhost:9092/api/v1/courses/COURSE_ID_HERE/lessons/LESSON_ID_HERE \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### **Step 6: Complete Lesson**
```bash
curl -X POST http://localhost:9092/api/v1/courses/COURSE_ID_HERE/lessons/LESSON_ID_HERE/complete \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 📊 **Response Examples**

### **Course Creation Response**
```json
{
  "ok": true,
  "data": {
    "course": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "title": "Introduction to Purpose Discovery",
      "summary": "Learn the fundamentals of discovering your life purpose",
      "status": "DRAFT",
      "ownerId": {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
        "name": "Test Instructor",
        "email": "instructor@example.com"
      },
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  },
  "message": "Course created successfully"
}
```

### **Section Lessons Response** ⭐ **NEW**
```json
{
  "ok": true,
  "data": {
    "data": [
      {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d2",
        "title": "What Are Core Values?",
        "type": "VIDEO",
        "youtubeVideoId": "dQw4w9WgXcQ",
        "order": 1,
        "durationSec": 1800,
        "isPublished": true,
        "sectionId": {
          "_id": "64f8a1b2c3d4e5f6a7b8c9d3",
          "title": "Understanding Core Values",
          "order": 1
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  },
  "message": "Lessons retrieved successfully"
}
```

---

## ⚠️ **Important Notes**

1. **Replace Placeholders:**
   - `COURSE_ID_HERE` - Actual course ID
   - `SECTION_ID_HERE` - Actual section ID
   - `LESSON_ID_HERE` - Actual lesson ID
   - `YOUR_TOKEN_HERE` - Your JWT access token

2. **Permissions:**
   - Course/Section/Lesson creation/editing requires `INSTRUCTOR` or `ADMIN` role
   - Students can view published content and interact with lessons
   - Some endpoints require authentication

3. **Development vs Production:**
   - In development, all courses/sections/lessons are visible for easier testing
   - In production, only published content is visible to non-admin users

4. **Pagination:**
   - All list endpoints support pagination with `page` and `limit` parameters
   - Default page size is 20 items

5. **Ordering:**
   - Sections and lessons are ordered by their `order` field
   - Lower order numbers appear first

---

## 🚀 **Quick Test Commands**

### **Test Course Creation (Single Line)**
```bash
curl -X POST http://localhost:9092/api/v1/courses -H "Authorization: Bearer YOUR_TOKEN_HERE" -H "Content-Type: application/json" -d '{"title": "Test Course", "summary": "Test course", "difficulty": "BEGINNER"}'
```

### **Test Section Creation (Single Line)**
```bash
curl -X POST http://localhost:9092/api/v1/courses/COURSE_ID_HERE/sections -H "Authorization: Bearer YOUR_TOKEN_HERE" -H "Content-Type: application/json" -d '{"title": "Test Section", "order": 1}'
```

### **Test Lesson Creation (Single Line)**
```bash
curl -X POST http://localhost:9092/api/v1/courses/COURSE_ID_HERE/sections/SECTION_ID_HERE/lessons -H "Authorization: Bearer YOUR_TOKEN_HERE" -H "Content-Type: application/json" -d '{"title": "Test Lesson", "type": "TEXT", "order": 1}'
```

### **Test Get Section Lessons (Single Line)** ⭐ **NEW**
```bash
curl -X GET http://localhost:9092/api/v1/courses/COURSE_ID_HERE/sections/SECTION_ID_HERE/lessons
```
