# 📝 Assessment API - CURL Requests

This document contains all the CURL requests for the Assessment API endpoints.

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

## 📚 **Assessment Management APIs**

### 1. **Get All Assessments for a Course**
```bash
curl -X GET http://localhost:9092/api/v1/assessments/courses/COURSE_ID_HERE/assessments \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Query Parameters:**
- `type` - Filter by assessment type (QUIZ, ASSIGNMENT, EXAM, SURVEY)
- `status` - Filter by status (published, draft)
- `search` - Search in title, description, or tags
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

**Example with filters:**
```bash
curl -X GET "http://localhost:9092/api/v1/assessments/courses/COURSE_ID_HERE/assessments?type=QUIZ&status=published&search=quiz&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 2. **Create Assessment (Instructor/Admin Only)**
```bash
curl -X POST http://localhost:9092/api/v1/assessments/courses/COURSE_ID_HERE/assessments \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Core Values Assessment",
    "description": "Test your understanding of core values and their importance in life purpose discovery",
    "type": "QUIZ",
    "questions": [
      {
        "question": "What are core values?",
        "type": "MULTIPLE_CHOICE",
        "options": [
          "Fundamental beliefs that guide behavior",
          "Personal preferences for food",
          "Career goals",
          "Financial targets"
        ],
        "correctAnswer": "Fundamental beliefs that guide behavior",
        "points": 10,
        "explanation": "Core values are the fundamental beliefs that guide your behavior and decision-making.",
        "order": 1
      },
      {
        "question": "Which of the following is NOT typically considered a core value?",
        "type": "MULTIPLE_CHOICE",
        "options": [
          "Integrity",
          "Compassion",
          "Pizza preference",
          "Excellence"
        ],
        "correctAnswer": "Pizza preference",
        "points": 10,
        "explanation": "Pizza preference is a personal taste, not a core value.",
        "order": 2
      },
      {
        "question": "Core values should be consistent across all areas of life.",
        "type": "TRUE_FALSE",
        "correctAnswer": true,
        "points": 5,
        "explanation": "True. Core values should guide your decisions in all areas of life.",
        "order": 3
      },
      {
        "question": "Describe how you would apply your core values in a difficult decision.",
        "type": "ESSAY",
        "points": 25,
        "order": 4
      }
    ],
    "timeLimit": 30,
    "passingScore": 70,
    "maxAttempts": 2,
    "isPublished": true,
    "isAutoGraded": true,
    "allowReview": true,
    "showCorrectAnswers": false,
    "dueDate": "2024-12-31T23:59:59.000Z",
    "instructions": "Read each question carefully. You have 30 minutes to complete this assessment. Essay questions will be manually graded.",
    "tags": ["core-values", "purpose", "assessment"],
    "difficulty": "MEDIUM"
  }'
```

### 3. **Get Assessment by ID**
```bash
curl -X GET http://localhost:9092/api/v1/assessments/courses/COURSE_ID_HERE/assessments/ASSESSMENT_ID_HERE \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 4. **Update Assessment (Instructor/Admin Only)**
```bash
curl -X PUT http://localhost:9092/api/v1/assessments/courses/COURSE_ID_HERE/assessments/ASSESSMENT_ID_HERE \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Core Values Assessment",
    "description": "Updated description for the core values assessment",
    "isPublished": true,
    "showCorrectAnswers": true,
    "timeLimit": 45,
    "passingScore": 75,
    "tags": ["core-values", "purpose", "assessment", "updated"]
  }'
```

### 5. **Delete Assessment (Instructor/Admin Only)**
```bash
curl -X DELETE http://localhost:9092/api/v1/assessments/courses/COURSE_ID_HERE/assessments/ASSESSMENT_ID_HERE \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 📝 **Assessment Submission APIs**

