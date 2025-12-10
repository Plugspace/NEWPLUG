#!/bin/bash
# ==============================================
# PLUGSPACE.IO TITAN v1.4 - VPS HARDENING SCRIPT
# ==============================================
# Complete server security setup for Ubuntu 24.04 LTS
# Run as root on a fresh Hostinger VPS installation
# ==============================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root"
   exit 1
fi

echo "========================================"
echo "🔒 PLUGSPACE VPS HARDENING"
echo "========================================"
echo ""

# ==============================================
# 1. SYSTEM UPDATE
# ==============================================
log_info "Updating system packages..."
apt update && apt upgrade -y
apt install -y \
    curl \
    wget \
    git \
    vim \
    htop \
    iotop \
    ncdu \
    tree \
    jq \
    unzip \
    gnupg \
    ca-certificates \
    apt-transport-https \
    software-properties-common \
    ufw \
    fail2ban \
    unattended-upgrades \
    logrotate \
    rsync \
    net-tools \
    dnsutils

log_success "System packages updated"

# ==============================================
# 2. AUTOMATIC SECURITY UPDATES
# ==============================================
log_info "Configuring automatic security updates..."

cat > /etc/apt/apt.conf.d/20auto-upgrades << 'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Unattended-Upgrade "1";
EOF

cat > /etc/apt/apt.conf.d/50unattended-upgrades << 'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}";
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-New-Unused-Dependencies "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::SyslogEnable "true";
EOF

systemctl enable unattended-upgrades
systemctl start unattended-upgrades

log_success "Automatic security updates configured"

# ==============================================
# 3. CREATE DEPLOYMENT USER
# ==============================================
log_info "Creating deployment user..."

# Create user if doesn't exist
if ! id "plugspace" &>/dev/null; then
    useradd -m -s /bin/bash plugspace
    log_info "Created user: plugspace"
else
    log_info "User plugspace already exists"
fi

# Add to sudo group
usermod -aG sudo plugspace

# Create SSH directory
mkdir -p /home/plugspace/.ssh
chmod 700 /home/plugspace/.ssh
touch /home/plugspace/.ssh/authorized_keys
chmod 600 /home/plugspace/.ssh/authorized_keys
chown -R plugspace:plugspace /home/plugspace/.ssh

# Sudo without password for deployment
echo "plugspace ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart nginx, /usr/bin/systemctl reload nginx, /usr/bin/pm2 *" > /etc/sudoers.d/plugspace
chmod 440 /etc/sudoers.d/plugspace

log_success "Deployment user configured"

# ==============================================
# 4. SSH HARDENING
# ==============================================
log_info "Hardening SSH configuration..."

# Backup original config
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# Create hardened SSH config
cat > /etc/ssh/sshd_config << 'EOF'
# ==============================================
# PLUGSPACE HARDENED SSH CONFIGURATION
# ==============================================

# Port Configuration
Port 2222
AddressFamily inet

# Authentication
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
ChallengeResponseAuthentication no
UsePAM yes

# Session Settings
LoginGraceTime 30
MaxAuthTries 3
MaxSessions 5
ClientAliveInterval 300
ClientAliveCountMax 2

# Security Options
X11Forwarding no
AllowTcpForwarding no
AllowAgentForwarding no
PermitTunnel no
PermitUserEnvironment no
DebianBanner no

# Logging
SyslogFacility AUTH
LogLevel VERBOSE

# Allow only specific users
AllowUsers plugspace

# Crypto settings
KexAlgorithms curve25519-sha256@libssh.org,diffie-hellman-group16-sha512,diffie-hellman-group18-sha512
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com
MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com

# Subsystem
Subsystem sftp /usr/lib/openssh/sftp-server
EOF

# Test SSH config before restarting
sshd -t
if [ $? -eq 0 ]; then
    systemctl restart sshd
    log_success "SSH hardened (Port: 2222)"
else
    log_error "SSH config test failed, reverting..."
    cp /etc/ssh/sshd_config.backup /etc/ssh/sshd_config
    exit 1
fi

