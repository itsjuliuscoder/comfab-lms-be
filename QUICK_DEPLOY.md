# 🚀 Quick Start: Deploy to Vercel in 5 Minutes

## ⚡ Fast Deployment Steps

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Deploy (Choose One Method)

#### Option A: Automated Script (Recommended)
```bash
./deploy-vercel.sh
```

#### Option B: Manual Deployment
```bash
vercel
```

### 4. Set Environment Variables
```bash
# Required variables
vercel env add MONGODB_URI
vercel env add JWT_SECRET
vercel env add RESEND_API_KEY
vercel env add CLOUDINARY_CLOUD_NAME
vercel env add CLOUDINARY_API_KEY
vercel env add CLOUDINARY_API_SECRET

# Deploy to production
vercel --prod
```

## 🔑 Required Environment Variables

Copy these to your Vercel project:

```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/confab_lms
JWT_SECRET=your-super-secure-jwt-secret-at-least-32-characters-long
RESEND_API_KEY=re_your_resend_api_key_here
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
NODE_ENV=production
```

## 🌐 Test Your Deployment

```bash
# Health check
curl https://your-project-name.vercel.app/health

# Bulk invite template (public endpoint)
curl https://your-project-name.vercel.app/api/v1/users/bulk-invite-template
```

## 📚 Full Documentation

See `VERCEL_DEPLOYMENT.md` for complete deployment guide.

---

**Need Help?** Check the troubleshooting section in `VERCEL_DEPLOYMENT.md`
