#!/bin/bash
# ==============================================
# PLUGSPACE.IO TITAN v1.4 - REDIS SETUP
# ==============================================
# Production Redis 7 configuration with
# persistence, security, and optimization
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

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root"
   exit 1
fi

# Generate secure password
REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)

echo "========================================"
echo "🔴 REDIS PRODUCTION SETUP"
echo "========================================"
echo ""

# ==============================================
# 1. INSTALL REDIS 7
# ==============================================
log_info "Installing Redis 7..."

# Add Redis repository
curl -fsSL https://packages.redis.io/gpg | gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb $(lsb_release -cs) main" | tee /etc/apt/sources.list.d/redis.list

apt-get update
apt-get install -y redis-server

log_success "Redis installed"

# ==============================================
# 2. CONFIGURE REDIS
# ==============================================
log_info "Configuring Redis..."

# Backup original config
cp /etc/redis/redis.conf /etc/redis/redis.conf.backup

# Create production configuration
cat > /etc/redis/redis.conf << EOF
# ==============================================
# PLUGSPACE REDIS PRODUCTION CONFIGURATION
# ==============================================

# Network
bind 127.0.0.1
port 6379
protected-mode yes
tcp-backlog 511
timeout 0
tcp-keepalive 300

# General
daemonize yes
supervised systemd
pidfile /var/run/redis/redis-server.pid
loglevel notice
logfile /var/log/redis/redis-server.log
databases 16

# Snapshotting (RDB Persistence)
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb
rdb-del-sync-files no
dir /var/lib/redis

# Append Only File (AOF Persistence)
appendonly yes
appendfilename "appendonly.aof"
appenddirname "appendonlydir"
appendfsync everysec
no-appendfsync-on-rewrite no
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
aof-load-truncated yes
aof-use-rdb-preamble yes
aof-timestamp-enabled no

# Security
requirepass ${REDIS_PASSWORD}
rename-command FLUSHALL ""
rename-command FLUSHDB ""
rename-command CONFIG ""
rename-command DEBUG ""
rename-command SHUTDOWN PLUGSPACE_SHUTDOWN

# Limits
maxclients 10000
maxmemory 1gb
maxmemory-policy allkeys-lru
maxmemory-samples 5

# Replication
replica-serve-stale-data yes
replica-read-only yes
repl-diskless-sync yes
repl-diskless-sync-delay 5
repl-diskless-sync-max-replicas 0
repl-diskless-load disabled
repl-disable-tcp-nodelay no
replica-priority 100

# Lazy Freeing
lazyfree-lazy-eviction yes
lazyfree-lazy-expire yes
lazyfree-lazy-server-del yes
replica-lazy-flush yes
lazyfree-lazy-user-del yes
lazyfree-lazy-user-flush yes

# Threaded I/O
io-threads 4
io-threads-do-reads yes

# Slow Log
slowlog-log-slower-than 10000
slowlog-max-len 128

# Latency Monitor
latency-monitor-threshold 100

# Event Notification
notify-keyspace-events ""

# Advanced Config
hash-max-listpack-entries 512
hash-max-listpack-value 64
list-max-listpack-size -2
list-compress-depth 0
set-max-intset-entries 512
set-max-listpack-entries 128
set-max-listpack-value 64
zset-max-listpack-entries 128
zset-max-listpack-value 64
hll-sparse-max-bytes 3000
stream-node-max-bytes 4096
stream-node-max-entries 100
activerehashing yes
client-output-buffer-limit normal 0 0 0
client-output-buffer-limit replica 256mb 64mb 60
client-output-buffer-limit pubsub 32mb 8mb 60
hz 10
dynamic-hz yes
aof-rewrite-incremental-fsync yes
rdb-save-incremental-fsync yes
jemalloc-bg-thread yes
EOF

log_success "Redis configured"

# ==============================================
# 3. CREATE DIRECTORIES
# ==============================================
log_info "Creating directories..."

mkdir -p /var/lib/redis
mkdir -p /var/log/redis
mkdir -p /var/run/redis

chown -R redis:redis /var/lib/redis
chown -R redis:redis /var/log/redis
chown -R redis:redis /var/run/redis

chmod 750 /var/lib/redis
chmod 750 /var/log/redis

log_success "Directories created"

# ==============================================
# 4. CONFIGURE SYSTEMD
# ==============================================
log_info "Configuring systemd service..."

