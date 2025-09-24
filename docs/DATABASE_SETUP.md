# PostgreSQL 數據庫設置指南

## 目錄
1. [本地開發環境設置](#本地開發環境設置)
2. [生產環境設置](#生產環境設置)
3. [數據庫配置](#數據庫配置)
4. [遷移和種子數據](#遷移和種子數據)
5. [備份和恢復](#備份和恢復)
6. [性能優化](#性能優化)
7. [監控和維護](#監控和維護)
8. [故障排除](#故障排除)

## 本地開發環境設置

### 方法 1: 使用 Docker (推薦)

#### 1.1 安裝 Docker
```bash
# Windows
# 下載並安裝 Docker Desktop for Windows
# https://docs.docker.com/desktop/windows/install/

# macOS
# 下載並安裝 Docker Desktop for Mac
# https://docs.docker.com/desktop/mac/install/

# Linux (Ubuntu)
sudo apt-get update
sudo apt-get install docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker
```

#### 1.2 使用 Docker Compose 啟動 PostgreSQL
```bash
# 啟動數據庫服務
docker-compose up -d db

# 檢查服務狀態
docker-compose ps

# 查看日誌
docker-compose logs db
```

#### 1.3 連接到數據庫
```bash
# 使用 Docker 連接到 PostgreSQL
docker-compose exec db psql -U postgres -d hk_heritage_crafts

# 或使用外部工具連接
# Host: localhost
# Port: 5432
# Database: hk_heritage_crafts
# Username: postgres
# Password: your_password
```

### 方法 2: 本地安裝 PostgreSQL

#### 2.1 Windows 安裝
```bash
# 下載 PostgreSQL 安裝程序
# https://www.postgresql.org/download/windows/

# 或使用 Chocolatey
choco install postgresql

# 或使用 Scoop
scoop install postgresql
```

#### 2.2 macOS 安裝
```bash
# 使用 Homebrew
brew install postgresql
brew services start postgresql

# 創建數據庫
createdb hk_heritage_crafts
```

#### 2.3 Linux (Ubuntu) 安裝
```bash
# 更新包列表
sudo apt-get update

# 安裝 PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# 啟動服務
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 切換到 postgres 用戶
sudo -u postgres psql

# 創建數據庫和用戶
CREATE DATABASE hk_heritage_crafts;
CREATE USER app_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE hk_heritage_crafts TO app_user;
```

### 1.4 環境變數配置
```bash
# .env.local
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/hk_heritage_crafts"
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_DB=hk_heritage_crafts
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
```

## 生產環境設置

### 2.1 雲端數據庫服務 (推薦)

#### AWS RDS PostgreSQL
```bash
# 1. 登入 AWS Console
# 2. 前往 RDS 服務
# 3. 創建數據庫實例

# 配置參數:
# - Engine: PostgreSQL
# - Version: 15.x (最新穩定版)
# - Instance Class: db.t3.micro (開發) / db.r5.large (生產)
# - Storage: 20GB (最小) / 100GB+ (生產)
# - Multi-AZ: Yes (生產環境)
# - Backup Retention: 7-30 days
```

#### Google Cloud SQL
```bash
# 使用 gcloud CLI
gcloud sql instances create hk-heritage-crafts-db \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=asia-east1 \
    --storage-size=20GB \
    --storage-type=SSD \
    --backup-start-time=03:00

# 創建數據庫
gcloud sql databases create hk_heritage_crafts \
    --instance=hk-heritage-crafts-db

# 創建用戶
gcloud sql users create app_user \
    --instance=hk-heritage-crafts-db \
    --password=secure_password
```

#### Azure Database for PostgreSQL
```bash
# 使用 Azure CLI
az postgres server create \
    --resource-group myResourceGroup \
    --name hk-heritage-crafts-db \
    --location eastasia \
    --admin-user postgres \
    --admin-password SecurePassword123 \
    --sku-name GP_Gen5_2 \
    --version 15

# 創建數據庫
az postgres db create \
    --resource-group myResourceGroup \
    --server-name hk-heritage-crafts-db \
    --name hk_heritage_crafts
```

### 2.2 自建 PostgreSQL 服務器

#### 2.2.1 服務器準備
```bash
# Ubuntu 20.04/22.04
sudo apt-get update
sudo apt-get upgrade -y

# 安裝必要工具
sudo apt-get install -y wget ca-certificates

# 添加 PostgreSQL 官方 APT 倉庫
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
echo "deb http://apt.postgresql.org/pub/repos/apt/ $(lsb_release -cs)-pgdg main" | sudo tee /etc/apt/sources.list.d/pgdg.list

# 安裝 PostgreSQL 15
sudo apt-get update
sudo apt-get install -y postgresql-15 postgresql-client-15 postgresql-contrib-15
```

#### 2.2.2 安全配置
```bash
# 設置 postgres 用戶密碼
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'secure_password';"

# 創建應用程式用戶
sudo -u postgres createuser --interactive --pwprompt app_user

# 創建數據庫
sudo -u postgres createdb -O app_user hk_heritage_crafts
```

#### 2.2.3 配置文件優化
```bash
# 編輯 postgresql.conf
sudo nano /etc/postgresql/15/main/postgresql.conf

# 主要配置項:
listen_addresses = '*'
port = 5432
max_connections = 200
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100

# 編輯 pg_hba.conf
sudo nano /etc/postgresql/15/main/pg_hba.conf

# 添加連接規則:
host    hk_heritage_crafts    app_user    0.0.0.0/0    md5
host    all                   postgres    127.0.0.1/32 md5
```

#### 2.2.4 SSL 配置
```bash
# 生成 SSL 證書
sudo -u postgres openssl req -new -x509 -days 365 -nodes -text \
    -out /var/lib/postgresql/15/main/server.crt \
    -keyout /var/lib/postgresql/15/main/server.key \
    -subj "/CN=your-domain.com"

# 設置權限
sudo -u postgres chmod 600 /var/lib/postgresql/15/main/server.key

# 在 postgresql.conf 中啟用 SSL
ssl = on
ssl_cert_file = 'server.crt'
ssl_key_file = 'server.key'
```

### 2.3 生產環境變數
```bash
# .env.production
DATABASE_URL="postgresql://app_user:secure_password@your-db-host:5432/hk_heritage_crafts?sslmode=require"
POSTGRES_USER=app_user
POSTGRES_PASSWORD=secure_password
POSTGRES_DB=hk_heritage_crafts
POSTGRES_HOST=your-db-host
POSTGRES_PORT=5432
POSTGRES_SSL=true
```

## 數據庫配置

### 3.1 連接池配置
```javascript
// src/lib/database.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

### 3.2 連接池優化
```bash
# 在 DATABASE_URL 中添加連接池參數
DATABASE_URL="postgresql://user:password@host:5432/db?connection_limit=20&pool_timeout=20&schema=public"
```

## 遷移和種子數據

### 4.1 初始化數據庫
```bash
# 生成 Prisma 客戶端
npx prisma generate

# 創建並運行遷移
npx prisma migrate dev --name init

# 重置數據庫 (開發環境)
npx prisma migrate reset

# 生產環境部署遷移
npx prisma migrate deploy
```

### 4.2 種子數據
```bash
# 運行種子腳本
npx prisma db seed

# 或手動運行
node prisma/seed.js
```

### 4.3 數據遷移腳本
```bash
# 創建遷移腳本
npx prisma migrate dev --name add_new_feature

# 檢查遷移狀態
npx prisma migrate status

# 標記遷移為已應用 (生產環境)
npx prisma migrate resolve --applied "migration_name"
```

## 備份和恢復

### 5.1 自動備份腳本
```bash
#!/bin/bash
# scripts/backup-db.sh

# 配置
DB_NAME="hk_heritage_crafts"
DB_USER="app_user"
DB_HOST="localhost"
BACKUP_DIR="/var/backups/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)

# 創建備份目錄
mkdir -p $BACKUP_DIR

# 執行備份
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME -f $BACKUP_DIR/backup_$DATE.sql

# 壓縮備份
gzip $BACKUP_DIR/backup_$DATE.sql

# 清理舊備份 (保留 30 天)
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: backup_$DATE.sql.gz"
```

### 5.2 設置定時備份
```bash
# 編輯 crontab
crontab -e

# 每天凌晨 2 點執行備份
0 2 * * * /path/to/scripts/backup-db.sh

# 每週日凌晨 1 點執行完整備份
0 1 * * 0 /path/to/scripts/full-backup-db.sh
```

### 5.3 恢復數據庫
```bash
# 從備份恢復
gunzip backup_20241222_020000.sql.gz
psql -h localhost -U app_user -d hk_heritage_crafts < backup_20241222_020000.sql

# 或使用 pg_restore (如果是自定義格式)
pg_restore -h localhost -U app_user -d hk_heritage_crafts backup_file.dump
```

## 性能優化

### 6.1 索引優化
```sql
-- 創建常用查詢的索引
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY idx_courses_status ON courses(status);
CREATE INDEX CONCURRENTLY idx_bookings_user_id ON bookings(user_id);
CREATE INDEX CONCURRENTLY idx_products_category ON products(category);

-- 複合索引
CREATE INDEX CONCURRENTLY idx_orders_user_status ON orders(user_id, status);
CREATE INDEX CONCURRENTLY idx_courses_craftsman_date ON courses(craftsman_id, start_date);

-- 部分索引
CREATE INDEX CONCURRENTLY idx_active_courses ON courses(id) WHERE status = 'ACTIVE';
```

### 6.2 查詢優化
```sql
-- 分析查詢計劃
EXPLAIN ANALYZE SELECT * FROM courses WHERE status = 'ACTIVE';

-- 更新統計信息
ANALYZE;

-- 重建索引
REINDEX DATABASE hk_heritage_crafts;
```

### 6.3 配置調優
```bash
# postgresql.conf 生產環境優化
shared_buffers = 25% of RAM
effective_cache_size = 75% of RAM
work_mem = (Total RAM - shared_buffers) / max_connections
maintenance_work_mem = RAM / 16
checkpoint_completion_target = 0.9
wal_buffers = 16MB
random_page_cost = 1.1  # for SSD
effective_io_concurrency = 200  # for SSD
```

## 監控和維護

### 7.1 監控腳本
```bash
#!/bin/bash
# scripts/db-monitor.sh

# 檢查數據庫連接
psql -h localhost -U app_user -d hk_heritage_crafts -c "SELECT 1;" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "Database connection: OK"
else
    echo "Database connection: FAILED"
    exit 1
fi

# 檢查數據庫大小
DB_SIZE=$(psql -h localhost -U app_user -d hk_heritage_crafts -t -c "SELECT pg_size_pretty(pg_database_size('hk_heritage_crafts'));")
echo "Database size: $DB_SIZE"

# 檢查活動連接數
ACTIVE_CONNECTIONS=$(psql -h localhost -U app_user -d hk_heritage_crafts -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';")
echo "Active connections: $ACTIVE_CONNECTIONS"

# 檢查長時間運行的查詢
LONG_QUERIES=$(psql -h localhost -U app_user -d hk_heritage_crafts -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active' AND now() - query_start > interval '5 minutes';")
echo "Long running queries: $LONG_QUERIES"
```

### 7.2 日常維護
```sql
-- 清理統計信息
VACUUM ANALYZE;

-- 重新組織表
VACUUM FULL;  -- 注意：會鎖定表

-- 檢查表膨脹
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 7.3 性能監控查詢
```sql
-- 最慢的查詢
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- 最頻繁的查詢
SELECT query, calls, mean_time, total_time
FROM pg_stat_statements
ORDER BY calls DESC
LIMIT 10;

-- 表使用統計
SELECT schemaname, tablename, seq_scan, seq_tup_read, idx_scan, idx_tup_fetch
FROM pg_stat_user_tables
ORDER BY seq_scan DESC;
```

## 故障排除

### 8.1 常見問題

#### 連接問題
```bash
# 檢查 PostgreSQL 是否運行
sudo systemctl status postgresql

# 檢查端口是否開放
netstat -an | grep 5432

# 檢查防火牆
sudo ufw status
sudo ufw allow 5432/tcp

# 測試連接
telnet localhost 5432
```

#### 權限問題
```sql
-- 檢查用戶權限
\du

-- 授予權限
GRANT ALL PRIVILEGES ON DATABASE hk_heritage_crafts TO app_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app_user;
```

#### 性能問題
```sql
-- 檢查鎖定
SELECT * FROM pg_locks WHERE NOT granted;

-- 檢查阻塞查詢
SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';

-- 終止長時間運行的查詢
SELECT pg_terminate_backend(pid);
```

### 8.2 日誌分析
```bash
# 查看 PostgreSQL 日誌
sudo tail -f /var/log/postgresql/postgresql-15-main.log

# 啟用慢查詢日誌
# 在 postgresql.conf 中設置:
log_min_duration_statement = 1000  # 記錄超過 1 秒的查詢
log_statement = 'all'  # 記錄所有語句 (僅用於調試)
```

### 8.3 災難恢復
```bash
# 完整災難恢復流程
# 1. 停止應用程式
# 2. 恢復數據庫
dropdb hk_heritage_crafts
createdb hk_heritage_crafts
psql -d hk_heritage_crafts < latest_backup.sql

# 3. 驗證數據完整性
psql -d hk_heritage_crafts -c "SELECT count(*) FROM users;"

# 4. 重啟應用程式
```

## 安全最佳實踐

### 9.1 用戶和權限管理
```sql
-- 創建只讀用戶
CREATE USER readonly_user WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE hk_heritage_crafts TO readonly_user;
GRANT USAGE ON SCHEMA public TO readonly_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;

-- 創建備份用戶
CREATE USER backup_user WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE hk_heritage_crafts TO backup_user;
GRANT USAGE ON SCHEMA public TO backup_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup_user;
```

### 9.2 網絡安全
```bash
# pg_hba.conf 安全配置
# 僅允許特定 IP 連接
host    hk_heritage_crafts    app_user    10.0.0.0/8      md5
host    hk_heritage_crafts    app_user    192.168.1.0/24  md5

# 拒絕所有其他連接
host    all                   all         0.0.0.0/0       reject
```

### 9.3 加密和 SSL
```bash
# 強制 SSL 連接
ssl = on
ssl_ciphers = 'HIGH:MEDIUM:+3DES:!aNULL'
ssl_prefer_server_ciphers = on
```

這個完整的指南涵蓋了從本地開發到生產環境的所有 PostgreSQL 設置需求。根據您的具體需求選擇合適的部署方式。