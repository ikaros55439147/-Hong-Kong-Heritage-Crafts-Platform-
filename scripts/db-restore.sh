#!/bin/bash

# PostgreSQL 數據庫恢復腳本
# 支持從備份文件恢復數據庫

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
FORCE_RESTORE=false
CREATE_DB=false

# 顯示使用說明
show_usage() {
    echo -e "${BLUE}PostgreSQL 數據庫恢復腳本${NC}"
    echo "=================================="
    echo ""
    echo "用法: $0 [選項] <備份文件>"
    echo ""
    echo "選項:"
    echo "  -h, --host HOST        數據庫主機 (默認: localhost)"
    echo "  -p, --port PORT        數據庫端口 (默認: 5432)"
    echo "  -d, --database DB      目標數據庫名稱 (默認: hk_heritage_crafts)"
    echo "  -u, --user USER        數據庫用戶 (默認: app_user)"
    echo "  -f, --force            強制恢復 (不詢問確認)"
    echo "  --create-db            如果數據庫不存在則創建"
    echo "  --docker               使用 Docker 容器恢復"
    echo "  --list                 列出可用的備份文件"
    echo "  --help                 顯示此幫助信息"
    echo ""
    echo "參數:"
    echo "  <備份文件>             要恢復的備份文件路徑"
    echo ""
    echo "示例:"
    echo "  $0 backups/hk_heritage_crafts_20241222_120000.sql"
    echo "  $0 --docker --force backup.sql.gz"
    echo "  $0 --list"
    echo "  $0 --create-db -h prod.example.com backup.sql"
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
            -f|--force)
                FORCE_RESTORE=true
                shift
                ;;
            --create-db)
                CREATE_DB=true
                shift
                ;;
            --docker)
                USE_DOCKER=true
                shift
                ;;
            --list)
                list_backups
                exit 0
                ;;
            --help)
                show_usage
                exit 0
                ;;
            -*)
                echo -e "${RED}❌ 未知選項: $1${NC}"
                show_usage
                exit 1
                ;;
            *)
                if [[ -z "$BACKUP_FILE" ]]; then
                    BACKUP_FILE="$1"
                else
                    echo -e "${RED}❌ 多餘的參數: $1${NC}"
                    show_usage
                    exit 1
                fi
                shift
                ;;
        esac
    done
}