cat > /etc/systemd/system/redis.service << 'EOF'
[Unit]
Description=Redis In-Memory Data Store
After=network.target
Documentation=https://redis.io/documentation

[Service]
Type=notify
User=redis
Group=redis
ExecStart=/usr/bin/redis-server /etc/redis/redis.conf
ExecStop=/usr/bin/redis-cli shutdown
Restart=always
RestartSec=3
TimeoutStartSec=30
TimeoutStopSec=30
LimitNOFILE=65535

# Security
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/var/lib/redis /var/log/redis /var/run/redis

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload

log_success "Systemd service configured"

# ==============================================
# 5. START REDIS
# ==============================================
log_info "Starting Redis..."

systemctl enable redis
systemctl restart redis

# Wait for Redis to start
sleep 3

# Test Redis
if redis-cli -a "${REDIS_PASSWORD}" ping | grep -q "PONG"; then
    log_success "Redis started and responding"
else
    log_error "Redis failed to start"
    journalctl -u redis --no-pager -n 50
    exit 1
fi

# ==============================================
# 6. SETUP REDIS EXPORTER
# ==============================================
log_info "Setting up Redis Exporter for Prometheus..."

# Create redis_exporter user
useradd --no-create-home --shell /bin/false redis_exporter 2>/dev/null || true

# Download and install redis_exporter
REDIS_EXPORTER_VERSION="1.56.0"
wget -q "https://github.com/oliver006/redis_exporter/releases/download/v${REDIS_EXPORTER_VERSION}/redis_exporter-v${REDIS_EXPORTER_VERSION}.linux-amd64.tar.gz" -O /tmp/redis_exporter.tar.gz
tar xzf /tmp/redis_exporter.tar.gz -C /tmp
cp /tmp/redis_exporter-v${REDIS_EXPORTER_VERSION}.linux-amd64/redis_exporter /usr/local/bin/
chmod +x /usr/local/bin/redis_exporter
rm -rf /tmp/redis_exporter*

# Create systemd service for redis_exporter
cat > /etc/systemd/system/redis_exporter.service << EOF
[Unit]
Description=Redis Exporter
After=network.target redis.service

[Service]
Type=simple
User=redis_exporter
Group=redis_exporter
ExecStart=/usr/local/bin/redis_exporter --redis.addr=redis://localhost:6379 --redis.password=${REDIS_PASSWORD}
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable redis_exporter
systemctl start redis_exporter

log_success "Redis Exporter running on :9121"

# ==============================================
# 7. SAVE CREDENTIALS
# ==============================================
log_info "Saving credentials..."

mkdir -p /root/.plugspace
chmod 700 /root/.plugspace

cat >> /root/.plugspace/redis-credentials.txt << EOF
# ==============================================
# PLUGSPACE REDIS CREDENTIALS
# Generated: $(date)
# ==============================================

REDIS_PASSWORD=${REDIS_PASSWORD}

# Connection String
REDIS_URL=redis://:${REDIS_PASSWORD}@localhost:6379

# For .env file
REDIS_URL="redis://:${REDIS_PASSWORD}@localhost:6379"
EOF

chmod 600 /root/.plugspace/redis-credentials.txt

log_success "Credentials saved to /root/.plugspace/redis-credentials.txt"

# ==============================================
# 8. SETUP LOGROTATE
# ==============================================
log_info "Configuring log rotation..."

cat > /etc/logrotate.d/redis << 'EOF'
/var/log/redis/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 640 redis redis
}
EOF

log_success "Log rotation configured"

# ==============================================
# 9. VERIFY INSTALLATION
# ==============================================
log_info "Verifying installation..."

# Check Redis info
redis-cli -a "${REDIS_PASSWORD}" INFO server | head -10

echo ""

# ==============================================
# SUMMARY
# ==============================================
echo ""
echo "========================================"
echo "✅ REDIS SETUP COMPLETE"
echo "========================================"
echo ""
echo "Redis 7 has been installed and configured with:"
echo "  • Bind: 127.0.0.1:6379"
echo "  • Authentication: enabled"
echo "  • Max memory: 1GB"
echo "  • Persistence: RDB + AOF"
echo "  • Exporter: :9121"
echo ""
echo "⚠️  IMPORTANT:"
echo "  1. Credentials saved to: /root/.plugspace/redis-credentials.txt"
echo "  2. Copy the REDIS_URL to your .env file"
echo ""
echo "Connection string for .env:"
echo "REDIS_URL=\"redis://:${REDIS_PASSWORD}@localhost:6379\""
echo ""
