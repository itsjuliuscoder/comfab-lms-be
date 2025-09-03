// Vercel API entry point
// This file handles all API requests for Vercel deployment

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { config } from '../src/config/env.js';
import { connectDatabase } from '../src/config/database.js';
import { logger } from '../src/utils/logger.js';
import { errorHandler, notFoundHandler } from '../src/middleware/error.js';

// Import routes
import authRoutes from '../src/modules/auth/routes/auth.js';
import userRoutes from '../src/modules/users/routes/users.js';
import courseRoutes from '../src/modules/courses/routes/courses.js';
import enrollmentRoutes from '../src/modules/enrollments/routes/enrollments.js';
import uploadRoutes from '../src/modules/upload/routes/upload.js';
import cohortRoutes from '../src/modules/cohorts/routes/cohorts.js';
import activityRoutes from '../src/modules/activities/routes/activities.js';
import adminRoutes from '../src/modules/admin/routes/admin.js';
import statisticsRoutes from '../src/modules/statistics/routes/statistics.js';
import analyticsRoutes from '../src/modules/analytics/routes/analytics.js';
import assessmentRoutes from '../src/modules/assessments/routes/assessments.js';

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
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
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

// Compression
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

// Initialize database connection for Vercel
let isConnected = false;

const ensureConnection = async () => {
  if (!isConnected) {
    try {
      await connectDatabase();
      isConnected = true;
      logger.info('✅ Database connected for Vercel function');
    } catch (error) {
      logger.error('❌ Database connection failed:', error);
      // Don't fail the function, just log the error
    }
  }
};

// Ensure connection on first request
app.use(async (req, res, next) => {
  await ensureConnection();
  next();
});

export default app;
