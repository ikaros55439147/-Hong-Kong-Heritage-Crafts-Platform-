#!/bin/bash

# Rollback Script for Production Deployment
# This script provides automated rollback capabilities for the HK Heritage Crafts Platform

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Configuration
BACKUP_DIR="/backups"
ROLLBACK_TAG="rollback"
COMPOSE_FILE="docker-compose.prod.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

# Check if running as root or with sudo
check_permissions() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root or with sudo"
        exit 1
    fi
}

# Backup current state before rollback
backup_current_state() {
    log "Creating backup of current state..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/pre_rollback_$timestamp.tar.gz"
    
    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"
    
    # Backup database
    log "Backing up database..."
    docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_dump -U postgres hk_heritage_crafts > "$BACKUP_DIR/db_pre_rollback_$timestamp.sql"
    
    # Backup uploaded files
    log "Backing up uploaded files..."
    if [ -d "uploads" ]; then
        tar -czf "$BACKUP_DIR/uploads_pre_rollback_$timestamp.tar.gz" uploads/
    fi
    
    # Backup configuration files
    log "Backing up configuration..."
    tar -czf "$backup_file" \
        .env.production.local \
        nginx/nginx.conf \
        docker-compose.prod.yml \
        2>/dev/null || true
    
    log "Backup completed: $backup_file"
}

