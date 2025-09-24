#!/bin/bash

# PostgreSQL 數據庫設置腳本
# 用於快速設置本地開發環境

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置變數
DB_NAME="hk_heritage_crafts"
DB_USER="app_user"
DB_PASSWORD="dev_password"
POSTGRES_PASSWORD="postgres"

echo -e "${GREEN}🚀 PostgreSQL 數據庫設置腳本${NC}"
echo "=================================="

# 檢查是否安裝了 Docker
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓ Docker 已安裝${NC}"
    USE_DOCKER=true
else
    echo -e "${YELLOW}⚠ Docker 未安裝，將嘗試使用本地 PostgreSQL${NC}"
    USE_DOCKER=false
fi

# 函數：使用 Docker 設置數據庫
setup_with_docker() {
    echo -e "${GREEN}📦 使用 Docker 設置 PostgreSQL...${NC}"
    
    # 檢查是否已有運行的容器
    if docker ps -a --format 'table {{.Names}}' | grep -q "hk-heritage-db"; then
        echo -e "${YELLOW}⚠ 發現現有的數據庫容器，正在停止並移除...${NC}"
        docker stop hk-heritage-db || true
        docker rm hk-heritage-db || true
    fi
    
    # 啟動 PostgreSQL 容器
    echo -e "${GREEN}🔄 啟動 PostgreSQL 容器...${NC}"
    docker run -d \
        --name hk-heritage-db \
        -e POSTGRES_DB=$DB_NAME \
        -e POSTGRES_USER=postgres \
        -e POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
        -p 5432:5432 \
        -v hk_heritage_data:/var/lib/postgresql/data \
        postgres:15-alpine
    
    # 等待數據庫啟動
    echo -e "${GREEN}⏳ 等待數據庫啟動...${NC}"
    sleep 10
    
    # 創建應用程式用戶
    echo -e "${GREEN}👤 創建應用程式用戶...${NC}"
    docker exec hk-heritage-db psql -U postgres -d $DB_NAME -c "
        CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
        GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
        GRANT ALL PRIVILEGES ON SCHEMA public TO $DB_USER;
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;
        GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;
        GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO $DB_USER;
    "
    
    echo -e "${GREEN}✅ Docker 數據庫設置完成！${NC}"
    echo -e "${GREEN}📋 連接信息：${NC}"
    echo "   Host: localhost"
    echo "   Port: 5432"
    echo "   Database: $DB_NAME"
    echo "   Username: $DB_USER"
    echo "   Password: $DB_PASSWORD"
}

# 函數：使用本地 PostgreSQL 設置數據庫
setup_local_postgres() {
    echo -e "${GREEN}🏠 使用本地 PostgreSQL 設置數據庫...${NC}"
    
    # 檢查 PostgreSQL 是否安裝
    if ! command -v psql &> /dev/null; then
        echo -e "${RED}❌ PostgreSQL 未安裝${NC}"
        echo -e "${YELLOW}請先安裝 PostgreSQL：${NC}"
        echo "  Ubuntu/Debian: sudo apt-get install postgresql postgresql-contrib"
        echo "  macOS: brew install postgresql"
        echo "  Windows: 下載安裝程序 https://www.postgresql.org/download/windows/"
        exit 1
    fi
    
    # 檢查 PostgreSQL 服務是否運行
    if ! pg_isready -q; then
        echo -e "${YELLOW}⚠ PostgreSQL 服務未運行，嘗試啟動...${NC}"
        if command -v systemctl &> /dev/null; then
            sudo systemctl start postgresql
        elif command -v brew &> /dev/null; then
            brew services start postgresql
        else
            echo -e "${RED}❌ 無法啟動 PostgreSQL 服務，請手動啟動${NC}"
            exit 1
        fi
    fi
    
    # 創建數據庫和用戶
    echo -e "${GREEN}🗄 創建數據庫和用戶...${NC}"
    
    # 嘗試以 postgres 用戶身份執行
    if command -v sudo &> /dev/null; then
        sudo -u postgres psql -c "DROP DATABASE IF EXISTS $DB_NAME;"
        sudo -u postgres psql -c "DROP USER IF EXISTS $DB_USER;"
        sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;"
        sudo -u postgres psql -c "CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASSWORD';"
        sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
        sudo -u postgres psql -d $DB_NAME -c "GRANT ALL PRIVILEGES ON SCHEMA public TO $DB_USER;"
    else
        # macOS 或其他系統
        psql postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
        psql postgres -c "DROP USER IF EXISTS $DB_USER;"
        psql postgres -c "CREATE DATABASE $DB_NAME;"
        psql postgres -c "CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASSWORD';"
        psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
        psql $DB_NAME -c "GRANT ALL PRIVILEGES ON SCHEMA public TO $DB_USER;"
    fi
    
    echo -e "${GREEN}✅ 本地數據庫設置完成！${NC}"
}

