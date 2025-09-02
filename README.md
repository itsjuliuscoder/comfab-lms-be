# CONFAB Purpose Discovery LMS Backend

A secure, scalable REST API for the CONFAB Purpose Discovery Learning Management System built with Node.js, Express, MongoDB, and modern JavaScript.

## 🚀 Features

- **User Management** with Role-Based Access Control (Admin/Instructor/Participant)
- **Course Management** with sections, lessons, and media support
- **Cohort Management** for group learning
- **Assessment System** with auto-grading capabilities
- **Enrollment Tracking** with progress monitoring
- **Email Notifications** via Resend
- **File Storage** via Cloudinary
- **JWT Authentication** with refresh tokens
- **Comprehensive API** with pagination, filtering, and validation
- **Production-Ready** with security, logging, and error handling

## 🛠️ Tech Stack

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT + bcrypt
- **Validation**: Zod
- **Email**: Resend
- **File Storage**: Cloudinary
- **Logging**: Pino
- **Security**: Helmet, CORS, Rate Limiting
- **Testing**: Vitest + Supertest

## 📋 Prerequisites

- Node.js >= 18.0.0
- MongoDB (local or cloud)
- Resend API key
- Cloudinary account

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd confab-llms-be
npm install
```

### 2. Environment Setup

Copy the environment template and configure your variables:

```bash
cp env.example .env
```

Edit `.env` with your configuration:

```env
# Server Configuration
NODE_ENV=development
PORT=9092
API_BASE_URL=http://localhost:9092

# CORS Configuration
CORS_ALLOWED_ORIGINS=http://localhost:3000

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key-here
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=7d

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/confab_lms

# Email Configuration (Resend)
RESEND_API_KEY=re_your_resend_api_key
RESEND_FROM_EMAIL=CONFAB <noreply@theconfab.org>

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Application Configuration
INITIAL_ADMIN_EMAIL=admin@theconfab.org
PRODUCT_NAME=CONFAB Purpose Discovery LMS

# Feature Flags
FEATURE_FLAGS_MESSAGING=true
FEATURE_FLAGS_REPORTS=true

# Logging
LOG_LEVEL=info
```

### 3. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:9092`

### 4. Verify Installation

Visit `http://localhost:9092/health` to check if the server is running.

## 📁 Project Structure

```
src/
├── config/                 # Configuration files
│   ├── env.js             # Environment variables
│   ├── database.js        # Database connection
│   ├── cloudinary.js      # Cloudinary setup
│   └── resend.js          # Email service setup
├── middleware/            # Express middleware
│   ├── auth.js           # Authentication middleware
│   ├── rbac.js           # Role-based access control
│   ├── validation.js     # Request validation
│   └── error.js          # Error handling
├── modules/              # Feature modules
│   ├── users/            # User management
│   ├── cohorts/          # Cohort management
│   ├── courses/          # Course management
│   ├── enrollments/      # Enrollment tracking
│   ├── assessments/      # Assessment system
│   └── announcements/    # Announcements
├── utils/                # Utility functions
│   ├── logger.js         # Logging setup
│   ├── response.js       # Response helpers
│   └── pagination.js     # Pagination utilities
└── server.js             # Main application file
```

## 🔐 Authentication & Authorization

### User Roles

- **ADMIN**: Full system access
- **INSTRUCTOR**: Course creation and management
- **PARTICIPANT**: Course enrollment and learning

### JWT Tokens

- **Access Token**: Short-lived (1 hour) for API access
- **Refresh Token**: Long-lived (7 days) for token renewal

### Protected Routes

All protected routes require the `Authorization` header:
```
Authorization: Bearer <access_token>
```

## 📚 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/auth/forgot-password` - Password reset request
- `POST /api/v1/auth/reset-password` - Password reset

### Users
- `GET /api/v1/users` - Get all users (Admin only)
- `GET /api/v1/users/:id` - Get user by ID
- `PUT /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user (Admin only)

### Courses
- `GET /api/v1/courses` - Get all courses
- `POST /api/v1/courses` - Create course (Instructor/Admin)
- `GET /api/v1/courses/:id` - Get course by ID
- `PUT /api/v1/courses/:id` - Update course
- `DELETE /api/v1/courses/:id` - Delete course

### Enrollments
- `GET /api/v1/enrollments` - Get user enrollments
- `POST /api/v1/enrollments` - Enroll in course
- `PUT /api/v1/enrollments/:id` - Update enrollment
- `DELETE /api/v1/enrollments/:id` - Withdraw from course

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run end-to-end tests
npm run test:e2e
```

## 🚀 Production Deployment

### Build

```bash
npm run build
```

### Environment Variables

Ensure all production environment variables are set:
- Strong JWT secrets
- Production MongoDB URI
- Valid Resend and Cloudinary credentials
- Proper CORS origins

### Security Checklist

- [ ] JWT secrets are strong and unique
- [ ] CORS origins are properly configured
- [ ] Rate limiting is enabled
- [ ] Helmet security headers are active
- [ ] Environment variables are secure
- [ ] Database connection uses SSL
- [ ] Logging is configured for production

## 📝 API Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "ok": true,
  "data": { ... },
  "message": "Success"
}
```

### Error Response
```json
{
  "ok": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message",
    "details": { ... }
  }
}
```

### Paginated Response
```json
{
  "ok": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## 🔧 Development

### Code Style

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

### Database Migrations

The application uses Mongoose schemas with automatic migrations. Schema changes are applied automatically when the application starts.

### Adding New Features

1. Create models in `src/modules/[feature]/models/`
2. Add validation schemas using Zod
3. Create controllers in `src/modules/[feature]/controllers/`
4. Add routes in `src/modules/[feature]/routes/`
5. Update the main server.js to include new routes
6. Add tests for new functionality

## 📞 Support

For support and questions:
- Email: support@theconfab.org
- Documentation: `/api/v1/docs` (when implemented)

## 📄 License

This project is licensed under the MIT License.

---

**Built with ❤️ by the CONFAB Team**
