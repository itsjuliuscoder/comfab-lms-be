# Course Materials API Documentation

This document provides comprehensive documentation for the Course Materials API endpoints in the CONFAB LMS system.

## 📋 Overview

The Course Materials API allows you to manage educational content including PDFs, PowerPoint presentations, videos, audio files, images, documents, and other file types. All materials are stored securely on Cloudinary with proper organization and optimization.

## 🔐 Authentication

All endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## 📁 Supported File Types

| Type | Extensions | Max Size | Description |
|------|------------|----------|-------------|
| **PDF** | `.pdf` | 50MB | PDF documents |
| **POWERPOINT** | `.ppt`, `.pptx` | 100MB | PowerPoint presentations |
| **VIDEO** | `.mp4`, `.avi`, `.mov`, `.wmv`, `.flv`, `.webm` | 500MB | Video files |
| **AUDIO** | `.mp3`, `.wav`, `.ogg`, `.aac`, `.m4a` | 100MB | Audio files |
| **IMAGE** | `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.svg` | 20MB | Image files |
| **DOCUMENT** | `.doc`, `.docx`, `.txt`, `.rtf` | 25MB | Document files |
| **SPREADSHEET** | `.xls`, `.xlsx`, `.csv` | 25MB | Spreadsheet files |
| **PRESENTATION** | `.ppt`, `.pptx`, `.odp` | 100MB | Presentation files |
| **ARCHIVE** | `.zip`, `.rar`, `.7z`, `.gz`, `.tar` | 200MB | Archive files |
| **OTHER** | Any | 50MB | Other file types |

## 🚀 API Endpoints

### 1. Get Supported File Types

**GET** `/api/v1/course-materials/supported-types`

Get a list of all supported file types and their configurations.

**Response:**
```json
{
  "ok": true,
  "data": [
    {
      "type": "PDF",
      "allowedMimes": ["application/pdf"],
      "allowedExtensions": [".pdf"],
      "maxSize": 52428800,
      "description": "PDF documents"
    }
  ],
  "message": "Supported file types retrieved successfully"
}
```

### 2. Get All Course Materials

**GET** `/api/v1/course-materials`

Retrieve all course materials with filtering and pagination.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `course` (string): Filter by course ID
- `lesson` (string): Filter by lesson ID
- `type` (string): Filter by material type
- `status` (string): Filter by status (`DRAFT`, `PUBLISHED`, `ARCHIVED`)
- `isRequired` (boolean): Filter by required materials
- `isPublic` (boolean): Filter by public materials
- `search` (string): Search in title, description, and tags
- `sortBy` (string): Sort field (default: `createdAt`)
- `sortOrder` (string): Sort order (`asc` or `desc`)

**Response:**
```json
{
  "ok": true,
  "data": {
    "materials": [
      {
        "_id": "64a1b2c3d4e5f6789012345",
        "title": "Introduction to JavaScript",
        "description": "Basic JavaScript concepts",
        "type": "PDF",
        "file": {
          "url": "https://res.cloudinary.com/.../sample.pdf",
          "originalName": "javascript-intro.pdf",
          "size": 2048576,
          "format": "pdf"
        },
        "course": {
          "_id": "64a1b2c3d4e5f6789012346",
          "title": "Web Development Basics"
        },
        "uploadedBy": {
          "_id": "64a1b2c3d4e5f6789012347",
          "name": "John Doe",
          "email": "john@example.com"
        },
        "downloadCount": 15,
        "viewCount": 45,
        "isRequired": true,
        "isPublic": true,
        "status": "PUBLISHED",
        "createdAt": "2023-07-01T10:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 100,
      "itemsPerPage": 20
    }
  },
  "message": "Course materials retrieved successfully"
}
```

### 3. Get Single Course Material

**GET** `/api/v1/course-materials/:id`

Retrieve a specific course material by ID.

