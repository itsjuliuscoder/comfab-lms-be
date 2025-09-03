# 🔧 Vercel Environment Variables Setup

Based on your Vercel deployment interface, here are the environment variables you need to set:

## 📋 Required Environment Variables

### Server Configuration
```
NODE_ENV=production
PORT=3000
API_BASE_URL=https://your-project-name.vercel.app
CLIENT_URL=https://lms.theconfab.org
```

### CORS Configuration
```
CORS_ALLOWED_ORIGINS=https://lms.theconfab.org,https://www.theconfab.org
```

### JWT Configuration
```
JWT_SECRET=your-super-secure-jwt-secret-at-least-32-characters-long
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_EXPIRES_IN=30d
```

### MongoDB Configuration
```
MONGODB_URI=mongodb+srv://confabUser:uMEsDcjd5xpYmPF4@confabdb.jfwrngi.mongodb.net/confabLMS
```

### Email Configuration
```
EMAIL_PROVIDER=nodemailer
NODEMAILER_PROVIDER=gmail
NODEMAILER_USER=thetechconfab@gmail.com
NODEMAILER_PASSWORD=cjgx llhe tekr pynz
NODEMAILER_FROM=thetechconfab@gmail.com
NODEMAILER_HOST=smtp.gmail.com
NODEMAILER_PORT=587
NODEMAILER_SECURE=false
NODEMAILER_REJECT_UNAUTHORIZED=false
```

### Cloudinary Configuration
```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Application Configuration
```
INITIAL_ADMIN_EMAIL=admin@theconfab.org
PRODUCT_NAME=CONFAB Purpose Discovery LMS
```

### Feature Flags
```
FEATURE_FLAGS_MESSAGING=true
FEATURE_FLAGS_REPORTS=true
```

### Logging
```
LOG_LEVEL=info
```

## 🚀 Quick Setup in Vercel Dashboard

1. **Go to your project settings** in Vercel dashboard
2. **Navigate to Environment Variables**
3. **Add each variable** from the list above
4. **Set environment** to "Production" for all variables
5. **Redeploy** your project

## ⚠️ Important Notes

1. **MongoDB Atlas**: Your connection string is already configured
2. **Gmail SMTP**: Your Nodemailer configuration is set up
3. **CORS**: Configured for your domain `lms.theconfab.org`
4. **JWT Secret**: Make sure to use a strong, unique secret

## 🔍 Verification

After setting environment variables, test your deployment:

```bash
# Health check
curl https://your-project-name.vercel.app/health

# Bulk invite template (public endpoint)
curl https://your-project-name.vercel.app/api/v1/users/bulk-invite-template
```

## 🚨 Troubleshooting

If you encounter issues:

1. **Check environment variables** are set correctly
2. **Verify MongoDB Atlas** connection
3. **Check Vercel function logs** for errors
4. **Ensure all required variables** are set
