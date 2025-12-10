#!/bin/bash
# ==============================================
# PLUGSPACE.IO TITAN v1.4 - BACKUP SCRIPT
# ==============================================
# Automated backup of database, files, and config
# ==============================================

set -euo pipefail

# Configuration
BACKUP_ROOT="/home/plugspace/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="${BACKUP_ROOT}/${TIMESTAMP}"
RETENTION_DAYS=${RETENTION_DAYS:-30}
LOG_FILE="/var/log/plugspace/backup.log"

# Remote storage (configure these)
REMOTE_ENABLED=${REMOTE_ENABLED:-false}
REMOTE_BUCKET=${REMOTE_BUCKET:-"plugspace-backups"}
REMOTE_PATH=${REMOTE_PATH:-"backups"}

# Notification webhook (optional)
WEBHOOK_URL=${WEBHOOK_URL:-""}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    echo -e "${timestamp} [${level}] ${message}" | tee -a ${LOG_FILE}
}

log_info() { log "INFO" "$@"; }
log_success() { log "SUCCESS" "$@"; }
log_warning() { log "WARNING" "$@"; }
log_error() { log "ERROR" "$@"; }

send_notification() {
    local status=$1
    local message=$2
    
    if [ -n "${WEBHOOK_URL}" ]; then
        curl -s -X POST "${WEBHOOK_URL}" \
            -H "Content-Type: application/json" \
            -d "{\"type\":\"backup\",\"status\":\"${status}\",\"message\":\"${message}\",\"timestamp\":\"${TIMESTAMP}\"}" || true
    fi
}

# Create backup directory
mkdir -p ${BACKUP_DIR}
mkdir -p $(dirname ${LOG_FILE})

log_info "========================================"
log_info "Starting backup: ${TIMESTAMP}"
log_info "========================================"

# ===========================================
# 1. MONGODB BACKUP
# ===========================================
log_info "Backing up MongoDB..."

# Load credentials
source /root/.plugspace/mongodb-credentials.txt 2>/dev/null || {
    log_error "MongoDB credentials not found"
    exit 1
}

MONGO_BACKUP_FILE="${BACKUP_DIR}/mongodb_plugspace_${TIMESTAMP}.archive.gz"

mongodump \
    --uri="${MONGODB_APP_URI}" \
    --gzip \
    --archive="${MONGO_BACKUP_FILE}" \
    --oplog 2>&1 | tee -a ${LOG_FILE}

if [ $? -eq 0 ]; then
    MONGO_SIZE=$(du -h "${MONGO_BACKUP_FILE}" | cut -f1)
    log_success "MongoDB backup complete: ${MONGO_SIZE}"
else
    log_error "MongoDB backup failed"
    send_notification "error" "MongoDB backup failed"
    exit 1
fi

# ===========================================
# 2. REDIS BACKUP
# ===========================================
log_info "Backing up Redis..."

source /root/.plugspace/redis-credentials.txt 2>/dev/null || {
    log_warning "Redis credentials not found, skipping Redis backup"
}

REDIS_BACKUP_FILE="${BACKUP_DIR}/redis_${TIMESTAMP}.rdb"

# Trigger RDB save
redis-cli -a "${REDIS_PASSWORD}" BGSAVE 2>/dev/null || true
sleep 5

# Copy RDB file
if [ -f /var/lib/redis/dump.rdb ]; then
    cp /var/lib/redis/dump.rdb "${REDIS_BACKUP_FILE}"
    REDIS_SIZE=$(du -h "${REDIS_BACKUP_FILE}" | cut -f1)
    log_success "Redis backup complete: ${REDIS_SIZE}"
else
    log_warning "Redis RDB file not found"
fi

# ===========================================
# 3. APPLICATION FILES BACKUP
# ===========================================
log_info "Backing up application files..."

APP_BACKUP_FILE="${BACKUP_DIR}/app_files_${TIMESTAMP}.tar.gz"

tar -czf "${APP_BACKUP_FILE}" \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='dist' \
    --exclude='.git' \
    -C /home/plugspace \
    plugspace 2>&1 | tee -a ${LOG_FILE}

if [ $? -eq 0 ]; then
    APP_SIZE=$(du -h "${APP_BACKUP_FILE}" | cut -f1)
    log_success "Application backup complete: ${APP_SIZE}"
else
    log_error "Application backup failed"
fi

# ===========================================
# 4. CONFIGURATION BACKUP
# ===========================================
log_info "Backing up configuration files..."

CONFIG_BACKUP_FILE="${BACKUP_DIR}/config_${TIMESTAMP}.tar.gz"

tar -czf "${CONFIG_BACKUP_FILE}" \
    /etc/nginx/nginx.conf \
    /etc/nginx/sites-available/ \
    /etc/mongod.conf \
    /etc/redis/redis.conf \
    /home/plugspace/plugspace/ecosystem.config.js \
    /home/plugspace/plugspace/.env 2>&1 | tee -a ${LOG_FILE}

