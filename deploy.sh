#!/bin/bash
set -e

echo "=== AppForge Deployment Script ==="

# Check Railway CLI is installed
if ! command -v railway &> /dev/null; then
  echo "Railway CLI not found. Installing..."
  npm install -g @railway/cli
fi

# Login check
echo "Checking Railway auth..."
railway whoami || (echo "Please run: railway login" && exit 1)

# Deploy API
echo "--- Deploying API ---"
cd apps/api
railway up --detach --service appforge-api
cd ../..

# Deploy Web
echo "--- Deploying Web ---"
cd apps/web
railway up --detach --service appforge-web
cd ../..

echo "=== Deployment triggered. Monitor at: https://railway.app/dashboard ==="
