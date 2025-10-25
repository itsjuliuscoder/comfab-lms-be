# CONFAB Purpose Discovery LMS - Architecture Diagrams

## 🏗️ System Architecture Diagram

```mermaid
graph TB
    %% External Users
    subgraph "Client Layer"
        WEB[Web Application<br/>React/Vue/Angular]
        MOBILE[Mobile App<br/>React Native/Flutter]
        API_CLIENT[API Clients<br/>Third-party Integrations]
    end

    %% Load Balancer & CDN
    subgraph "Infrastructure Layer"
        LB[Load Balancer<br/>Nginx/CloudFlare]
        CDN[CDN<br/>Static Assets]
    end

    %% Application Layer
    subgraph "Application Layer - Node.js Express API"
        subgraph "API Gateway"
            ROUTER[Express Router<br/>Route Management]
            MIDDLEWARE[Middleware Stack<br/>Auth, Validation, CORS]
        end

        subgraph "Authentication & Authorization"
            AUTH[Auth Middleware<br/>JWT Validation]
            RBAC[RBAC Middleware<br/>Role-based Access]
        end

        subgraph "Core Modules"
            USER_MOD[User Module<br/>Profile, Management]
            COURSE_MOD[Course Module<br/>Content Management]
            ENROLL_MOD[Enrollment Module<br/>Progress Tracking]
            ASSESS_MOD[Assessment Module<br/>Quizzes & Grading]
            COHORT_MOD[Cohort Module<br/>Group Management]
            ANNOUNCE_MOD[Announcement Module<br/>Messaging]
            ACTIVITY_MOD[Activity Module<br/>Audit Logging]
        end

        subgraph "Business Logic Layer"
            USER_CTRL[User Controller<br/>CRUD Operations]
            COURSE_CTRL[Course Controller<br/>Content Management]
            ENROLL_CTRL[Enrollment Controller<br/>Progress Tracking]
            ASSESS_CTRL[Assessment Controller<br/>Auto-grading]
            ANALYTICS_CTRL[Analytics Controller<br/>Reporting]
        end

        subgraph "Service Layer"
            EMAIL_SVC[Email Service<br/>Resend/Nodemailer]
            FILE_SVC[File Service<br/>Cloudinary Integration]
            EXCEL_SVC[Excel Service<br/>Bulk Operations]
        end
    end

    %% Data Layer
    subgraph "Data Layer"
        subgraph "MongoDB Database"
            USER_COLL[Users Collection<br/>Profiles, Auth]
            COURSE_COLL[Courses Collection<br/>Content Structure]
            ENROLL_COLL[Enrollments Collection<br/>User-Course Relations]
            ASSESS_COLL[Assessments Collection<br/>Questions & Answers]
            COHORT_COLL[Cohorts Collection<br/>Group Management]
            ANNOUNCE_COLL[Announcements Collection<br/>System Messages]
            ACTIVITY_COLL[Activities Collection<br/>Audit Trail]
        end

        subgraph "External Storage"
            CLOUDINARY[Cloudinary<br/>Media Storage]
            EMAIL_PROVIDER[Email Provider<br/>Resend/SMTP]
        end
    end

    %% Security & Monitoring
    subgraph "Security & Monitoring"
        RATE_LIMIT[Rate Limiting<br/>DDoS Protection]
        HELMET[Security Headers<br/>Helmet.js]
        LOGGER[Structured Logging<br/>Pino Logger]
        HEALTH[Health Checks<br/>System Monitoring]
    end

    %% Connections
    WEB --> LB
    MOBILE --> LB
    API_CLIENT --> LB

    LB --> ROUTER
    CDN --> LB

    ROUTER --> MIDDLEWARE
    MIDDLEWARE --> AUTH
    AUTH --> RBAC

    RBAC --> USER_MOD
    RBAC --> COURSE_MOD
    RBAC --> ENROLL_MOD
    RBAC --> ASSESS_MOD
    RBAC --> COHORT_MOD
    RBAC --> ANNOUNCE_MOD
    RBAC --> ACTIVITY_MOD

    USER_MOD --> USER_CTRL
    COURSE_MOD --> COURSE_CTRL
    ENROLL_MOD --> ENROLL_CTRL
    ASSESS_MOD --> ASSESS_CTRL
    ACTIVITY_MOD --> ANALYTICS_CTRL

    USER_CTRL --> EMAIL_SVC
    COURSE_CTRL --> FILE_SVC
    USER_CTRL --> EXCEL_SVC

    EMAIL_SVC --> EMAIL_PROVIDER
    FILE_SVC --> CLOUDINARY

    USER_CTRL --> USER_COLL
    COURSE_CTRL --> COURSE_COLL
    ENROLL_CTRL --> ENROLL_COLL
    ASSESS_CTRL --> ASSESS_COLL
    COHORT_MOD --> COHORT_COLL
    ANNOUNCE_MOD --> ANNOUNCE_COLL
    ACTIVITY_MOD --> ACTIVITY_COLL

    RATE_LIMIT --> ROUTER
    HELMET --> ROUTER
    LOGGER --> USER_CTRL
    LOGGER --> COURSE_CTRL
    LOGGER --> ENROLL_CTRL
    LOGGER --> ASSESS_CTRL
    HEALTH --> ROUTER
```

