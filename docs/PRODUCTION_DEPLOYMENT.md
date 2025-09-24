# 香港弱勢行業傳承平台 - 正式生產環境部署指南

## 概述

本文檔詳細說明香港弱勢行業傳承平台的正式生產環境部署流程，包括部署步驟、監控配置、健康檢查和運維支援。

## 部署架構

### 系統架構圖

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   Web Server    │    │   Application   │
│     (Nginx)     │────│     (Nginx)     │────│   (Next.js)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                       ┌─────────────────┐             │
                       │     Redis       │─────────────┤
                       │    (Cache)      │             │
                       └─────────────────┘             │
                                                        │
                       ┌─────────────────┐             │
                       │   PostgreSQL    │─────────────┘
                       │   (Database)    │
                       └─────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        監控系統                                   │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   Prometheus    │    Grafana      │       AlertManager          │
│   (指標收集)     │   (監控面板)     │       (告警管理)             │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

## 部署前準備

### 1. 環境要求

- **操作系統**: Ubuntu 20.04 LTS 或更高版本
- **Docker**: 20.10+ 
- **Docker Compose**: 2.0+
- **Node.js**: 18.0+
- **記憶體**: 最少 8GB RAM
- **磁碟空間**: 最少 100GB 可用空間
- **網路**: 穩定的網際網路連接

### 2. 必要的環境變數

創建 `.env.production` 文件並配置以下環境變數：

```bash
# 應用程式配置
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
APP_VERSION=1.0.0

# 數據庫配置
DATABASE_URL=postgresql://username:password@localhost:5432/hk_heritage_crafts
REDIS_URL=redis://localhost:6379

# 安全配置
JWT_SECRET=your-super-secret-jwt-key
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=https://your-domain.com

# AWS S3 配置
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=hk-heritage-media
AWS_REGION=ap-southeast-1

# 支付配置
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-publishable-key
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret

# 郵件配置
SENDGRID_API_KEY=your-sendgrid-api-key
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USERNAME=apikey
SMTP_PASSWORD=your-sendgrid-api-key

# 監控配置
GRAFANA_ADMIN_PASSWORD=your-grafana-password
PROMETHEUS_RETENTION=30d

# 告警配置
CRITICAL_ALERT_EMAIL=admin@your-domain.com
WARNING_ALERT_EMAIL=ops@your-domain.com
INFO_ALERT_EMAIL=info@your-domain.com
SLACK_WEBHOOK_URL=https://hooks.slack.com/your-webhook-url
```

### 3. SSL 證書配置

確保已配置有效的SSL證書：

```bash
# 使用 Let's Encrypt 自動獲取證書
sudo certbot --nginx -d your-domain.com

# 或手動配置證書文件
# /etc/ssl/certs/your-domain.com.crt
# /etc/ssl/private/your-domain.com.key
```

## 部署流程

### 1. 自動化部署

使用提供的部署腳本進行一鍵部署：

```bash
# 執行完整部署流程
./scripts/production-deployment.sh

# 或使用 npm 腳本
npm run deployment:deploy
```

### 2. 手動部署步驟

如果需要手動控制部署過程：

#### 步驟 1: 環境檢查
```bash
# 檢查環境變數
./scripts/operations-support.sh status --env=production

# 檢查系統資源
free -h
df -h
```

#### 步驟 2: 數據庫準備
```bash
# 備份現有數據庫
npm run db:backup

# 執行數據庫遷移
npx prisma migrate deploy

# 驗證數據庫連接
npm run db:check
```

#### 步驟 3: 應用程式構建
```bash
# 清理舊的構建文件
rm -rf .next dist

# 安裝生產依賴
npm ci --only=production

# 構建應用程式
npm run build
```

#### 步驟 4: 容器部署
```bash
# 停止現有服務
docker-compose -f docker-compose.prod.yml down

# 拉取最新鏡像
docker-compose -f docker-compose.prod.yml pull

# 啟動生產服務
docker-compose -f docker-compose.prod.yml up -d
```

