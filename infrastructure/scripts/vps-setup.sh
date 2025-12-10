#!/bin/bash

# ==============================================
# PLUGSPACE.IO TITAN v1.4 - VPS SETUP SCRIPT
# ==============================================
# Production server setup for Hostinger VPS
# Ubuntu 24.04 LTS
# ==============================================

set -e

# ============ COLORS ============
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============ LOGGING ============
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ============ CONFIGURATION ============
DOMAIN="${DOMAIN:-plugspace.io}"
EMAIL="${LETSENCRYPT_EMAIL:-admin@plugspace.io}"
APP_USER="plugspace"
APP_DIR="/var/www/plugspace"
BACKUP_DIR="/var/backups/plugspace"
LOG_DIR="/var/log/plugspace"
SSH_PORT="${SSH_PORT:-22}"
NODE_VERSION="20"

# ============ PRE-FLIGHT CHECKS ============
preflight_checks() {
    log_info "Running pre-flight checks..."
    
    # Check if running as root
    if [ "$EUID" -ne 0 ]; then
        log_error "Please run as root"
        exit 1
    fi
    
    # Check Ubuntu version
    if ! grep -q "Ubuntu 24" /etc/os-release 2>/dev/null; then
        log_warn "This script is designed for Ubuntu 24.04 LTS"
    fi
    
    # Check available disk space
    DISK_FREE=$(df -BG / | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ "$DISK_FREE" -lt 20 ]; then
        log_warn "Low disk space: ${DISK_FREE}GB available. Recommended: 20GB+"
    fi
    
    log_success "Pre-flight checks completed"
}

# ============ SYSTEM UPDATE ============
system_update() {
    log_info "Updating system packages..."
    
    apt-get update
    apt-get upgrade -y
    apt-get dist-upgrade -y
    apt-get autoremove -y
    apt-get autoclean
    
    log_success "System updated"
}

# ============ INSTALL ESSENTIAL PACKAGES ============
install_essentials() {
    log_info "Installing essential packages..."
    
    apt-get install -y \
        build-essential \
        curl \
        wget \
        git \
        vim \
        htop \
        iotop \
        tree \
        unzip \
        software-properties-common \
        apt-transport-https \
        ca-certificates \
        gnupg \
        lsb-release \
        jq \
        openssl \
        net-tools \
        dnsutils \
        ncdu \
        acl
    
    log_success "Essential packages installed"
}

# ============ CREATE APPLICATION USER ============
create_app_user() {
    log_info "Creating application user..."
    
    if id "$APP_USER" &>/dev/null; then
        log_warn "User $APP_USER already exists"
    else
        useradd -m -s /bin/bash "$APP_USER"
        usermod -aG sudo "$APP_USER"
        
        # Set up directories
        mkdir -p "$APP_DIR"
        mkdir -p "$BACKUP_DIR"
        mkdir -p "$LOG_DIR"
        
        chown -R "$APP_USER:$APP_USER" "$APP_DIR"
        chown -R "$APP_USER:$APP_USER" "$BACKUP_DIR"
        chown -R "$APP_USER:$APP_USER" "$LOG_DIR"
        
        log_success "Application user created: $APP_USER"
    fi
}

# ============ SECURE SSH ============
secure_ssh() {
    log_info "Securing SSH..."
    
    # Backup original config
    cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup
    
    # Configure SSH
    cat > /etc/ssh/sshd_config.d/99-plugspace.conf << EOF
# Plugspace.io SSH Configuration
Port $SSH_PORT
PermitRootLogin prohibit-password
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
MaxSessions 10
ClientAliveInterval 300
ClientAliveCountMax 2
X11Forwarding no
AllowTcpForwarding no
AllowAgentForwarding no
PermitEmptyPasswords no
Protocol 2
EOF

    # Restart SSH
    systemctl restart sshd
    
    log_success "SSH secured on port $SSH_PORT"
}

