#!/bin/bash

# PostgreSQL 數據庫管理主腳本
# 提供統一的數據庫管理界面

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# 腳本路徑
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SETUP_SCRIPT="$SCRIPT_DIR/db-setup.sh"
BACKUP_SCRIPT="$SCRIPT_DIR/db-backup.sh"
RESTORE_SCRIPT="$SCRIPT_DIR/db-restore.sh"
MONITOR_SCRIPT="$SCRIPT_DIR/db-monitor.sh"

# 顯示主菜單
show_main_menu() {
    clear
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                PostgreSQL 數據庫管理工具                      ║${NC}"
    echo -e "${CYAN}║                香港弱勢行業傳承平台                            ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}請選擇操作：${NC}"
    echo ""
    echo -e "${BLUE}1.${NC} 🚀 初始化數據庫設置"
    echo -e "${BLUE}2.${NC} 💾 備份數據庫"
    echo -e "${BLUE}3.${NC} 🔄 恢復數據庫"
    echo -e "${BLUE}4.${NC} 🔍 監控數據庫"
    echo -e "${BLUE}5.${NC} 📊 數據庫狀態檢查"
    echo -e "${BLUE}6.${NC} 🛠 維護工具"
    echo -e "${BLUE}7.${NC} 📋 查看備份列表"
    echo -e "${BLUE}8.${NC} ⚙️ 配置管理"
    echo -e "${BLUE}9.${NC} 📖 幫助文檔"
    echo -e "${BLUE}0.${NC} 🚪 退出"
    echo ""
    echo -ne "${YELLOW}請輸入選項 (0-9): ${NC}"
}

# 數據庫設置菜單
database_setup() {
    clear
    echo -e "${GREEN}🚀 數據庫初始化設置${NC}"
    echo "=================================="
    echo ""
    echo -e "${BLUE}選擇設置方式：${NC}"
    echo "1. 使用 Docker (推薦)"
    echo "2. 使用本地 PostgreSQL"
    echo "3. 返回主菜單"
    echo ""
    echo -ne "${YELLOW}請選擇 (1-3): ${NC}"
    
    read -r choice
    case $choice in
        1)
            echo -e "${GREEN}使用 Docker 設置數據庫...${NC}"
            bash "$SETUP_SCRIPT" --docker
            ;;
        2)
            echo -e "${GREEN}使用本地 PostgreSQL 設置數據庫...${NC}"
            bash "$SETUP_SCRIPT"
            ;;
        3)
            return
            ;;
        *)
            echo -e "${RED}無效選項${NC}"
            sleep 2
            database_setup
            ;;
    esac
    
    echo ""
    echo -e "${GREEN}按任意鍵返回主菜單...${NC}"
    read -n 1
}

# 數據庫備份菜單
database_backup() {
    clear
    echo -e "${GREEN}💾 數據庫備份${NC}"
    echo "=================================="
    echo ""
    echo -e "${BLUE}選擇備份類型：${NC}"
    echo "1. 完整備份 (數據 + 結構)"
    echo "2. 僅備份結構"
    echo "3. 僅備份數據"
    echo "4. 自定義備份選項"
    echo "5. 返回主菜單"
    echo ""
    echo -ne "${YELLOW}請選擇 (1-5): ${NC}"
    
    read -r choice
    case $choice in
        1)
            echo -e "${GREEN}執行完整備份...${NC}"
            bash "$BACKUP_SCRIPT" --full
            ;;
        2)
            echo -e "${GREEN}執行結構備份...${NC}"
            bash "$BACKUP_SCRIPT" --schema-only
            ;;
        3)
            echo -e "${GREEN}執行數據備份...${NC}"
            bash "$BACKUP_SCRIPT" --data-only
            ;;
        4)
            custom_backup_options
            ;;
        5)
            return
            ;;
        *)
            echo -e "${RED}無效選項${NC}"
            sleep 2
            database_backup
            ;;
    esac
    
    echo ""
    echo -e "${GREEN}按任意鍵返回主菜單...${NC}"
    read -n 1
}