# 函數：設置環境變數
setup_env_vars() {
    echo -e "${GREEN}🔧 設置環境變數...${NC}"
    
    ENV_FILE=".env.local"
    DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"
    
    # 備份現有的 .env.local
    if [ -f "$ENV_FILE" ]; then
        cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
        echo -e "${YELLOW}⚠ 已備份現有的 $ENV_FILE${NC}"
    fi
    
    # 更新或創建 .env.local
    if [ -f "$ENV_FILE" ]; then
        # 更新現有文件中的 DATABASE_URL
        if grep -q "DATABASE_URL=" "$ENV_FILE"; then
            sed -i.bak "s|DATABASE_URL=.*|DATABASE_URL=\"$DATABASE_URL\"|" "$ENV_FILE"
        else
            echo "DATABASE_URL=\"$DATABASE_URL\"" >> "$ENV_FILE"
        fi
    else
        # 創建新的 .env.local
        cat > "$ENV_FILE" << EOF
# Database Configuration
DATABASE_URL="$DATABASE_URL"
POSTGRES_USER=$DB_USER
POSTGRES_PASSWORD=$DB_PASSWORD
POSTGRES_DB=$DB_NAME
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-secret-key-here-change-in-production

# Development Settings
NEXT_TELEMETRY_DISABLED=1
NODE_ENV=development
EOF
    fi
    
    echo -e "${GREEN}✅ 環境變數設置完成！${NC}"
    echo -e "${GREEN}📄 DATABASE_URL: $DATABASE_URL${NC}"
}

# 函數：運行 Prisma 遷移
run_prisma_migrations() {
    echo -e "${GREEN}🔄 運行 Prisma 遷移...${NC}"
    
    # 檢查是否安裝了 npm 依賴
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}⚠ 未找到 node_modules，正在安裝依賴...${NC}"
        npm install
    fi
    
    # 生成 Prisma 客戶端
    echo -e "${GREEN}🔧 生成 Prisma 客戶端...${NC}"
    npx prisma generate
    
    # 運行遷移
    echo -e "${GREEN}📊 運行數據庫遷移...${NC}"
    npx prisma migrate dev --name init
    
    # 運行種子數據
    if [ -f "prisma/seed.ts" ] || [ -f "prisma/seed.js" ]; then
        echo -e "${GREEN}🌱 運行種子數據...${NC}"
        npx prisma db seed
    fi
    
    echo -e "${GREEN}✅ Prisma 遷移完成！${NC}"
}

# 函數：測試數據庫連接
test_connection() {
    echo -e "${GREEN}🔍 測試數據庫連接...${NC}"
    
    if $USE_DOCKER; then
        docker exec hk-heritage-db psql -U $DB_USER -d $DB_NAME -c "SELECT 'Connection successful!' as status;"
    else
        psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT 'Connection successful!' as status;"
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ 數據庫連接測試成功！${NC}"
    else
        echo -e "${RED}❌ 數據庫連接測試失敗${NC}"
        exit 1
    fi
}

# 主執行流程
main() {
    echo -e "${GREEN}開始數據庫設置...${NC}"
    
    # 選擇設置方式
    if $USE_DOCKER; then
        setup_with_docker
    else
        setup_local_postgres
    fi
    
    # 設置環境變數
    setup_env_vars
    
    # 運行 Prisma 遷移
    run_prisma_migrations
    
    # 測試連接
    test_connection
    
    echo -e "${GREEN}🎉 數據庫設置完成！${NC}"
    echo ""
    echo -e "${GREEN}📋 下一步：${NC}"
    echo "1. 啟動開發服務器: npm run dev"
    echo "2. 訪問應用程式: http://localhost:3001"
    echo "3. 查看數據庫: npx prisma studio"
    echo ""
    echo -e "${GREEN}🔧 有用的命令：${NC}"
    if $USE_DOCKER; then
        echo "- 查看數據庫日誌: docker logs hk-heritage-db"
        echo "- 連接數據庫: docker exec -it hk-heritage-db psql -U $DB_USER -d $DB_NAME"
        echo "- 停止數據庫: docker stop hk-heritage-db"
        echo "- 啟動數據庫: docker start hk-heritage-db"
    else
        echo "- 連接數據庫: psql -h localhost -U $DB_USER -d $DB_NAME"
        echo "- 查看數據庫狀態: pg_isready"
    fi
    echo "- 重置數據庫: npx prisma migrate reset"
    echo "- 查看數據庫: npx prisma studio"
}

# 執行主函數
main "$@"