# ==============================================
# 5. FIREWALL CONFIGURATION (UFW)
# ==============================================
log_info "Configuring firewall..."

# Reset UFW
ufw --force reset

# Default policies
ufw default deny incoming
ufw default allow outgoing

# SSH (custom port)
ufw allow 2222/tcp comment 'SSH'

# HTTP/HTTPS
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# Voice Server WebSocket (internal, through Nginx)
# ufw allow 4001/tcp comment 'Voice WebSocket'

# Enable UFW
ufw --force enable

log_success "Firewall configured"

# ==============================================
# 6. FAIL2BAN CONFIGURATION
# ==============================================
log_info "Configuring Fail2Ban..."

cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
# Ban hosts for 1 hour
bantime = 3600
# Find failures within 10 minutes
findtime = 600
# Allow 5 retries before ban
maxretry = 5
# Email notifications (configure SMTP)
# destemail = admin@plugspace.io
# sendername = Fail2Ban
# mta = sendmail
# action = %(action_mwl)s

# Ignore local networks
ignoreip = 127.0.0.1/8 ::1

[sshd]
enabled = true
port = 2222
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 86400

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 5

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10

[nginx-botsearch]
enabled = true
filter = nginx-botsearch
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2
EOF

# Create nginx filters
cat > /etc/fail2ban/filter.d/nginx-limit-req.conf << 'EOF'
[Definition]
failregex = limiting requests, excess:.* by zone.*client: <HOST>
ignoreregex =
EOF

systemctl enable fail2ban
systemctl restart fail2ban

log_success "Fail2Ban configured"

# ==============================================
# 7. INSTALL DOCKER
# ==============================================
log_info "Installing Docker..."

# Remove old versions
apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# Add Docker repository
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add user to docker group
usermod -aG docker plugspace

# Configure Docker daemon
mkdir -p /etc/docker
cat > /etc/docker/daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "live-restore": true,
  "userland-proxy": false,
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 65536,
      "Soft": 65536
    }
  }
}
EOF

systemctl enable docker
systemctl restart docker

log_success "Docker installed"

# ==============================================
# 8. INSTALL NODE.JS 20 LTS
# ==============================================
log_info "Installing Node.js 20 LTS..."

curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Verify installation
node --version
npm --version

log_success "Node.js $(node --version) installed"

# ==============================================
# 9. INSTALL PM2
# ==============================================
log_info "Installing PM2..."

npm install -g pm2

# Setup PM2 startup script
pm2 startup systemd -u plugspace --hp /home/plugspace

log_success "PM2 installed"

# ==============================================
# 10. INSTALL NGINX
# ==============================================
log_info "Installing Nginx..."

apt install -y nginx

# Enable and start Nginx
systemctl enable nginx
systemctl start nginx

log_success "Nginx installed"

# ==============================================
# 11. INSTALL CERTBOT
# ==============================================
log_info "Installing Certbot..."

apt install -y certbot python3-certbot-nginx

log_success "Certbot installed"

# ==============================================
# 12. CONFIGURE SYSTEM LIMITS
# ==============================================
log_info "Configuring system limits..."

cat >> /etc/security/limits.conf << 'EOF'

# Plugspace Production Limits
* soft nofile 65536
* hard nofile 65536
* soft nproc 65536
* hard nproc 65536
plugspace soft nofile 65536
plugspace hard nofile 65536
EOF

# PAM limits
echo "session required pam_limits.so" >> /etc/pam.d/common-session

log_success "System limits configured"

# ==============================================
# 13. KERNEL OPTIMIZATION
# ==============================================
log_info "Optimizing kernel parameters..."

cat >> /etc/sysctl.conf << 'EOF'

# ==============================================
# PLUGSPACE KERNEL OPTIMIZATIONS
# ==============================================

# Network Performance
net.core.somaxconn = 65536
net.core.netdev_max_backlog = 65536
net.ipv4.tcp_max_syn_backlog = 65536
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 15
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_keepalive_time = 300
net.ipv4.tcp_keepalive_probes = 5
net.ipv4.tcp_keepalive_intvl = 15

