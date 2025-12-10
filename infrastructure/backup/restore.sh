#!/bin/bash
# ==============================================
# PLUGSPACE.IO TITAN v1.4 - RESTORE SCRIPT
# ==============================================
# Disaster recovery restore procedure
# ==============================================

set -euo pipefail

# Configuration
BACKUP_ROOT="/home/plugspace/backups"
APP_DIR="/home/plugspace/plugspace"
LOG_FILE="/var/log/plugspace/restore.log"

# Colors
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

# Usage
usage() {
    echo "Usage: $0 <backup_timestamp> [options]"
    echo ""
    echo "Options:"
    echo "  --mongodb    Restore MongoDB only"
    echo "  --redis      Restore Redis only"
    echo "  --app        Restore application files only"
    echo "  --config     Restore configuration only"
    echo "  --ssl        Restore SSL certificates only"
    echo "  --all        Restore everything (default)"
    echo "  --dry-run    Show what would be restored without making changes"
    echo ""
    echo "Example:"
    echo "  $0 20240101_120000 --all"
    echo "  $0 20240101_120000 --mongodb --redis"
    exit 1
}

# Check arguments
if [ $# -lt 1 ]; then
    usage
fi

BACKUP_TIMESTAMP=$1
BACKUP_DIR="${BACKUP_ROOT}/${BACKUP_TIMESTAMP}"
shift

# Parse options
RESTORE_MONGODB=false
RESTORE_REDIS=false
RESTORE_APP=false
RESTORE_CONFIG=false
RESTORE_SSL=false
DRY_RUN=false

if [ $# -eq 0 ]; then
    # Default: restore all
    RESTORE_MONGODB=true
    RESTORE_REDIS=true
    RESTORE_APP=true
    RESTORE_CONFIG=true
    RESTORE_SSL=true
fi

while [ $# -gt 0 ]; do
    case "$1" in
        --mongodb) RESTORE_MONGODB=true ;;
        --redis) RESTORE_REDIS=true ;;
        --app) RESTORE_APP=true ;;
        --config) RESTORE_CONFIG=true ;;
        --ssl) RESTORE_SSL=true ;;
        --all)
            RESTORE_MONGODB=true
            RESTORE_REDIS=true
            RESTORE_APP=true
            RESTORE_CONFIG=true
            RESTORE_SSL=true
            ;;
        --dry-run) DRY_RUN=true ;;
        *) echo "Unknown option: $1"; usage ;;
    esac
    shift
done

# Verify backup exists
if [ ! -d "${BACKUP_DIR}" ]; then
    log_error "Backup directory not found: ${BACKUP_DIR}"
    echo ""
    echo "Available backups:"
    ls -1 ${BACKUP_ROOT}
    exit 1
fi

# Check manifest
if [ ! -f "${BACKUP_DIR}/manifest.json" ]; then
    log_error "Backup manifest not found"
    exit 1
fi

mkdir -p $(dirname ${LOG_FILE})

log_info "========================================"
log_info "Starting restore from: ${BACKUP_TIMESTAMP}"
log_info "========================================"

if [ "${DRY_RUN}" = true ]; then
    log_warning "DRY RUN MODE - No changes will be made"
fi

# Show what will be restored
log_info "Restore plan:"
log_info "  MongoDB: ${RESTORE_MONGODB}"
log_info "  Redis: ${RESTORE_REDIS}"
log_info "  Application: ${RESTORE_APP}"
log_info "  Config: ${RESTORE_CONFIG}"
log_info "  SSL: ${RESTORE_SSL}"

echo ""
read -p "Continue with restore? (yes/no): " CONFIRM
if [ "${CONFIRM}" != "yes" ]; then
    log_info "Restore cancelled by user"
    exit 0
fi

# ===========================================
# STOP SERVICES
# ===========================================
if [ "${DRY_RUN}" = false ]; then
    log_info "Stopping services..."
    pm2 stop all 2>/dev/null || true
    
    if [ "${RESTORE_MONGODB}" = true ]; then
        systemctl stop mongod 2>/dev/null || true
    fi
    
    if [ "${RESTORE_REDIS}" = true ]; then
        systemctl stop redis 2>/dev/null || true
    fi