#### 步驟 5: 健康檢查
```bash
# 執行完整健康檢查
./scripts/production-health-check.sh

# 或使用 npm 腳本
npm run deployment:health-check
```

## 監控系統配置

### 1. 啟動監控服務

```bash
# 啟動完整監控堆疊
docker-compose -f monitoring/docker-compose.monitoring.yml up -d

# 或使用 npm 腳本
npm run monitoring:start
```

### 2. 監控服務訪問

- **Grafana 監控面板**: http://your-domain:3001
  - 用戶名: admin
  - 密碼: 在環境變數中設置的 GRAFANA_ADMIN_PASSWORD

- **Prometheus 指標**: http://your-domain:9090
- **AlertManager 告警**: http://your-domain:9093

### 3. 預設監控面板

系統提供以下預設監控面板：

1. **系統概覽面板**
   - 系統資源使用率 (CPU, 記憶體, 磁碟)
   - 應用程式健康狀態
   - 請求量和響應時間

2. **應用程式面板**
   - API 端點性能
   - 錯誤率統計
   - 用戶活動指標

3. **基礎設施面板**
   - 數據庫性能指標
   - Redis 緩存狀態
   - 容器資源使用

## 告警配置

### 1. 告警規則

系統預設配置以下告警規則：

- **嚴重告警 (Critical)**
  - 應用程式停止運行
  - 數據庫連接失敗
  - 支付處理異常

- **警告告警 (Warning)**
  - CPU 使用率 > 80%
  - 記憶體使用率 > 85%
  - 錯誤率 > 5%
  - 響應時間 > 2秒

- **信息告警 (Info)**
  - 用戶註冊數量異常
  - SSL 證書即將過期

### 2. 告警通知渠道

- **郵件通知**: 發送到指定的管理員郵箱
- **Slack 通知**: 發送到指定的 Slack 頻道
- **Webhook 通知**: 發送到應用程式的告警處理端點

## 健康檢查

### 1. 自動健康檢查

系統提供多層次的健康檢查：

```bash
# 基本健康檢查
curl http://your-domain/api/health

# 詳細健康檢查
curl http://your-domain/api/system/health/detailed
```

### 2. 健康檢查項目

- **應用程式狀態**: 基本服務可用性
- **數據庫連接**: PostgreSQL 連接和查詢
- **Redis 連接**: 緩存服務狀態
- **外部服務**: AWS S3, 支付服務, 郵件服務
- **系統資源**: CPU, 記憶體, 磁碟使用率

### 3. 定期健康檢查

```bash
# 設置定期健康檢查 (每5分鐘)
crontab -e

# 添加以下行
*/5 * * * * /path/to/your/project/scripts/production-health-check.sh >> /var/log/health-check.log 2>&1
```

## 運維支援

### 1. 運維工具

使用提供的運維支援腳本：

```bash
# 查看系統狀態
./scripts/operations-support.sh status

# 查看服務日誌
./scripts/operations-support.sh logs --service=app

# 重啟服務
./scripts/operations-support.sh restart --service=database

# 執行備份
./scripts/operations-support.sh backup --env=production

# 監控系統指標
./scripts/operations-support.sh monitor

# 故障排除
./scripts/operations-support.sh troubleshoot
```

### 2. 常見運維任務

#### 服務重啟
```bash
# 重啟特定服務
docker-compose -f docker-compose.prod.yml restart app

# 重啟所有服務
docker-compose -f docker-compose.prod.yml restart
```

#### 日誌查看
```bash
# 查看應用程式日誌
docker-compose -f docker-compose.prod.yml logs -f app

# 查看數據庫日誌
docker-compose -f docker-compose.prod.yml logs -f postgres
```

#### 擴展服務
```bash
# 擴展應用程式實例
docker-compose -f docker-compose.prod.yml up -d --scale app=3
```

## 故障響應流程

### 1. 告警響應

當收到告警時，按以下流程處理：

