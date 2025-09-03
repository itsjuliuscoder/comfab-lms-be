# CONFAB LMS Configuration Guide

This guide explains how environment variables are used throughout the CONFAB Purpose Discovery LMS application.

## 🚀 Quick Start

1. Copy `env.example` to `.env`
2. Update values for your environment
3. Restart the application

## 📋 Environment Variables Overview

### Server Configuration

| Variable | Default | Description | Usage |
|----------|---------|-------------|-------|
| `NODE_ENV` | `development` | Application environment | Used in logging, error handling, and feature flags |
| `PORT` | `9092` | Server port | Express server listens on this port |
| `API_BASE_URL` | `http://localhost:9092` | Base URL for API endpoints | Used in email templates and external references |

### CORS Configuration

| Variable | Default | Description | Usage |
|----------|---------|-------------|-------|
| `CORS_ALLOWED_ORIGINS` | `https://lms.theconfab.org, http://localhost:3000` | Allowed CORS origins | Express CORS middleware configuration |

**Usage in code:**
```javascript
// src/server.js
app.use(cors({
  origin: config.cors.allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

### JWT Configuration

| Variable | Default | Description | Usage |
|----------|---------|-------------|-------|
| `JWT_SECRET` | `confaBLm$%&25` | Secret for JWT signing | Authentication middleware and token generation |
| `JWT_EXPIRES_IN` | `24h` | Access token expiration | Token generation and validation |
| `REFRESH_TOKEN_EXPIRES_IN` | `30d` | Refresh token expiration | Refresh token generation |

**Usage in code:**
```javascript
// src/middleware/auth.js
const decoded = jwt.verify(token, config.jwt.secret);

export const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
  // ... more code
};
```

### Database Configuration

| Variable | Default | Description | Usage |
|----------|---------|-------------|-------|
| `MONGODB_URI` | `mongodb://localhost:27017/confab_lms` | MongoDB connection string | Database connection and operations |

**Usage in code:**
```javascript
// src/config/database.js
await mongoose.connect(config.mongodb.uri, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});
```

### Email Configuration

| Variable | Default | Description | Usage |
|----------|---------|-------------|-------|
| `EMAIL_PROVIDER` | `nodemailer` | Email service provider | Determines which email service to use |
| `RESEND_API_KEY` | - | Resend API key | Resend email service configuration |
| `RESEND_FROM_EMAIL` | - | Resend sender email | Resend email service configuration |
| `NODEMAILER_PROVIDER` | `gmail` | Nodemailer provider type | Nodemailer configuration |
| `NODEMAILER_USER` | `thetechconfab@gmail.com` | Nodemailer user email | Nodemailer authentication |
| `NODEMAILER_PASSWORD` | `cjgx llhe tekr pynz` | Nodemailer password | Nodemailer authentication |
| `NODEMAILER_FROM` | `thetechconfab@gmail.com` | Nodemailer sender email | Email sender address |
| `NODEMAILER_HOST` | `smtp.gmail.com` | SMTP host | SMTP server configuration |
| `NODEMAILER_PORT` | `587` | SMTP port | SMTP server configuration |
| `NODEMAILER_SECURE` | `false` | Use secure connection | SMTP security configuration |
| `NODEMAILER_REJECT_UNAUTHORIZED` | `false` | Reject unauthorized certs | SMTP security configuration |

**Usage in code:**
```javascript
// src/config/email.js
export class EmailService {
  constructor() {
    this.provider = config.email.provider;
    // ... more code
  }
  
  async sendEmail(emailOptions) {
    if (this.provider === 'nodemailer') {
      return await this.sendWithNodemailer(emailOptions);
    } else if (this.provider === 'resend') {
      return await this.sendWithResend(emailOptions);
    }
  }
}
```

### Cloudinary Configuration

| Variable | Default | Description | Usage |
|----------|---------|-------------|-------|
| `CLOUDINARY_CLOUD_NAME` | `confab_lms_dev` | Cloudinary cloud name | File upload and storage |
| `CLOUDINARY_API_KEY` | `test_api_key` | Cloudinary API key | File upload authentication |
| `CLOUDINARY_API_SECRET` | `test_api_secret` | Cloudinary API secret | File upload authentication |

**Usage in code:**
```javascript
// src/config/cloudinary.js
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});
```

### Application Configuration

| Variable | Default | Description | Usage |
|----------|---------|-------------|-------|
| `INITIAL_ADMIN_EMAIL` | `admin@theconfab.org` | Initial admin user email | First admin user creation |
| `PRODUCT_NAME` | `CONFAB Purpose Discovery LMS` | Application name | Email templates, API responses, logging |
| `CLIENT_URL` | `http://localhost:3000` | Frontend client URL | Email template links and redirects |

