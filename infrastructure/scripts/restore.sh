#!/bin/bash

# ==============================================
# PLUGSPACE.IO TITAN v1.4 - DATABASE RESTORE SCRIPT
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
LOG_FILE="${LOG_DIR:-/var/log/plugspace}/restore.log"

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

# S3 settings
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

# ============ LIST BACKUPS ============
list_backups() {
    log_info "Available local backups:"
    echo ""
    echo "MongoDB backups:"
    ls -lh "$BACKUP_DIR"/mongodb_*.gz 2>/dev/null | awk '{print "  " $NF " (" $5 ")"}' || echo "  No MongoDB backups found"
    echo ""
    echo "Redis backups:"
    ls -lh "$BACKUP_DIR"/redis_*.gz 2>/dev/null | awk '{print "  " $NF " (" $5 ")"}' || echo "  No Redis backups found"
    echo ""
    echo "Application backups:"
    ls -lh "$BACKUP_DIR"/app_*.tar.gz 2>/dev/null | awk '{print "  " $NF " (" $5 ")"}' || echo "  No application backups found"
    echo ""
}

list_s3_backups() {
    if [ -z "$S3_BUCKET" ]; then
        log_warn "No S3 bucket configured"
        return
    fi
    
    if ! command -v aws &> /dev/null; then
        log_warn "AWS CLI not installed"
        return
    fi
    
    log_info "Available S3 backups:"
    aws s3 ls "s3://${S3_BUCKET}/" --region "$AWS_REGION" | awk '{print "  " $4 " (" $3 ")"}'
}

# ============ DOWNLOAD FROM S3 ============
download_from_s3() {
    local filename=$1
    local dest="$BACKUP_DIR/$filename"
    
    if [ -z "$S3_BUCKET" ]; then
        log_error "No S3 bucket configured"
        return 1
    fi
    
    log_info "Downloading $filename from S3..."
    
    aws s3 cp "s3://${S3_BUCKET}/$filename" "$dest" --region "$AWS_REGION"
    
    if [ -f "$dest" ]; then
        log_success "Downloaded: $dest"
        echo "$dest"
    else
        log_error "Download failed"
        return 1
    fi
}

# ============ RESTORE MONGODB ============
restore_mongodb() {
    local backup_file=$1
    
    if [ ! -f "$backup_file" ]; then
        log_error "Backup file not found: $backup_file"
        return 1
    fi
    
    log_warn "This will DROP the existing database '$MONGO_DB'"
    echo -n "Are you sure you want to continue? (yes/no): "
    read confirm
    
    if [ "$confirm" != "yes" ]; then
        log_info "Restore cancelled"
        return 0
    fi
    
    log_info "Restoring MongoDB from $backup_file..."
    
    local mongo_auth=""
    if [ -n "$MONGO_PASS" ]; then
        mongo_auth="-u $MONGO_USER -p $MONGO_PASS --authenticationDatabase admin"
    fi
    
    # Check if running in Docker
    if docker ps | grep -q plugspace-mongo-primary 2>/dev/null; then
        log_info "Restoring to Docker container..."
        
        # Copy backup to container
        docker cp "$backup_file" "plugspace-mongo-primary:/tmp/restore.gz"
        
        # Restore
        docker exec plugspace-mongo-primary mongorestore \
            --host="$MONGO_HOST" \
            --port="$MONGO_PORT" \
            $mongo_auth \
            --archive="/tmp/restore.gz" \
            --gzip \
            --drop
        
        # Cleanup
        docker exec plugspace-mongo-primary rm -f /tmp/restore.gz
    else
        log_info "Restoring directly..."
        
        mongorestore \
            --host="$MONGO_HOST" \
            --port="$MONGO_PORT" \
            $mongo_auth \
            --archive="$backup_file" \
            --gzip \
            --drop
    fi
    
    log_success "MongoDB restore completed"
}

# ============ RESTORE REDIS ============
restore_redis() {
    local backup_file=$1
    
    if [ ! -f "$backup_file" ]; then
        log_error "Backup file not found: $backup_file"
        return 1
    fi
    
    log_warn "This will REPLACE the existing Redis data"
    echo -n "Are you sure you want to continue? (yes/no): "
    read confirm
    
    if [ "$confirm" != "yes" ]; then
        log_info "Restore cancelled"
        return 0
    fi
    
    log_info "Restoring Redis from $backup_file..."
    
    local redis_auth=""
    if [ -n "$REDIS_PASS" ]; then
        redis_auth="-a $REDIS_PASS"
    fi
    
    # Decompress if needed
    local rdb_file="$backup_file"
    if [[ "$backup_file" == *.gz ]]; then
        rdb_file="${backup_file%.gz}"
        gunzip -k "$backup_file" || true
    fi
    
    # Check if running in Docker
    if docker ps | grep -q plugspace-redis-master 2>/dev/null; then
        log_info "Restoring to Docker container..."
        
        # Stop Redis, copy file, restart
        docker exec plugspace-redis-master redis-cli $redis_auth SHUTDOWN NOSAVE || true
        sleep 2
        docker cp "$rdb_file" "plugspace-redis-master:/data/dump.rdb"
        docker start plugspace-redis-master
    else
        log_info "Restoring directly..."
        
        # Stop Redis, copy file, restart
        systemctl stop redis || redis-cli $redis_auth SHUTDOWN NOSAVE
        cp "$rdb_file" /var/lib/redis/dump.rdb
        chown redis:redis /var/lib/redis/dump.rdb
        systemctl start redis
    fi
    
    # Cleanup decompressed file
    if [ "$rdb_file" != "$backup_file" ]; then
        rm -f "$rdb_file"
    fi
    
    log_success "Redis restore completed"
}

