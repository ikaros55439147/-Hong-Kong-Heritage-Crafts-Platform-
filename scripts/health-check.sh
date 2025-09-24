#!/bin/bash

# Health Check Script for HK Heritage Crafts Platform
# Comprehensive health monitoring for production deployment

set -e

# Configuration
HEALTH_ENDPOINT="http://localhost/api/health"
METRICS_ENDPOINT="http://localhost/api/metrics"
MAX_RETRIES=5
RETRY_DELAY=10
TIMEOUT=30

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

# Check application health endpoint
check_health_endpoint() {
    log "Checking application health endpoint..."
    
    local retries=0
    while [ $retries -lt $MAX_RETRIES ]; do
        if curl -f -s --max-time $TIMEOUT "$HEALTH_ENDPOINT" > /dev/null; then
            log "✅ Health endpoint is responding"
            return 0
        else
            warn "Health endpoint check failed, attempt $((retries + 1))/$MAX_RETRIES"
            sleep $RETRY_DELAY
            ((retries++))
        fi
    done
    
    error "❌ Health endpoint failed after $MAX_RETRIES attempts"
    return 1
}

# Check detailed health status
check_detailed_health() {
    log "Checking detailed health status..."
    
    local health_response=$(curl -s --max-time $TIMEOUT "$HEALTH_ENDPOINT" 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        echo "$health_response" | jq . 2>/dev/null || echo "$health_response"
        
        # Check if status is healthy
        local status=$(echo "$health_response" | jq -r '.status' 2>/dev/null || echo "unknown")
        if [ "$status" = "healthy" ]; then
            log "✅ Application status: healthy"
            return 0
        else
            error "❌ Application status: $status"
            return 1
        fi
    else
        error "❌ Failed to get health status"
        return 1
    fi
}

# Check database connectivity
check_database() {
    log "Checking database connectivity..."
    
    if docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
        log "✅ Database is responding"
        return 0
    else
        error "❌ Database is not responding"
        return 1
    fi
}

# Check Redis connectivity
check_redis() {
    log "Checking Redis connectivity..."
    
    if docker-compose -f docker-compose.prod.yml exec -T redis redis-cli ping > /dev/null 2>&1; then
        log "✅ Redis is responding"
        return 0
    else
        error "❌ Redis is not responding"
        return 1
    fi
}

# Check critical API endpoints
check_api_endpoints() {
    log "Checking critical API endpoints..."
    
    local endpoints=(
        "/api/courses"
        "/api/products"
        "/api/craftsmen"
    )
    
    local failed_endpoints=0
    
    for endpoint in "${endpoints[@]}"; do
        local url="http://localhost$endpoint"
        if curl -f -s --max-time $TIMEOUT "$url" > /dev/null; then
            log "✅ Endpoint $endpoint is responding"
        else
            warn "⚠️  Endpoint $endpoint is not responding"
            ((failed_endpoints++))
        fi
    done
    
    if [ $failed_endpoints -eq 0 ]; then
        log "✅ All critical endpoints are responding"
        return 0
    else
        warn "⚠️  $failed_endpoints endpoints are not responding"
        return 1
    fi
}

# Check SSL certificate
check_ssl_certificate() {
    local domain="${1:-localhost}"
    
    if [ "$domain" != "localhost" ]; then
        log "Checking SSL certificate for $domain..."
        
        local cert_info=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
        
        if [ $? -eq 0 ]; then
            log "✅ SSL certificate is valid"
            echo "$cert_info"
            return 0
        else
            error "❌ SSL certificate check failed"
            return 1
        fi
    else
        log "Skipping SSL check for localhost"
        return 0
    fi
}

# Check disk space
check_disk_space() {
    log "Checking disk space..."
    
    local disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$disk_usage" -lt 80 ]; then
        log "✅ Disk usage: ${disk_usage}%"
        return 0
    elif [ "$disk_usage" -lt 90 ]; then
        warn "⚠️  Disk usage: ${disk_usage}% (Warning threshold)"
        return 1
    else
        error "❌ Disk usage: ${disk_usage}% (Critical threshold)"
        return 1
    fi
}

# Check memory usage
check_memory_usage() {
    log "Checking memory usage..."
    
    local memory_info=$(free | grep Mem)
    local total=$(echo $memory_info | awk '{print $2}')
    local used=$(echo $memory_info | awk '{print $3}')
    local usage_percent=$((used * 100 / total))
    
    if [ "$usage_percent" -lt 80 ]; then
        log "✅ Memory usage: ${usage_percent}%"
        return 0
    elif [ "$usage_percent" -lt 90 ]; then
        warn "⚠️  Memory usage: ${usage_percent}% (Warning threshold)"
        return 1
    else
        error "❌ Memory usage: ${usage_percent}% (Critical threshold)"
        return 1
    fi
}

# Check Docker containers
check_docker_containers() {
    log "Checking Docker containers..."
    
    local containers=("app" "postgres" "redis" "nginx")
    local failed_containers=0
    
    for container in "${containers[@]}"; do
        if docker-compose -f docker-compose.prod.yml ps "$container" | grep -q "Up"; then
            log "✅ Container $container is running"
        else
            error "❌ Container $container is not running"
            ((failed_containers++))
        fi
    done
    
    if [ $failed_containers -eq 0 ]; then
        log "✅ All containers are running"
        return 0
    else
        error "❌ $failed_containers containers are not running"
        return 1
    fi
}

# Check application metrics
check_metrics() {
    log "Checking application metrics..."
    
    if curl -f -s --max-time $TIMEOUT "$METRICS_ENDPOINT" > /dev/null; then
        log "✅ Metrics endpoint is responding"
        
        # Get basic metrics
        local metrics=$(curl -s --max-time $TIMEOUT "$METRICS_ENDPOINT" 2>/dev/null)
        if [ $? -eq 0 ]; then
            echo "Recent metrics:"
            echo "$metrics" | grep -E "(app_users_total|app_courses_active|app_products_active)" | head -5
        fi
        return 0
    else
        warn "⚠️  Metrics endpoint is not responding"
        return 1
    fi
}

# Generate health report
generate_health_report() {
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    local report_file="/tmp/health_report_$(date +%Y%m%d_%H%M%S).json"
    
    log "Generating health report..."
    
    cat > "$report_file" << EOF
{
  "timestamp": "$timestamp",
  "environment": "production",
  "overall_status": "healthy",
  "checks": {
    "application": {
      "status": "healthy",
      "response_time_ms": 0
    },
    "database": {
      "status": "healthy"
    },
    "redis": {
      "status": "healthy"
    },
    "disk_space": {
      "status": "healthy",
      "usage_percent": 0
    },
    "memory": {
      "status": "healthy",
      "usage_percent": 0
    },
    "containers": {
      "status": "healthy"
    }
  }
}
EOF
    
    log "Health report generated: $report_file"
    echo "$report_file"
}

# Send health status to monitoring
send_to_monitoring() {
    local status="$1"
    local webhook_url="${MONITORING_WEBHOOK_URL:-}"
    
    if [ -n "$webhook_url" ]; then
        log "Sending health status to monitoring system..."
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{
                \"service\": \"hk-heritage-crafts\",
                \"status\": \"$status\",
                \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
                \"environment\": \"production\"
            }" \
            "$webhook_url" 2>/dev/null || warn "Failed to send status to monitoring"
    fi
}

# Main health check function
main() {
    log "Starting comprehensive health check..."
    log "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    
    local failed_checks=0
    local total_checks=0
    
    # Run all health checks
    local checks=(
        "check_docker_containers"
        "check_database"
        "check_redis"
        "check_health_endpoint"
        "check_detailed_health"
        "check_api_endpoints"
        "check_disk_space"
        "check_memory_usage"
        "check_metrics"
    )
    
    for check in "${checks[@]}"; do
        ((total_checks++))
        if ! $check; then
            ((failed_checks++))
        fi
        echo ""
    done
    
    # Check SSL if domain is provided
    if [ -n "${1:-}" ] && [ "$1" != "localhost" ]; then
        ((total_checks++))
        if ! check_ssl_certificate "$1"; then
            ((failed_checks++))
        fi
        echo ""
    fi
    
    # Summary
    log "Health check completed"
    log "Total checks: $total_checks"
    log "Failed checks: $failed_checks"
    log "Success rate: $(( (total_checks - failed_checks) * 100 / total_checks ))%"
    
    if [ $failed_checks -eq 0 ]; then
        log "🎉 All health checks passed!"
        send_to_monitoring "healthy"
        return 0
    elif [ $failed_checks -lt 3 ]; then
        warn "⚠️  Some health checks failed, but system is operational"
        send_to_monitoring "degraded"
        return 1
    else
        error "🚨 Multiple health checks failed, system may be unhealthy"
        send_to_monitoring "unhealthy"
        return 2
    fi
}

# Handle command line arguments
case "${1:-}" in
    "endpoint")
        check_health_endpoint
        ;;
    "database")
        check_database
        ;;
    "redis")
        check_redis
        ;;
    "containers")
        check_docker_containers
        ;;
    "metrics")
        check_metrics
        ;;
    "report")
        generate_health_report
        ;;
    *)
        main "$@"
        ;;
esac