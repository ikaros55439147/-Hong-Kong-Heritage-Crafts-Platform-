# 社交登入設置指南

本指南將幫助您配置 Google 和 Facebook 社交登入功能。

## 前置要求

1. 確保您已經安裝了所有必要的依賴項
2. 設置了 PostgreSQL 數據庫
3. 配置了基本的環境變數

## Google OAuth 設置

### 1. 創建 Google Cloud 項目

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 創建新項目或選擇現有項目
3. 啟用 Google+ API

### 2. 配置 OAuth 同意畫面

1. 在左側導航中，選擇「APIs & Services」>「OAuth consent screen」
2. 選擇「External」用戶類型
3. 填寫必要資訊：
   - 應用程式名稱：香港弱勢行業傳承平台
   - 用戶支援電子郵件：您的電子郵件
   - 開發者聯絡資訊：您的電子郵件

### 3. 創建 OAuth 2.0 憑證

1. 前往「APIs & Services」>「Credentials」
2. 點擊「Create Credentials」>「OAuth 2.0 Client IDs」
3. 選擇「Web application」
4. 設置授權重定向 URI：
   - 開發環境：\`http://localhost:3000/api/auth/callback/google\`
   - 生產環境：\`https://yourdomain.com/api/auth/callback/google\`
5. 複製 Client ID 和 Client Secret

### 4. 更新環境變數

將獲得的憑證添加到 \`.env.local\` 文件：

\`\`\`env
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
\`\`\`

## Facebook OAuth 設置

### 1. 創建 Facebook 應用程式

1. 前往 [Facebook Developers](https://developers.facebook.com/)
2. 點擊「My Apps」>「Create App」
3. 選擇「Consumer」類型
4. 填寫應用程式詳細資訊

### 2. 配置 Facebook Login

1. 在應用程式儀表板中，點擊「Add Product」
2. 選擇「Facebook Login」並點擊「Set Up」
3. 選擇「Web」平台
4. 設置網站 URL：
   - 開發環境：\`http://localhost:3000\`
   - 生產環境：\`https://yourdomain.com\`

### 3. 配置有效的 OAuth 重定向 URI

1. 在左側導航中，選擇「Facebook Login」>「Settings」
2. 在「Valid OAuth Redirect URIs」中添加：
   - 開發環境：\`http://localhost:3000/api/auth/callback/facebook\`
   - 生產環境：\`https://yourdomain.com/api/auth/callback/facebook\`

### 4. 獲取應用程式憑證

1. 前往「Settings」>「Basic」
2. 複製 App ID 和 App Secret

### 5. 更新環境變數

將獲得的憑證添加到 \`.env.local\` 文件：

\`\`\`env
FACEBOOK_CLIENT_ID="your-facebook-app-id"
FACEBOOK_CLIENT_SECRET="your-facebook-app-secret"
\`\`\`

## NextAuth.js 配置

確保您的 \`.env.local\` 文件包含以下變數：

\`\`\`env
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
\`\`\`

### 生成 NEXTAUTH_SECRET

您可以使用以下命令生成一個安全的密鑰：

\`\`\`bash
openssl rand -base64 32
\`\`\`

## 數據庫遷移

運行以下命令來更新數據庫架構：

\`\`\`bash
npx prisma db push
\`\`\`

或者創建並運行遷移：

\`\`\`bash
npx prisma migrate dev --name add-nextauth-tables
\`\`\`

## 測試社交登入

1. 啟動開發服務器：
   \`\`\`bash
   npm run dev
   \`\`\`

2. 前往 \`http://localhost:3000/auth/login\`

3. 點擊 Google 或 Facebook 登入按鈕

4. 完成 OAuth 流程

5. 確認用戶已成功登入並重定向到首頁

## 故障排除

### 常見問題

1. **「redirect_uri_mismatch」錯誤**
   - 確保 OAuth 應用程式中的重定向 URI 與您的應用程式 URL 完全匹配

2. **「invalid_client」錯誤**
   - 檢查 Client ID 和 Client Secret 是否正確
   - 確保環境變數已正確設置

3. **數據庫錯誤**
   - 確保已運行數據庫遷移
   - 檢查數據庫連接字符串

4. **Session 問題**
   - 確保 NEXTAUTH_SECRET 已設置
   - 檢查 NEXTAUTH_URL 是否正確

### 調試技巧

1. 啟用 NextAuth.js 調試模式：
   \`\`\`env
   NEXTAUTH_DEBUG=true
   \`\`\`

2. 檢查瀏覽器開發者工具的網路標籤

3. 查看服務器日誌以獲取詳細錯誤信息

## 生產環境部署

在部署到生產環境時：

1. 更新 OAuth 應用程式中的重定向 URI
2. 設置正確的 NEXTAUTH_URL
3. 使用強密鑰作為 NEXTAUTH_SECRET
4. 確保所有環境變數都已正確設置

## 安全考慮

1. 永遠不要在客戶端代碼中暴露 Client Secret
2. 使用 HTTPS 在生產環境中
3. 定期輪換 OAuth 憑證
4. 監控異常登入活動

## 支援

如果您遇到問題，請檢查：
- [NextAuth.js 文檔](https://next-auth.js.org/)
- [Google OAuth 文檔](https://developers.google.com/identity/protocols/oauth2)
- [Facebook Login 文檔](https://developers.facebook.com/docs/facebook-login/)