# TCP Buffer Sizes
net.core.rmem_default = 31457280
net.core.rmem_max = 67108864
net.core.wmem_default = 31457280
net.core.wmem_max = 67108864
net.ipv4.tcp_rmem = 4096 87380 67108864
net.ipv4.tcp_wmem = 4096 65536 67108864

# TCP Optimization
net.ipv4.tcp_window_scaling = 1
net.ipv4.tcp_timestamps = 1
net.ipv4.tcp_sack = 1
net.ipv4.tcp_no_metrics_save = 1
net.ipv4.tcp_moderate_rcvbuf = 1

# Memory Management
vm.swappiness = 10
vm.dirty_ratio = 60
vm.dirty_background_ratio = 2
vm.overcommit_memory = 1

# File System
fs.file-max = 2097152
fs.inotify.max_user_watches = 524288

# Security
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
EOF

sysctl -p

log_success "Kernel parameters optimized"

# ==============================================
# 14. CREATE DIRECTORY STRUCTURE
# ==============================================
log_info "Creating directory structure..."

mkdir -p /home/plugspace/plugspace
mkdir -p /home/plugspace/backups
mkdir -p /var/log/pm2
mkdir -p /var/log/plugspace

chown -R plugspace:plugspace /home/plugspace
chown -R plugspace:plugspace /var/log/pm2
chown -R plugspace:plugspace /var/log/plugspace

log_success "Directory structure created"

# ==============================================
# 15. SETUP LOG ROTATION
# ==============================================
log_info "Configuring log rotation..."

cat > /etc/logrotate.d/plugspace << 'EOF'
/var/log/plugspace/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 plugspace plugspace
    sharedscripts
    postrotate
        [ -f /var/run/nginx.pid ] && kill -USR1 `cat /var/run/nginx.pid`
    endscript
}

/var/log/pm2/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 plugspace plugspace
}
EOF

log_success "Log rotation configured"

# ==============================================
# 16. INSTALL MONITORING TOOLS
# ==============================================
log_info "Installing monitoring tools..."

# Node Exporter for Prometheus
useradd --no-create-home --shell /bin/false node_exporter 2>/dev/null || true

wget https://github.com/prometheus/node_exporter/releases/download/v1.7.0/node_exporter-1.7.0.linux-amd64.tar.gz
tar xvfz node_exporter-1.7.0.linux-amd64.tar.gz
cp node_exporter-1.7.0.linux-amd64/node_exporter /usr/local/bin/
rm -rf node_exporter-1.7.0.linux-amd64*

cat > /etc/systemd/system/node_exporter.service << 'EOF'
[Unit]
Description=Node Exporter
Wants=network-online.target
After=network-online.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable node_exporter
systemctl start node_exporter

log_success "Monitoring tools installed"

# ==============================================
# FINAL SUMMARY
# ==============================================
echo ""
echo "========================================"
echo "✅ VPS HARDENING COMPLETE"
echo "========================================"
echo ""
echo "Summary of changes:"
echo "  • SSH port changed to 2222"
echo "  • Root login disabled"
echo "  • Password authentication disabled"
echo "  • Firewall (UFW) enabled"
echo "  • Fail2Ban configured"
echo "  • Docker installed"
echo "  • Node.js 20 LTS installed"
echo "  • PM2 installed"
echo "  • Nginx installed"
echo "  • Certbot installed"
echo "  • System limits optimized"
echo "  • Kernel parameters tuned"
echo "  • Log rotation configured"
echo "  • Node Exporter running on :9100"
echo ""
echo "⚠️  IMPORTANT: Before disconnecting:"
echo "  1. Add your SSH public key to /home/plugspace/.ssh/authorized_keys"
echo "  2. Test SSH connection on port 2222"
echo "  3. Update DNS records for your domain"
echo ""
echo "Next steps:"
echo "  1. Run: ./mongodb-setup.sh"
echo "  2. Run: ./redis-setup.sh"
echo "  3. Run: ./nginx-setup.sh"
echo "  4. Run: ./ssl-setup.sh"
echo ""
