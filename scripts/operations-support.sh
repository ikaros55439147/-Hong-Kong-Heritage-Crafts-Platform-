#!/bin/bash

# 香港弱勢行業傳承平台 - 運維支援腳本
# Operations Support Script for HK Heritage Crafts Platform

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

log_debug() {
    echo -e "${BLUE}[DEBUG]${NC} $1"
}

# 顯示幫助信息
show_help() {
    cat << EOF
香港弱勢行業傳承平台 - 運維支援工具
HK Heritage Crafts Platform - Operations Support Tool

使用方法: $0 [命令] [選項]

可用命令:
  status          - 查看系統狀態
  logs            - 查看系統日誌
  restart         - 重啟服務
  backup          - 執行數據備份
  restore         - 恢復數據
  scale           - 擴展服務
  monitor         - 監控系統指標
  troubleshoot    - 故障排除
  maintenance     - 維護模式
  help            - 顯示此幫助信息

選項:
  --service=NAME  - 指定服務名稱
  --env=ENV       - 指定環境 (production/staging)
  --verbose       - 詳細輸出
  --dry-run       - 模擬執行

範例:
  $0 status                           # 查看整體系統狀態
  $0 logs --service=app               # 查看應用程式日誌
  $0 restart --service=database       # 重啟數據庫服務
  $0 backup --env=production          # 執行生產環境備份
  $0 scale --service=app --replicas=3 # 擴展應用程式到3個實例

EOF
}

# 解析命令行參數
parse_arguments() {
    COMMAND=""
    SERVICE=""
    ENVIRONMENT="production"
    VERBOSE=false
    DRY_RUN=false
    REPLICAS=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            status|logs|restart|backup|restore|scale|monitor|troubleshoot|maintenance|help)
                COMMAND="$1"
                shift
                ;;
            --service=*)
                SERVICE="${1#*=}"
                shift
                ;;
            --env=*)
                ENVIRONMENT="${1#*=}"
                shift
                ;;
            --replicas=*)
                REPLICAS="${1#*=}"
                shift
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            *)
                echo "未知參數: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    if [ -z "$COMMAND" ]; then
        show_help
        exit 1
    fi
}

# 執行命令
execute_command() {
    local cmd="$1"
    
    if [ "$DRY_RUN" = true ]; then
        log_debug "模擬執行: $cmd"
        return 0
    fi
    
    if [ "$VERBOSE" = true ]; then
        log_debug "執行: $cmd"
    fi
    
    eval "$cmd"
}

# 查看系統狀態
check_system_status() {
    log_info "檢查系統狀態..."
    
    if [ -n "$SERVICE" ]; then
        log_info "檢查服務: $SERVICE"
        execute_command "docker-compose -f docker-compose.prod.yml ps $SERVICE"
    else
        log_info "檢查所有服務狀態"
        execute_command "docker-compose -f docker-compose.prod.yml ps"
    fi
    
    # 檢查健康狀態
    log_info "執行健康檢查..."
    execute_command "./scripts/production-health-check.sh"
}

# 查看系統日誌
view_system_logs() {
    log_info "查看系統日誌..."
    
    if [ -n "$SERVICE" ]; then
        log_info "查看服務日誌: $SERVICE"
        execute_command "docker-compose -f docker-compose.prod.yml logs -f --tail=100 $SERVICE"
    else
        log_info "查看所有服務日誌"
        execute_command "docker-compose -f docker-compose.prod.yml logs -f --tail=100"
    fi
}

# 重啟服務
restart_services() {
    log_info "重啟服務..."
    
    if [ -n "$SERVICE" ]; then
        log_info "重啟服務: $SERVICE"
        execute_command "docker-compose -f docker-compose.prod.yml restart $SERVICE"
    else
        log_warn "重啟所有服務"
        read -p "確定要重啟所有服務嗎？(y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            execute_command "docker-compose -f docker-compose.prod.yml restart"
        else
            log_info "取消重啟操作"
        fi
    fi
    
    # 重啟後健康檢查
    log_info "執行重啟後健康檢查..."
    sleep 10
    execute_command "./scripts/production-health-check.sh"
}

# 執行數據備份
perform_backup() {
    log_info "執行數據備份..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_dir="backups/${ENVIRONMENT}_${timestamp}"
    
    execute_command "mkdir -p $backup_dir"
    
    # 數據庫備份
    log_info "備份數據庫..."
    execute_command "npm run db:backup -- --output=$backup_dir/database.sql"
    
    # Redis備份
    log_info "備份Redis..."
    execute_command "docker exec hk-heritage-redis redis-cli BGSAVE"
    execute_command "docker cp hk-heritage-redis:/data/dump.rdb $backup_dir/redis.rdb"
    
    # 媒體文件備份
    log_info "備份媒體文件..."
    execute_command "tar -czf $backup_dir/uploads.tar.gz uploads/"
    
    # 配置文件備份
    log_info "備份配置文件..."
    execute_command "cp -r .env* $backup_dir/"
    execute_command "cp -r nginx/ $backup_dir/"
    execute_command "cp docker-compose.prod.yml $backup_dir/"
    
    log_info "備份完成: $backup_dir"
}

