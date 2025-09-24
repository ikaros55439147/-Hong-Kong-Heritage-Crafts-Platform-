#!/bin/bash

# 香港弱勢行業傳承平台 - 生產環境健康檢查腳本
# Production Health Check Script for HK Heritage Crafts Platform

set -e

echo "🏥 開始生產環境健康檢查..."
echo "Starting production health check..."

# 配置變數
APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"
HEALTH_CHECK_TIMEOUT=30
MAX_RETRIES=3

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日誌函數
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 檢查HTTP端點
check_http_endpoint() {
    local url=$1
    local description=$2
    local expected_status=${3:-200}
    
    echo "🔍 檢查 $description..."
    
    local retry_count=0
    while [ $retry_count -lt $MAX_RETRIES ]; do
        local response=$(curl -s -w "%{http_code}" --max-time $HEALTH_CHECK_TIMEOUT "$url" -o /dev/null)
        
        if [ "$response" = "$expected_status" ]; then
            log_info "$description 健康檢查通過 (HTTP $response)"
            return 0
        else
            retry_count=$((retry_count + 1))
            log_warn "$description 健康檢查失敗 (HTTP $response)，重試 $retry_count/$MAX_RETRIES"
            
            if [ $retry_count -lt $MAX_RETRIES ]; then
                sleep 5
            fi
        fi
    done
    
    log_error "$description 健康檢查失敗"
    return 1
}

# 檢查應用程式健康狀態
check_application_health() {
    echo "📱 檢查應用程式健康狀態..."
    
    if check_http_endpoint "$APP_URL/api/health" "應用程式基本健康檢查"; then
        log_info "應用程式基本健康檢查通過"
    else
        log_error "應用程式基本健康檢查失敗"
        return 1
    fi
    
    if check_http_endpoint "$APP_URL/api/system/health/detailed" "應用程式詳細健康檢查"; then
        log_info "應用程式詳細健康檢查通過"
    else
        log_error "應用程式詳細健康檢查失敗"
        return 1
    fi
}

# 檢查關鍵API端點
check_critical_apis() {
    echo "🔌 檢查關鍵API端點..."
    
    local critical_endpoints=(
        "/api/auth/profile:認證API"
        "/api/courses:課程API"
        "/api/products:產品API"
        "/api/craftsmen:師傅API"
        "/api/users/profile:用戶API"
    )
    
    local failed_count=0
    
    for endpoint_info in "${critical_endpoints[@]}"; do
        IFS=':' read -r endpoint description <<< "$endpoint_info"
        
        if ! check_http_endpoint "$APP_URL$endpoint" "$description" "200"; then
            failed_count=$((failed_count + 1))
        fi
    done
    
    if [ $failed_count -gt 0 ]; then
        log_error "$failed_count 個關鍵API端點檢查失敗"
        return 1
    else
        log_info "所有關鍵API端點檢查通過"
    fi
}

# 檢查數據庫連接
check_database_connection() {
    echo "🗄️ 檢查數據庫連接..."
    
    if npm run db:check > /dev/null 2>&1; then
        log_info "數據庫連接檢查通過"
    else
        log_error "數據庫連接檢查失敗"
        return 1
    fi
}

# 檢查Redis連接
check_redis_connection() {
    echo "🔴 檢查Redis連接..."
    
    if npm run redis:check > /dev/null 2>&1; then
        log_info "Redis連接檢查通過"
    else
        log_error "Redis連接檢查失敗"
        return 1
    fi
}

# 檢查Docker容器狀態
check_docker_containers() {
    echo "🐳 檢查Docker容器狀態..."
    
    local containers=$(docker-compose -f docker-compose.prod.yml ps -q)
    local failed_containers=0
    
    for container in $containers; do
        local status=$(docker inspect --format='{{.State.Status}}' $container)
        local name=$(docker inspect --format='{{.Name}}' $container | sed 's/\///')
        
        if [ "$status" = "running" ]; then
            log_info "容器 $name 運行正常"
        else
            log_error "容器 $name 狀態異常: $status"
            failed_containers=$((failed_containers + 1))
        fi
    done
    
    if [ $failed_containers -gt 0 ]; then
        log_error "$failed_containers 個容器狀態異常"
        return 1
    else
        log_info "所有容器運行正常"
    fi
}