# ============ RESTORE APPLICATION ============
restore_application() {
    local backup_file=$1
    local app_dir="${APP_DIR:-/var/www/plugspace}"
    
    if [ ! -f "$backup_file" ]; then
        log_error "Backup file not found: $backup_file"
        return 1
    fi
    
    log_warn "This will REPLACE the application files"
    echo -n "Are you sure you want to continue? (yes/no): "
    read confirm
    
    if [ "$confirm" != "yes" ]; then
        log_info "Restore cancelled"
        return 0
    fi
    
    log_info "Restoring application from $backup_file..."
    
    # Create backup of current state
    local current_backup="$BACKUP_DIR/pre_restore_$(date +%Y%m%d_%H%M%S).tar.gz"
    if [ -d "$app_dir" ]; then
        log_info "Creating backup of current state..."
        tar -czf "$current_backup" -C "$(dirname $app_dir)" "$(basename $app_dir)" 2>/dev/null || true
    fi
    
    # Extract backup
    tar -xzf "$backup_file" -C "$(dirname $app_dir)"
    
    # Restore permissions
    chown -R plugspace:plugspace "$app_dir"
    
    # Reinstall dependencies
    if [ -f "$app_dir/package.json" ]; then
        log_info "Reinstalling dependencies..."
        cd "$app_dir" && npm ci
    fi
    
    log_success "Application restore completed"
    log_info "Pre-restore backup saved to: $current_backup"
}

# ============ POINT IN TIME RECOVERY ============
point_in_time_recovery() {
    local target_time=$1
    
    log_info "Point-in-time recovery to: $target_time"
    log_error "Point-in-time recovery requires MongoDB oplog and is not yet implemented"
    log_info "Please contact support for point-in-time recovery requests"
    
    return 1
}

# ============ INTERACTIVE MODE ============
interactive_restore() {
    echo ""
    echo "=============================================="
    echo "PLUGSPACE.IO - INTERACTIVE RESTORE"
    echo "=============================================="
    echo ""
    
    list_backups
    
    echo "What would you like to restore?"
    echo "  1) MongoDB database"
    echo "  2) Redis cache"
    echo "  3) Application files"
    echo "  4) All (MongoDB + Redis + Application)"
    echo "  5) Download from S3 first"
    echo "  6) Cancel"
    echo ""
    echo -n "Select option: "
    read option
    
    case $option in
        1)
            echo ""
            echo "Enter MongoDB backup filename:"
            echo -n "> "
            read filename
            restore_mongodb "$BACKUP_DIR/$filename"
            ;;
        2)
            echo ""
            echo "Enter Redis backup filename:"
            echo -n "> "
            read filename
            restore_redis "$BACKUP_DIR/$filename"
            ;;
        3)
            echo ""
            echo "Enter application backup filename:"
            echo -n "> "
            read filename
            restore_application "$BACKUP_DIR/$filename"
            ;;
        4)
            echo ""
            echo "Enter backup timestamp (YYYYMMDD_HHMMSS):"
            echo -n "> "
            read timestamp
            restore_mongodb "$BACKUP_DIR/mongodb_${timestamp}.gz"
            restore_redis "$BACKUP_DIR/redis_${timestamp}.rdb.gz"
            restore_application "$BACKUP_DIR/app_${timestamp}.tar.gz"
            ;;
        5)
            list_s3_backups
            echo ""
            echo "Enter filename to download:"
            echo -n "> "
            read filename
            download_from_s3 "$filename"
            ;;
        6)
            log_info "Restore cancelled"
            exit 0
            ;;
        *)
            log_error "Invalid option"
            exit 1
            ;;
    esac
}

# ============ USAGE ============
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --mongodb FILE      Restore MongoDB from FILE"
    echo "  --redis FILE        Restore Redis from FILE"
    echo "  --app FILE          Restore application from FILE"
    echo "  --download FILE     Download FILE from S3"
    echo "  --list              List available backups"
    echo "  --list-s3           List S3 backups"
    echo "  --interactive       Interactive restore mode"
    echo "  -h, --help          Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 --list"
    echo "  $0 --mongodb /var/backups/plugspace/mongodb_20240101_020000.gz"
    echo "  $0 --interactive"
}

# ============ MAIN ============
main() {
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$(dirname $LOG_FILE)"
    
    if [ $# -eq 0 ]; then
        interactive_restore
        exit 0
    fi
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --mongodb)
                restore_mongodb "$2"
                shift 2
                ;;
            --redis)
                restore_redis "$2"
                shift 2
                ;;
            --app)
                restore_application "$2"
                shift 2
                ;;
            --download)
                download_from_s3 "$2"
                shift 2
                ;;
            --list)
                list_backups
                exit 0
                ;;
            --list-s3)
                list_s3_backups
                exit 0
                ;;
            --interactive)
                interactive_restore
                exit 0
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
    
    log_success "Restore operations completed"
}

# Run main function
main "$@"
