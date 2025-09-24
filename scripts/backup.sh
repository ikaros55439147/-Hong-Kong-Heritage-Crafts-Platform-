#!/bin/bash

# Backup Script for HK Heritage Crafts Platform
# Creates comprehensive backups of database, files, and configuration

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

# Create backup directories
create_backup_dirs() {
    log "Creating backup directories..."
    mkdir -p "$BACKUP_DIR"/{database,files,config,logs}
}

# Backup database
backup_database() {
    log "Backing up PostgreSQL database..."
    
    local db_backup_file="$BACKUP_DIR/database/db_backup_$TIMESTAMP.sql"
    local db_backup_compressed="$BACKUP_DIR/database/db_backup_$TIMESTAMP.sql.gz"
    
    # Create database backup
    docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump \
        -U postgres \
        -h localhost \
        --verbose \
        --clean \
        --no-owner \
        --no-privileges \
        hk_heritage_crafts > "$db_backup_file"
    
    # Compress backup
    gzip "$db_backup_file"
    
    log "Database backup completed: $db_backup_compressed"
    
    # Verify backup integrity
    if gunzip -t "$db_backup_compressed"; then
        log "Database backup integrity verified"
    else
        error "Database backup integrity check failed"
        return 1
    fi
}

# Backup uploaded files
backup_files() {
    log "Backing up uploaded files..."
    
    local files_backup="$BACKUP_DIR/files/files_backup_$TIMESTAMP.tar.gz"
    
    if [ -d "$PROJECT_DIR/uploads" ]; then
        tar -czf "$files_backup" -C "$PROJECT_DIR" uploads/
        log "Files backup completed: $files_backup"
    else
        warn "No uploads directory found, skipping files backup"
    fi
    
    # Backup any additional file directories
    if [ -d "$PROJECT_DIR/public/uploads" ]; then
        tar -czf "$BACKUP_DIR/files/public_uploads_$TIMESTAMP.tar.gz" -C "$PROJECT_DIR/public" uploads/
        log "Public uploads backup completed"
    fi
}

# Backup configuration files
backup_config() {
    log "Backing up configuration files..."
    
    local config_backup="$BACKUP_DIR/config/config_backup_$TIMESTAMP.tar.gz"
    
    tar -czf "$config_backup" \
        -C "$PROJECT_DIR" \
        .env.production.local \
        docker-compose.prod.yml \
        nginx/nginx.conf \
        prisma/schema.prisma \
        package.json \
        package-lock.json \
        2>/dev/null || true
    
    log "Configuration backup completed: $config_backup"
}

# Backup application logs
backup_logs() {
    log "Backing up application logs..."
    
    local logs_backup="$BACKUP_DIR/logs/logs_backup_$TIMESTAMP.tar.gz"
    
    if [ -d "$PROJECT_DIR/logs" ]; then
        tar -czf "$logs_backup" -C "$PROJECT_DIR" logs/
        log "Logs backup completed: $logs_backup"
    else
        warn "No logs directory found, skipping logs backup"
    fi
}

# Create backup manifest
create_manifest() {
    log "Creating backup manifest..."
    
    local manifest_file="$BACKUP_DIR/backup_manifest_$TIMESTAMP.json"
    
    cat > "$manifest_file" << EOF
{
  "backup_timestamp": "$TIMESTAMP",
  "backup_date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "git_commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "git_branch": "$(git branch --show-current 2>/dev/null || echo 'unknown')",
  "environment": "production",
  "components": {
    "database": {
      "file": "database/db_backup_$TIMESTAMP.sql.gz",
      "size": "$(du -h $BACKUP_DIR/database/db_backup_$TIMESTAMP.sql.gz 2>/dev/null | cut -f1 || echo 'unknown')"
    },
    "files": {
      "file": "files/files_backup_$TIMESTAMP.tar.gz",
      "size": "$(du -h $BACKUP_DIR/files/files_backup_$TIMESTAMP.tar.gz 2>/dev/null | cut -f1 || echo 'unknown')"
    },
    "config": {
      "file": "config/config_backup_$TIMESTAMP.tar.gz",
      "size": "$(du -h $BACKUP_DIR/config/config_backup_$TIMESTAMP.tar.gz 2>/dev/null | cut -f1 || echo 'unknown')"
    },
    "logs": {
      "file": "logs/logs_backup_$TIMESTAMP.tar.gz",
      "size": "$(du -h $BACKUP_DIR/logs/logs_backup_$TIMESTAMP.tar.gz 2>/dev/null | cut -f1 || echo 'unknown')"
    }
  },
  "total_size": "$(du -sh $BACKUP_DIR 2>/dev/null | cut -f1 || echo 'unknown')"
}
EOF
    
    log "Backup manifest created: $manifest_file"
}