**Response:**
```json
{
  "ok": true,
  "data": {
    "_id": "64a1b2c3d4e5f6789012345",
    "title": "Introduction to JavaScript",
    "description": "Basic JavaScript concepts",
    "type": "PDF",
    "file": {
      "publicId": "course-materials/pdfs/sample_abc123",
      "url": "https://res.cloudinary.com/.../sample.pdf",
      "originalName": "javascript-intro.pdf",
      "mimeType": "application/pdf",
      "size": 2048576,
      "format": "pdf"
    },
    "thumbnail": {
      "publicId": "course-materials/pdfs/thumbnails/sample_abc123_thumbnail",
      "url": "https://res.cloudinary.com/.../sample_thumbnail.jpg"
    },
    "course": {
      "_id": "64a1b2c3d4e5f6789012346",
      "title": "Web Development Basics",
      "slug": "web-development-basics"
    },
    "uploadedBy": {
      "_id": "64a1b2c3d4e5f6789012347",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "downloadCount": 15,
    "viewCount": 46,
    "isRequired": true,
    "isPublic": true,
    "status": "PUBLISHED",
    "tags": ["javascript", "programming", "basics"],
    "metadata": {
      "author": "John Doe",
      "version": "1.0",
      "language": "en",
      "accessibility": {
        "hasTranscript": false,
        "hasSubtitles": false,
        "hasAudioDescription": false
      }
    },
    "createdAt": "2023-07-01T10:00:00.000Z",
    "updatedAt": "2023-07-01T10:00:00.000Z"
  },
  "message": "Course material retrieved successfully"
}
```

### 4. Create Course Material

**POST** `/api/v1/course-materials`

Create a new course material. Requires `ADMIN` or `INSTRUCTOR` role.

**Content-Type:** `multipart/form-data`

**Form Data:**
- `file` (file): The material file (required)
- `title` (string): Material title (required)
- `description` (string): Material description (optional)
- `course` (string): Course ID (required)
- `lesson` (string): Lesson ID (optional)
- `type` (string): Material type (required)
- `isRequired` (boolean): Whether material is required (optional)
- `isPublic` (boolean): Whether material is public (optional)
- `order` (number): Display order (optional)
- `tags` (array): Material tags (optional)
- `metadata` (object): Additional metadata (optional)

**Example Request:**
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -F "file=@javascript-intro.pdf" \
  -F "title=Introduction to JavaScript" \
  -F "description=Basic JavaScript concepts" \
  -F "course=64a1b2c3d4e5f6789012346" \
  -F "type=PDF" \
  -F "isRequired=true" \
  -F "tags=javascript,programming,basics" \
  https://your-api.com/api/v1/course-materials
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "_id": "64a1b2c3d4e5f6789012345",
    "title": "Introduction to JavaScript",
    "description": "Basic JavaScript concepts",
    "type": "PDF",
    "file": {
      "publicId": "course-materials/pdfs/sample_abc123",
      "url": "https://res.cloudinary.com/.../sample.pdf",
      "originalName": "javascript-intro.pdf",
      "mimeType": "application/pdf",
      "size": 2048576,
      "format": "pdf"
    },
    "course": "64a1b2c3d4e5f6789012346",
    "uploadedBy": "64a1b2c3d4e5f6789012347",
    "status": "DRAFT",
    "createdAt": "2023-07-01T10:00:00.000Z"
  },
  "message": "Course material created successfully"
}
```

### 5. Update Course Material

**PUT** `/api/v1/course-materials/:id`

Update an existing course material. Only the uploader or admin can update.

**Content-Type:** `multipart/form-data`

**Form Data:** (Same as create, all optional except for file replacement)

**Response:**
```json
{
  "ok": true,
  "data": {
    "_id": "64a1b2c3d4e5f6789012345",
    "title": "Updated JavaScript Introduction",
    "description": "Updated description",
    "type": "PDF",
    "file": {
      "publicId": "course-materials/pdfs/sample_abc123",
      "url": "https://res.cloudinary.com/.../sample.pdf",
      "originalName": "javascript-intro.pdf",
      "mimeType": "application/pdf",
      "size": 2048576,
      "format": "pdf"
    },
    "status": "PUBLISHED",
    "updatedAt": "2023-07-01T11:00:00.000Z"
  },
  "message": "Course material updated successfully"
}
```

### 6. Delete Course Material

**DELETE** `/api/v1/course-materials/:id`

Delete a course material. Only the uploader or admin can delete.

**Response:**
```json
{
  "ok": true,
  "data": null,
  "message": "Course material deleted successfully"
}
```

### 7. Get Materials by Course

**GET** `/api/v1/course-materials/course/:courseId`

Get all materials for a specific course.

**Query Parameters:**
- `lesson` (string): Filter by lesson ID
- `type` (string): Filter by material type
- `status` (string): Filter by status

**Response:**
```json
{
  "ok": true,
  "data": [
    {
      "_id": "64a1b2c3d4e5f6789012345",
      "title": "Introduction to JavaScript",
      "type": "PDF",
      "file": {
        "url": "https://res.cloudinary.com/.../sample.pdf",
        "originalName": "javascript-intro.pdf",
        "size": 2048576
      },
      "isRequired": true,
      "order": 1
    }
  ],
  "message": "Course materials retrieved successfully"
}
```

### 8. Get Materials by Type

**GET** `/api/v1/course-materials/type/:type`

Get all materials of a specific type.

**Query Parameters:**
- `courseId` (string): Filter by course ID

**Response:**
```json
{
  "ok": true,
  "data": [
    {
      "_id": "64a1b2c3d4e5f6789012345",
      "title": "Introduction to JavaScript",
      "type": "PDF",
      "course": {
        "_id": "64a1b2c3d4e5f6789012346",
        "title": "Web Development Basics"
      },
      "file": {
        "url": "https://res.cloudinary.com/.../sample.pdf",
        "originalName": "javascript-intro.pdf",
        "size": 2048576
      }
    }
  ],
  "message": "Materials by type retrieved successfully"
}
```

### 9. Track Download

**POST** `/api/v1/course-materials/:id/download`

Track a download and get the download URL.

**Response:**
```json
{
  "ok": true,
  "data": {
    "downloadCount": 16,
    "downloadUrl": "https://res.cloudinary.com/.../sample.pdf"
  },
  "message": "Download tracked successfully"
}
```

### 10. Get Material Statistics

**GET** `/api/v1/course-materials/stats`

Get statistics about course materials. Requires `ADMIN` or `INSTRUCTOR` role.

**Response:**
```json
{
  "ok": true,
  "data": {
    "totalMaterials": 150,
    "totalSize": 1073741824,
    "byType": [
      {
        "_id": "PDF",
        "count": 45,
        "totalSize": 524288000,
        "totalViews": 1200,
        "totalDownloads": 300
      },
      {
        "_id": "VIDEO",
        "count": 30,
        "totalSize": 4294967296,
        "totalViews": 5000,
        "totalDownloads": 150
      }
    ]
  },
  "message": "Material statistics retrieved successfully"
}
```

## 🔧 Error Responses

### Common Error Codes

| Code | Description |
|------|-------------|
| `NO_FILE` | No file uploaded |
| `INVALID_FILE_TYPE` | File type not supported |
| `FILE_TOO_LARGE` | File size exceeds limit |
| `MISSING_TYPE` | Material type not specified |
| `INVALID_TYPE` | Invalid material type |
| `UNAUTHORIZED` | Authentication required |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Material not found |

### Error Response Format

```json
{
  "ok": false,
  "error": {
    "code": "INVALID_FILE_TYPE",
    "message": "Invalid file type for PDF. Allowed types: PDF documents"
  }
}
```

## 📝 Usage Examples

### Upload a PDF Document

```javascript
const formData = new FormData();
formData.append('file', pdfFile);
formData.append('title', 'Course Syllabus');
formData.append('description', 'Complete course syllabus');
formData.append('course', '64a1b2c3d4e5f6789012346');
formData.append('type', 'PDF');
formData.append('isRequired', 'true');
formData.append('tags', 'syllabus,requirements');

