#!/bin/bash

# PaperPulse Web Deployment Script
# This script deploys the Next.js web app to Vercel

set -e

echo "🚀 Deploying PaperPulse Web to Vercel..."

# Check if we're in the correct directory
if [ ! -f "web/package.json" ]; then
    echo "❌ web/package.json not found. Please run from the project root."
    exit 1
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Navigate to web directory
cd web

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building project..."
npm run build

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."

# Check if this is the first deployment
if [ ! -f ".vercel/project.json" ]; then
    echo "🆕 First time deployment - setting up project..."
    vercel --prod
else
    echo "🔄 Updating existing deployment..."
    vercel --prod
fi

echo ""
echo "🎉 PaperPulse Web deployment complete!"
echo ""
echo "Next steps:"
echo "1. Set up environment variables in Vercel dashboard:"
echo "   - MAILCHIMP_API_KEY"
echo "   - MAILCHIMP_SERVER_PREFIX"
echo "   - MAILCHIMP_LIST_ID"
echo "   - SENDGRID_API_KEY"
echo "   - FROM_EMAIL"
echo "   - NEXT_PUBLIC_BASE_URL"
echo ""
echo "2. Configure custom domain (optional)"
echo "3. Set up preview deployments for staging"
echo ""
echo "📱 Your PaperPulse web app is now live!"