## 🗄️ Database Schema Diagram

```mermaid
erDiagram
    %% Core User Entity
    USERS {
        ObjectId _id PK
        string name
        string email UK
        string password
        enum role "ADMIN,INSTRUCTOR,PARTICIPANT"
        string avatarUrl
        enum status "ACTIVE,SUSPENDED"
        boolean emailVerified
        date lastLoginAt
        string passwordResetToken
        date passwordResetExpires
        string inviteToken
        date inviteTokenExpires
        ObjectId invitedBy FK
        object cohortAssignment
        date createdAt
        date updatedAt
    }

    %% Course Management
    COURSES {
        ObjectId _id PK
        string title
        string summary
        string description
        array outcomes
        array tags
        string thumbnailUrl
        ObjectId ownerId FK
        enum status "DRAFT,PUBLISHED,ARCHIVED"
        enum difficulty "BEGINNER,INTERMEDIATE,ADVANCED"
        number estimatedDuration
        boolean isPublic
        number enrollmentLimit
        array prerequisites
        boolean featured
        date publishedAt
        date createdAt
        date updatedAt
    }

    SECTIONS {
        ObjectId _id PK
        ObjectId courseId FK
        string title
        string description
        number order
        boolean isPublished
        date createdAt
        date updatedAt
    }

    LESSONS {
        ObjectId _id PK
        ObjectId sectionId FK
        ObjectId courseId FK
        string title
        enum type "TEXT,VIDEO,AUDIO,QUIZ,ASSIGNMENT,RESOURCE"
        string content
        string youtubeVideoId
        string externalUrl
        number order
        number durationSec
        boolean isPublished
        boolean isFree
        string notes
        date createdAt
        date updatedAt
    }

    %% Enrollment System
    ENROLLMENTS {
        ObjectId _id PK
        ObjectId userId FK
        ObjectId courseId FK
        enum status "ACTIVE,COMPLETED,WITHDRAWN,SUSPENDED"
        number progressPct
        date enrolledAt
        date completedAt
        date withdrawnAt
        date lastAccessedAt
        boolean certificateIssued
        date certificateIssuedAt
        string notes
        date createdAt
        date updatedAt
    }

    %% Cohort Management
    COHORTS {
        ObjectId _id PK
        string name
        string description
        number year
        array tags
        date startDate
        date endDate
        enum status "ACTIVE,INACTIVE,COMPLETED"
        number maxParticipants
        ObjectId createdBy FK
        date createdAt
        date updatedAt
    }

    USER_COHORTS {
        ObjectId _id PK
        ObjectId userId FK
        ObjectId cohortId FK
        enum roleInCohort "LEADER,MEMBER,MENTOR"
        enum status "ACTIVE,INACTIVE"
        date joinedAt
        date leftAt
        date createdAt
        date updatedAt
    }

    %% Assessment System
    ASSESSMENTS {
        ObjectId _id PK
        ObjectId courseId FK
        string title
        string description
        enum type "QUIZ,ASSIGNMENT,EXAM,SURVEY"
        array questions
        number timeLimit
        number passingScore
        number maxAttempts
        boolean isPublished
        boolean isAutoGraded
        boolean allowReview
        boolean showCorrectAnswers
        date dueDate
        string instructions
        array tags
        enum difficulty "EASY,MEDIUM,HARD"
        number totalPoints
        ObjectId ownerId FK
        date createdAt
        date updatedAt
    }

    ASSESSMENT_SUBMISSIONS {
        ObjectId _id PK
        ObjectId assessmentId FK
        ObjectId userId FK
        array answers
        number score
        number percentage
        boolean passed
        number attemptNumber
        date startedAt
        date submittedAt
        date gradedAt
        ObjectId gradedBy FK
        string feedback
        enum status "IN_PROGRESS,SUBMITTED,GRADED"
        date createdAt
        date updatedAt
    }

    %% Announcement System
    ANNOUNCEMENTS {
        ObjectId _id PK
        string title
        string content
        enum type "GENERAL,COURSE,SYSTEM,MAINTENANCE,EVENT,URGENT"
        enum priority "LOW,MEDIUM,HIGH,URGENT"
        enum status "DRAFT,PUBLISHED,ARCHIVED"
        enum visibility "PUBLIC,ENROLLED_USERS,INSTRUCTORS,ADMINS,SPECIFIC_USERS"
        object targetAudience
        array attachments
        date scheduledAt
        date expiresAt
        boolean isPinned
        boolean allowComments
        array tags
        ObjectId authorId FK
        date publishedAt
        array readBy
        object metadata
        date createdAt
        date updatedAt
    }

    %% Activity Logging
    ACTIVITIES {
        ObjectId _id PK
        enum action "USER_REGISTERED,COURSE_CREATED,ENROLLMENT_CREATED,etc"
        object actor
        object target
        object context
        object changes
        object metadata
        enum status "SUCCESS,FAILURE,PENDING,CANCELLED"
        object error
        date performedAt
        number duration
        date createdAt
        date updatedAt
    }

    %% Course Materials
    COURSE_MATERIALS {
        ObjectId _id PK
        ObjectId courseId FK
        ObjectId lessonId FK
        string title
        string description
        enum type "PDF,VIDEO,AUDIO,IMAGE,DOCUMENT,etc"
        string publicId
        string url
        string mimeType
        number size
        number width
        number height
        number duration
        object thumbnail
        boolean isPublic
        number downloadCount
        date createdAt
        date updatedAt
    }

    %% Relationships
    USERS ||--o{ COURSES : "owns"
    USERS ||--o{ ENROLLMENTS : "enrolled_in"
    USERS ||--o{ USER_COHORTS : "member_of"
    USERS ||--o{ COHORTS : "created"
    USERS ||--o{ ASSESSMENTS : "created"
    USERS ||--o{ ASSESSMENT_SUBMISSIONS : "submitted"
    USERS ||--o{ ANNOUNCEMENTS : "authored"
    USERS ||--o{ ACTIVITIES : "performed"

    COURSES ||--o{ SECTIONS : "contains"
    COURSES ||--o{ ENROLLMENTS : "enrolled_by"
    COURSES ||--o{ ASSESSMENTS : "has"
    COURSES ||--o{ COURSE_MATERIALS : "contains"

    SECTIONS ||--o{ LESSONS : "contains"

    COHORTS ||--o{ USER_COHORTS : "has_members"

    ASSESSMENTS ||--o{ ASSESSMENT_SUBMISSIONS : "submitted_to"

    LESSONS ||--o{ COURSE_MATERIALS : "has_materials"
```

