#!/bin/bash

# 🚀 Vercel Deployment Script for CONFAB LMS Backend
# This script automates the deployment process to Vercel

set -e  # Exit on any error

echo "🚀 Starting Vercel deployment for CONFAB LMS Backend..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed. Installing now..."
    npm install -g vercel
fi

# Check if user is logged in to Vercel
if ! vercel whoami &> /dev/null; then
    echo "🔐 Please login to Vercel first..."
    vercel login
fi

# Check if project is already linked
if [ -f ".vercel/project.json" ]; then
    echo "✅ Project is already linked to Vercel"
    echo "📝 Current project info:"
    cat .vercel/project.json | jq '.name, .orgId' 2>/dev/null || echo "Project linked but details not available"
else
    echo "🔗 Linking project to Vercel..."
    vercel
fi

# Set environment variables if they don't exist
echo "🔧 Setting up environment variables..."

# Check if .env file exists
if [ -f ".env" ]; then
    echo "📁 Found .env file, setting variables..."
    
    # Read .env file and set variables in Vercel
    while IFS='=' read -r key value; do
        # Skip comments and empty lines
        if [[ $key =~ ^[^#] ]] && [[ -n $key ]]; then
            # Remove quotes from value
            value=$(echo "$value" | sed 's/^"//;s/"$//')
            
            echo "Setting $key..."
            vercel env add "$key" <<< "$value" 2>/dev/null || echo "Variable $key already exists or failed to set"
        fi
    done < .env
else
    echo "⚠️  No .env file found. Please set environment variables manually:"
    echo "   vercel env add MONGODB_URI"
    echo "   vercel env add JWT_SECRET"
    echo "   vercel env add RESEND_API_KEY"
    echo "   vercel env add CLOUDINARY_CLOUD_NAME"
    echo "   vercel env add CLOUDINARY_API_KEY"
    echo "   vercel env add CLOUDINARY_API_SECRET"
    echo "   # ... and other required variables"
fi

# Deploy to production
echo "🚀 Deploying to production..."
vercel --prod

echo "✅ Deployment completed!"
echo "🌐 Your API is now live at: https://your-project-name.vercel.app"
echo ""
echo "🔍 Test your deployment:"
echo "   curl https://your-project-name.vercel.app/health"
echo "   curl https://your-project-name.vercel.app/api/v1/users/bulk-invite-template"
echo ""
echo "📊 Monitor your deployment at: https://vercel.com/dashboard"
