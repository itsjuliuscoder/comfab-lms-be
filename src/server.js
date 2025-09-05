import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { config } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { logger } from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import activityLogger from './middleware/activityLogger.js';

// Import routes
import authRoutes from './modules/auth/routes/auth.js';
import userRoutes from './modules/users/routes/users.js';
import courseRoutes from './modules/courses/routes/courses.js';
import enrollmentRoutes from './modules/enrollments/routes/enrollments.js';
import uploadRoutes from './modules/upload/routes/upload.js';
import cohortRoutes from './modules/cohorts/routes/cohorts.js';
import activityRoutes from './modules/activities/routes/activities.js';
import adminRoutes from './modules/admin/routes/admin.js';
import statisticsRoutes from './modules/statistics/routes/statistics.js';
import analyticsRoutes from './modules/analytics/routes/analytics.js';
import assessmentRoutes from './modules/assessments/routes/assessments.js';
import courseMaterialRoutes from './modules/courses/routes/courseMaterials.js';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: config.cors.allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    ok: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Activity logging middleware (after rate limiting, before other middleware)
// Temporarily disabled for debugging
// app.use('/api/', activityLogger({
//   excludeActions: [
//     'GET /health',
//     'GET /api/v1/activities',
//     'GET /api/v1/analytics',
//     'GET /api/v1/statistics'
//   ],
//   roleBasedLogging: {
//     'ADMIN': ['*'],
//     'INSTRUCTOR': ['*'],
//     'PARTICIPANT': ['POST', 'PUT', 'PATCH', 'DELETE']
//   },
//   logBodies: false, // Set to true for debugging, but be careful with sensitive data
//   logSuccess: true,
//   logFailure: true
// }));

// Compression
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: `${config.upload.maxFileSizeMB}mb` }));
app.use(express.urlencoded({ extended: true, limit: `${config.upload.maxFileSizeMB}mb` }));

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim()),
  },
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    ok: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.server.nodeEnv,
  });
});

// API routes
app.use('/api/v1', (req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });
  next();
});

// Mount route modules
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/enrollments', enrollmentRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/cohorts', cohortRoutes);
app.use('/api/v1/activities', activityRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/statistics', statisticsRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/assessments', assessmentRoutes);
app.use('/api/v1/course-materials', courseMaterialRoutes);

// Temporary welcome route
app.get('/api/v1', (req, res) => {
  res.json({
    ok: true,
    message: `Welcome to ${config.app.productName} API`,
    version: '1.0.0',
    documentation: '/api/v1/docs',
  });
});

// 404 handler
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  logger.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();
    
    // Start listening
    const server = app.listen(config.server.port, () => {
      logger.info(`🚀 Server running on port ${config.server.port}`);
      logger.info(`This is the allowed origins: ${config.cors.allowedOrigins}`)
      logger.info(`📊 Environment: ${config.server.nodeEnv}`);
      logger.info(`🌐 API Base URL: ${config.server.apiBaseUrl}`);
      logger.info(`📧 Email Service: ${config.email.provider} (${config.email.provider === 'nodemailer' ? config.email.nodemailer.from : config.email.resend.fromEmail || 'Not configured'})`);
      logger.info(`☁️  Cloud Storage: Cloudinary`);
    });

    // Graceful shutdown for server
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, closing server');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export default app;
