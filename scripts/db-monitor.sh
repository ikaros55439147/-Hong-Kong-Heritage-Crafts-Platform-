#!/bin/bash

# PostgreSQL 數據庫監控腳本
# 監控數據庫健康狀態、性能指標和資源使用情況

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 默認配置
DB_NAME="hk_heritage_crafts"
DB_USER="app_user"
DB_HOST="localhost"
DB_PORT="5432"
ALERT_THRESHOLD_CONNECTIONS=80
ALERT_THRESHOLD_CPU=80
ALERT_THRESHOLD_MEMORY=80
ALERT_THRESHOLD_DISK=90
ALERT_THRESHOLD_SLOW_QUERIES=10
LOG_FILE="./logs/db-monitor.log"

# 顯示使用說明
show_usage() {
    echo -e "${BLUE}PostgreSQL 數據庫監控腳本${NC}"
    echo "=================================="
    echo ""
    echo "用法: $0 [選項]"
    echo ""
    echo "選項:"
    echo "  -h, --host HOST        數據庫主機 (默認: localhost)"
    echo "  -p, --port PORT        數據庫端口 (默認: 5432)"
    echo "  -d, --database DB      數據庫名稱 (默認: hk_heritage_crafts)"
    echo "  -u, --user USER        數據庫用戶 (默認: app_user)"
    echo "  -l, --log FILE         日誌文件路徑 (默認: ./logs/db-monitor.log)"
    echo "  --docker               使用 Docker 容器監控"
    echo "  --continuous           持續監控模式 (每30秒刷新)"
    echo "  --alerts-only          僅顯示警告信息"
    echo "  --json                 以 JSON 格式輸出"
    echo "  --help                 顯示此幫助信息"
    echo ""
    echo "監控項目:"
    echo "  • 數據庫連接狀態"
    echo "  • 活動連接數"
    echo "  • 慢查詢統計"
    echo "  • 數據庫大小"
    echo "  • 表統計信息"
    echo "  • 索引使用情況"
    echo "  • 鎖定情況"
    echo "  • 系統資源使用"
}

# 解析命令行參數
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--host)
                DB_HOST="$2"
                shift 2
                ;;
            -p|--port)
                DB_PORT="$2"
                shift 2
                ;;
            -d|--database)
                DB_NAME="$2"
                shift 2
                ;;
            -u|--user)
                DB_USER="$2"
                shift 2
                ;;
            -l|--log)
                LOG_FILE="$2"
                shift 2
                ;;
            --docker)
                USE_DOCKER=true
                shift
                ;;
            --continuous)
                CONTINUOUS_MODE=true
                shift
                ;;
            --alerts-only)
                ALERTS_ONLY=true
                shift
                ;;
            --json)
                JSON_OUTPUT=true
                shift
                ;;
            --help)
                show_usage
                exit 0
                ;;
            *)
                echo -e "${RED}❌ 未知選項: $1${NC}"
                show_usage
                exit 1
                ;;
        esac
    done
}

# 初始化日誌
init_logging() {
    mkdir -p "$(dirname "$LOG_FILE")"
    touch "$LOG_FILE"
}

# 記錄日誌
log_message() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
    
    if [[ "$ALERTS_ONLY" != true ]] || [[ "$level" == "ALERT" ]]; then
        case $level in
            "INFO")
                echo -e "${GREEN}ℹ $message${NC}"
                ;;
            "WARN")
                echo -e "${YELLOW}⚠ $message${NC}"
                ;;
            "ERROR")
                echo -e "${RED}❌ $message${NC}"
                ;;
            "ALERT")
                echo -e "${RED}🚨 ALERT: $message${NC}"
                ;;
            *)
                echo "$message"
                ;;
        esac
    fi
}

# 執行 SQL 查詢
execute_sql() {
    local query="$1"
    local result=""
    
    if [[ "$USE_DOCKER" == true ]]; then
        result=$(docker exec hk-heritage-db psql -U "$DB_USER" -d "$DB_NAME" -t -c "$query" 2>/dev/null | tr -d ' ' || echo "ERROR")
    else
        result=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "$query" 2>/dev/null | tr -d ' ' || echo "ERROR")
    fi
    
    echo "$result"
}