const response = await fetch('/api/v1/course-materials', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

### Upload a Video with Metadata

```javascript
const formData = new FormData();
formData.append('file', videoFile);
formData.append('title', 'JavaScript Tutorial');
formData.append('course', '64a1b2c3d4e5f6789012346');
formData.append('type', 'VIDEO');
formData.append('metadata', JSON.stringify({
  author: 'John Doe',
  version: '2.0',
  language: 'en',
  accessibility: {
    hasSubtitles: true,
    hasTranscript: true
  }
}));

const response = await fetch('/api/v1/course-materials', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

### Get Materials for a Course

```javascript
const response = await fetch('/api/v1/course-materials/course/64a1b2c3d4e5f6789012346', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const data = await response.json();
console.log(data.data); // Array of materials
```

## 🔒 Security Considerations

1. **File Validation**: All files are validated for type and size
2. **Access Control**: Only authorized users can upload/modify materials
3. **Secure Storage**: Files are stored securely on Cloudinary
4. **Virus Scanning**: Consider implementing virus scanning for uploaded files
5. **Rate Limiting**: Upload endpoints are rate-limited to prevent abuse

## 📊 Performance Tips

1. **Optimize File Sizes**: Compress files before upload when possible
2. **Use Appropriate Formats**: Choose the most efficient format for your content
3. **Lazy Loading**: Load materials on-demand rather than all at once
4. **Caching**: Implement caching for frequently accessed materials
5. **CDN**: Cloudinary provides global CDN for fast delivery

## 🚀 Future Enhancements

- Bulk upload functionality
- Material versioning
- Advanced search and filtering
- Material analytics and insights
- Integration with learning management systems
- Automatic transcription for videos
- OCR for scanned documents