# ============ CONFIGURE FIREWALL ============
configure_firewall() {
    log_info "Configuring firewall..."
    
    # Install UFW
    apt-get install -y ufw
    
    # Reset UFW
    ufw --force reset
    
    # Default policies
    ufw default deny incoming
    ufw default allow outgoing
    
    # Allow SSH
    ufw allow "$SSH_PORT/tcp"
    
    # Allow HTTP and HTTPS
    ufw allow 80/tcp
    ufw allow 443/tcp
    
    # Allow application ports (internal only, proxied through Nginx)
    # These are not exposed externally
    
    # Enable UFW
    ufw --force enable
    
    log_success "Firewall configured"
}

# ============ INSTALL FAIL2BAN ============
install_fail2ban() {
    log_info "Installing Fail2ban..."
    
    apt-get install -y fail2ban
    
    # Configure Fail2ban
    cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
destemail = $EMAIL
sender = fail2ban@$DOMAIN
action = %(action_mwl)s

[sshd]
enabled = true
port = $SSH_PORT
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 86400

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
findtime = 120
bantime = 600
EOF

    systemctl enable fail2ban
    systemctl restart fail2ban
    
    log_success "Fail2ban installed and configured"
}

# ============ INSTALL NODE.JS ============
install_nodejs() {
    log_info "Installing Node.js $NODE_VERSION..."
    
    # Install NVM for the app user
    sudo -u "$APP_USER" bash << EOF
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
export NVM_DIR="\$HOME/.nvm"
[ -s "\$NVM_DIR/nvm.sh" ] && \. "\$NVM_DIR/nvm.sh"
nvm install $NODE_VERSION
nvm use $NODE_VERSION
nvm alias default $NODE_VERSION

# Install global packages
npm install -g pm2 npm@latest
EOF
    
    log_success "Node.js $NODE_VERSION installed"
}

# ============ INSTALL DOCKER ============
install_docker() {
    log_info "Installing Docker..."
    
    # Remove old versions
    apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
    
    # Add Docker's official GPG key
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
    
    # Add the repository
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Add app user to docker group
    usermod -aG docker "$APP_USER"
    
    # Start Docker
    systemctl enable docker
    systemctl start docker
    
    log_success "Docker installed"
}

