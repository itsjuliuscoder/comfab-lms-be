import { z } from 'zod';
import dotenv from 'dotenv';

// Load .env file if it exists, but don't fail if it doesn't
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('9092'),
  API_BASE_URL: z.string().url().default('http://localhost:9092'),
  
  // CORS
  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
  
  // JWT
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters').default('confaBLm$%&25'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('30d'),
  
  // MongoDB
  MONGODB_URI: z.string().default('mongodb://localhost:27017/confab_lms'),
  
  // Email Configuration
  EMAIL_PROVIDER: z.enum(['resend', 'nodemailer']).default('nodemailer'),
  
  // Resend
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional(),
  
  // Nodemailer
  NODEMAILER_PROVIDER: z.enum(['gmail', 'outlook', 'yahoo', 'smtp']).default('gmail'),
  NODEMAILER_USER: z.string().email('Invalid Nodemailer user email').default('thetechconfab@gmail.com'),
  NODEMAILER_PASSWORD: z.string().default('cjgx llhe tekr pynz'),
  NODEMAILER_FROM: z.string().default('thetechconfab@gmail.com'),
  NODEMAILER_HOST: z.string().default('smtp.gmail.com'),
  NODEMAILER_PORT: z.string().transform(Number).default('587'),
  NODEMAILER_SECURE: z.string().transform(val => val === 'true').default('false'),
  NODEMAILER_REJECT_UNAUTHORIZED: z.string().transform(val => val === 'true').default('false'),
  
  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().default('confab_lms_dev'),
  CLOUDINARY_API_KEY: z.string().default('test_api_key'),
  CLOUDINARY_API_SECRET: z.string().default('test_api_secret'),
  
  // App
  INITIAL_ADMIN_EMAIL: z.string().email('Invalid initial admin email').default('admin@theconfab.org'),
  PRODUCT_NAME: z.string().default('CONFAB Purpose Discovery LMS'),
  CLIENT_URL: z.string().url().default('http://localhost:3000'),
  
  // Feature Flags
  FEATURE_FLAGS_MESSAGING: z.string().transform(val => val === 'true').default('true'),
  FEATURE_FLAGS_REPORTS: z.string().transform(val => val === 'true').default('true'),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

const envParse = envSchema.safeParse(process.env);

if (!envParse.success) {
  console.error('❌ Invalid environment variables:');
  console.error(envParse.error.format());
  process.exit(1);
}

export const env = envParse.data;

export const config = {
  server: {
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
    apiBaseUrl: env.API_BASE_URL,
  },
  cors: {
    allowedOrigins: env.CORS_ALLOWED_ORIGINS.split(',').map(origin => origin.trim()),
  },
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    refreshExpiresIn: env.REFRESH_TOKEN_EXPIRES_IN,
  },
  mongodb: {
    uri: env.MONGODB_URI,
  },
  email: {
    provider: env.EMAIL_PROVIDER,
    resend: {
      apiKey: env.RESEND_API_KEY,
      fromEmail: env.RESEND_FROM_EMAIL,
    },
    nodemailer: {
      provider: env.NODEMAILER_PROVIDER,
      user: env.NODEMAILER_USER,
      password: env.NODEMAILER_PASSWORD,
      from: env.NODEMAILER_FROM,
      host: env.NODEMAILER_HOST,
      port: env.NODEMAILER_PORT,
      secure: env.NODEMAILER_SECURE,
      rejectUnauthorized: env.NODEMAILER_REJECT_UNAUTHORIZED,
    },
  },
  cloudinary: {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    apiSecret: env.CLOUDINARY_API_SECRET,
  },
  app: {
    name: env.PRODUCT_NAME,
    productName: env.PRODUCT_NAME,
    initialAdminEmail: env.INITIAL_ADMIN_EMAIL,
    clientUrl: env.CLIENT_URL,
  },
  features: {
    messaging: env.FEATURE_FLAGS_MESSAGING,
    reports: env.FEATURE_FLAGS_REPORTS,
  },
  logging: {
    level: env.LOG_LEVEL,
  },
};