### 6. **Start Assessment Attempt**
```bash
curl -X POST http://localhost:9092/api/v1/assessments/courses/COURSE_ID_HERE/assessments/ASSESSMENT_ID_HERE/start \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Response includes:**
- `submission` - Submission details with attempt number
- `assessment` - Assessment details (without correct answers)

### 7. **Submit Assessment**
```bash
curl -X POST http://localhost:9092/api/v1/assessments/courses/COURSE_ID_HERE/assessments/ASSESSMENT_ID_HERE/submit \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "submissionId": "SUBMISSION_ID_HERE",
    "answers": [
      {
        "answer": "Fundamental beliefs that guide behavior",
        "timeSpent": 30
      },
      {
        "answer": "Pizza preference",
        "timeSpent": 25
      },
      {
        "answer": true,
        "timeSpent": 15
      },
      {
        "answer": "I would apply my core values by first identifying which values are most relevant to the situation, then making a decision that aligns with those values. For example, if integrity is a core value, I would choose the honest option even if it's more difficult.",
        "timeSpent": 180
      }
    ]
  }'
```

### 8. **Get User Submissions for Assessment**
```bash
curl -X GET http://localhost:9092/api/v1/assessments/courses/COURSE_ID_HERE/assessments/ASSESSMENT_ID_HERE/submissions \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 9. **Get Assessment Results (Instructor/Admin Only)**
```bash
curl -X GET http://localhost:9092/api/v1/assessments/courses/COURSE_ID_HERE/assessments/ASSESSMENT_ID_HERE/results \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

---

## 🎯 **Question Types and Examples**

### **Multiple Choice Question**
```json
{
  "question": "What is the primary purpose of core values?",
  "type": "MULTIPLE_CHOICE",
  "options": [
    "To make decisions easier",
    "To guide behavior and choices",
    "To impress others",
    "To earn money"
  ],
  "correctAnswer": "To guide behavior and choices",
  "points": 10,
  "explanation": "Core values serve as a compass to guide your behavior and choices in life.",
  "order": 1
}
```

### **True/False Question**
```json
{
  "question": "Core values can change over time as you grow and develop.",
  "type": "TRUE_FALSE",
  "correctAnswer": true,
  "points": 5,
  "explanation": "True. Core values can evolve as you gain new experiences and insights.",
  "order": 2
}
```

### **Short Answer Question**
```json
{
  "question": "List three of your core values and explain why they are important to you.",
  "type": "SHORT_ANSWER",
  "points": 15,
  "order": 3
}
```

### **Essay Question**
```json
{
  "question": "Write a 500-word essay on how your core values have influenced a major life decision.",
  "type": "ESSAY",
  "points": 25,
  "order": 4
}
```

### **File Upload Question**
```json
{
  "question": "Upload a document describing your personal mission statement based on your core values.",
  "type": "FILE_UPLOAD",
  "points": 20,
  "order": 5
}
```

---

## 🔄 **Complete Assessment Workflow Example**

### **Step 1: Create a Course (if not exists)**
```bash
curl -X POST http://localhost:9092/api/v1/courses \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Purpose Discovery Course",
    "summary": "Learn to discover your life purpose through structured learning",
    "description": "A comprehensive course on finding your life purpose",
    "difficulty": "BEGINNER",
    "estimatedDuration": 120,
    "isPublic": true
  }'
```

### **Step 2: Create Assessment**
```bash
curl -X POST http://localhost:9092/api/v1/assessments/courses/COURSE_ID_HERE/assessments \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Purpose Discovery Quiz",
    "description": "Test your understanding of purpose discovery concepts",
    "type": "QUIZ",
    "questions": [
      {
        "question": "What is the first step in discovering your purpose?",
        "type": "MULTIPLE_CHOICE",
        "options": [
          "Set financial goals",
          "Identify your core values",
          "Choose a career",
          "Buy a house"
        ],
        "correctAnswer": "Identify your core values",
        "points": 10,
        "order": 1
      }
    ],
    "timeLimit": 20,
    "passingScore": 70,
    "isPublished": true
  }'
```

### **Step 3: Student Starts Assessment**
```bash
curl -X POST http://localhost:9092/api/v1/assessments/courses/COURSE_ID_HERE/assessments/ASSESSMENT_ID_HERE/start \
  -H "Authorization: Bearer STUDENT_TOKEN_HERE"
