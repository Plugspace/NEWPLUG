#!/bin/bash
# ==============================================
# PLUGSPACE.IO TITAN v1.4 - MONGODB SETUP
# ==============================================
# Production MongoDB 7 configuration with
# replica set, authentication, and optimization
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

# Generate secure passwords
MONGO_ADMIN_PASSWORD=$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)
MONGO_APP_PASSWORD=$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)

echo "========================================"
echo "🍃 MONGODB PRODUCTION SETUP"
echo "========================================"
echo ""

# ==============================================
# 1. INSTALL MONGODB 7
# ==============================================
log_info "Installing MongoDB 7..."

# Import MongoDB public GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
   tee /etc/apt/sources.list.d/mongodb-org-7.0.list

apt-get update
apt-get install -y mongodb-org

# Prevent automatic upgrades
echo "mongodb-org hold" | dpkg --set-selections
echo "mongodb-org-database hold" | dpkg --set-selections
echo "mongodb-org-server hold" | dpkg --set-selections
echo "mongodb-mongosh hold" | dpkg --set-selections
echo "mongodb-org-mongos hold" | dpkg --set-selections
echo "mongodb-org-tools hold" | dpkg --set-selections

log_success "MongoDB 7 installed"

# ==============================================
# 2. CONFIGURE MONGODB
# ==============================================
log_info "Configuring MongoDB..."

# Backup original config
cp /etc/mongod.conf /etc/mongod.conf.backup

# Create production configuration
cat > /etc/mongod.conf << 'EOF'
# ==============================================
# PLUGSPACE MONGODB PRODUCTION CONFIGURATION
# ==============================================

# Storage Settings
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true
    commitIntervalMs: 100
  directoryPerDB: true
  wiredTiger:
    engineConfig:
      cacheSizeGB: 2
      journalCompressor: snappy
      directoryForIndexes: true
    collectionConfig:
      blockCompressor: snappy
    indexConfig:
      prefixCompression: true

# Logging
systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log
  logRotate: reopen
  timeStampFormat: iso8601-local

# Network
net:
  port: 27017
  bindIp: 127.0.0.1
  maxIncomingConnections: 65536
  wireObjectCheck: true
  ipv6: false
  unixDomainSocket:
    enabled: true
    pathPrefix: /tmp

# Process Management
processManagement:
  timeZoneInfo: /usr/share/zoneinfo
  fork: false

# Security
security:
  authorization: enabled
  javascriptEnabled: false

# Replication
replication:
  replSetName: "plugspace-rs"
  oplogSizeMB: 2048

# Operation Profiling
operationProfiling:
  mode: slowOp
  slowOpThresholdMs: 100
  slowOpSampleRate: 1

# Set Parameter
setParameter:
  authenticationMechanisms: SCRAM-SHA-256
  enableLocalhostAuthBypass: false
EOF

log_success "MongoDB configured"

# ==============================================
# 3. CREATE DATA DIRECTORIES
# ==============================================
log_info "Creating data directories..."

mkdir -p /var/lib/mongodb
mkdir -p /var/log/mongodb
chown -R mongodb:mongodb /var/lib/mongodb
chown -R mongodb:mongodb /var/log/mongodb
chmod 755 /var/lib/mongodb
chmod 755 /var/log/mongodb

log_success "Data directories created"

# ==============================================
# 4. START MONGODB (without auth first)
# ==============================================
log_info "Starting MongoDB..."

# Temporarily disable auth for initial setup
sed -i 's/authorization: enabled/authorization: disabled/' /etc/mongod.conf

systemctl start mongod
systemctl enable mongod

# Wait for MongoDB to start
sleep 5

# Check if MongoDB is running
if ! systemctl is-active --quiet mongod; then
    log_error "MongoDB failed to start"
    journalctl -u mongod --no-pager -n 50
    exit 1
fi

log_success "MongoDB started"

# ==============================================
# 5. INITIALIZE REPLICA SET
# ==============================================
log_info "Initializing replica set..."

mongosh --quiet --eval '
rs.initiate({
  _id: "plugspace-rs",
  members: [
    { _id: 0, host: "localhost:27017", priority: 1 }
  ]
})
'

# Wait for replica set to initialize
sleep 5

log_success "Replica set initialized"

# ==============================================
# 6. CREATE ADMIN USER
# ==============================================
log_info "Creating admin user..."

mongosh admin --quiet --eval "
db.createUser({
  user: 'admin',
  pwd: '${MONGO_ADMIN_PASSWORD}',
  roles: [
    { role: 'root', db: 'admin' },
    { role: 'userAdminAnyDatabase', db: 'admin' },
    { role: 'dbAdminAnyDatabase', db: 'admin' },
    { role: 'readWriteAnyDatabase', db: 'admin' },
    { role: 'clusterAdmin', db: 'admin' }
  ]
})
"

log_success "Admin user created"

# ==============================================
# 7. CREATE APPLICATION DATABASE AND USER
# ==============================================
log_info "Creating application database and user..."