# 檢查系統資源
check_system_resources() {
    echo "💻 檢查系統資源..."
    
    # 檢查磁碟空間
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ $disk_usage -gt 85 ]; then
        log_error "磁碟使用率過高: ${disk_usage}%"
        return 1
    else
        log_info "磁碟使用率正常: ${disk_usage}%"
    fi
    
    # 檢查記憶體使用
    local memory_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    if [ $memory_usage -gt 85 ]; then
        log_warn "記憶體使用率較高: ${memory_usage}%"
    else
        log_info "記憶體使用率正常: ${memory_usage}%"
    fi
    
    # 檢查CPU負載
    local cpu_load=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    local cpu_cores=$(nproc)
    local load_percentage=$(echo "$cpu_load $cpu_cores" | awk '{printf "%.0f", ($1/$2)*100}')
    
    if [ $load_percentage -gt 80 ]; then
        log_warn "CPU負載較高: ${load_percentage}%"
    else
        log_info "CPU負載正常: ${load_percentage}%"
    fi
}

# 檢查SSL證書
check_ssl_certificate() {
    echo "🔒 檢查SSL證書..."
    
    if [[ $APP_URL == https://* ]]; then
        local domain=$(echo $APP_URL | sed 's|https://||' | sed 's|/.*||')
        local cert_expiry=$(echo | openssl s_client -servername $domain -connect $domain:443 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
        local expiry_timestamp=$(date -d "$cert_expiry" +%s)
        local current_timestamp=$(date +%s)
        local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
        
        if [ $days_until_expiry -lt 30 ]; then
            log_warn "SSL證書將在 $days_until_expiry 天後過期"
        else
            log_info "SSL證書有效，還有 $days_until_expiry 天過期"
        fi
    else
        log_info "跳過SSL證書檢查（非HTTPS）"
    fi
}

# 檢查監控系統
check_monitoring_system() {
    echo "📊 檢查監控系統..."
    
    # 檢查Prometheus
    if check_http_endpoint "http://localhost:9090/-/healthy" "Prometheus監控系統"; then
        log_info "Prometheus監控系統正常"
    else
        log_warn "Prometheus監控系統異常"
    fi
    
    # 檢查Grafana
    if check_http_endpoint "http://localhost:3001/api/health" "Grafana監控面板"; then
        log_info "Grafana監控面板正常"
    else
        log_warn "Grafana監控面板異常"
    fi
    
    # 檢查AlertManager
    if check_http_endpoint "http://localhost:9093/-/healthy" "AlertManager告警系統"; then
        log_info "AlertManager告警系統正常"
    else
        log_warn "AlertManager告警系統異常"
    fi
}

# 生成健康檢查報告
generate_health_report() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local report_file="health-check-report-$(date +%Y%m%d-%H%M%S).txt"
    
    echo "📋 生成健康檢查報告..."
    
    cat > $report_file << EOF
香港弱勢行業傳承平台 - 生產環境健康檢查報告
HK Heritage Crafts Platform - Production Health Check Report

檢查時間: $timestamp
應用程式URL: $APP_URL

=== 檢查結果摘要 ===
EOF
    
    # 這裡可以添加更詳細的報告內容
    log_info "健康檢查報告已生成: $report_file"
}

# 主要健康檢查流程
main() {
    echo "🎯 開始完整的生產環境健康檢查..."
    echo "=========================================="
    
    local failed_checks=0
    
    # 執行各項檢查
    check_application_health || failed_checks=$((failed_checks + 1))
    check_critical_apis || failed_checks=$((failed_checks + 1))
    check_database_connection || failed_checks=$((failed_checks + 1))
    check_redis_connection || failed_checks=$((failed_checks + 1))
    check_docker_containers || failed_checks=$((failed_checks + 1))
    check_system_resources || failed_checks=$((failed_checks + 1))
    check_ssl_certificate || failed_checks=$((failed_checks + 1))
    check_monitoring_system || failed_checks=$((failed_checks + 1))
    
    echo "=========================================="
    
    if [ $failed_checks -eq 0 ]; then
        log_info "🎉 所有健康檢查通過！系統運行正常"
        generate_health_report
        exit 0
    else
        log_error "❌ $failed_checks 項健康檢查失敗"
        generate_health_report
        exit 1
    fi
}

# 錯誤處理
trap 'echo "❌ 健康檢查過程中發生錯誤"; exit 1' ERR

# 執行主要流程
main "$@"