# ============ INSTALL NGINX ============
install_nginx() {
    log_info "Installing Nginx..."
    
    apt-get install -y nginx
    
    # Remove default site
    rm -f /etc/nginx/sites-enabled/default
    
    # Create Nginx directories
    mkdir -p /etc/nginx/ssl
    mkdir -p /var/cache/nginx
    
    # Configure Nginx
    cat > /etc/nginx/nginx.conf << 'EOF'
user www-data;
worker_processes auto;
pid /run/nginx.pid;
error_log /var/log/nginx/error.log warn;

events {
    worker_connections 4096;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for" '
                    'rt=$request_time uct="$upstream_connect_time" '
                    'uht="$upstream_header_time" urt="$upstream_response_time"';

    access_log /var/log/nginx/access.log main;

    # Basic Settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;
    client_max_body_size 100M;

    # Buffer Settings
    client_body_buffer_size 128k;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 16k;

    # Gzip Settings
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_buffers 16 8k;
    gzip_http_version 1.1;
    gzip_min_length 256;
    gzip_types
        application/atom+xml
        application/javascript
        application/json
        application/ld+json
        application/manifest+json
        application/rss+xml
        application/vnd.geo+json
        application/vnd.ms-fontobject
        application/x-font-ttf
        application/x-web-app-manifest+json
        application/xhtml+xml
        application/xml
        font/opentype
        image/bmp
        image/svg+xml
        image/x-icon
        text/cache-manifest
        text/css
        text/plain
        text/vcard
        text/vnd.rim.location.xloc
        text/vtt
        text/x-component
        text/x-cross-domain-policy;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/s;
    limit_conn_zone $binary_remote_addr zone=conn:10m;

    # Include site configs
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
EOF

    # Enable and start Nginx
    systemctl enable nginx
    systemctl restart nginx
    
    log_success "Nginx installed"
}

# ============ INSTALL CERTBOT ============
install_certbot() {
    log_info "Installing Certbot..."
    
    apt-get install -y certbot python3-certbot-nginx
    
    # Create renewal hook
    cat > /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh << 'EOF'
#!/bin/bash
systemctl reload nginx
EOF
    chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
    
    # Add cron job for renewal
    (crontab -l 2>/dev/null | grep -v certbot; echo "0 3 * * * /usr/bin/certbot renew --quiet") | crontab -
    
    log_success "Certbot installed"
}

# ============ CONFIGURE SSL ============
configure_ssl() {
    log_info "Configuring SSL certificates..."
    
    # Generate DH parameters
    if [ ! -f /etc/nginx/ssl/dhparam.pem ]; then
        openssl dhparam -out /etc/nginx/ssl/dhparam.pem 2048
    fi
    
    # Create SSL snippet
    cat > /etc/nginx/snippets/ssl-params.conf << 'EOF'
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers on;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
ssl_session_timeout 1d;
ssl_session_cache shared:SSL:50m;
ssl_session_tickets off;
ssl_dhparam /etc/nginx/ssl/dhparam.pem;
ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;
add_header Strict-Transport-Security "max-age=63072000" always;
EOF

    log_success "SSL configured"
}

# ============ INSTALL MONITORING TOOLS ============
install_monitoring() {
    log_info "Installing monitoring tools..."
    
    # Install Netdata
    bash <(curl -Ss https://get.netdata.cloud/kickstart.sh) --non-interactive
    
    # Configure Netdata to listen only locally
    cat >> /etc/netdata/netdata.conf << EOF

[web]
    bind to = 127.0.0.1
EOF

    systemctl restart netdata
    
    log_success "Monitoring tools installed"
}

# ============ CONFIGURE AUTOMATIC UPDATES ============
configure_auto_updates() {
    log_info "Configuring automatic security updates..."
    
    apt-get install -y unattended-upgrades
    
    cat > /etc/apt/apt.conf.d/50unattended-upgrades << EOF
Unattended-Upgrade::Allowed-Origins {
    "\${distro_id}:\${distro_codename}-security";
    "\${distro_id}ESMApps:\${distro_codename}-apps-security";
    "\${distro_id}ESM:\${distro_codename}-infra-security";
};
Unattended-Upgrade::Package-Blacklist {
};
Unattended-Upgrade::DevRelease "false";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::Mail "$EMAIL";
EOF

    cat > /etc/apt/apt.conf.d/20auto-upgrades << EOF
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Unattended-Upgrade "1";
EOF

    systemctl enable unattended-upgrades
    
    log_success "Automatic updates configured"
}

# ============ CONFIGURE LOG ROTATION ============
configure_logrotation() {
    log_info "Configuring log rotation..."
    
    cat > /etc/logrotate.d/plugspace << EOF
$LOG_DIR/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 $APP_USER $APP_USER
    sharedscripts
    postrotate
        [ -s /var/run/nginx.pid ] && kill -USR1 \$(cat /var/run/nginx.pid)
    endscript
}
EOF

    log_success "Log rotation configured"
}

# ============ CREATE BACKUP SCRIPT ============
create_backup_script() {
    log_info "Creating backup scripts..."
    
    cat > /usr/local/bin/plugspace-backup << 'EOF'
#!/bin/bash

# Backup script for Plugspace.io
set -e

BACKUP_DIR="/var/backups/plugspace"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.tar.gz"

echo "[$(date)] Starting backup..."

# Create backup
tar -czf "$BACKUP_FILE" \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='*.log' \
    /var/www/plugspace 2>/dev/null || true

# MongoDB backup (if running in Docker)
if docker ps | grep -q mongo-primary; then
    docker exec plugspace-mongo-primary mongodump \
        --archive="/tmp/mongodb_$TIMESTAMP.gz" \
        --gzip 2>/dev/null || true
    docker cp "plugspace-mongo-primary:/tmp/mongodb_$TIMESTAMP.gz" "$BACKUP_DIR/" || true
fi

# Clean old backups
find "$BACKUP_DIR" -name "backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "mongodb_*.gz" -mtime +$RETENTION_DAYS -delete

echo "[$(date)] Backup completed: $BACKUP_FILE"
EOF

    chmod +x /usr/local/bin/plugspace-backup
    
    # Add to cron
    (crontab -l 2>/dev/null | grep -v plugspace-backup; echo "0 2 * * * /usr/local/bin/plugspace-backup >> /var/log/plugspace/backup.log 2>&1") | crontab -
    
    log_success "Backup scripts created"
}

# ============ FINAL SETUP ============
final_setup() {
    log_info "Running final setup..."
    
    # Set proper permissions
    chown -R "$APP_USER:$APP_USER" "$APP_DIR"
    chown -R "$APP_USER:$APP_USER" "$BACKUP_DIR"
    chown -R "$APP_USER:$APP_USER" "$LOG_DIR"
    
    # Create systemd service for health checks
    cat > /etc/systemd/system/plugspace-health.service << EOF
[Unit]
Description=Plugspace Health Check
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/plugspace-health-check
User=$APP_USER

[Install]
WantedBy=multi-user.target
EOF

    cat > /etc/systemd/system/plugspace-health.timer << EOF
[Unit]
Description=Run Plugspace health check every 5 minutes

[Timer]
OnBootSec=60
OnUnitActiveSec=300

[Install]
WantedBy=timers.target
EOF

    # Create health check script
    cat > /usr/local/bin/plugspace-health-check << 'EOF'
#!/bin/bash
HEALTH_LOG="/var/log/plugspace/health.log"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

check_service() {
    if curl -sf "http://localhost:$1/health" > /dev/null 2>&1; then
        echo "[$TIMESTAMP] $2: OK" >> "$HEALTH_LOG"
    else
        echo "[$TIMESTAMP] $2: FAIL" >> "$HEALTH_LOG"
    fi
}

check_service 4000 "API"
check_service 3000 "Landing"
check_service 3001 "Studio"
check_service 3002 "Admin"

# Check disk space
DISK_USE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USE" -gt 90 ]; then
    echo "[$TIMESTAMP] DISK SPACE WARNING: ${DISK_USE}%" >> "$HEALTH_LOG"
fi

# Check memory
MEM_USE=$(free | awk '/Mem:/ {printf("%.0f", $3/$2*100)}')
if [ "$MEM_USE" -gt 90 ]; then
    echo "[$TIMESTAMP] MEMORY WARNING: ${MEM_USE}%" >> "$HEALTH_LOG"
fi
EOF

    chmod +x /usr/local/bin/plugspace-health-check
    
    systemctl daemon-reload
    systemctl enable plugspace-health.timer
    systemctl start plugspace-health.timer
    
    log_success "Final setup completed"
}

# ============ PRINT SUMMARY ============
print_summary() {
    echo ""
    echo "=============================================="
    echo -e "${GREEN}VPS SETUP COMPLETED SUCCESSFULLY${NC}"
    echo "=============================================="
    echo ""
    echo "Server Configuration:"
    echo "  - SSH Port: $SSH_PORT"
    echo "  - Application User: $APP_USER"
    echo "  - Application Directory: $APP_DIR"
    echo "  - Backup Directory: $BACKUP_DIR"
    echo "  - Log Directory: $LOG_DIR"
    echo ""
    echo "Installed Services:"
    echo "  - Node.js $NODE_VERSION (via NVM)"
    echo "  - Docker & Docker Compose"
    echo "  - Nginx"
    echo "  - Certbot (Let's Encrypt)"
    echo "  - Fail2ban"
    echo "  - Netdata (monitoring)"
    echo ""
    echo "Next Steps:"
    echo "  1. Copy SSH key for $APP_USER"
    echo "  2. Deploy application to $APP_DIR"
    echo "  3. Configure SSL: certbot --nginx -d $DOMAIN"
    echo "  4. Start application: docker compose up -d"
    echo ""
    echo "Useful Commands:"
    echo "  - View logs: journalctl -u nginx"
    echo "  - Check status: systemctl status nginx"
    echo "  - Run backup: /usr/local/bin/plugspace-backup"
    echo "  - View monitoring: http://localhost:19999"
    echo ""
}

# ============ MAIN ============
main() {
    echo "=============================================="
    echo "PLUGSPACE.IO TITAN v1.4 - VPS SETUP"
    echo "=============================================="
    echo ""
    
    preflight_checks
    system_update
    install_essentials
    create_app_user
    secure_ssh
    configure_firewall
    install_fail2ban
    install_nodejs
    install_docker
    install_nginx
    install_certbot
    configure_ssl
    install_monitoring
    configure_auto_updates
    configure_logrotation
    create_backup_script
    final_setup
    print_summary
}

# Run main function
main "$@"
