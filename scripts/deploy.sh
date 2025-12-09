#!/bin/bash

# ==============================================
# PLUGSPACE.IO TITAN v1.4 - DEPLOYMENT SCRIPT
# ==============================================

set -e

echo "🚀 Starting Plugspace Titan v1.4 Deployment..."

# Configuration
DEPLOY_DIR="/var/www/plugspace"
BACKUP_DIR="/var/backups/plugspace"
LOG_FILE="/var/log/plugspace/deploy.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a $LOG_FILE
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a $LOG_FILE
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1" | tee -a $LOG_FILE
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    error "Please run as root"
fi

# Create directories
mkdir -p $DEPLOY_DIR $BACKUP_DIR $(dirname $LOG_FILE)

# Step 1: Backup current deployment
log "📦 Creating backup..."
if [ -d "$DEPLOY_DIR" ]; then
    BACKUP_NAME="backup-$(date +'%Y%m%d-%H%M%S').tar.gz"
    tar -czf "$BACKUP_DIR/$BACKUP_NAME" -C $DEPLOY_DIR . 2>/dev/null || warn "No existing deployment to backup"
    log "Backup created: $BACKUP_NAME"
fi

# Step 2: Pull latest code
log "📥 Pulling latest code..."
cd $DEPLOY_DIR
git pull origin main || error "Failed to pull code"

# Step 3: Install dependencies
log "📚 Installing dependencies..."
npm ci --legacy-peer-deps || error "Failed to install dependencies"

# Step 4: Generate Prisma client
log "🗄️ Generating database client..."
npm run db:generate || error "Failed to generate Prisma client"

# Step 5: Run database migrations
log "🔄 Running database migrations..."
npm run db:push || warn "Database push failed (might be first deployment)"

# Step 6: Build all packages
log "🔨 Building packages..."
npm run build || error "Build failed"

# Step 7: Restart services with PM2
log "🔄 Restarting services..."
pm2 reload ecosystem.config.js --env production || pm2 start ecosystem.config.js --env production

# Step 8: Verify services
log "✅ Verifying services..."
sleep 5

check_service() {
    local url=$1
    local name=$2
    if curl -s -o /dev/null -w "%{http_code}" $url | grep -q "200\|301\|302"; then
        log "  ✓ $name is running"
    else
        warn "  ✗ $name might not be responding correctly"
    fi
}

check_service "http://localhost:3000" "Landing Page"
check_service "http://localhost:3001" "Studio"
check_service "http://localhost:3002" "Admin"
check_service "http://localhost:4000/health" "API"

# Step 9: Clear caches
log "🧹 Clearing caches..."
redis-cli FLUSHDB 2>/dev/null || warn "Could not flush Redis cache"

# Step 10: Reload Nginx
log "🔄 Reloading Nginx..."
nginx -t && systemctl reload nginx || warn "Nginx reload failed"

# Done
log "🎉 Deployment completed successfully!"
echo ""
echo "📊 Service Status:"
pm2 status

echo ""
echo "🔗 URLs:"
echo "   Landing: https://plugspace.io"
echo "   Studio:  https://studio.plugspace.io"
echo "   Admin:   https://admin.plugspace.io"
echo "   API:     https://api.plugspace.io"