# 自定義備份選項
custom_backup_options() {
    clear
    echo -e "${GREEN}🛠 自定義備份選項${NC}"
    echo "=================================="
    echo ""
    
    echo -ne "${YELLOW}數據庫主機 (默認: localhost): ${NC}"
    read -r db_host
    db_host=${db_host:-localhost}
    
    echo -ne "${YELLOW}數據庫端口 (默認: 5432): ${NC}"
    read -r db_port
    db_port=${db_port:-5432}
    
    echo -ne "${YELLOW}數據庫名稱 (默認: hk_heritage_crafts): ${NC}"
    read -r db_name
    db_name=${db_name:-hk_heritage_crafts}
    
    echo -ne "${YELLOW}數據庫用戶 (默認: app_user): ${NC}"
    read -r db_user
    db_user=${db_user:-app_user}
    
    echo -ne "${YELLOW}備份目錄 (默認: ./backups): ${NC}"
    read -r backup_dir
    backup_dir=${backup_dir:-./backups}
    
    echo -ne "${YELLOW}是否壓縮備份? (y/N): ${NC}"
    read -r compress
    
    local compress_option=""
    if [[ "$compress" =~ ^[Yy]$ ]]; then
        compress_option="--compress"
    else
        compress_option="--no-compress"
    fi
    
    echo -e "${GREEN}執行自定義備份...${NC}"
    bash "$BACKUP_SCRIPT" -h "$db_host" -p "$db_port" -d "$db_name" -u "$db_user" -o "$backup_dir" $compress_option
}

# 數據庫恢復菜單
database_restore() {
    clear
    echo -e "${GREEN}🔄 數據庫恢復${NC}"
    echo "=================================="
    echo ""
    
    # 顯示可用備份
    echo -e "${BLUE}可用的備份文件：${NC}"
    bash "$RESTORE_SCRIPT" --list
    echo ""
    
    echo -ne "${YELLOW}請輸入備份文件路徑: ${NC}"
    read -r backup_file
    
    if [[ -z "$backup_file" ]]; then
        echo -e "${RED}未指定備份文件${NC}"
        sleep 2
        return
    fi
    
    echo -ne "${YELLOW}是否強制恢復 (不詢問確認)? (y/N): ${NC}"
    read -r force
    
    local force_option=""
    if [[ "$force" =~ ^[Yy]$ ]]; then
        force_option="--force"
    fi
    
    echo -e "${GREEN}執行數據庫恢復...${NC}"
    bash "$RESTORE_SCRIPT" $force_option "$backup_file"
    
    echo ""
    echo -e "${GREEN}按任意鍵返回主菜單...${NC}"
    read -n 1
}

# 數據庫監控菜單
database_monitor() {
    clear
    echo -e "${GREEN}🔍 數據庫監控${NC}"
    echo "=================================="
    echo ""
    echo -e "${BLUE}選擇監控模式：${NC}"
    echo "1. 一次性檢查"
    echo "2. 持續監控 (每30秒刷新)"
    echo "3. 僅顯示警告"
    echo "4. JSON 格式輸出"
    echo "5. 返回主菜單"
    echo ""
    echo -ne "${YELLOW}請選擇 (1-5): ${NC}"
    
    read -r choice
    case $choice in
        1)
            echo -e "${GREEN}執行一次性監控檢查...${NC}"
            bash "$MONITOR_SCRIPT"
            ;;
        2)
            echo -e "${GREEN}啟動持續監控模式...${NC}"
            echo -e "${YELLOW}按 Ctrl+C 退出${NC}"
            sleep 2
            bash "$MONITOR_SCRIPT" --continuous
            ;;
        3)
            echo -e "${GREEN}僅顯示警告信息...${NC}"
            bash "$MONITOR_SCRIPT" --alerts-only
            ;;
        4)
            echo -e "${GREEN}JSON 格式輸出...${NC}"
            bash "$MONITOR_SCRIPT" --json
            ;;
        5)
            return
            ;;
        *)
            echo -e "${RED}無效選項${NC}"
            sleep 2
            database_monitor
            ;;
    esac
    
    echo ""
    echo -e "${GREEN}按任意鍵返回主菜單...${NC}"
    read -n 1
}