fi

# ===========================================
# 1. RESTORE MONGODB
# ===========================================
if [ "${RESTORE_MONGODB}" = true ]; then
    log_info "Restoring MongoDB..."
    
    MONGO_BACKUP=$(ls ${BACKUP_DIR}/mongodb_*.archive.gz 2>/dev/null | head -1)
    
    if [ -z "${MONGO_BACKUP}" ]; then
        log_error "MongoDB backup file not found"
    else
        if [ "${DRY_RUN}" = false ]; then
            # Load credentials
            source /root/.plugspace/mongodb-credentials.txt
            
            # Ensure MongoDB is running for restore
            systemctl start mongod
            sleep 5
            
            # Restore
            mongorestore \
                --uri="${MONGODB_APP_URI}" \
                --gzip \
                --archive="${MONGO_BACKUP}" \
                --drop \
                --oplogReplay 2>&1 | tee -a ${LOG_FILE}
            
            log_success "MongoDB restored"
        else
            log_info "[DRY RUN] Would restore: ${MONGO_BACKUP}"
        fi
    fi
fi

# ===========================================
# 2. RESTORE REDIS
# ===========================================
if [ "${RESTORE_REDIS}" = true ]; then
    log_info "Restoring Redis..."
    
    REDIS_BACKUP=$(ls ${BACKUP_DIR}/redis_*.rdb 2>/dev/null | head -1)
    
    if [ -z "${REDIS_BACKUP}" ]; then
        log_warning "Redis backup file not found"
    else
        if [ "${DRY_RUN}" = false ]; then
            # Copy RDB file
            cp "${REDIS_BACKUP}" /var/lib/redis/dump.rdb
            chown redis:redis /var/lib/redis/dump.rdb
            chmod 660 /var/lib/redis/dump.rdb
            
            # Start Redis (will load from RDB)
            systemctl start redis
            sleep 3
            
            log_success "Redis restored"
        else
            log_info "[DRY RUN] Would restore: ${REDIS_BACKUP}"
        fi
    fi
fi

# ===========================================
# 3. RESTORE APPLICATION FILES
# ===========================================
if [ "${RESTORE_APP}" = true ]; then
    log_info "Restoring application files..."
    
    APP_BACKUP=$(ls ${BACKUP_DIR}/app_files_*.tar.gz 2>/dev/null | head -1)
    
    if [ -z "${APP_BACKUP}" ]; then
        log_error "Application backup file not found"
    else
        if [ "${DRY_RUN}" = false ]; then
            # Create backup of current app
            mv ${APP_DIR} ${APP_DIR}.pre-restore.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
            
            # Extract backup
            tar -xzf "${APP_BACKUP}" -C /home/plugspace
            
            # Reinstall dependencies
            cd ${APP_DIR}
            npm ci --production=false
            npm run build
            
            log_success "Application files restored"
        else
            log_info "[DRY RUN] Would restore: ${APP_BACKUP}"
        fi
    fi
fi