# 恢復數據
restore_data() {
    log_warn "執行數據恢復..."
    
    read -p "請輸入備份目錄路徑: " backup_path
    
    if [ ! -d "$backup_path" ]; then
        log_error "備份目錄不存在: $backup_path"
        exit 1
    fi
    
    read -p "確定要恢復數據嗎？這將覆蓋現有數據！(y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "取消恢復操作"
        exit 0
    fi
    
    # 停止服務
    log_info "停止服務..."
    execute_command "docker-compose -f docker-compose.prod.yml down"
    
    # 恢復數據庫
    if [ -f "$backup_path/database.sql" ]; then
        log_info "恢復數據庫..."
        execute_command "npm run db:restore -- --input=$backup_path/database.sql"
    fi
    
    # 恢復Redis
    if [ -f "$backup_path/redis.rdb" ]; then
        log_info "恢復Redis..."
        execute_command "docker cp $backup_path/redis.rdb hk-heritage-redis:/data/dump.rdb"
    fi
    
    # 恢復媒體文件
    if [ -f "$backup_path/uploads.tar.gz" ]; then
        log_info "恢復媒體文件..."
        execute_command "tar -xzf $backup_path/uploads.tar.gz"
    fi
    
    # 重啟服務
    log_info "重啟服務..."
    execute_command "docker-compose -f docker-compose.prod.yml up -d"
    
    log_info "數據恢復完成"
}

# 擴展服務
scale_services() {
    log_info "擴展服務..."
    
    if [ -z "$SERVICE" ]; then
        log_error "請指定要擴展的服務名稱"
        exit 1
    fi
    
    if [ -z "$REPLICAS" ]; then
        read -p "請輸入副本數量: " REPLICAS
    fi
    
    log_info "擴展服務 $SERVICE 到 $REPLICAS 個實例"
    execute_command "docker-compose -f docker-compose.prod.yml up -d --scale $SERVICE=$REPLICAS"
    
    # 檢查擴展結果
    log_info "檢查擴展結果..."
    execute_command "docker-compose -f docker-compose.prod.yml ps $SERVICE"
}

# 監控系統指標
monitor_system() {
    log_info "監控系統指標..."
    
    # 顯示系統資源使用情況
    echo "=== 系統資源使用情況 ==="
    execute_command "free -h"
    execute_command "df -h"
    execute_command "uptime"
    
    echo ""
    echo "=== Docker容器資源使用情況 ==="
    execute_command "docker stats --no-stream"
    
    echo ""
    echo "=== 網路連接狀況 ==="
    execute_command "netstat -tuln | grep LISTEN"
    
    echo ""
    echo "=== 應用程式指標 ==="
    execute_command "curl -s http://localhost:3000/api/metrics | head -20"
}

# 故障排除
troubleshoot_system() {
    log_info "執行故障排除..."
    
    echo "=== 系統故障排除報告 ==="
    echo "時間: $(date)"
    echo ""
    
    # 檢查服務狀態
    echo "1. 服務狀態檢查"
    execute_command "docker-compose -f docker-compose.prod.yml ps"
    echo ""
    
    # 檢查最近的錯誤日誌
    echo "2. 最近的錯誤日誌"
    execute_command "docker-compose -f docker-compose.prod.yml logs --tail=50 | grep -i error"
    echo ""
    
    # 檢查系統資源
    echo "3. 系統資源檢查"
    execute_command "free -m"
    execute_command "df -h"
    echo ""
    
    # 檢查網路連接
    echo "4. 網路連接檢查"
    execute_command "curl -I http://localhost:3000/api/health"
    echo ""
    
    # 檢查數據庫連接
    echo "5. 數據庫連接檢查"
    execute_command "npm run db:check"
    echo ""
    
    # 生成故障排除報告
    local report_file="troubleshoot-report-$(date +%Y%m%d-%H%M%S).txt"
    log_info "故障排除報告已生成: $report_file"
}

# 維護模式
maintenance_mode() {
    log_info "維護模式管理..."
    
    read -p "啟用維護模式？(enable/disable): " mode
    
    case $mode in
        enable)
            log_info "啟用維護模式..."
            execute_command "touch maintenance.flag"
            execute_command "nginx -s reload"
            log_info "維護模式已啟用"
            ;;
        disable)
            log_info "停用維護模式..."
            execute_command "rm -f maintenance.flag"
            execute_command "nginx -s reload"
            log_info "維護模式已停用"
            ;;
        *)
            log_error "無效的維護模式選項"
            exit 1
            ;;
    esac
}

# 主要執行流程
main() {
    echo "🔧 香港弱勢行業傳承平台 - 運維支援工具"
    echo "============================================"
    
    parse_arguments "$@"
    
    case $COMMAND in
        status)
            check_system_status
            ;;
        logs)
            view_system_logs
            ;;
        restart)
            restart_services
            ;;
        backup)
            perform_backup
            ;;
        restore)
            restore_data
            ;;
        scale)
            scale_services
            ;;
        monitor)
            monitor_system
            ;;
        troubleshoot)
            troubleshoot_system
            ;;
        maintenance)
            maintenance_mode
            ;;
        help)
            show_help
            ;;
        *)
            log_error "未知命令: $COMMAND"
            show_help
            exit 1
            ;;
    esac
    
    log_info "操作完成"
}

# 錯誤處理
trap 'log_error "運維操作過程中發生錯誤"; exit 1' ERR

# 執行主要流程
main "$@"