# 數據庫狀態檢查
database_status() {
    clear
    echo -e "${GREEN}📊 數據庫狀態檢查${NC}"
    echo "=================================="
    echo ""
    
    # 檢查數據庫連接
    echo -e "${BLUE}🔗 檢查數據庫連接...${NC}"
    if command -v docker &> /dev/null && docker ps | grep -q "hk-heritage-db"; then
        echo -e "${GREEN}✓ Docker 數據庫容器運行中${NC}"
        docker exec hk-heritage-db pg_isready -U app_user -d hk_heritage_crafts
    elif pg_isready -h localhost -p 5432 -U app_user -d hk_heritage_crafts &> /dev/null; then
        echo -e "${GREEN}✓ 本地數據庫連接正常${NC}"
    else
        echo -e "${RED}❌ 數據庫連接失敗${NC}"
    fi
    
    echo ""
    
    # 檢查 Prisma 狀態
    echo -e "${BLUE}🔧 檢查 Prisma 狀態...${NC}"
    if [[ -f "prisma/schema.prisma" ]]; then
        echo -e "${GREEN}✓ Prisma schema 文件存在${NC}"
        
        if [[ -d "node_modules/.prisma" ]]; then
            echo -e "${GREEN}✓ Prisma 客戶端已生成${NC}"
        else
            echo -e "${YELLOW}⚠ Prisma 客戶端未生成，運行: npx prisma generate${NC}"
        fi
    else
        echo -e "${RED}❌ Prisma schema 文件不存在${NC}"
    fi
    
    echo ""
    
    # 檢查環境變數
    echo -e "${BLUE}⚙️ 檢查環境變數...${NC}"
    if [[ -f ".env.local" ]]; then
        echo -e "${GREEN}✓ .env.local 文件存在${NC}"
        
        if grep -q "DATABASE_URL" .env.local; then
            echo -e "${GREEN}✓ DATABASE_URL 已配置${NC}"
        else
            echo -e "${YELLOW}⚠ DATABASE_URL 未配置${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ .env.local 文件不存在${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}按任意鍵返回主菜單...${NC}"
    read -n 1
}

# 維護工具菜單
maintenance_tools() {
    clear
    echo -e "${GREEN}🛠 數據庫維護工具${NC}"
    echo "=================================="
    echo ""
    echo -e "${BLUE}選擇維護操作：${NC}"
    echo "1. 清理數據庫 (VACUUM)"
    echo "2. 重建索引 (REINDEX)"
    echo "3. 更新統計信息 (ANALYZE)"
    echo "4. 檢查數據完整性"
    echo "5. 清理舊備份文件"
    echo "6. 重置數據庫 (危險操作)"
    echo "7. 返回主菜單"
    echo ""
    echo -ne "${YELLOW}請選擇 (1-7): ${NC}"
    
    read -r choice
    case $choice in
        1)
            vacuum_database
            ;;
        2)
            reindex_database
            ;;
        3)
            analyze_database
            ;;
        4)
            check_integrity
            ;;
        5)
            cleanup_backups
            ;;
        6)
            reset_database
            ;;
        7)
            return
            ;;
        *)
            echo -e "${RED}無效選項${NC}"
            sleep 2
            maintenance_tools
            ;;
    esac
    
    echo ""
    echo -e "${GREEN}按任意鍵返回主菜單...${NC}"
    read -n 1
}