**Usage in code:**
```javascript
// src/server.js
app.get('/api/v1', (req, res) => {
  res.json({
    ok: true,
    message: `Welcome to ${config.app.productName} API`,
    version: '1.0.0',
    documentation: '/api/v1/docs',
  });
});

// src/config/email.js
const subject = `Welcome to ${config.app.name}!`;
```

### Feature Flags

| Variable | Default | Description | Usage |
|----------|---------|-------------|-------|
| `FEATURE_FLAGS_MESSAGING` | `true` | Enable messaging features | Feature toggling |
| `FEATURE_FLAGS_REPORTS` | `true` | Enable reporting features | Feature toggling |

**Usage in code:**
```javascript
// Feature checks throughout the application
if (config.features.messaging) {
  // Enable messaging functionality
}
```

### Logging Configuration

| Variable | Default | Description | Usage |
|----------|---------|-------------|-------|
| `LOG_LEVEL` | `info` | Logging level | Pino logger configuration |

**Usage in code:**
```javascript
// src/utils/logger.js
export const logger = pino({
  level: config.logging.level,
  // ... more configuration
});
```

### Rate Limiting

| Variable | Default | Description | Usage |
|----------|---------|-------------|-------|
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit window (15 min) | Express rate limiting middleware |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Max requests per window | Express rate limiting middleware |

**Usage in code:**
```javascript
// src/server.js
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  // ... more configuration
});
```

### File Upload Configuration

| Variable | Default | Description | Usage |
|----------|---------|-------------|-------|
| `MAX_FILE_SIZE_MB` | `10` | Maximum file size in MB | Multer file size limits |

**Usage in code:**
```javascript
// src/server.js
app.use(express.json({ limit: `${config.upload.maxFileSizeMB}mb` }));
app.use(express.urlencoded({ extended: true, limit: `${config.upload.maxFileSizeMB}mb` }));

// src/modules/users/routes/users.js
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.upload.maxFileSizeMB * 1024 * 1024,
  },
  // ... more configuration
});
```

### Security Configuration

| Variable | Default | Description | Usage |
|----------|---------|-------------|-------|
| `SESSION_SECRET` | `confab-session-secret-change-in-production` | Session secret | Security middleware |

## 🔧 Configuration Best Practices

### Development Environment
- Use default values for non-sensitive configurations
- Set `NODE_ENV=development`
- Use local MongoDB instance
- Use test Cloudinary credentials

### Production Environment
- **ALWAYS** change default secrets and keys
- Set `NODE_ENV=production`
- Use strong, unique `JWT_SECRET`
- Configure production MongoDB URI
- Set up production email credentials
- Configure production Cloudinary account
- Update `CORS_ALLOWED_ORIGINS` for production domains
- Use environment-specific `CLIENT_URL`

### Security Considerations
- Never commit `.env` files to version control
- Use strong, unique secrets for production
- Regularly rotate API keys and secrets
- Use environment-specific configurations
- Validate all environment variables on startup

## 🚨 Environment Variable Validation

The application validates all environment variables on startup using Zod schemas:

```javascript
// src/config/env.js
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('9092'),
  // ... more validations
});

const envParse = envSchema.safeParse(process.env);

if (!envParse.success) {
  console.error('❌ Invalid environment variables:');
  console.error(envParse.error.format());
  process.exit(1);
}
```

## 📁 File Structure

```
src/
├── config/
│   ├── env.js          # Environment configuration and validation
│   ├── database.js     # Database connection using env vars
│   ├── email.js        # Email service using env vars
│   ├── cloudinary.js   # Cloudinary config using env vars
│   └── nodemailer.js   # Nodemailer config using env vars
├── middleware/
│   ├── auth.js         # JWT authentication using env vars
│   └── validation.js   # Request validation
├── server.js           # Main server using env vars
└── utils/
    └── logger.js       # Logging using env vars
```

## 🔍 Troubleshooting

### Common Issues

1. **"Invalid environment variables" error**
   - Check that all required variables are set
   - Verify variable types (strings, numbers, booleans)
   - Ensure JWT_SECRET is at least 16 characters

2. **Database connection failed**
   - Verify `MONGODB_URI` is correct
   - Check MongoDB service is running
   - Ensure network connectivity

3. **Email service not working**
   - Verify email provider configuration
   - Check API keys and credentials
   - Ensure email service is accessible

4. **File uploads failing**
   - Check `MAX_FILE_SIZE_MB` value
   - Verify Cloudinary credentials
   - Ensure file types are allowed

### Debug Mode

Set `LOG_LEVEL=debug` to see detailed logging information:

```bash
LOG_LEVEL=debug npm start
```

## 📚 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [MongoDB Connection Guide](https://docs.mongodb.com/drivers/node/current/quick-start/connect/)
- [JWT Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)
- [Multer File Upload](https://github.com/expressjs/multer)
- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Nodemailer Documentation](https://nodemailer.com/)
- [Resend Documentation](https://resend.com/docs)