```

### **Step 4: Student Submits Assessment**
```bash
curl -X POST http://localhost:9092/api/v1/assessments/courses/COURSE_ID_HERE/assessments/ASSESSMENT_ID_HERE/submit \
  -H "Authorization: Bearer STUDENT_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "submissionId": "SUBMISSION_ID_HERE",
    "answers": [
      {
        "answer": "Identify your core values",
        "timeSpent": 45
      }
    ]
  }'
```

### **Step 5: Instructor Views Results**
```bash
curl -X GET http://localhost:9092/api/v1/assessments/courses/COURSE_ID_HERE/assessments/ASSESSMENT_ID_HERE/results \
  -H "Authorization: Bearer INSTRUCTOR_TOKEN_HERE"
```

---

## 📊 **Response Examples**

### **Assessment Creation Response**
```json
{
  "ok": true,
  "data": {
    "assessment": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "title": "Core Values Assessment",
      "description": "Test your understanding of core values",
      "type": "QUIZ",
      "questionCount": 4,
      "totalPoints": 50,
      "timeLimit": 30,
      "passingScore": 70,
      "isPublished": true,
      "ownerId": {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
        "name": "Test Instructor",
        "email": "instructor@example.com"
      },
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  },
  "message": "Assessment created successfully"
}
```

### **Assessment Submission Response**
```json
{
  "ok": true,
  "data": {
    "submission": {
      "id": "64f8a1b2c3d4e5f6a7b8c9d2",
      "assessmentId": "64f8a1b2c3d4e5f6a7b8c9d0",
      "attemptNumber": 1,
      "totalScore": 35,
      "maxPossibleScore": 50,
      "percentage": 70,
      "passed": true,
      "status": "GRADED",
      "submitTime": "2024-01-15T11:00:00.000Z",
      "timeSpent": 1200
    },
    "autoGraded": true,
    "showCorrectAnswers": false
  },
  "message": "Assessment submitted successfully"
}
```

---

## ⚠️ **Important Notes**

1. **Replace Placeholders:**
   - `COURSE_ID_HERE` - Actual course ID
   - `ASSESSMENT_ID_HERE` - Actual assessment ID
   - `SUBMISSION_ID_HERE` - Actual submission ID
   - `YOUR_TOKEN_HERE` - Your JWT access token

2. **Permissions:**
   - Assessment creation/editing requires `INSTRUCTOR` or `ADMIN` role
   - Students can only start, submit, and view their own submissions
   - Results viewing requires `INSTRUCTOR` or `ADMIN` role

3. **Auto-grading:**
   - Multiple choice, single choice, and true/false questions are auto-graded
   - Essay, short answer, and file upload questions require manual grading
   - Manual grading can be done through the instructor dashboard

4. **Time Limits:**
   - Time limits are in minutes
   - Submissions after time limit are marked but still accepted
   - Time tracking is automatic

5. **Attempts:**
   - Users can have multiple attempts based on `maxAttempts` setting
   - Each attempt is tracked separately
   - Best score is typically used for final grade

---

## 🚀 **Quick Test Commands**

### **Test Assessment Creation (Single Line)**
```bash
curl -X POST http://localhost:9092/api/v1/assessments/courses/COURSE_ID_HERE/assessments -H "Authorization: Bearer YOUR_TOKEN_HERE" -H "Content-Type: application/json" -d '{"title": "Test Quiz", "type": "QUIZ", "questions": [{"question": "What is 2+2?", "type": "MULTIPLE_CHOICE", "options": ["3", "4", "5", "6"], "correctAnswer": "4", "points": 10, "order": 1}], "isPublished": true}'
```

### **Test Assessment Retrieval (Single Line)**
```bash
curl -X GET http://localhost:9092/api/v1/assessments/courses/COURSE_ID_HERE/assessments -H "Authorization: Bearer YOUR_TOKEN_HERE"
```
