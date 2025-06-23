#!/bin/bash

# PaperPulse Agent Deployment Script
# This script sets up GitHub Actions secrets and deploys the agent

set -e

echo "🚀 Setting up PaperPulse Agent deployment..."

# Check if we're in a git repository
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    echo "❌ Not in a git repository. Please run from the project root."
    exit 1
fi

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed. Please install it first:"
    echo "   https://cli.github.com/"
    exit 1
fi

# Check if user is logged in to GitHub CLI
if ! gh auth status &> /dev/null; then
    echo "❌ Not logged in to GitHub CLI. Please run: gh auth login"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Set up GitHub Actions secrets
echo "🔐 Setting up GitHub Actions secrets..."

read -p "Enter your SendGrid API key: " -s SENDGRID_API_KEY
echo
read -p "Enter your Anthropic API key: " -s ANTHROPIC_API_KEY
echo
read -p "Enter your Vercel token (optional): " -s VERCEL_TOKEN
echo
read -p "Enter your Vercel Org ID (optional): " -s VERCEL_ORG_ID
echo
read -p "Enter your Vercel Project ID (optional): " -s VERCEL_PROJECT_ID
echo

# Set the secrets
gh secret set SENDGRID_API_KEY --body "$SENDGRID_API_KEY"
gh secret set ANTHROPIC_API_KEY --body "$ANTHROPIC_API_KEY"

if [ ! -z "$VERCEL_TOKEN" ]; then
    gh secret set VERCEL_TOKEN --body "$VERCEL_TOKEN"
fi

if [ ! -z "$VERCEL_ORG_ID" ]; then
    gh secret set VERCEL_ORG_ID --body "$VERCEL_ORG_ID"
fi

if [ ! -z "$VERCEL_PROJECT_ID" ]; then
    gh secret set VERCEL_PROJECT_ID --body "$VERCEL_PROJECT_ID"
fi

echo "✅ GitHub Actions secrets configured"

# Push the workflow file if it doesn't exist in remote
if ! git ls-remote --exit-code --heads origin main > /dev/null 2>&1; then
    echo "📤 Pushing workflow to GitHub..."
    git add .github/workflows/agent.yml
    git commit -m "Add PaperPulse agent workflow" || true
    git push -u origin main
else
    echo "📤 Updating workflow on GitHub..."
    git add .github/workflows/agent.yml
    git commit -m "Update PaperPulse agent workflow" || true
    git push
fi

echo "✅ Workflow deployed to GitHub Actions"

# Test the workflow (optional)
read -p "Would you like to trigger a test run? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🧪 Triggering test run..."
    gh workflow run agent.yml
    echo "✅ Test run triggered. Check GitHub Actions tab for results."
fi

echo ""
echo "🎉 PaperPulse Agent deployment complete!"
echo ""
echo "Next steps:"
echo "1. Check the GitHub Actions tab in your repository"
echo "2. The agent will run daily at 5:00 AM UTC"
echo "3. You can manually trigger runs using: gh workflow run agent.yml"
echo "4. Monitor the logs for any issues"
echo ""
echo "📧 Subscribers will start receiving emails once the workflow runs successfully."