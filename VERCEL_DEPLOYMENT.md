# 🚀 Vercel Deployment Guide for CONFAB LMS Backend

This guide will help you deploy your CONFAB LMS Node.js backend to Vercel.

## 📋 Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Vercel CLI**: Install globally with `npm i -g vercel`
3. **Git Repository**: Your code should be in a Git repository (GitHub, GitLab, etc.)
4. **MongoDB Atlas**: Set up a MongoDB Atlas cluster for production
5. **Environment Variables**: Prepare your production environment variables

## 🔧 Pre-Deployment Setup

### 1. MongoDB Atlas Setup

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a new cluster (free tier available)
3. Create a database user with read/write permissions
4. Get your connection string
5. Update `vercel.env.example` with your MongoDB URI

### 2. Environment Variables Preparation

Copy the variables from `vercel.env.example` and update them with your actual values:

```bash
# Required for production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/confab_lms
JWT_SECRET=your-super-secure-jwt-secret-at-least-32-characters-long
RESEND_API_KEY=re_your_resend_api_key_here
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## 🚀 Deployment Steps

### Method 1: Vercel CLI (Recommended)

1. **Login to Vercel**:
   ```bash
   vercel login
   ```

2. **Deploy from your project directory**:
   ```bash
   cd /path/to/your/confab-lms-backend
   vercel
   ```

3. **Follow the prompts**:
   - Link to existing project or create new
   - Set project name
   - Confirm deployment settings

4. **Set environment variables**:
   ```bash
   vercel env add MONGODB_URI
   vercel env add JWT_SECRET
   vercel env add RESEND_API_KEY
   # ... add all other required variables
   ```

5. **Deploy to production**:
   ```bash
   vercel --prod
   ```

**Note**: The new Vercel configuration uses a catch-all route (`api/[...path].js`) which automatically handles all API requests.

### Method 2: Vercel Dashboard

1. **Connect Repository**:
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your Git repository

2. **Configure Project**:
   - Framework Preset: `Node.js`
   - Root Directory: `./` (or leave empty)
   - Build Command: Leave empty (Vercel auto-detects)
   - Output Directory: Leave empty

3. **Set Environment Variables**:
   - Go to Project Settings → Environment Variables
   - Add each variable from `vercel.env.example`

4. **Deploy**:
   - Click "Deploy"
   - Wait for build to complete

## 🔍 Post-Deployment Verification

### 1. Test Health Endpoint

```bash
curl https://your-project-name.vercel.app/health
```

Expected response:
```json
{
  "ok": true,
  "message": "Server is healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "production"
}
```

### 2. Test API Endpoints

```bash
# Test bulk invite template (public endpoint)
curl https://your-project-name.vercel.app/api/v1/users/bulk-invite-template

# Test authentication
curl -X POST https://your-project-name.vercel.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@yourdomain.com", "password": "your_password"}'
```

## ⚠️ Important Notes

### 1. Serverless Limitations

- **Cold Starts**: First request may be slower
- **Function Timeout**: Max 30 seconds (configurable)
- **Memory**: Limited to 1024MB
- **File System**: Read-only (except `/tmp`)

### 2. Database Connections

- **Connection Pooling**: MongoDB connections are managed per function invocation
- **Connection Limits**: Be mindful of MongoDB Atlas connection limits
- **Connection String**: Use MongoDB Atlas connection string with retry logic

### 3. File Uploads

- **Temporary Storage**: Use `/tmp` directory for temporary file processing
- **Cloudinary**: All file uploads go directly to Cloudinary
- **No Local Storage**: Files are not persisted on Vercel

## 🔧 Custom Domain Setup

1. **Add Custom Domain**:
   - Go to Project Settings → Domains
   - Add your domain (e.g., `api.yourdomain.com`)

2. **DNS Configuration**:
   - Add CNAME record pointing to Vercel
   - Wait for DNS propagation (up to 48 hours)

3. **Update Environment Variables**:
   ```bash
   vercel env add API_BASE_URL
   # Set to: https://api.yourdomain.com
   ```

## 📊 Monitoring & Analytics

1. **Vercel Analytics**:
   - View request counts, response times, and errors
   - Monitor function invocations and cold starts

2. **Function Logs**:
   ```bash
   vercel logs your-project-name
   ```

3. **Performance Monitoring**:
   - Monitor MongoDB connection performance
   - Track API response times
   - Monitor error rates

## 🚨 Troubleshooting

### Common Issues

1. **Environment Variables Not Set**:
   ```bash
   vercel env ls
   vercel env add VARIABLE_NAME
   ```

2. **Build Failures**:
   - Check Node.js version compatibility
   - Verify all dependencies are in `package.json`
   - Check for ES module syntax issues

3. **Database Connection Issues**:
   - Verify MongoDB Atlas network access
   - Check connection string format
   - Ensure database user has correct permissions

4. **CORS Issues**:
   - Update `CORS_ALLOWED_ORIGINS` with your frontend domain
   - Redeploy after environment variable changes

### Debug Commands

```bash
# View deployment logs
vercel logs

# View function logs
vercel logs --function=api/index.js

# Redeploy with debug info
vercel --debug

# Check environment variables
vercel env ls
```

## 🔄 Continuous Deployment

1. **Automatic Deployments**:
   - Push to `main` branch triggers production deployment
   - Push to other branches creates preview deployments

2. **Preview Deployments**:
   - Test changes before merging to main
   - Share preview URLs with team members

3. **Rollback**:
   - Go to Project → Deployments
   - Click on previous deployment
   - Click "Promote to Production"

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Node.js Runtime](https://vercel.com/docs/runtimes#official-runtimes/node-js)
- [MongoDB Atlas Setup](https://docs.atlas.mongodb.com/getting-started/)
- [Vercel CLI Reference](https://vercel.com/docs/cli)

## 🎯 Next Steps

After successful deployment:

1. **Update Frontend**: Point your frontend to the new API URL
2. **Test All Endpoints**: Verify all API functionality works
3. **Monitor Performance**: Set up monitoring and alerting
4. **Scale as Needed**: Upgrade Vercel plan if required
5. **Set Up CI/CD**: Automate deployment pipeline

---

**Happy Deploying! 🚀**

If you encounter any issues, check the Vercel logs and refer to the troubleshooting section above.