# 檢查數據庫連接
check_connection() {
    local status="OK"
    
    if [[ "$USE_DOCKER" == true ]]; then
        if ! docker exec hk-heritage-db pg_isready -U "$DB_USER" -d "$DB_NAME" &> /dev/null; then
            status="FAILED"
        fi
    else
        if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" &> /dev/null; then
            status="FAILED"
        fi
    fi
    
    if [[ "$status" == "OK" ]]; then
        log_message "INFO" "數據庫連接正常"
    else
        log_message "ALERT" "數據庫連接失敗"
    fi
    
    echo "$status"
}

# 檢查活動連接數
check_connections() {
    local active_connections=$(execute_sql "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';")
    local total_connections=$(execute_sql "SELECT count(*) FROM pg_stat_activity;")
    local max_connections=$(execute_sql "SHOW max_connections;" | head -1)
    
    if [[ "$active_connections" == "ERROR" ]]; then
        log_message "ERROR" "無法獲取連接數信息"
        return
    fi
    
    local connection_percentage=$((active_connections * 100 / max_connections))
    
    log_message "INFO" "活動連接: $active_connections/$max_connections ($connection_percentage%)"
    
    if [[ $connection_percentage -gt $ALERT_THRESHOLD_CONNECTIONS ]]; then
        log_message "ALERT" "連接數過高: $connection_percentage% (閾值: $ALERT_THRESHOLD_CONNECTIONS%)"
    fi
    
    echo "$active_connections,$total_connections,$max_connections"
}

