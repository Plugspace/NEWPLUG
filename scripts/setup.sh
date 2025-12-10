#!/bin/bash

# ==============================================
# PLUGSPACE.IO TITAN v1.4 - SERVER SETUP SCRIPT
# ==============================================

set -e

echo "🔧 Setting up Plugspace Titan v1.4 Server..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[SETUP]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    error "Please run as root"
fi

# Update system
log "Updating system packages..."
apt update && apt upgrade -y

# Install required packages
log "Installing required packages..."
apt install -y \
    curl \
    wget \
    git \
    nginx \
    certbot \
    python3-certbot-nginx \
    build-essential \
    ufw \
    fail2ban \
    htop \
    vim

# Install Node.js 20 LTS
log "Installing Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PM2
log "Installing PM2..."
npm install -g pm2

# Install MongoDB 7
log "Installing MongoDB 7..."
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | \
    gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
    tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt update
apt install -y mongodb-org

# Start and enable MongoDB
systemctl start mongod
systemctl enable mongod

# Install Redis
log "Installing Redis..."
apt install -y redis-server
systemctl start redis-server
systemctl enable redis-server

# Configure firewall
log "Configuring firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
ufw --force enable

# Configure fail2ban
log "Configuring fail2ban..."
systemctl start fail2ban
systemctl enable fail2ban

# Create application user
log "Creating application user..."
useradd -m -s /bin/bash deploy || true
usermod -aG sudo deploy

# Create directories
log "Creating directories..."
mkdir -p /var/www/plugspace
mkdir -p /var/log/plugspace
mkdir -p /var/log/pm2
mkdir -p /var/backups/plugspace
chown -R deploy:deploy /var/www/plugspace
chown -R deploy:deploy /var/log/plugspace
chown -R deploy:deploy /var/log/pm2

# Set up SSL certificates (Let's Encrypt)
log "Setting up SSL certificates..."
echo ""
echo "Run the following command to obtain SSL certificates:"
echo "  certbot --nginx -d plugspace.io -d www.plugspace.io -d studio.plugspace.io -d admin.plugspace.io -d api.plugspace.io -d *.projects.plugspace.io"
echo ""

# PM2 startup
log "Configuring PM2 startup..."
pm2 startup systemd -u deploy --hp /home/deploy

# System optimizations
log "Applying system optimizations..."
cat >> /etc/sysctl.conf << EOF

# Plugspace Titan optimizations
net.core.somaxconn = 65535
net.ipv4.tcp_max_tw_buckets = 1440000
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_fin_timeout = 15
net.ipv4.tcp_window_scaling = 1
net.core.netdev_max_backlog = 65535
fs.file-max = 2097152
EOF

sysctl -p

# Increase file limits
cat >> /etc/security/limits.conf << EOF

# Plugspace Titan limits
deploy soft nofile 65535
deploy hard nofile 65535
* soft nofile 65535
* hard nofile 65535
EOF

echo ""
log "✅ Server setup completed!"
echo ""
echo "Next steps:"
echo "1. Clone the repository to /var/www/plugspace"
echo "2. Copy .env.example to .env and configure"
echo "3. Run: npm install"
echo "4. Run: npm run db:generate && npm run db:push"
echo "5. Run: npm run build"
echo "6. Copy infrastructure/nginx/nginx.conf to /etc/nginx/"
echo "7. Run: ./scripts/deploy.sh"
echo ""