# Get list of available rollback points
list_rollback_points() {
    log "Available rollback points:"
    echo ""
    
    # List Docker images with rollback tags
    echo "Docker Images:"
    docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.CreatedAt}}" | grep -E "(rollback|backup)" || echo "No rollback images found"
    
    echo ""
    
    # List database backups
    echo "Database Backups:"
    if [ -d "$BACKUP_DIR" ]; then
        ls -la "$BACKUP_DIR"/*.sql 2>/dev/null | tail -10 || echo "No database backups found"
    else
        echo "No backup directory found"
    fi
}

# Rollback to previous Docker image
rollback_application() {
    local target_image=${1:-"$ROLLBACK_TAG"}
    
    log "Rolling back application to image: $target_image"
    
    # Check if rollback image exists
    if ! docker images | grep -q "$target_image"; then
        error "Rollback image '$target_image' not found"
        return 1
    fi
    
    # Update docker-compose file
    log "Updating docker-compose configuration..."
    sed -i.bak "s|image: .*|image: hk-heritage-crafts:$target_image|" "$COMPOSE_FILE"
    
    # Restart application with rollback image
    log "Restarting application with rollback image..."
    docker-compose -f "$COMPOSE_FILE" up -d app
    
    # Wait for application to start
    log "Waiting for application to start..."
    sleep 30
    
    # Health check
    if curl -f http://localhost/api/health > /dev/null 2>&1; then
        log "Application rollback successful!"
        return 0
    else
        error "Application health check failed after rollback"
        return 1
    fi
}

# Rollback database to specific backup
rollback_database() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        error "No backup file specified"
        return 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        error "Backup file not found: $backup_file"
        return 1
    fi
    
    warn "This will overwrite the current database!"
    read -p "Are you sure you want to continue? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        log "Database rollback cancelled"
        return 0
    fi
    
    log "Rolling back database from: $backup_file"
    
    # Stop application to prevent database access
    log "Stopping application..."
    docker-compose -f "$COMPOSE_FILE" stop app
    
    # Restore database
    log "Restoring database..."
    docker-compose -f "$COMPOSE_FILE" exec -T postgres psql -U postgres -c "DROP DATABASE IF EXISTS hk_heritage_crafts;"
    docker-compose -f "$COMPOSE_FILE" exec -T postgres psql -U postgres -c "CREATE DATABASE hk_heritage_crafts;"
    docker-compose -f "$COMPOSE_FILE" exec -T postgres psql -U postgres hk_heritage_crafts < "$backup_file"
    
    # Restart application
    log "Restarting application..."
    docker-compose -f "$COMPOSE_FILE" up -d app
    
    log "Database rollback completed"
}

# Complete rollback (application + database)
complete_rollback() {
    local app_image="$1"
    local db_backup="$2"
    
    log "Starting complete rollback..."
    
    # Backup current state
    backup_current_state
    
    # Rollback application
    if [ -n "$app_image" ]; then
        rollback_application "$app_image"
    else
        rollback_application
    fi
    
    # Rollback database if specified
    if [ -n "$db_backup" ]; then
        rollback_database "$db_backup"
    fi
    
    # Verify system health
    verify_system_health
    
    log "Complete rollback finished"
}

# Verify system health after rollback
verify_system_health() {
    log "Verifying system health..."
    
    # Check application health
    local health_check_attempts=0
    local max_attempts=10
    
    while [ $health_check_attempts -lt $max_attempts ]; do
        if curl -f http://localhost/api/health > /dev/null 2>&1; then
            log "✅ Application health check passed"
            break
        else
            warn "Health check failed, attempt $((health_check_attempts + 1))/$max_attempts"
            sleep 10
            ((health_check_attempts++))
        fi
    done
    
    if [ $health_check_attempts -eq $max_attempts ]; then
        error "❌ Application health check failed after $max_attempts attempts"
        return 1
    fi
    
    # Check database connectivity
    if docker-compose -f "$COMPOSE_FILE" exec -T postgres psql -U postgres -c "SELECT 1;" > /dev/null 2>&1; then
        log "✅ Database connectivity check passed"
    else
        error "❌ Database connectivity check failed"
        return 1
    fi
    
    # Check critical endpoints
    local endpoints=("/api/courses" "/api/products" "/api/auth/profile")
    
    for endpoint in "${endpoints[@]}"; do
        if curl -f "http://localhost$endpoint" > /dev/null 2>&1; then
            log "✅ Endpoint $endpoint is responding"
        else
            warn "⚠️  Endpoint $endpoint is not responding (may require authentication)"
        fi
    done
    
    log "System health verification completed"
}

# Emergency rollback (fastest possible rollback)
emergency_rollback() {
    log "🚨 EMERGENCY ROLLBACK INITIATED"
    
    # Skip backup to save time
    warn "Skipping backup due to emergency rollback"
    
    # Rollback to last known good state
    rollback_application "$ROLLBACK_TAG"
    
    # Quick health check
    sleep 15
    if curl -f http://localhost/api/health > /dev/null 2>&1; then
        log "🚨 Emergency rollback completed successfully"
    else
        error "🚨 Emergency rollback failed - manual intervention required"
        exit 1
    fi
}

# Show usage information
show_usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  list                          List available rollback points"
    echo "  app [IMAGE_TAG]              Rollback application only (default: rollback)"
    echo "  db [BACKUP_FILE]             Rollback database only"
    echo "  complete [IMAGE_TAG] [DB_BACKUP]  Complete rollback (app + db)"
    echo "  emergency                    Emergency rollback (fastest)"
    echo "  verify                       Verify system health"
    echo ""
    echo "Examples:"
    echo "  $0 list"
    echo "  $0 app rollback"
    echo "  $0 db /backups/db_backup_20231201_120000.sql"
    echo "  $0 complete rollback /backups/db_backup_20231201_120000.sql"
    echo "  $0 emergency"
}

# Main execution
main() {
    cd "$PROJECT_DIR"
    
    case "${1:-}" in
        "list")
            list_rollback_points
            ;;
        "app")
            check_permissions
            rollback_application "$2"
            ;;
        "db")
            check_permissions
            rollback_database "$2"
            ;;
        "complete")
            check_permissions
            complete_rollback "$2" "$3"
            ;;
        "emergency")
            check_permissions
            emergency_rollback
            ;;
        "verify")
            verify_system_health
            ;;
        "help"|"--help"|"-h")
            show_usage
            ;;
        *)
            error "Invalid command: ${1:-}"
            echo ""
            show_usage
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"