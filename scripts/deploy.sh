#!/bin/bash

# Plugspace.io Titan v1.4 - Production Deployment Script

set -e

echo "🚀 Starting Plugspace.io Titan v1.4 Deployment..."

# Check prerequisites
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed"
    exit 1
fi

if ! command -v pm2 &> /dev/null; then
    echo "⚠️  PM2 is not installed. Installing..."
    npm install -g pm2
fi

# Build all applications
echo "📦 Building applications..."
pnpm install
pnpm build

# Generate Prisma client
echo "🗄️  Generating Prisma client..."
cd packages/db
pnpm prisma:generate
cd ../..

# Run database migrations
echo "🔄 Running database migrations..."
cd packages/db
pnpm prisma:migrate
cd ../..

# Create logs directory
mkdir -p logs

# Stop existing PM2 processes
echo "🛑 Stopping existing processes..."
pm2 stop all || true
pm2 delete all || true

# Start applications with PM2
echo "▶️  Starting applications..."
pm2 start infrastructure/pm2.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup

echo "✅ Deployment complete!"
echo "📊 View status: pm2 status"
echo "📝 View logs: pm2 logs"
