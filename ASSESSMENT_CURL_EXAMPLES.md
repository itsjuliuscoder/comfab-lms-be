# Assessment API - CURL Examples

## Authentication Setup
```bash
# Login to get token
curl -X POST http://localhost:9092/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "instructor@example.com", "password": "SecurePassword123!"}'
```

## 1. Get Course Assessments
```bash
curl -X GET http://localhost:9092/api/v1/assessments/courses/COURSE_ID/assessments \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 2. Create Assessment
```bash
curl -X POST http://localhost:9092/api/v1/assessments/courses/COURSE_ID/assessments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Core Values Quiz",
    "type": "QUIZ",
    "questions": [
      {
        "question": "What are core values?",
        "type": "MULTIPLE_CHOICE",
        "options": ["Beliefs", "Preferences", "Goals", "Habits"],
        "correctAnswer": "Beliefs",
        "points": 10,
        "order": 1
      }
    ],
    "timeLimit": 30,
    "passingScore": 70,
    "isPublished": true
  }'
```

## 3. Get Assessment by ID
```bash
curl -X GET http://localhost:9092/api/v1/assessments/courses/COURSE_ID/assessments/ASSESSMENT_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 4. Update Assessment
```bash
curl -X PUT http://localhost:9092/api/v1/assessments/courses/COURSE_ID/assessments/ASSESSMENT_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Quiz Title", "isPublished": true}'
```

## 5. Delete Assessment
```bash
curl -X DELETE http://localhost:9092/api/v1/assessments/courses/COURSE_ID/assessments/ASSESSMENT_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 6. Start Assessment
```bash
curl -X POST http://localhost:9092/api/v1/assessments/courses/COURSE_ID/assessments/ASSESSMENT_ID/start \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 7. Submit Assessment
```bash
curl -X POST http://localhost:9092/api/v1/assessments/courses/COURSE_ID/assessments/ASSESSMENT_ID/submit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "submissionId": "SUBMISSION_ID",
    "answers": [
      {"answer": "Beliefs", "timeSpent": 30}
    ]
  }'
```

## 8. Get User Submissions
```bash
curl -X GET http://localhost:9092/api/v1/assessments/courses/COURSE_ID/assessments/ASSESSMENT_ID/submissions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 9. Get Assessment Results (Instructor Only)
```bash
curl -X GET http://localhost:9092/api/v1/assessments/courses/COURSE_ID/assessments/ASSESSMENT_ID/results \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Complete Workflow Example

### Step 1: Create Course
```bash
curl -X POST http://localhost:9092/api/v1/courses \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Course", "summary": "Test course", "difficulty": "BEGINNER"}'
```

### Step 2: Create Assessment
```bash
curl -X POST http://localhost:9092/api/v1/assessments/courses/COURSE_ID/assessments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Quiz", "type": "QUIZ", "questions": [{"question": "Test?", "type": "MULTIPLE_CHOICE", "options": ["A", "B"], "correctAnswer": "A", "points": 10, "order": 1}], "isPublished": true}'
```

### Step 3: Start Assessment
```bash
curl -X POST http://localhost:9092/api/v1/assessments/courses/COURSE_ID/assessments/ASSESSMENT_ID/start \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Step 4: Submit Assessment
```bash
curl -X POST http://localhost:9092/api/v1/assessments/courses/COURSE_ID/assessments/ASSESSMENT_ID/submit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"submissionId": "SUBMISSION_ID", "answers": [{"answer": "A", "timeSpent": 30}]}'
```

### Step 5: View Results
```bash
curl -X GET http://localhost:9092/api/v1/assessments/courses/COURSE_ID/assessments/ASSESSMENT_ID/results \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Question Types Supported
- MULTIPLE_CHOICE
- SINGLE_CHOICE  
- TRUE_FALSE
- SHORT_ANSWER
- ESSAY
- FILE_UPLOAD

## Assessment Types
- QUIZ
- ASSIGNMENT
- EXAM
- SURVEY