# Cleanup old backups
cleanup_old_backups() {
    local retention_days=${1:-30}
    
    log "Cleaning up backups older than $retention_days days..."
    
    # Remove old database backups
    find "$BACKUP_DIR/database" -name "*.sql.gz" -mtime +$retention_days -delete 2>/dev/null || true
    
    # Remove old file backups
    find "$BACKUP_DIR/files" -name "*.tar.gz" -mtime +$retention_days -delete 2>/dev/null || true
    
    # Remove old config backups
    find "$BACKUP_DIR/config" -name "*.tar.gz" -mtime +$retention_days -delete 2>/dev/null || true
    
    # Remove old log backups
    find "$BACKUP_DIR/logs" -name "*.tar.gz" -mtime +$retention_days -delete 2>/dev/null || true
    
    # Remove old manifests
    find "$BACKUP_DIR" -name "backup_manifest_*.json" -mtime +$retention_days -delete 2>/dev/null || true
    
    log "Cleanup completed"
}

# Verify backup completeness
verify_backup() {
    log "Verifying backup completeness..."
    
    local errors=0
    
    # Check database backup
    if [ ! -f "$BACKUP_DIR/database/db_backup_$TIMESTAMP.sql.gz" ]; then
        error "Database backup file not found"
        ((errors++))
    fi
    
    # Check files backup (if uploads directory exists)
    if [ -d "$PROJECT_DIR/uploads" ] && [ ! -f "$BACKUP_DIR/files/files_backup_$TIMESTAMP.tar.gz" ]; then
        error "Files backup not found"
        ((errors++))
    fi
    
    # Check config backup
    if [ ! -f "$BACKUP_DIR/config/config_backup_$TIMESTAMP.tar.gz" ]; then
        error "Configuration backup not found"
        ((errors++))
    fi
    
    if [ $errors -eq 0 ]; then
        log "✅ Backup verification passed"
        return 0
    else
        error "❌ Backup verification failed with $errors errors"
        return 1
    fi
}

# Send backup notification
send_notification() {
    local status="$1"
    local webhook_url="${SLACK_WEBHOOK_URL:-}"
    
    if [ -n "$webhook_url" ]; then
        local message
        if [ "$status" = "success" ]; then
            message="✅ Backup completed successfully at $(date)"
        else
            message="❌ Backup failed at $(date)"
        fi
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\"}" \
            "$webhook_url" 2>/dev/null || true
    fi
}

# Main backup function
main() {
    cd "$PROJECT_DIR"
    
    log "Starting backup process..."
    log "Timestamp: $TIMESTAMP"
    log "Backup directory: $BACKUP_DIR"
    
    # Create backup directories
    create_backup_dirs
    
    # Perform backups
    backup_database
    backup_files
    backup_config
    backup_logs
    
    # Create manifest
    create_manifest
    
    # Verify backup
    if verify_backup; then
        log "✅ Backup process completed successfully"
        send_notification "success"
        
        # Cleanup old backups
        cleanup_old_backups 30
        
        # Display backup summary
        echo ""
        log "📊 Backup Summary:"
        echo "   Database: $(du -h $BACKUP_DIR/database/db_backup_$TIMESTAMP.sql.gz 2>/dev/null | cut -f1 || echo 'N/A')"
        echo "   Files: $(du -h $BACKUP_DIR/files/files_backup_$TIMESTAMP.tar.gz 2>/dev/null | cut -f1 || echo 'N/A')"
        echo "   Config: $(du -h $BACKUP_DIR/config/config_backup_$TIMESTAMP.tar.gz 2>/dev/null | cut -f1 || echo 'N/A')"
        echo "   Total: $(du -sh $BACKUP_DIR 2>/dev/null | cut -f1 || echo 'N/A')"
        
        return 0
    else
        error "❌ Backup process failed"
        send_notification "failure"
        return 1
    fi
}

# Handle command line arguments
case "${1:-}" in
    "cleanup")
        cleanup_old_backups "${2:-30}"
        ;;
    "verify")
        verify_backup
        ;;
    *)
        main "$@"
        ;;
esac