# 列出可用的備份文件
list_backups() {
    echo -e "${BLUE}📋 可用的備份文件${NC}"
    echo "=================================="
    
    if [[ ! -d "$BACKUP_DIR" ]]; then
        echo -e "${YELLOW}⚠ 備份目錄不存在: $BACKUP_DIR${NC}"
        return
    fi
    
    local backup_files=($(find "$BACKUP_DIR" -name "*.sql*" -type f | sort -r))
    
    if [[ ${#backup_files[@]} -eq 0 ]]; then
        echo -e "${YELLOW}⚠ 沒有找到備份文件${NC}"
        return
    fi
    
    echo -e "${GREEN}找到 ${#backup_files[@]} 個備份文件:${NC}"
    echo ""
    
    for file in "${backup_files[@]}"; do
        local size=$(du -h "$file" | cut -f1)
        local date=$(stat -c %y "$file" 2>/dev/null | cut -d' ' -f1,2 | cut -d'.' -f1 || echo "未知")
        echo -e "${GREEN}  $(basename "$file")${NC}"
        echo -e "${YELLOW}    大小: $size${NC}"
        echo -e "${YELLOW}    日期: $date${NC}"
        echo ""
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
        if ! command -v psql &> /dev/null; then
            echo -e "${RED}❌ psql 未安裝${NC}"
            echo -e "${YELLOW}請安裝 PostgreSQL 客戶端工具${NC}"
            exit 1
        fi
        echo -e "${GREEN}✓ psql 已安裝${NC}"
    fi
}

# 驗證備份文件
validate_backup_file() {
    if [[ -z "$BACKUP_FILE" ]]; then
        echo -e "${RED}❌ 請指定備份文件${NC}"
        echo ""
        show_usage
        exit 1
    fi
    
    if [[ ! -f "$BACKUP_FILE" ]]; then
        echo -e "${RED}❌ 備份文件不存在: $BACKUP_FILE${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ 備份文件存在: $BACKUP_FILE${NC}"
    
    # 檢查文件大小
    local file_size=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}📊 文件大小: $file_size${NC}"
    
    # 檢查是否為壓縮文件
    if [[ "$BACKUP_FILE" == *.gz ]]; then
        echo -e "${YELLOW}📦 檢測到壓縮文件${NC}"
        COMPRESSED=true
    fi
}

# 測試數據庫連接
test_connection() {
    echo -e "${BLUE}🔗 測試數據庫連接...${NC}"
    
    if [[ "$USE_DOCKER" == true ]]; then
        if ! docker exec hk-heritage-db pg_isready -U "$DB_USER" &> /dev/null; then
            echo -e "${RED}❌ 無法連接到 Docker 數據庫${NC}"
            exit 1
        fi
    else
        if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" &> /dev/null; then
            echo -e "${RED}❌ 無法連接到數據庫 $DB_HOST:$DB_PORT${NC}"
            exit 1
        fi
    fi
    
    echo -e "${GREEN}✓ 數據庫連接正常${NC}"
}

# 檢查數據庫是否存在
check_database_exists() {
    echo -e "${BLUE}🗄 檢查目標數據庫...${NC}"
    
    local db_exists=false
    
    if [[ "$USE_DOCKER" == true ]]; then
        if docker exec hk-heritage-db psql -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
            db_exists=true
        fi
    else
        if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
            db_exists=true
        fi
    fi
    
    if [[ "$db_exists" == true ]]; then
        echo -e "${GREEN}✓ 數據庫 '$DB_NAME' 存在${NC}"
        DATABASE_EXISTS=true
    else
        echo -e "${YELLOW}⚠ 數據庫 '$DB_NAME' 不存在${NC}"
        DATABASE_EXISTS=false
        
        if [[ "$CREATE_DB" == true ]]; then
            create_database
        else
            echo -e "${RED}❌ 目標數據庫不存在，使用 --create-db 選項來創建${NC}"
            exit 1
        fi
    fi
}

# 創建數據庫
create_database() {
    echo -e "${BLUE}🏗 創建數據庫 '$DB_NAME'...${NC}"
    
    if [[ "$USE_DOCKER" == true ]]; then
        docker exec hk-heritage-db createdb -U "$DB_USER" "$DB_NAME"
    else
        PGPASSWORD="$DB_PASSWORD" createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
    fi
    
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✅ 數據庫創建成功${NC}"
        DATABASE_EXISTS=true
    else
        echo -e "${RED}❌ 數據庫創建失敗${NC}"
        exit 1
    fi
}

# 備份當前數據庫
backup_current_database() {
    if [[ "$DATABASE_EXISTS" == true ]]; then
        echo -e "${BLUE}💾 備份當前數據庫...${NC}"
        
        local current_backup="$BACKUP_DIR/pre_restore_${DB_NAME}_$(date +%Y%m%d_%H%M%S).sql"
        mkdir -p "$BACKUP_DIR"
        
        if [[ "$USE_DOCKER" == true ]]; then
            docker exec hk-heritage-db pg_dump -U "$DB_USER" -d "$DB_NAME" > "$current_backup"
        else
            PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > "$current_backup"
        fi
        
        if [[ $? -eq 0 ]]; then
            echo -e "${GREEN}✅ 當前數據庫已備份到: $current_backup${NC}"
        else
            echo -e "${YELLOW}⚠ 當前數據庫備份失敗，但將繼續恢復${NC}"
        fi
    fi
}

# 確認恢復操作
confirm_restore() {
    if [[ "$FORCE_RESTORE" == true ]]; then
        return 0
    fi
    
    echo ""
    echo -e "${YELLOW}⚠ 警告: 此操作將覆蓋數據庫 '$DB_NAME' 的所有數據${NC}"
    echo -e "${YELLOW}📁 備份文件: $BACKUP_FILE${NC}"
    echo -e "${YELLOW}🎯 目標數據庫: $DB_NAME@$DB_HOST:$DB_PORT${NC}"
    echo ""
    
    read -p "確定要繼續嗎？(y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}❌ 操作已取消${NC}"
        exit 0
    fi
}

# 執行恢復
perform_restore() {
    echo -e "${BLUE}🔄 開始恢復數據庫...${NC}"
    echo -e "${YELLOW}備份文件: $BACKUP_FILE${NC}"
    echo -e "${YELLOW}目標數據庫: $DB_NAME${NC}"
    
    local restore_cmd=""
    local input_file="$BACKUP_FILE"
    
    # 處理壓縮文件
    if [[ "$COMPRESSED" == true ]]; then
        echo -e "${BLUE}📦 解壓縮備份文件...${NC}"
        input_file="-"
        restore_cmd="gunzip -c '$BACKUP_FILE' |"
    fi
    
    # 構建恢復命令
    if [[ "$USE_DOCKER" == true ]]; then
        if [[ "$COMPRESSED" == true ]]; then
            eval "$restore_cmd docker exec -i hk-heritage-db psql -U '$DB_USER' -d '$DB_NAME'"
        else
            docker exec -i hk-heritage-db psql -U "$DB_USER" -d "$DB_NAME" < "$input_file"
        fi
    else
        if [[ "$COMPRESSED" == true ]]; then
            eval "$restore_cmd PGPASSWORD='$DB_PASSWORD' psql -h '$DB_HOST' -p '$DB_PORT' -U '$DB_USER' -d '$DB_NAME'"
        else
            PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" < "$input_file"
        fi
    fi
    
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✅ 數據庫恢復成功${NC}"
    else
        echo -e "${RED}❌ 數據庫恢復失敗${NC}"
        exit 1
    fi
}

# 驗證恢復結果
verify_restore() {
    echo -e "${BLUE}🔍 驗證恢復結果...${NC}"
    
    # 檢查表數量
    local table_count
    if [[ "$USE_DOCKER" == true ]]; then
        table_count=$(docker exec hk-heritage-db psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')
    else
        table_count=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')
    fi
    
    echo -e "${GREEN}📊 恢復的表數量: $table_count${NC}"
    
    # 檢查一些關鍵表的記錄數
    local tables=("users" "courses" "products" "bookings")
    
    for table in "${tables[@]}"; do
        local count
        if [[ "$USE_DOCKER" == true ]]; then
            count=$(docker exec hk-heritage-db psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM $table;" 2>/dev/null | tr -d ' ' || echo "N/A")
        else
            count=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM $table;" 2>/dev/null | tr -d ' ' || echo "N/A")
        fi
        
        if [[ "$count" != "N/A" ]]; then
            echo -e "${GREEN}📋 $table 表記錄數: $count${NC}"
        fi
    done
    
    echo -e "${GREEN}✅ 恢復驗證完成${NC}"
}

# 更新 Prisma 客戶端
update_prisma() {
    if [[ -f "package.json" ]] && grep -q "prisma" package.json; then
        echo -e "${BLUE}🔧 更新 Prisma 客戶端...${NC}"
        
        if command -v npm &> /dev/null; then
            npx prisma generate
            echo -e "${GREEN}✅ Prisma 客戶端已更新${NC}"
        else
            echo -e "${YELLOW}⚠ npm 未安裝，請手動運行: npx prisma generate${NC}"
        fi
    fi
}

# 主函數
main() {
    echo -e "${GREEN}🔄 PostgreSQL 數據庫恢復腳本${NC}"
    echo "=================================="
    echo ""
    
    # 解析參數
    parse_args "$@"
    
    # 檢查依賴
    check_dependencies
    
    # 驗證備份文件
    validate_backup_file
    
    # 測試連接
    test_connection
    
    # 檢查數據庫
    check_database_exists
    
    # 備份當前數據庫
    backup_current_database
    
    # 確認恢復
    confirm_restore
    
    # 執行恢復
    perform_restore
    
    # 驗證結果
    verify_restore
    
    # 更新 Prisma
    update_prisma
    
    echo ""
    echo -e "${GREEN}🎉 數據庫恢復完成！${NC}"
    echo ""
    echo -e "${GREEN}📋 下一步建議：${NC}"
    echo "1. 檢查應用程式功能是否正常"
    echo "2. 驗證關鍵數據是否完整"
    echo "3. 如有問題，可從預恢復備份中恢復"
}

# 錯誤處理
trap 'echo -e "${RED}❌ 恢復過程中發生錯誤${NC}"; exit 1' ERR

# 執行主函數
main "$@"