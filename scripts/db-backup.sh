#!/bin/bash

# PostgreSQL 數據庫備份腳本
# 支持本地和遠程數據庫備份

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 默認配置
DB_NAME="hk_heritage_crafts"
DB_USER="app_user"
DB_HOST="localhost"
DB_PORT="5432"
BACKUP_DIR="./backups"
RETENTION_DAYS=30
COMPRESS=true
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 顯示使用說明
show_usage() {
    echo -e "${BLUE}PostgreSQL 數據庫備份腳本${NC}"
    echo "=================================="
    echo ""
    echo "用法: $0 [選項]"
    echo ""
    echo "選項:"
    echo "  -h, --host HOST        數據庫主機 (默認: localhost)"
    echo "  -p, --port PORT        數據庫端口 (默認: 5432)"
    echo "  -d, --database DB      數據庫名稱 (默認: hk_heritage_crafts)"
    echo "  -u, --user USER        數據庫用戶 (默認: app_user)"
    echo "  -o, --output DIR       備份輸出目錄 (默認: ./backups)"
    echo "  -r, --retention DAYS   備份保留天數 (默認: 30)"
    echo "  -c, --compress         壓縮備份文件 (默認: 啟用)"
    echo "  --no-compress          不壓縮備份文件"
    echo "  --docker               使用 Docker 容器備份"
    echo "  --full                 完整備份 (包括權限和所有者)"
    echo "  --schema-only          僅備份結構"
    echo "  --data-only            僅備份數據"
    echo "  --help                 顯示此幫助信息"
    echo ""
    echo "示例:"
    echo "  $0                                    # 基本備份"
    echo "  $0 --docker                          # Docker 容器備份"
    echo "  $0 -h prod.example.com -u postgres   # 遠程數據庫備份"
    echo "  $0 --schema-only                     # 僅備份結構"
    echo "  $0 --full --no-compress              # 完整備份，不壓縮"
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
            -o|--output)
                BACKUP_DIR="$2"
                shift 2
                ;;
            -r|--retention)
                RETENTION_DAYS="$2"
                shift 2
                ;;
            -c|--compress)
                COMPRESS=true
                shift
                ;;
            --no-compress)
                COMPRESS=false
                shift
                ;;
            --docker)
                USE_DOCKER=true
                shift
                ;;
            --full)
                BACKUP_TYPE="full"
                shift
                ;;
            --schema-only)
                BACKUP_TYPE="schema"
                shift
                ;;
            --data-only)
                BACKUP_TYPE="data"
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

# 檢查依賴
check_dependencies() {
    echo -e "${BLUE}🔍 檢查依賴...${NC}"
    
    if [[ "$USE_DOCKER" == true ]]; then
        if ! command -v docker &> /dev/null; then
            echo -e "${RED}❌ Docker 未安裝${NC}"
            exit 1
        fi
        echo -e "${GREEN}✓ Docker 已安裝${NC}"
    else
        if ! command -v pg_dump &> /dev/null; then
            echo -e "${RED}❌ pg_dump 未安裝${NC}"
            echo -e "${YELLOW}請安裝 PostgreSQL 客戶端工具${NC}"
            exit 1
        fi
        echo -e "${GREEN}✓ pg_dump 已安裝${NC}"
    fi
    
    if [[ "$COMPRESS" == true ]] && ! command -v gzip &> /dev/null; then
        echo -e "${YELLOW}⚠ gzip 未安裝，將不壓縮備份文件${NC}"
        COMPRESS=false
    fi
}

# 創建備份目錄
create_backup_dir() {
    echo -e "${BLUE}📁 創建備份目錄...${NC}"
    
    mkdir -p "$BACKUP_DIR"
    
    if [[ ! -w "$BACKUP_DIR" ]]; then
        echo -e "${RED}❌ 無法寫入備份目錄: $BACKUP_DIR${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ 備份目錄已準備: $BACKUP_DIR${NC}"
}

# 測試數據庫連接
test_connection() {
    echo -e "${BLUE}🔗 測試數據庫連接...${NC}"
    
    if [[ "$USE_DOCKER" == true ]]; then
        if ! docker exec hk-heritage-db pg_isready -U "$DB_USER" -d "$DB_NAME" &> /dev/null; then
            echo -e "${RED}❌ 無法連接到 Docker 數據庫${NC}"
            exit 1
        fi
    else
        if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" &> /dev/null; then
            echo -e "${RED}❌ 無法連接到數據庫 $DB_HOST:$DB_PORT${NC}"
            exit 1
        fi
    fi
    
    echo -e "${GREEN}✓ 數據庫連接正常${NC}"
}

