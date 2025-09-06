# My Assessments API Documentation

## Overview
The My Assessments API allows participants to retrieve all their assessments across all courses with detailed submission information, progress tracking, and filtering capabilities.

## Endpoint

### GET /api/v1/assessments/my-assessments
Get all assessments for the current authenticated user (participant).

**Authentication:** Required (Bearer Token)
**Authorization:** Any authenticated user (primarily designed for PARTICIPANT role)

## Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `page` | number | Page number for pagination (default: 1) | `?page=2` |
| `limit` | number | Number of items per page (default: 20) | `?limit=10` |
| `status` | string | Filter by assessment status | `?status=completed` |
| `type` | string | Filter by assessment type | `?type=QUIZ` |
| `courseId` | string | Filter by specific course | `?courseId=68ba5cdc809c41ef914ad23c` |
| `search` | string | Search in title, description, or tags | `?search=math` |

### Status Filter Options
- `completed` - Assessments that have been completed
- `in_progress` - Assessments currently in progress
- `not_started` - Assessments not yet started
- `passed` - Assessments that have been passed
- `failed` - Assessments that have been failed

### Type Filter Options
- `QUIZ` - Quiz assessments
- `ASSIGNMENT` - Assignment assessments
- `EXAM` - Exam assessments
- `SURVEY` - Survey assessments

## Example Requests

### 1. Get All My Assessments
```bash
curl -X GET "http://localhost:9092/api/v1/assessments/my-assessments" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2. Get Completed Assessments Only
```bash
curl -X GET "http://localhost:9092/api/v1/assessments/my-assessments?status=completed" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Get Quiz Assessments from Specific Course
```bash
curl -X GET "http://localhost:9092/api/v1/assessments/my-assessments?type=QUIZ&courseId=68ba5cdc809c41ef914ad23c" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. Search and Paginate
```bash
curl -X GET "http://localhost:9092/api/v1/assessments/my-assessments?search=math&page=1&limit=5" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Response Format

### Success Response (200 OK)
```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "_id": "68ba5cdc809c41ef914ad23c",
        "title": "Introduction to Mathematics Quiz",
        "description": "Basic mathematics concepts quiz",
        "type": "QUIZ",
        "difficulty": "EASY",
        "timeLimit": 30,
        "passingScore": 70,
        "maxAttempts": 3,
        "totalPoints": 100,
        "isPublished": true,
        "dueDate": "2024-02-15T23:59:59.000Z",
        "courseId": {
          "_id": "68ba5cdc809c41ef914ad23d",
          "title": "Mathematics 101",
          "status": "PUBLISHED"
        },
        "ownerId": {
          "_id": "68ba5cdc809c41ef914ad23e",
          "name": "Dr. Smith",
          "email": "dr.smith@example.com"
        },
        "userSubmissions": {
          "totalAttempts": 2,
          "latestSubmission": {
            "_id": "68ba5cdc809c41ef914ad23f",
            "status": "COMPLETED",
            "totalScore": 85,
            "percentage": 85,
            "passed": true,
            "submitTime": "2024-01-15T14:30:00.000Z",
            "attemptNumber": 2
          },
          "canRetake": true,
          "remainingAttempts": 1
        },
        "createdAt": "2024-01-01T10:00:00.000Z",
        "updatedAt": "2024-01-01T10:00:00.000Z"
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
  "message": "Your assessments retrieved successfully"
}
```

### Response Fields Explanation

#### Assessment Object
- `_id` - Unique assessment identifier
- `title` - Assessment title
- `description` - Assessment description
- `type` - Assessment type (QUIZ, ASSIGNMENT, EXAM, SURVEY)
- `difficulty` - Assessment difficulty level
- `timeLimit` - Time limit in minutes
- `passingScore` - Minimum score required to pass
- `maxAttempts` - Maximum number of attempts allowed
- `totalPoints` - Total points available
- `isPublished` - Whether the assessment is published
- `dueDate` - Assessment due date
- `courseId` - Course information (populated)
- `ownerId` - Instructor information (populated)

#### User Submissions Object
- `totalAttempts` - Total number of attempts made
- `latestSubmission` - Information about the most recent submission
  - `_id` - Submission ID
  - `status` - Submission status (COMPLETED, IN_PROGRESS, etc.)
  - `totalScore` - Total score achieved
  - `percentage` - Percentage score
  - `passed` - Whether the assessment was passed
  - `submitTime` - When the submission was made
  - `attemptNumber` - Which attempt this was
- `canRetake` - Whether the user can retake the assessment
- `remainingAttempts` - Number of attempts remaining

## Use Cases

1. **Assessment Dashboard**: Display all user's assessments with progress
2. **Progress Tracking**: Show completion status and scores
3. **Retake Management**: Identify which assessments can be retaken
4. **Course-Specific View**: Filter assessments by course
5. **Search and Filter**: Find specific assessments quickly
6. **Status Monitoring**: Track completed, in-progress, and not-started assessments

## Error Responses

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

### 500 Internal Server Error
```json
{
  "ok": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred",
    "details": null
  }
}
```

## Notes

- Only published assessments are returned
- Results are sorted by creation date (newest first)
- The API automatically populates course and instructor information
- User submission data is included for each assessment
- Pagination is supported for large result sets
- Search is case-insensitive and searches across title, description, and tags
- Status filtering provides multiple ways to view assessment progress