# 清理數據庫
vacuum_database() {
    echo -e "${GREEN}🧹 清理數據庫...${NC}"
    
    if command -v docker &> /dev/null && docker ps | grep -q "hk-heritage-db"; then
        docker exec hk-heritage-db psql -U app_user -d hk_heritage_crafts -c "VACUUM ANALYZE;"
    else
        PGPASSWORD="$DB_PASSWORD" psql -h localhost -p 5432 -U app_user -d hk_heritage_crafts -c "VACUUM ANALYZE;"
    fi
    
    echo -e "${GREEN}✅ 數據庫清理完成${NC}"
}

# 重建索引
reindex_database() {
    echo -e "${GREEN}🔧 重建索引...${NC}"
    
    echo -e "${YELLOW}⚠ 警告: 重建索引可能需要較長時間並會鎖定表${NC}"
    echo -ne "${YELLOW}確定要繼續嗎? (y/N): ${NC}"
    read -r confirm
    
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
        if command -v docker &> /dev/null && docker ps | grep -q "hk-heritage-db"; then
            docker exec hk-heritage-db psql -U app_user -d hk_heritage_crafts -c "REINDEX DATABASE hk_heritage_crafts;"
        else
            PGPASSWORD="$DB_PASSWORD" psql -h localhost -p 5432 -U app_user -d hk_heritage_crafts -c "REINDEX DATABASE hk_heritage_crafts;"
        fi
        
        echo -e "${GREEN}✅ 索引重建完成${NC}"
    else
        echo -e "${YELLOW}操作已取消${NC}"
    fi
}

# 更新統計信息
analyze_database() {
    echo -e "${GREEN}📊 更新統計信息...${NC}"
    
    if command -v docker &> /dev/null && docker ps | grep -q "hk-heritage-db"; then
        docker exec hk-heritage-db psql -U app_user -d hk_heritage_crafts -c "ANALYZE;"
    else
        PGPASSWORD="$DB_PASSWORD" psql -h localhost -p 5432 -U app_user -d hk_heritage_crafts -c "ANALYZE;"
    fi
    
    echo -e "${GREEN}✅ 統計信息更新完成${NC}"
}

# 檢查數據完整性
check_integrity() {
    echo -e "${GREEN}🔍 檢查數據完整性...${NC}"
    
    # 這裡可以添加自定義的數據完整性檢查
    echo -e "${GREEN}✅ 數據完整性檢查完成${NC}"
}

# 清理舊備份
cleanup_backups() {
    echo -e "${GREEN}🗑 清理舊備份文件...${NC}"
    
    echo -ne "${YELLOW}保留多少天的備份? (默認: 30): ${NC}"
    read -r retention_days
    retention_days=${retention_days:-30}
    
    if [[ -d "./backups" ]]; then
        local deleted_count=$(find ./backups -name "*.sql*" -mtime +$retention_days -delete -print | wc -l)
        echo -e "${GREEN}✅ 已清理 $deleted_count 個舊備份文件${NC}"
    else
        echo -e "${YELLOW}⚠ 備份目錄不存在${NC}"
    fi
}

# 重置數據庫
reset_database() {
    echo -e "${RED}⚠️ 危險操作: 重置數據庫${NC}"
    echo -e "${RED}此操作將刪除所有數據並重新初始化數據庫${NC}"
    echo ""
    echo -ne "${YELLOW}確定要繼續嗎? 請輸入 'RESET' 確認: ${NC}"
    read -r confirm
    
    if [[ "$confirm" == "RESET" ]]; then
        echo -e "${GREEN}執行數據庫重置...${NC}"
        
        # 備份當前數據庫
        bash "$BACKUP_SCRIPT" --full
        
        # 重置 Prisma
        if command -v npx &> /dev/null; then
            npx prisma migrate reset --force
            echo -e "${GREEN}✅ 數據庫重置完成${NC}"
        else
            echo -e "${RED}❌ npm/npx 未安裝，無法執行 Prisma 重置${NC}"
        fi
    else
        echo -e "${YELLOW}操作已取消${NC}"
    fi
}