# 執行備份
perform_backup() {
    local backup_file="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql"
    local pg_dump_options=""
    
    echo -e "${BLUE}💾 開始備份數據庫...${NC}"
    echo -e "${YELLOW}數據庫: $DB_NAME${NC}"
    echo -e "${YELLOW}主機: $DB_HOST:$DB_PORT${NC}"
    echo -e "${YELLOW}用戶: $DB_USER${NC}"
    echo -e "${YELLOW}備份文件: $backup_file${NC}"
    
    # 設置備份選項
    case "$BACKUP_TYPE" in
        "full")
            pg_dump_options="--verbose --no-password --clean --if-exists --create"
            backup_file="$BACKUP_DIR/${DB_NAME}_full_${TIMESTAMP}.sql"
            ;;
        "schema")
            pg_dump_options="--verbose --no-password --schema-only"
            backup_file="$BACKUP_DIR/${DB_NAME}_schema_${TIMESTAMP}.sql"
            ;;
        "data")
            pg_dump_options="--verbose --no-password --data-only"
            backup_file="$BACKUP_DIR/${DB_NAME}_data_${TIMESTAMP}.sql"
            ;;
        *)
            pg_dump_options="--verbose --no-password"
            ;;
    esac
    
    # 執行備份
    if [[ "$USE_DOCKER" == true ]]; then
        echo -e "${BLUE}🐳 使用 Docker 執行備份...${NC}"
        docker exec hk-heritage-db pg_dump \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            $pg_dump_options \
            > "$backup_file"
    else
        echo -e "${BLUE}🏠 使用本地 pg_dump 執行備份...${NC}"
        PGPASSWORD="$DB_PASSWORD" pg_dump \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            $pg_dump_options \
            > "$backup_file"
    fi
    
    # 檢查備份是否成功
    if [[ $? -eq 0 && -f "$backup_file" && -s "$backup_file" ]]; then
        local file_size=$(du -h "$backup_file" | cut -f1)
        echo -e "${GREEN}✅ 備份成功完成${NC}"
        echo -e "${GREEN}📊 備份文件大小: $file_size${NC}"
        
        # 壓縮備份文件
        if [[ "$COMPRESS" == true ]]; then
            echo -e "${BLUE}🗜 壓縮備份文件...${NC}"
            gzip "$backup_file"
            backup_file="${backup_file}.gz"
            local compressed_size=$(du -h "$backup_file" | cut -f1)
            echo -e "${GREEN}✅ 壓縮完成，壓縮後大小: $compressed_size${NC}"
        fi
        
        echo -e "${GREEN}📁 最終備份文件: $backup_file${NC}"
    else
        echo -e "${RED}❌ 備份失敗${NC}"
        exit 1
    fi
}

# 清理舊備份
cleanup_old_backups() {
    echo -e "${BLUE}🧹 清理舊備份文件...${NC}"
    
    local deleted_count=0
    
    # 查找並刪除超過保留期的備份文件
    while IFS= read -r -d '' file; do
        rm "$file"
        ((deleted_count++))
        echo -e "${YELLOW}🗑 已刪除: $(basename "$file")${NC}"
    done < <(find "$BACKUP_DIR" -name "${DB_NAME}_*.sql*" -mtime +$RETENTION_DAYS -print0 2>/dev/null)
    
    if [[ $deleted_count -gt 0 ]]; then
        echo -e "${GREEN}✅ 已清理 $deleted_count 個舊備份文件${NC}"
    else
        echo -e "${GREEN}✅ 沒有需要清理的舊備份文件${NC}"
    fi
}

# 顯示備份統計
show_backup_stats() {
    echo -e "${BLUE}📊 備份統計信息${NC}"
    echo "=================================="
    
    local total_backups=$(find "$BACKUP_DIR" -name "${DB_NAME}_*.sql*" | wc -l)
    local total_size=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1 || echo "未知")
    
    echo -e "${GREEN}總備份數量: $total_backups${NC}"
    echo -e "${GREEN}總佔用空間: $total_size${NC}"
    echo ""
    
    echo -e "${BLUE}最近的備份文件:${NC}"
    find "$BACKUP_DIR" -name "${DB_NAME}_*.sql*" -printf "%T@ %Tc %p\n" 2>/dev/null | \
        sort -nr | \
        head -5 | \
        while read timestamp date time timezone file; do
            local size=$(du -h "$file" 2>/dev/null | cut -f1 || echo "未知")
            echo -e "${GREEN}  $(basename "$file") - $size - $date $time${NC}"
        done
}

# 發送通知 (可選)
send_notification() {
    local status="$1"
    local message="$2"
    
    # 這裡可以添加郵件、Slack 或其他通知方式
    # 例如：
    # curl -X POST -H 'Content-type: application/json' \
    #     --data "{\"text\":\"數據庫備份 $status: $message\"}" \
    #     "$SLACK_WEBHOOK_URL"
    
    echo -e "${BLUE}📧 通知: $status - $message${NC}"
}

# 主函數
main() {
    echo -e "${GREEN}🚀 PostgreSQL 數據庫備份腳本${NC}"
    echo "=================================="
    echo ""
    
    # 解析參數
    parse_args "$@"
    
    # 檢查依賴
    check_dependencies
    
    # 創建備份目錄
    create_backup_dir
    
    # 測試連接
    test_connection
    
    # 執行備份
    perform_backup
    
    # 清理舊備份
    cleanup_old_backups
    
    # 顯示統計
    show_backup_stats
    
    # 發送成功通知
    send_notification "成功" "數據庫 $DB_NAME 備份完成"
    
    echo ""
    echo -e "${GREEN}🎉 備份流程完成！${NC}"
}

# 錯誤處理
trap 'echo -e "${RED}❌ 備份過程中發生錯誤${NC}"; send_notification "失敗" "數據庫備份過程中發生錯誤"; exit 1' ERR

# 執行主函數
main "$@"