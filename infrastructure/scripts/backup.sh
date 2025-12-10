#!/bin/bash

# ==============================================
# PLUGSPACE.IO TITAN v1.4 - DATABASE BACKUP SCRIPT
# ==============================================

set -e

# ============ COLORS ============
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ============ CONFIGURATION ============
BACKUP_DIR="${BACKUP_DIR:-/var/backups/plugspace}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${LOG_DIR:-/var/log/plugspace}/backup.log"

# MongoDB settings
MONGO_HOST="${MONGO_HOST:-localhost}"
MONGO_PORT="${MONGO_PORT:-27017}"
MONGO_DB="${MONGO_DB:-plugspace}"
MONGO_USER="${MONGO_USER:-admin}"
MONGO_PASS="${MONGO_PASS:-}"

# Redis settings
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASS="${REDIS_PASS:-}"

# S3 settings (optional)
S3_BUCKET="${S3_BACKUP_BUCKET:-}"
AWS_REGION="${AWS_REGION:-us-east-1}"

# ============ LOGGING ============
log() {
    local level=$1
    shift
    local message=$@
    local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    echo -e "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

log_info() { log "INFO" "$@"; }
log_success() { log "SUCCESS" "$@"; }
log_warn() { log "WARN" "$@"; }
log_error() { log "ERROR" "$@"; }

# ============ PRE-FLIGHT CHECKS ============
preflight() {
    log_info "Running pre-flight checks..."
    
    # Create backup directory if not exists
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$(dirname $LOG_FILE)"
    
    # Check disk space
    DISK_FREE=$(df -BG "$BACKUP_DIR" | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ "$DISK_FREE" -lt 5 ]; then
        log_error "Insufficient disk space: ${DISK_FREE}GB available"
        exit 1
    fi
    
    log_success "Pre-flight checks passed"
}

# ============ MONGODB BACKUP ============
backup_mongodb() {
    log_info "Starting MongoDB backup..."
    
    local mongo_backup_file="$BACKUP_DIR/mongodb_${TIMESTAMP}.gz"
    local mongo_auth=""
    
    if [ -n "$MONGO_PASS" ]; then
        mongo_auth="-u $MONGO_USER -p $MONGO_PASS --authenticationDatabase admin"
    fi
    
    # Check if running in Docker
    if docker ps | grep -q plugspace-mongo-primary 2>/dev/null; then
        log_info "Backing up MongoDB from Docker container..."
        
        docker exec plugspace-mongo-primary mongodump \
            --host="$MONGO_HOST" \
            --port="$MONGO_PORT" \
            --db="$MONGO_DB" \
            $mongo_auth \
            --archive="/tmp/mongodb_backup.gz" \
            --gzip
        
        docker cp "plugspace-mongo-primary:/tmp/mongodb_backup.gz" "$mongo_backup_file"
        docker exec plugspace-mongo-primary rm -f /tmp/mongodb_backup.gz
    else
        log_info "Backing up MongoDB directly..."
        
        mongodump \
            --host="$MONGO_HOST" \
            --port="$MONGO_PORT" \
            --db="$MONGO_DB" \
            $mongo_auth \
            --archive="$mongo_backup_file" \
            --gzip
    fi
    
    # Verify backup
    if [ -f "$mongo_backup_file" ]; then
        local size=$(du -h "$mongo_backup_file" | cut -f1)
        log_success "MongoDB backup completed: $mongo_backup_file ($size)"
        echo "$mongo_backup_file"
    else
        log_error "MongoDB backup failed"
        return 1
    fi
}

# ============ REDIS BACKUP ============
backup_redis() {
    log_info "Starting Redis backup..."
    
    local redis_backup_file="$BACKUP_DIR/redis_${TIMESTAMP}.rdb"
    local redis_auth=""
    
    if [ -n "$REDIS_PASS" ]; then
        redis_auth="-a $REDIS_PASS"
    fi
    
    # Trigger RDB save
    if docker ps | grep -q plugspace-redis-master 2>/dev/null; then
        log_info "Backing up Redis from Docker container..."
        
        docker exec plugspace-redis-master redis-cli $redis_auth BGSAVE
        sleep 5  # Wait for save to complete
        
        docker cp "plugspace-redis-master:/data/dump.rdb" "$redis_backup_file"
    else
        log_info "Backing up Redis directly..."
        
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" $redis_auth BGSAVE
        sleep 5
        
        cp /var/lib/redis/dump.rdb "$redis_backup_file"
    fi
    
    # Compress the backup
    if [ -f "$redis_backup_file" ]; then
        gzip "$redis_backup_file"
        local size=$(du -h "${redis_backup_file}.gz" | cut -f1)
        log_success "Redis backup completed: ${redis_backup_file}.gz ($size)"
        echo "${redis_backup_file}.gz"
    else
        log_warn "Redis backup skipped or failed"
    fi
}

# ============ APPLICATION BACKUP ============
backup_application() {
    log_info "Starting application backup..."
    
    local app_backup_file="$BACKUP_DIR/app_${TIMESTAMP}.tar.gz"
    local app_dir="${APP_DIR:-/var/www/plugspace}"
    
    if [ -d "$app_dir" ]; then
        tar -czf "$app_backup_file" \
            --exclude='node_modules' \
            --exclude='.git' \
            --exclude='*.log' \
            --exclude='.next' \
            --exclude='dist' \
            -C "$(dirname $app_dir)" \
            "$(basename $app_dir)"
        
        local size=$(du -h "$app_backup_file" | cut -f1)
        log_success "Application backup completed: $app_backup_file ($size)"
        echo "$app_backup_file"
    else
        log_warn "Application directory not found: $app_dir"
    fi
}

# ============ UPLOAD TO S3 ============
upload_to_s3() {
    local file=$1
    
    if [ -z "$S3_BUCKET" ]; then
        log_info "S3 upload skipped (no bucket configured)"
        return 0
    fi
    
    if ! command -v aws &> /dev/null; then
        log_warn "AWS CLI not installed, skipping S3 upload"
        return 0
    fi
    
    log_info "Uploading $file to S3..."
    
    local s3_path="s3://${S3_BUCKET}/$(basename $file)"
    
    aws s3 cp "$file" "$s3_path" \
        --region "$AWS_REGION" \
        --storage-class STANDARD_IA
    
    log_success "Uploaded to S3: $s3_path"
}

# ============ CLEANUP OLD BACKUPS ============
cleanup_old_backups() {
    log_info "Cleaning up backups older than $RETENTION_DAYS days..."
    
    # Local cleanup
    local deleted=$(find "$BACKUP_DIR" -name "*.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
    deleted=$((deleted + $(find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)))
    
    log_info "Deleted $deleted old local backups"
    
    # S3 cleanup (using lifecycle rules is recommended)
    if [ -n "$S3_BUCKET" ] && command -v aws &> /dev/null; then
        log_info "S3 cleanup should be handled by S3 Lifecycle Rules"
    fi
}

# ============ SEND NOTIFICATION ============
send_notification() {
    local status=$1
    local message=$2
    
    # Slack notification (if configured)
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -s -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-type: application/json' \
            -d "{\"text\":\"Backup $status: $message\"}" > /dev/null
    fi
    
    # Email notification (if configured)
    if [ -n "$ALERT_EMAIL" ] && command -v mail &> /dev/null; then
        echo "$message" | mail -s "Plugspace Backup $status" "$ALERT_EMAIL"
    fi
}

# ============ MAIN ============
main() {
    log_info "=========================================="
    log_info "PLUGSPACE.IO BACKUP - Starting"
    log_info "=========================================="
    
    local start_time=$(date +%s)
    local backup_files=()
    local errors=0
    
    # Run pre-flight checks
    preflight
    
    # Backup MongoDB
    if mongo_file=$(backup_mongodb); then
        backup_files+=("$mongo_file")
        upload_to_s3 "$mongo_file"
    else
        ((errors++))
    fi
    
    # Backup Redis
    if redis_file=$(backup_redis); then
        backup_files+=("$redis_file")
        upload_to_s3 "$redis_file"
    fi
    
    # Backup Application (optional)
    if [ "${BACKUP_APP:-false}" = "true" ]; then
        if app_file=$(backup_application); then
            backup_files+=("$app_file")
            upload_to_s3 "$app_file"
        fi
    fi
    
    # Cleanup old backups
    cleanup_old_backups
    
    # Calculate duration
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Summary
    log_info "=========================================="
    log_info "BACKUP SUMMARY"
    log_info "=========================================="
    log_info "Duration: ${duration}s"
    log_info "Files created: ${#backup_files[@]}"
    for file in "${backup_files[@]}"; do
        log_info "  - $file"
    done
    
    if [ $errors -gt 0 ]; then
        log_error "Backup completed with $errors errors"
        send_notification "FAILED" "Backup completed with $errors errors"
        exit 1
    else
        log_success "Backup completed successfully"
        send_notification "SUCCESS" "Backup completed in ${duration}s"
    fi
}

# Run main function
main "$@"