## 🔄 Data Flow Diagram

```mermaid
sequenceDiagram
    participant Client as Client Application
    participant API as Express API
    participant Auth as Auth Middleware
    participant RBAC as RBAC Middleware
    participant Controller as Controller
    participant Service as Service Layer
    participant DB as MongoDB
    participant External as External Services

    Client->>API: HTTP Request
    API->>Auth: Validate JWT Token
    Auth->>RBAC: Check Permissions
    RBAC->>Controller: Authorized Request
    Controller->>Service: Business Logic
    Service->>DB: Database Operations
    Service->>External: External API Calls
    External-->>Service: Response
    DB-->>Service: Data
    Service-->>Controller: Processed Data
    Controller-->>API: Response
    API-->>Client: JSON Response
```

## 🏗️ Deployment Architecture

```mermaid
graph TB
    subgraph "Production Environment"
        subgraph "Load Balancer Layer"
            LB[Load Balancer<br/>Nginx/HAProxy]
        end

        subgraph "Application Layer"
            APP1[Node.js App Instance 1<br/>Port 9092]
            APP2[Node.js App Instance 2<br/>Port 9092]
            APP3[Node.js App Instance 3<br/>Port 9092]
        end

        subgraph "Database Layer"
            MONGO_PRIMARY[MongoDB Primary<br/>Read/Write]
            MONGO_SECONDARY1[MongoDB Secondary 1<br/>Read Replica]
            MONGO_SECONDARY2[MongoDB Secondary 2<br/>Read Replica]
        end

        subgraph "External Services"
            CLOUDINARY[Cloudinary<br/>Media Storage]
            RESEND[Resend<br/>Email Service]
            REDIS[Redis<br/>Session Cache]
        end

        subgraph "Monitoring & Logging"
            LOG_AGG[Log Aggregation<br/>ELK Stack]
            METRICS[Metrics Collection<br/>Prometheus]
            ALERTS[Alerting<br/>Grafana]
        end
    end

    LB --> APP1
    LB --> APP2
    LB --> APP3

    APP1 --> MONGO_PRIMARY
    APP2 --> MONGO_PRIMARY
    APP3 --> MONGO_PRIMARY

    MONGO_PRIMARY --> MONGO_SECONDARY1
    MONGO_PRIMARY --> MONGO_SECONDARY2

    APP1 --> CLOUDINARY
    APP2 --> CLOUDINARY
    APP3 --> CLOUDINARY

    APP1 --> RESEND
    APP2 --> RESEND
    APP3 --> RESEND

    APP1 --> REDIS
    APP2 --> REDIS
    APP3 --> REDIS

    APP1 --> LOG_AGG
    APP2 --> LOG_AGG
    APP3 --> LOG_AGG

    APP1 --> METRICS
    APP2 --> METRICS
    APP3 --> METRICS
```

## 📊 System Components Overview

### **Frontend Layer**

- **Web Application**: React/Vue/Angular SPA
- **Mobile Application**: React Native/Flutter
- **API Clients**: Third-party integrations

### **API Gateway Layer**

- **Express Router**: Route management and middleware
- **Authentication**: JWT token validation
- **Authorization**: Role-based access control
- **Rate Limiting**: DDoS protection
- **CORS**: Cross-origin resource sharing

### **Business Logic Layer**

- **User Management**: Profile, authentication, bulk operations
- **Course Management**: Content creation, sections, lessons
- **Enrollment System**: Progress tracking, completion
- **Assessment System**: Quizzes, auto-grading, submissions
- **Cohort Management**: Group-based learning
- **Analytics**: Reporting and insights

### **Data Layer**

- **MongoDB**: Primary database with collections for all entities
- **Cloudinary**: Media storage and processing
- **External APIs**: Email services, file storage

### **Security & Monitoring**

- **Structured Logging**: Pino logger with context
- **Activity Tracking**: Comprehensive audit trail
- **Health Checks**: System monitoring
- **Error Handling**: Centralized error processing
