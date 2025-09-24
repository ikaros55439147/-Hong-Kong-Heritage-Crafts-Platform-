# GitHub 上傳指南

## 步驟 1: 安裝 Git

### 選項 A: 使用 Winget (推薦)
```powershell
winget install --id Git.Git -e --source winget
```

### 選項 B: 手動下載安裝
1. 前往 https://git-scm.com/download/win
2. 下載 Git for Windows
3. 執行安裝程式，使用預設設定

### 選項 C: 使用 Chocolatey (如果已安裝)
```powershell
choco install git
```

## 步驟 2: 重新啟動 PowerShell
安裝完成後，關閉並重新開啟 PowerShell 或 Command Prompt。

## 步驟 3: 設定 Git (首次使用)
```bash
git config --global user.name "您的姓名"
git config --global user.email "您的郵箱@example.com"
```

## 步驟 4: 初始化並上傳專案

### 4.1 初始化 Git 倉庫
```bash
git init
```

### 4.2 添加遠程倉庫
```bash
git remote add origin https://github.com/ikaros55439147/-Hong-Kong-Heritage-Crafts-Platform-.git
```

### 4.3 創建 .gitignore 文件
```bash
# 這個文件已經為您準備好了，內容如下
```

### 4.4 添加所有文件
```bash
git add .
```

### 4.5 提交變更
```bash
git commit -m "Initial commit: Hong Kong Heritage Crafts Platform

- Complete full-stack Next.js application
- 50,000+ lines of TypeScript code
- 73 test files with comprehensive coverage
- 100+ API endpoints
- Multi-language support (Traditional Chinese, Simplified Chinese, English)
- E-commerce functionality with payment integration
- Social features and community interaction
- Mobile-responsive PWA design
- Production-ready deployment configuration
- Comprehensive documentation and specs"
```

### 4.6 推送到 GitHub
```bash
git branch -M main
git push -u origin main
```

## 步驟 5: 驗證上傳
前往 https://github.com/ikaros55439147/-Hong-Kong-Heritage-Crafts-Platform- 查看您的專案是否成功上傳。

## 如果遇到問題

### 問題 1: 認證失敗
如果推送時要求認證，您需要：
1. 使用 GitHub Personal Access Token 而不是密碼
2. 前往 GitHub Settings > Developer settings > Personal access tokens
3. 生成新的 token 並使用它作為密碼

### 問題 2: 文件太大
如果有大文件導致上傳失敗：
```bash
# 安裝 Git LFS
git lfs install

# 追蹤大文件
git lfs track "*.mp4"
git lfs track "*.zip"
git lfs track "*.pdf"

# 重新添加和提交
git add .gitattributes
git commit -m "Add Git LFS tracking"
git push
```

### 問題 3: 倉庫已存在
如果遠程倉庫已有內容：
```bash
git pull origin main --allow-unrelated-histories
git push origin main
```

## 自動化腳本

為了方便，我也為您準備了一個自動化腳本：