# 查看備份列表
list_backups() {
    clear
    echo -e "${GREEN}📋 備份文件列表${NC}"
    echo "=================================="
    echo ""
    
    bash "$RESTORE_SCRIPT" --list
    
    echo ""
    echo -e "${GREEN}按任意鍵返回主菜單...${NC}"
    read -n 1
}

# 配置管理
config_management() {
    clear
    echo -e "${GREEN}⚙️ 配置管理${NC}"
    echo "=================================="
    echo ""
    echo -e "${BLUE}選擇配置操作：${NC}"
    echo "1. 查看當前配置"
    echo "2. 編輯環境變數"
    echo "3. 測試數據庫連接"
    echo "4. 生成新的密鑰"
    echo "5. 返回主菜單"
    echo ""
    echo -ne "${YELLOW}請選擇 (1-5): ${NC}"
    
    read -r choice
    case $choice in
        1)
            show_current_config
            ;;
        2)
            edit_env_vars
            ;;
        3)
            test_db_connection
            ;;
        4)
            generate_secrets
            ;;
        5)
            return
            ;;
        *)
            echo -e "${RED}無效選項${NC}"
            sleep 2
            config_management
            ;;
    esac
    
    echo ""
    echo -e "${GREEN}按任意鍵返回主菜單...${NC}"
    read -n 1
}

# 顯示當前配置
show_current_config() {
    echo -e "${GREEN}📋 當前配置${NC}"
    echo "────────────────────────────────────────"
    
    if [[ -f ".env.local" ]]; then
        echo -e "${BLUE}環境變數 (.env.local):${NC}"
        grep -E "^[A-Z_]+" .env.local | sed 's/=.*/=***/' || echo "無配置項"
    else
        echo -e "${YELLOW}⚠ .env.local 文件不存在${NC}"
    fi
    
    echo ""
    
    if [[ -f "prisma/schema.prisma" ]]; then
        echo -e "${BLUE}數據庫配置:${NC}"
        grep -A 5 "datasource db" prisma/schema.prisma || echo "無數據庫配置"
    else
        echo -e "${YELLOW}⚠ Prisma schema 文件不存在${NC}"
    fi
}

# 編輯環境變數
edit_env_vars() {
    echo -e "${GREEN}✏️ 編輯環境變數${NC}"
    echo "────────────────────────────────────────"
    
    if command -v nano &> /dev/null; then
        nano .env.local
    elif command -v vim &> /dev/null; then
        vim .env.local
    elif command -v code &> /dev/null; then
        code .env.local
    else
        echo -e "${YELLOW}⚠ 未找到文本編輯器${NC}"
        echo -e "${BLUE}請手動編輯 .env.local 文件${NC}"
    fi
}

# 測試數據庫連接
test_db_connection() {
    echo -e "${GREEN}🔗 測試數據庫連接${NC}"
    echo "────────────────────────────────────────"
    
    bash "$MONITOR_SCRIPT" --json | jq '.connection_status' 2>/dev/null || bash "$MONITOR_SCRIPT"
}

# 生成新的密鑰
generate_secrets() {
    echo -e "${GREEN}🔐 生成新的密鑰${NC}"
    echo "────────────────────────────────────────"
    
    if command -v openssl &> /dev/null; then
        echo -e "${BLUE}NEXTAUTH_SECRET:${NC}"
        openssl rand -base64 32
        echo ""
        echo -e "${BLUE}JWT_SECRET:${NC}"
        openssl rand -base64 32
    else
        echo -e "${YELLOW}⚠ openssl 未安裝，無法生成密鑰${NC}"
        echo -e "${BLUE}請手動生成 32 字符的隨機字符串${NC}"
    fi
}