mongosh admin --quiet --eval "
// Switch to plugspace database
db = db.getSiblingDB('plugspace');

// Create application user
db.createUser({
  user: 'plugspace_app',
  pwd: '${MONGO_APP_PASSWORD}',
  roles: [
    { role: 'readWrite', db: 'plugspace' },
    { role: 'dbAdmin', db: 'plugspace' }
  ]
});

// Create indexes for common queries
db.createCollection('users');
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ firebaseUid: 1 }, { unique: true, sparse: true });

db.createCollection('organizations');
db.organizations.createIndex({ slug: 1 }, { unique: true });

db.createCollection('projects');
db.projects.createIndex({ organizationId: 1, createdAt: -1 });
db.projects.createIndex({ userId: 1, createdAt: -1 });

db.createCollection('sessions');
db.sessions.createIndex({ userId: 1 });
db.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
"

log_success "Application database and user created"

# ==============================================
# 8. ENABLE AUTHENTICATION
# ==============================================
log_info "Enabling authentication..."

sed -i 's/authorization: disabled/authorization: enabled/' /etc/mongod.conf
systemctl restart mongod

# Wait for restart
sleep 5

# Test authentication
mongosh "mongodb://admin:${MONGO_ADMIN_PASSWORD}@localhost:27017/admin?authSource=admin&replicaSet=plugspace-rs" --quiet --eval "db.adminCommand('ping')" > /dev/null

if [ $? -eq 0 ]; then
    log_success "Authentication enabled and tested"
else
    log_error "Authentication test failed"
    exit 1
fi

# ==============================================
# 9. CREATE MONGODB EXPORTER USER
# ==============================================
log_info "Creating monitoring user..."

mongosh "mongodb://admin:${MONGO_ADMIN_PASSWORD}@localhost:27017/admin?authSource=admin&replicaSet=plugspace-rs" --quiet --eval "
db.createUser({
  user: 'mongodb_exporter',
  pwd: '$(openssl rand -base64 16 | tr -d '/+=')',
  roles: [
    { role: 'clusterMonitor', db: 'admin' },
    { role: 'read', db: 'local' }
  ]
})
"

log_success "Monitoring user created"

# ==============================================
# 10. SAVE CREDENTIALS
# ==============================================
log_info "Saving credentials..."

mkdir -p /root/.plugspace
chmod 700 /root/.plugspace

cat > /root/.plugspace/mongodb-credentials.txt << EOF
# ==============================================
# PLUGSPACE MONGODB CREDENTIALS
# Generated: $(date)
# ==============================================
# ⚠️  KEEP THIS FILE SECURE - DELETE AFTER NOTING PASSWORDS
# ==============================================

MONGODB_ADMIN_USER=admin
MONGODB_ADMIN_PASSWORD=${MONGO_ADMIN_PASSWORD}

MONGODB_APP_USER=plugspace_app
MONGODB_APP_PASSWORD=${MONGO_APP_PASSWORD}

# Connection Strings
MONGODB_ADMIN_URI=mongodb://admin:${MONGO_ADMIN_PASSWORD}@localhost:27017/admin?authSource=admin&replicaSet=plugspace-rs
MONGODB_APP_URI=mongodb://plugspace_app:${MONGO_APP_PASSWORD}@localhost:27017/plugspace?authSource=plugspace&replicaSet=plugspace-rs

# For .env file
DATABASE_URL="mongodb://plugspace_app:${MONGO_APP_PASSWORD}@localhost:27017/plugspace?authSource=plugspace&replicaSet=plugspace-rs"
EOF

chmod 600 /root/.plugspace/mongodb-credentials.txt

log_success "Credentials saved to /root/.plugspace/mongodb-credentials.txt"

# ==============================================
# 11. SETUP LOGROTATE
# ==============================================
log_info "Configuring log rotation..."

cat > /etc/logrotate.d/mongodb << 'EOF'
/var/log/mongodb/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 640 mongodb mongodb
    sharedscripts
    postrotate
        /bin/kill -SIGUSR1 `cat /var/lib/mongodb/mongod.lock 2>/dev/null` 2>/dev/null || true
    endscript
}
EOF

log_success "Log rotation configured"

# ==============================================
# SUMMARY
# ==============================================
echo ""
echo "========================================"
echo "✅ MONGODB SETUP COMPLETE"
echo "========================================"
echo ""
echo "MongoDB 7 has been installed and configured with:"
echo "  • Replica set: plugspace-rs"
echo "  • Authentication: enabled"
echo "  • Database: plugspace"
echo "  • Application user: plugspace_app"
echo ""
echo "⚠️  IMPORTANT:"
echo "  1. Credentials saved to: /root/.plugspace/mongodb-credentials.txt"
echo "  2. Copy the DATABASE_URL to your .env file"
echo "  3. Delete the credentials file after noting passwords"
echo ""
echo "Connection string for .env:"
echo "DATABASE_URL=\"mongodb://plugspace_app:${MONGO_APP_PASSWORD}@localhost:27017/plugspace?authSource=plugspace&replicaSet=plugspace-rs\""
echo ""
