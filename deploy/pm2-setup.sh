#!/bin/bash
# ==============================================
# PLUGSPACE.IO TITAN v1.4 - PM2 SETUP
# ==============================================
# Production PM2 process management setup
# ==============================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if running as plugspace user
if [[ "$(whoami)" != "plugspace" ]]; then
   log_warning "This script should be run as the plugspace user"
   log_info "Running: sudo -u plugspace $0"
   exec sudo -u plugspace "$0" "$@"
fi

APP_DIR="/home/plugspace/plugspace"

echo "========================================"
echo "⚡ PM2 PRODUCTION SETUP"
echo "========================================"
echo ""

# ==============================================
# 1. VERIFY INSTALLATION
# ==============================================
log_info "Verifying PM2 installation..."

if ! command -v pm2 &> /dev/null; then
    log_error "PM2 is not installed"
    exit 1
fi

PM2_VERSION=$(pm2 -v)
log_success "PM2 ${PM2_VERSION} found"

# ==============================================
# 2. CREATE LOG DIRECTORIES
# ==============================================
log_info "Creating log directories..."

sudo mkdir -p /var/log/pm2
sudo chown -R plugspace:plugspace /var/log/pm2

log_success "Log directories created"

# ==============================================
# 3. BUILD APPLICATIONS
# ==============================================
log_info "Building applications..."

cd ${APP_DIR}

# Install dependencies
npm ci --production=false

# Build all packages
npm run build

log_success "Applications built"

# ==============================================
# 4. START PM2 PROCESSES
# ==============================================
log_info "Starting PM2 processes..."

# Stop any existing processes
pm2 delete all 2>/dev/null || true

# Start from ecosystem config
pm2 start ecosystem.config.js --env production

# Wait for processes to start
sleep 10

log_success "PM2 processes started"

# ==============================================
# 5. SAVE PM2 PROCESS LIST
# ==============================================
log_info "Saving PM2 process list..."

pm2 save

log_success "Process list saved"

# ==============================================
# 6. SETUP PM2 STARTUP
# ==============================================
log_info "Setting up PM2 startup..."

# Generate startup script (needs sudo)
pm2 startup systemd -u plugspace --hp /home/plugspace | tail -1 | sudo bash

log_success "PM2 startup configured"

# ==============================================
# 7. SETUP PM2 LOG ROTATION
# ==============================================
log_info "Setting up PM2 log rotation..."

pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 14
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss
pm2 set pm2-logrotate:rotateModule true
pm2 set pm2-logrotate:workerInterval 3600

log_success "Log rotation configured"

# ==============================================
# 8. SHOW STATUS
# ==============================================
log_info "PM2 Status:"
pm2 status

echo ""

# ==============================================
# 9. CREATE HELPER SCRIPTS
# ==============================================
log_info "Creating helper scripts..."

# Restart all script
cat > ${APP_DIR}/scripts/pm2-restart.sh << 'EOF'
#!/bin/bash
cd /home/plugspace/plugspace
pm2 reload ecosystem.config.js --env production
pm2 save
EOF
chmod +x ${APP_DIR}/scripts/pm2-restart.sh

# Status script
cat > ${APP_DIR}/scripts/pm2-status.sh << 'EOF'
#!/bin/bash
pm2 status
echo ""
pm2 monit
EOF
chmod +x ${APP_DIR}/scripts/pm2-status.sh

# Logs script
cat > ${APP_DIR}/scripts/pm2-logs.sh << 'EOF'
#!/bin/bash
APP=${1:-all}
pm2 logs $APP --lines 100
EOF
chmod +x ${APP_DIR}/scripts/pm2-logs.sh

log_success "Helper scripts created"

# ==============================================
# SUMMARY
# ==============================================
echo ""
echo "========================================"
echo "✅ PM2 SETUP COMPLETE"
echo "========================================"
echo ""
echo "PM2 is running with the following apps:"
pm2 jlist | jq -r '.[] | "  • \(.name): \(.pm2_env.status)"' 2>/dev/null || pm2 list
echo ""
echo "Useful commands:"
echo "  pm2 status          - Show process status"
echo "  pm2 logs            - View all logs"
echo "  pm2 monit           - Real-time monitoring"
echo "  pm2 reload all      - Zero-downtime reload"
echo "  pm2 restart all     - Restart all processes"
echo ""
echo "Helper scripts in ${APP_DIR}/scripts/:"
echo "  ./scripts/pm2-restart.sh - Reload all processes"
echo "  ./scripts/pm2-status.sh  - Show status and metrics"
echo "  ./scripts/pm2-logs.sh    - View logs"
echo ""