1. **確認告警**: 檢查告警詳情和嚴重程度
2. **初步診斷**: 使用健康檢查和監控面板
3. **問題定位**: 查看相關日誌和指標
4. **緊急處理**: 執行必要的恢復操作
5. **根本原因分析**: 分析問題根本原因
6. **預防措施**: 制定預防類似問題的措施

### 2. 緊急恢復程序

#### 應用程式故障
```bash
# 重啟應用程式
docker-compose -f docker-compose.prod.yml restart app

# 如果重啟失敗，執行完整重新部署
./scripts/production-deployment.sh
```

#### 數據庫故障
```bash
# 檢查數據庫狀態
docker-compose -f docker-compose.prod.yml logs postgres

# 重啟數據庫服務
docker-compose -f docker-compose.prod.yml restart postgres

# 如果需要，從備份恢復
./scripts/operations-support.sh restore
```

#### 完整系統故障
```bash
# 執行系統回滾
npm run deployment:rollback -- --version=previous-stable-version

# 或執行緊急恢復
./scripts/operations-support.sh troubleshoot
```

## 維護模式

### 1. 啟用維護模式

```bash
# 啟用維護模式
./scripts/operations-support.sh maintenance enable

# 或手動創建維護標誌
touch maintenance.flag
nginx -s reload
```

### 2. 維護期間操作

在維護模式下可以安全執行：

- 數據庫遷移
- 應用程式更新
- 系統配置變更
- 備份和恢復操作

### 3. 停用維護模式

```bash
# 停用維護模式
./scripts/operations-support.sh maintenance disable

# 或手動移除維護標誌
rm -f maintenance.flag
nginx -s reload
```

## 性能優化

### 1. 數據庫優化

- 定期執行 `VACUUM` 和 `ANALYZE`
- 監控慢查詢並優化索引
- 配置適當的連接池大小

### 2. 緩存優化

- 監控 Redis 記憶體使用
- 配置適當的過期策略
- 使用 CDN 加速靜態資源

### 3. 應用程式優化

- 監控應用程式記憶體使用
- 優化 API 響應時間
- 實施適當的限流策略

## 安全考慮

### 1. 網路安全

- 配置防火牆規則
- 使用 HTTPS 加密通信
- 定期更新 SSL 證書

### 2. 應用程式安全

- 定期更新依賴套件
- 實施適當的認證和授權
- 監控安全事件

### 3. 數據安全

- 加密敏感數據
- 定期備份數據
- 實施數據存取控制

## 備份和恢復

### 1. 自動備份

```bash
# 設置每日自動備份
crontab -e

# 添加以下行 (每天凌晨2點執行備份)
0 2 * * * /path/to/your/project/scripts/operations-support.sh backup --env=production
```

### 2. 備份驗證

定期驗證備份的完整性：

```bash
# 驗證數據庫備份
pg_restore --list backup_file.sql

# 測試恢復流程 (在測試環境)
./scripts/operations-support.sh restore --backup-path=/path/to/backup
```

## 監控和日誌

### 1. 日誌管理

- 使用 Loki 收集和聚合日誌
- 配置日誌輪轉和保留策略
- 監控錯誤日誌和異常

### 2. 指標收集

- 使用 Prometheus 收集系統和應用程式指標
- 配置自定義業務指標
- 設置適當的指標保留期

## 故障排除指南

### 常見問題和解決方案

1. **應用程式無法啟動**
   - 檢查環境變數配置
   - 驗證數據庫連接
   - 查看應用程式日誌

2. **數據庫連接失敗**
   - 檢查數據庫服務狀態
   - 驗證連接字符串
   - 檢查網路連接

3. **高記憶體使用**
   - 檢查記憶體洩漏
   - 優化查詢和緩存
   - 考慮擴展資源

4. **響應時間過長**
   - 分析慢查詢
   - 檢查網路延遲
   - 優化應用程式代碼

## 聯絡資訊

如遇到緊急問題，請聯絡：

- **技術支援**: tech-support@your-domain.com
- **運維團隊**: ops@your-domain.com
- **緊急熱線**: +852-xxxx-xxxx

---

**注意**: 本文檔應定期更新以反映系統變更和最佳實踐的演進。