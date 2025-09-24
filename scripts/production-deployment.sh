#!/bin/bash

# 香港弱勢行業傳承平台 - 正式生產環境部署腳本
# Production Deployment Script for HK Heritage Crafts Platform

set -e

echo "🚀 開始正式生產環境部署..."
echo "Starting production deployment..."

# 環境變數檢查
check_environment() {
    echo "📋 檢查環境變數..."
    
    required_vars=(
        "DATABASE_URL"
        "REDIS_URL"
        "JWT_SECRET"
        "AWS_ACCESS_KEY_ID"
        "AWS_SECRET_ACCESS_KEY"
        "STRIPE_SECRET_KEY"
        "SENDGRID_API_KEY"
        "NEXT_PUBLIC_APP_URL"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            echo "❌ 缺少環境變數: $var"
            exit 1
        fi
    done
    
    echo "✅ 環境變數檢查完成"
}

# 數據庫遷移
run_database_migration() {
    echo "🗄️ 執行數據庫遷移..."
    
    # 備份當前數據庫
    echo "📦 備份當前數據庫..."
    npm run db:backup
    
    # 執行遷移
    echo "🔄 執行數據庫遷移..."
    npx prisma migrate deploy
    
    # 驗證遷移
    echo "✅ 驗證數據庫遷移..."
    npx prisma db pull --print
    
    echo "✅ 數據庫遷移完成"
}

# 構建應用程式
build_application() {
    echo "🔨 構建生產版本..."
    
    # 清理舊的構建文件
    rm -rf .next
    rm -rf dist
    
    # 安裝依賴
    npm ci --only=production
    
    # 構建應用程式
    npm run build
    
    # 驗證構建
    if [ ! -d ".next" ]; then
        echo "❌ 構建失敗"
        exit 1
    fi
    
    echo "✅ 應用程式構建完成"
}

# 部署到生產環境
deploy_to_production() {
    echo "🚀 部署到生產環境..."
    
    # 停止現有服務
    echo "⏹️ 停止現有服務..."
    docker-compose -f docker-compose.prod.yml down
    
    # 拉取最新鏡像
    echo "📥 拉取最新鏡像..."
    docker-compose -f docker-compose.prod.yml pull
    
    # 啟動服務
    echo "▶️ 啟動生產服務..."
    docker-compose -f docker-compose.prod.yml up -d
    
    # 等待服務啟動
    echo "⏳ 等待服務啟動..."
    sleep 30
    
    echo "✅ 生產環境部署完成"
}

# 健康檢查
health_check() {
    echo "🏥 執行健康檢查..."
    
    # 檢查應用程式健康狀態
    max_attempts=10
    attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        echo "🔍 健康檢查嘗試 $attempt/$max_attempts..."
        
        if curl -f -s "${NEXT_PUBLIC_APP_URL}/api/health" > /dev/null; then
            echo "✅ 應用程式健康檢查通過"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            echo "❌ 應用程式健康檢查失敗"
            exit 1
        fi
        
        sleep 10
        ((attempt++))
    done
    
    # 檢查數據庫連接
    echo "🗄️ 檢查數據庫連接..."
    if ! npm run db:check; then
        echo "❌ 數據庫連接失敗"
        exit 1
    fi
    
    # 檢查Redis連接
    echo "🔴 檢查Redis連接..."
    if ! npm run redis:check; then
        echo "❌ Redis連接失敗"
        exit 1
    fi
    
    echo "✅ 所有健康檢查通過"
}

# 設置監控
setup_monitoring() {
    echo "📊 設置監控系統..."
    
    # 啟動監控服務
    docker-compose -f monitoring/docker-compose.monitoring.yml up -d
    
    # 配置告警規則
    echo "⚠️ 配置告警規則..."
    npm run monitoring:setup-alerts
    
    # 驗證監控系統
    echo "✅ 驗證監控系統..."
    if ! curl -f -s "http://localhost:3001/metrics" > /dev/null; then
        echo "⚠️ 監控系統可能未正常啟動"
    fi
    
    echo "✅ 監控系統設置完成"
}

# 執行部署後驗證
post_deployment_verification() {
    echo "🔍 執行部署後驗證..."
    
    # 執行關鍵功能測試
    echo "🧪 執行關鍵功能測試..."
    npm run test:production
    
    # 檢查性能指標
    echo "⚡ 檢查性能指標..."
    npm run performance:check
    
    # 驗證安全配置
    echo "🔒 驗證安全配置..."
    npm run security:verify
    
    echo "✅ 部署後驗證完成"
}

# 主要部署流程
main() {
    echo "🎯 開始正式生產環境部署流程..."
    
    check_environment
    run_database_migration
    build_application
    deploy_to_production
    health_check
    setup_monitoring
    post_deployment_verification
    
    echo ""
    echo "🎉 生產環境部署成功完成！"
    echo "🌐 應用程式URL: ${NEXT_PUBLIC_APP_URL}"
    echo "📊 監控面板: ${NEXT_PUBLIC_APP_URL}/admin/monitoring"
    echo "📋 健康檢查: ${NEXT_PUBLIC_APP_URL}/api/health"
    echo ""
    echo "📞 如有問題，請聯繫運維團隊"
}

# 錯誤處理
trap 'echo "❌ 部署過程中發生錯誤，正在回滾..."; npm run deployment:rollback; exit 1' ERR

# 執行主要流程
main "$@"