# 檢查慢查詢
check_slow_queries() {
    local slow_queries=$(execute_sql "SELECT count(*) FROM pg_stat_activity WHERE state = 'active' AND now() - query_start > interval '5 minutes';")
    
    if [[ "$slow_queries" == "ERROR" ]]; then
        log_message "ERROR" "無法獲取慢查詢信息"
        return
    fi
    
    log_message "INFO" "慢查詢數量: $slow_queries"
    
    if [[ $slow_queries -gt $ALERT_THRESHOLD_SLOW_QUERIES ]]; then
        log_message "ALERT" "慢查詢過多: $slow_queries (閾值: $ALERT_THRESHOLD_SLOW_QUERIES)"
    fi
    
    # 顯示最慢的查詢
    if [[ $slow_queries -gt 0 ]]; then
        local slow_query_details
        if [[ "$USE_DOCKER" == true ]]; then
            slow_query_details=$(docker exec hk-heritage-db psql -U "$DB_USER" -d "$DB_NAME" -c "
                SELECT pid, now() - query_start AS duration, left(query, 50) AS query_preview 
                FROM pg_stat_activity 
                WHERE state = 'active' AND now() - query_start > interval '5 minutes'
                ORDER BY query_start 
                LIMIT 3;" 2>/dev/null || echo "ERROR")
        else
            slow_query_details=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
                SELECT pid, now() - query_start AS duration, left(query, 50) AS query_preview 
                FROM pg_stat_activity 
                WHERE state = 'active' AND now() - query_start > interval '5 minutes'
                ORDER BY query_start 
                LIMIT 3;" 2>/dev/null || echo "ERROR")
        fi
        
        if [[ "$slow_query_details" != "ERROR" ]]; then
            log_message "WARN" "慢查詢詳情:\n$slow_query_details"
        fi
    fi
    
    echo "$slow_queries"
}

# 檢查數據庫大小
check_database_size() {
    local db_size=$(execute_sql "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));")
    local db_size_bytes=$(execute_sql "SELECT pg_database_size('$DB_NAME');")
    
    if [[ "$db_size" == "ERROR" ]]; then
        log_message "ERROR" "無法獲取數據庫大小"
        return
    fi
    
    log_message "INFO" "數據庫大小: $db_size"
    
    echo "$db_size,$db_size_bytes"
}

# 檢查表統計
check_table_stats() {
    local table_stats
    if [[ "$USE_DOCKER" == true ]]; then
        table_stats=$(docker exec hk-heritage-db psql -U "$DB_USER" -d "$DB_NAME" -c "
            SELECT 
                schemaname,
                tablename,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
                n_tup_ins as inserts,
                n_tup_upd as updates,
                n_tup_del as deletes
            FROM pg_stat_user_tables 
            ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC 
            LIMIT 5;" 2>/dev/null || echo "ERROR")
    else
        table_stats=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
            SELECT 
                schemaname,
                tablename,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
                n_tup_ins as inserts,
                n_tup_upd as updates,
                n_tup_del as deletes
            FROM pg_stat_user_tables 
            ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC 
            LIMIT 5;" 2>/dev/null || echo "ERROR")
    fi
    
    if [[ "$table_stats" != "ERROR" ]]; then
        log_message "INFO" "最大的5個表:\n$table_stats"
    else
        log_message "ERROR" "無法獲取表統計信息"
    fi
}

# 檢查索引使用情況
check_index_usage() {
    local unused_indexes
    if [[ "$USE_DOCKER" == true ]]; then
        unused_indexes=$(docker exec hk-heritage-db psql -U "$DB_USER" -d "$DB_NAME" -c "
            SELECT 
                schemaname,
                tablename,
                indexname,
                idx_scan
            FROM pg_stat_user_indexes 
            WHERE idx_scan = 0 
            ORDER BY schemaname, tablename;" 2>/dev/null || echo "ERROR")
    else
        unused_indexes=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
            SELECT 
                schemaname,
                tablename,
                indexname,
                idx_scan
            FROM pg_stat_user_indexes 
            WHERE idx_scan = 0 
            ORDER BY schemaname, tablename;" 2>/dev/null || echo "ERROR")
    fi
    
    if [[ "$unused_indexes" != "ERROR" ]]; then
        local unused_count=$(echo "$unused_indexes" | grep -c "^" || echo "0")
        if [[ $unused_count -gt 0 ]]; then
            log_message "WARN" "發現 $unused_count 個未使用的索引"
        else
            log_message "INFO" "所有索引都在使用中"
        fi
    else
        log_message "ERROR" "無法獲取索引使用情況"
    fi
}

# 檢查鎖定情況
check_locks() {
    local blocked_queries=$(execute_sql "SELECT count(*) FROM pg_locks WHERE NOT granted;")
    
    if [[ "$blocked_queries" == "ERROR" ]]; then
        log_message "ERROR" "無法獲取鎖定信息"
        return
    fi
    
    if [[ $blocked_queries -gt 0 ]]; then
        log_message "ALERT" "發現 $blocked_queries 個被阻塞的查詢"
        
        # 顯示鎖定詳情
        local lock_details
        if [[ "$USE_DOCKER" == true ]]; then
            lock_details=$(docker exec hk-heritage-db psql -U "$DB_USER" -d "$DB_NAME" -c "
                SELECT 
                    blocked_locks.pid AS blocked_pid,
                    blocked_activity.usename AS blocked_user,
                    blocking_locks.pid AS blocking_pid,
                    blocking_activity.usename AS blocking_user,
                    blocked_activity.query AS blocked_statement
                FROM pg_catalog.pg_locks blocked_locks
                JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
                JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
                    AND blocking_locks.DATABASE IS NOT DISTINCT FROM blocked_locks.DATABASE
                    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
                    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
                    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
                    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
                    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
                    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
                    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
                    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
                    AND blocking_locks.pid != blocked_locks.pid
                JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
                WHERE NOT blocked_locks.GRANTED;" 2>/dev/null || echo "ERROR")
        else
            lock_details=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
                SELECT 
                    blocked_locks.pid AS blocked_pid,
                    blocked_activity.usename AS blocked_user,
                    blocking_locks.pid AS blocking_pid,
                    blocking_activity.usename AS blocking_user,
                    blocked_activity.query AS blocked_statement
                FROM pg_catalog.pg_locks blocked_locks
                JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
                JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
                    AND blocking_locks.DATABASE IS NOT DISTINCT FROM blocked_locks.DATABASE
                    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
                    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
                    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
                    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
                    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
                    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
                    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
                    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
                    AND blocking_locks.pid != blocked_locks.pid
                JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
                WHERE NOT blocked_locks.GRANTED;" 2>/dev/null || echo "ERROR")
        fi
        
        if [[ "$lock_details" != "ERROR" ]]; then
            log_message "WARN" "鎖定詳情:\n$lock_details"
        fi
    else
        log_message "INFO" "沒有被阻塞的查詢"
    fi
    
    echo "$blocked_queries"
}

# 檢查系統資源
check_system_resources() {
    if [[ "$USE_DOCKER" == true ]]; then
        # Docker 容器資源使用
        local container_stats=$(docker stats hk-heritage-db --no-stream --format "table {{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" 2>/dev/null || echo "ERROR")
        
        if [[ "$container_stats" != "ERROR" ]]; then
            log_message "INFO" "Docker 容器資源使用:\n$container_stats"
        else
            log_message "ERROR" "無法獲取 Docker 容器資源信息"
        fi
    else
        # 系統資源使用
        if command -v free &> /dev/null; then
            local memory_info=$(free -h)
            log_message "INFO" "系統內存使用:\n$memory_info"
        fi
        
        if command -v df &> /dev/null; then
            local disk_info=$(df -h | grep -E "/$|/var|/tmp")
            log_message "INFO" "磁盤使用情況:\n$disk_info"
        fi
    fi
}

# 生成 JSON 報告
generate_json_report() {
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local connection_status=$(check_connection)
    local connections_info=$(check_connections)
    local slow_queries=$(check_slow_queries)
    local db_size_info=$(check_database_size)
    local locks=$(check_locks)
    
    # 解析連接信息
    IFS=',' read -r active_conn total_conn max_conn <<< "$connections_info"
    
    # 解析數據庫大小信息
    IFS=',' read -r db_size_pretty db_size_bytes <<< "$db_size_info"
    
    cat << EOF
{
  "timestamp": "$timestamp",
  "database": "$DB_NAME",
  "host": "$DB_HOST:$DB_PORT",
  "connection_status": "$connection_status",
  "connections": {
    "active": $active_conn,
    "total": $total_conn,
    "max": $max_conn,
    "percentage": $((active_conn * 100 / max_conn))
  },
  "performance": {
    "slow_queries": $slow_queries,
    "blocked_queries": $locks
  },
  "storage": {
    "size_pretty": "$db_size_pretty",
    "size_bytes": $db_size_bytes
  }
}
EOF
}

# 顯示監控儀表板
show_dashboard() {
    clear
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                    PostgreSQL 監控儀表板                      ║${NC}"
    echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${CYAN}║ 數據庫: $DB_NAME @ $DB_HOST:$DB_PORT${NC}"
    echo -e "${CYAN}║ 時間: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # 連接狀態
    echo -e "${BLUE}🔗 連接狀態${NC}"
    echo "────────────────────────────────────────"
    check_connection > /dev/null
    
    # 連接數
    echo -e "${BLUE}👥 連接統計${NC}"
    echo "────────────────────────────────────────"
    check_connections > /dev/null
    
    # 性能指標
    echo -e "${BLUE}⚡ 性能指標${NC}"
    echo "────────────────────────────────────────"
    check_slow_queries > /dev/null
    check_locks > /dev/null
    
    # 存儲信息
    echo -e "${BLUE}💾 存儲信息${NC}"
    echo "────────────────────────────────────────"
    check_database_size > /dev/null
    
    # 表統計
    echo -e "${BLUE}📊 表統計${NC}"
    echo "────────────────────────────────────────"
    check_table_stats
    
    # 索引使用
    echo -e "${BLUE}🔍 索引使用${NC}"
    echo "────────────────────────────────────────"
    check_index_usage
    
    # 系統資源
    echo -e "${BLUE}🖥 系統資源${NC}"
    echo "────────────────────────────────────────"
    check_system_resources
    
    echo ""
    echo -e "${CYAN}按 Ctrl+C 退出持續監控模式${NC}"
}

# 主函數
main() {
    # 解析參數
    parse_args "$@"
    
    # 初始化日誌
    init_logging
    
    if [[ "$JSON_OUTPUT" == true ]]; then
        generate_json_report
        return
    fi
    
    if [[ "$CONTINUOUS_MODE" == true ]]; then
        while true; do
            show_dashboard
            sleep 30
        done
    else
        echo -e "${GREEN}🔍 PostgreSQL 數據庫監控報告${NC}"
        echo "=================================="
        echo ""
        
        check_connection > /dev/null
        check_connections > /dev/null
        check_slow_queries > /dev/null
        check_database_size > /dev/null
        check_table_stats
        check_index_usage
        check_locks > /dev/null
        check_system_resources
        
        echo ""
        echo -e "${GREEN}✅ 監控檢查完成${NC}"
        echo -e "${BLUE}📄 詳細日誌: $LOG_FILE${NC}"
    fi
}

# 錯誤處理
trap 'echo -e "${RED}❌ 監控過程中發生錯誤${NC}"; exit 1' ERR

# 執行主函數
main "$@"