CONFIG_SIZE=$(du -h "${CONFIG_BACKUP_FILE}" | cut -f1)
log_success "Configuration backup complete: ${CONFIG_SIZE}"

# ===========================================
# 5. SSL CERTIFICATES BACKUP
# ===========================================
log_info "Backing up SSL certificates..."

SSL_BACKUP_FILE="${BACKUP_DIR}/ssl_${TIMESTAMP}.tar.gz"

tar -czf "${SSL_BACKUP_FILE}" \
    /etc/letsencrypt 2>&1 | tee -a ${LOG_FILE}

SSL_SIZE=$(du -h "${SSL_BACKUP_FILE}" | cut -f1)
log_success "SSL certificates backup complete: ${SSL_SIZE}"

# ===========================================
# 6. CREATE BACKUP MANIFEST
# ===========================================
log_info "Creating backup manifest..."

cat > "${BACKUP_DIR}/manifest.json" << EOF
{
  "timestamp": "${TIMESTAMP}",
  "date": "$(date -Iseconds)",
  "version": "1.4.0",
  "files": {
    "mongodb": "$(basename ${MONGO_BACKUP_FILE})",
    "redis": "$(basename ${REDIS_BACKUP_FILE})",
    "application": "$(basename ${APP_BACKUP_FILE})",
    "config": "$(basename ${CONFIG_BACKUP_FILE})",
    "ssl": "$(basename ${SSL_BACKUP_FILE})"
  },
  "sizes": {
    "mongodb": "${MONGO_SIZE}",
    "redis": "${REDIS_SIZE:-N/A}",
    "application": "${APP_SIZE}",
    "config": "${CONFIG_SIZE}",
    "ssl": "${SSL_SIZE}"
  },
  "checksums": {
    "mongodb": "$(sha256sum ${MONGO_BACKUP_FILE} | cut -d' ' -f1)",
    "application": "$(sha256sum ${APP_BACKUP_FILE} | cut -d' ' -f1)"
  }
}
EOF

log_success "Manifest created"

# ===========================================
# 7. ENCRYPT BACKUP (Optional)
# ===========================================
if [ -n "${ENCRYPTION_KEY:-}" ]; then
    log_info "Encrypting backup..."
    
    ENCRYPTED_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.tar.gz.enc"
    tar -czf - -C ${BACKUP_DIR} . | \
        openssl enc -aes-256-cbc -salt -pbkdf2 -out "${ENCRYPTED_FILE}" -k "${ENCRYPTION_KEY}"
    
    log_success "Backup encrypted"
fi

# ===========================================
# 8. UPLOAD TO REMOTE STORAGE
# ===========================================
if [ "${REMOTE_ENABLED}" = "true" ]; then
    log_info "Uploading to remote storage..."
    
    # Using rclone (configure with: rclone config)
    if command -v rclone &> /dev/null; then
        rclone copy "${BACKUP_DIR}" "remote:${REMOTE_BUCKET}/${REMOTE_PATH}/${TIMESTAMP}/" \
            --progress 2>&1 | tee -a ${LOG_FILE}
        
        if [ $? -eq 0 ]; then
            log_success "Remote upload complete"
        else
            log_error "Remote upload failed"
        fi
    else
        log_warning "rclone not installed, skipping remote upload"
    fi
fi

# ===========================================
# 9. CLEANUP OLD BACKUPS
# ===========================================
log_info "Cleaning up old backups (retention: ${RETENTION_DAYS} days)..."

find ${BACKUP_ROOT} -maxdepth 1 -type d -mtime +${RETENTION_DAYS} -exec rm -rf {} \;
DELETED_COUNT=$(find ${BACKUP_ROOT} -maxdepth 1 -type d -mtime +${RETENTION_DAYS} 2>/dev/null | wc -l)

log_success "Cleanup complete (removed ${DELETED_COUNT} old backups)"

# ===========================================
# 10. CALCULATE TOTAL SIZE
# ===========================================
TOTAL_SIZE=$(du -sh ${BACKUP_DIR} | cut -f1)

# ===========================================
# SUMMARY
# ===========================================
log_info "========================================"
log_info "Backup Complete!"
log_info "========================================"
log_info "Location: ${BACKUP_DIR}"
log_info "Total Size: ${TOTAL_SIZE}"
log_info "Files:"
log_info "  - MongoDB: ${MONGO_SIZE}"
log_info "  - Redis: ${REDIS_SIZE:-N/A}"
log_info "  - Application: ${APP_SIZE}"
log_info "  - Config: ${CONFIG_SIZE}"
log_info "  - SSL: ${SSL_SIZE}"
log_info "========================================"

# Send success notification
send_notification "success" "Backup completed successfully. Size: ${TOTAL_SIZE}"

exit 0