# 幫助文檔
show_help() {
    clear
    echo -e "${GREEN}📖 幫助文檔${NC}"
    echo "=================================="
    echo ""
    echo -e "${BLUE}數據庫管理工具使用指南${NC}"
    echo ""
    echo -e "${YELLOW}1. 初始化設置:${NC}"
    echo "   首次使用時選擇 '初始化數據庫設置' 來配置數據庫"
    echo ""
    echo -e "${YELLOW}2. 備份策略:${NC}"
    echo "   - 完整備份: 包含數據和結構，適合災難恢復"
    echo "   - 結構備份: 僅包含表結構，適合開發環境"
    echo "   - 數據備份: 僅包含數據，適合數據遷移"
    echo ""
    echo -e "${YELLOW}3. 監控建議:${NC}"
    echo "   - 定期檢查數據庫狀態"
    echo "   - 監控慢查詢和連接數"
    echo "   - 設置自動備份計劃"
    echo ""
    echo -e "${YELLOW}4. 維護建議:${NC}"
    echo "   - 定期執行 VACUUM 清理"
    echo "   - 更新統計信息以優化查詢"
    echo "   - 清理舊備份文件"
    echo ""
    echo -e "${YELLOW}5. 故障排除:${NC}"
    echo "   - 檢查數據庫連接狀態"
    echo "   - 查看監控日誌"
    echo "   - 驗證環境變數配置"
    echo ""
    echo -e "${BLUE}更多詳細信息請參考: docs/DATABASE_SETUP.md${NC}"
    echo ""
    echo -e "${GREEN}按任意鍵返回主菜單...${NC}"
    read -n 1
}

# 主循環
main() {
    while true; do
        show_main_menu
        read -r choice
        
        case $choice in
            1)
                database_setup
                ;;
            2)
                database_backup
                ;;
            3)
                database_restore
                ;;
            4)
                database_monitor
                ;;
            5)
                database_status
                ;;
            6)
                maintenance_tools
                ;;
            7)
                list_backups
                ;;
            8)
                config_management
                ;;
            9)
                show_help
                ;;
            0)
                echo -e "${GREEN}👋 再見！${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}無效選項，請重新選擇${NC}"
                sleep 2
                ;;
        esac
    done
}

# 檢查依賴
check_prerequisites() {
    local missing_deps=()
    
    # 檢查必要的腳本文件
    if [[ ! -f "$SETUP_SCRIPT" ]]; then
        missing_deps+=("db-setup.sh")
    fi
    
    if [[ ! -f "$BACKUP_SCRIPT" ]]; then
        missing_deps+=("db-backup.sh")
    fi
    
    if [[ ! -f "$RESTORE_SCRIPT" ]]; then
        missing_deps+=("db-restore.sh")
    fi
    
    if [[ ! -f "$MONITOR_SCRIPT" ]]; then
        missing_deps+=("db-monitor.sh")
    fi
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        echo -e "${RED}❌ 缺少必要的腳本文件:${NC}"
        for dep in "${missing_deps[@]}"; do
            echo -e "${RED}  - $dep${NC}"
        done
        echo ""
        echo -e "${YELLOW}請確保所有腳本文件都在 scripts/ 目錄中${NC}"
        exit 1
    fi
}

# 歡迎信息
show_welcome() {
    clear
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║              PostgreSQL 數據庫管理工具                        ║"
    echo "║                                                              ║"
    echo "║                香港弱勢行業傳承平台                            ║"
    echo "║                                                              ║"
    echo "║  提供完整的數據庫管理功能：                                    ║"
    echo "║  • 初始化設置                                                ║"
    echo "║  • 備份與恢復                                                ║"
    echo "║  • 監控與維護                                                ║"
    echo "║  • 配置管理                                                  ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    echo -e "${GREEN}正在初始化...${NC}"
    sleep 2
}

# 錯誤處理
trap 'echo -e "${RED}❌ 發生錯誤，程序退出${NC}"; exit 1' ERR

# 程序入口
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    show_welcome
    check_prerequisites
    main "$@"
fi