# ===========================================
# 4. RESTORE CONFIGURATION
# ===========================================
if [ "${RESTORE_CONFIG}" = true ]; then
    log_info "Restoring configuration files..."
    
    CONFIG_BACKUP=$(ls ${BACKUP_DIR}/config_*.tar.gz 2>/dev/null | head -1)
    
    if [ -z "${CONFIG_BACKUP}" ]; then
        log_warning "Configuration backup file not found"
    else
        if [ "${DRY_RUN}" = false ]; then
            # Extract to temporary directory first
            TEMP_DIR=$(mktemp -d)
            tar -xzf "${CONFIG_BACKUP}" -C ${TEMP_DIR}
            
            # Restore individual files
            cp -f ${TEMP_DIR}/etc/nginx/nginx.conf /etc/nginx/ 2>/dev/null || true
            cp -rf ${TEMP_DIR}/etc/nginx/sites-available/* /etc/nginx/sites-available/ 2>/dev/null || true
            cp -f ${TEMP_DIR}/etc/mongod.conf /etc/ 2>/dev/null || true
            cp -f ${TEMP_DIR}/etc/redis/redis.conf /etc/redis/ 2>/dev/null || true
            
            # Restore app-specific config
            cp -f ${TEMP_DIR}/home/plugspace/plugspace/ecosystem.config.js ${APP_DIR}/ 2>/dev/null || true
            cp -f ${TEMP_DIR}/home/plugspace/plugspace/.env ${APP_DIR}/ 2>/dev/null || true
            
            rm -rf ${TEMP_DIR}
            
            # Test Nginx config
            nginx -t
            
            log_success "Configuration files restored"
        else
            log_info "[DRY RUN] Would restore: ${CONFIG_BACKUP}"
        fi
    fi
fi

# ===========================================
# 5. RESTORE SSL CERTIFICATES
# ===========================================
if [ "${RESTORE_SSL}" = true ]; then
    log_info "Restoring SSL certificates..."
    
    SSL_BACKUP=$(ls ${BACKUP_DIR}/ssl_*.tar.gz 2>/dev/null | head -1)
    
    if [ -z "${SSL_BACKUP}" ]; then
        log_warning "SSL backup file not found"
    else
        if [ "${DRY_RUN}" = false ]; then
            # Backup current certificates
            mv /etc/letsencrypt /etc/letsencrypt.pre-restore.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
            
            # Extract certificates
            tar -xzf "${SSL_BACKUP}" -C /
            
            log_success "SSL certificates restored"
        else
            log_info "[DRY RUN] Would restore: ${SSL_BACKUP}"
        fi
    fi
fi

# ===========================================
# RESTART SERVICES
# ===========================================
if [ "${DRY_RUN}" = false ]; then
    log_info "Restarting services..."
    
    # Start database services
    systemctl start mongod 2>/dev/null || true
    systemctl start redis 2>/dev/null || true
    
    # Wait for databases
    sleep 5
    
    # Reload Nginx
    systemctl reload nginx 2>/dev/null || systemctl restart nginx
    
    # Start application
    cd ${APP_DIR}
    pm2 start ecosystem.config.js --env production
    pm2 save
    
    log_success "Services restarted"
fi

# ===========================================
# VERIFY RESTORE
# ===========================================
if [ "${DRY_RUN}" = false ]; then
    log_info "Verifying restore..."
    
    # Check services
    SERVICES_OK=true
    
    if ! systemctl is-active --quiet mongod; then
        log_error "MongoDB is not running"
        SERVICES_OK=false
    fi
    
    if ! systemctl is-active --quiet redis; then
        log_error "Redis is not running"
        SERVICES_OK=false
    fi
    
    if ! systemctl is-active --quiet nginx; then
        log_error "Nginx is not running"
        SERVICES_OK=false
    fi
    
    # Check PM2
    if ! pm2 list | grep -q "online"; then
        log_error "PM2 processes not running"
        SERVICES_OK=false
    fi
    
    if [ "${SERVICES_OK}" = true ]; then
        log_success "All services verified"
    else
        log_error "Some services failed to start"
    fi
fi

# ===========================================
# SUMMARY
# ===========================================
log_info "========================================"
log_info "Restore Complete!"
log_info "========================================"
log_info "Restored from: ${BACKUP_TIMESTAMP}"
log_info "Components restored:"
log_info "  - MongoDB: ${RESTORE_MONGODB}"
log_info "  - Redis: ${RESTORE_REDIS}"
log_info "  - Application: ${RESTORE_APP}"
log_info "  - Config: ${RESTORE_CONFIG}"
log_info "  - SSL: ${RESTORE_SSL}"
log_info "========================================"

if [ "${DRY_RUN}" = true ]; then
    log_warning "This was a DRY RUN - no changes were made"
fi

exit 0
