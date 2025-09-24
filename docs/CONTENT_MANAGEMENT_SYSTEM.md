# 內容管理系統文檔

## 概述

香港弱勢行業傳承平台的內容管理系統提供了完整的內容版本控制、發布排程、自動標籤和品質評分功能。該系統旨在幫助管理員和師傅更好地管理和優化平台上的內容品質。

## 功能特性

### 1. 內容版本控制系統

#### 功能描述
- 為所有內容實體（課程、產品、教學材料等）提供版本控制
- 支持版本創建、發布、回復等操作
- 記錄每個版本的變更摘要和創建者信息
- 支持版本比較和歷史追蹤

#### 主要API端點
- `POST /api/content-management/versions` - 創建新版本
- `GET /api/content-management/versions` - 獲取版本歷史
- `POST /api/content-management/versions/{id}/publish` - 發布版本
- `POST /api/content-management/versions/{id}/revert` - 回復到指定版本

#### 使用示例
```typescript
// 創建新版本
const version = await contentManagementService.createVersion({
  entityType: 'course',
  entityId: 'course-123',
  contentData: { title: '更新的課程標題', description: '新的描述' },
  changeSummary: '更新課程信息',
  createdBy: 'user-456'
})

// 發布版本
await contentManagementService.publishVersion(version.id, 'user-456')
```

### 2. 內容發布排程功能

#### 功能描述
- 支持內容的定時發布、取消發布和更新
- 提供排程管理和執行狀態追蹤
- 支持批量排程操作
- 自動執行到期的排程任務

#### 主要API端點
- `POST /api/content-management/schedules` - 創建內容排程
- `GET /api/content-management/schedules` - 獲取排程列表
- `POST /api/content-management/schedules/{id}/execute` - 立即執行排程

#### 使用示例
```typescript
// 創建發布排程
const schedule = await contentManagementService.scheduleContent({
  entityType: 'course',
  entityId: 'course-123',
  actionType: 'publish',
  scheduledAt: new Date('2024-12-25T10:00:00Z'),
  createdBy: 'user-456'
})

// 執行排程
await contentManagementService.executeScheduledAction(schedule.id)
```

### 3. 內容標籤和分類自動化

#### 功能描述
- 支持手動和自動內容標籤
- 基於內容分析的智能標籤建議
- 標籤分類管理（難度、工藝類型、主題等）
- 標籤使用統計和管理

#### 自動標籤規則
- **難度等級檢測**: 根據關鍵字自動識別初級、中級、高級
- **工藝類型檢測**: 識別手雕麻將、吹糖、竹編等傳統工藝
- **主題分類**: 識別文化歷史、實作教學等主題

#### 主要API端點
- `POST /api/content-management/tags` - 創建標籤或標記內容
- `GET /api/content-management/tags` - 獲取標籤列表
- `POST /api/content-management/tags/auto` - 自動標籤內容

#### 使用示例
```typescript
// 創建標籤
const tag = await contentManagementService.createTag({
  name: '初級',
  description: '適合初學者的內容',
  color: '#4CAF50',
  category: 'difficulty'
})

// 自動標籤內容
const autoTags = await contentManagementService.autoTagContent(
  'course',
  'course-123',
  { title: '初學者手雕麻將課程', description: '傳統工藝入門' }
)
```

### 4. 內容品質評分機制

#### 評分維度
1. **完整性評分** (25%): 檢查必要字段的完整性
2. **準確性評分** (20%): 內容準確性評估
3. **互動性評分** (25%): 基於用戶互動數據
4. **多媒體評分** (15%): 圖片、影片等多媒體內容
5. **語言品質評分** (15%): 多語言支持和內容品質

#### 評分標準
- **優秀** (80-100分): 內容完整、互動性高、多媒體豐富
- **良好** (60-79分): 內容較完整、有一定互動性
- **普通** (40-59分): 基本內容完整、互動性一般
- **需改善** (0-39分): 內容不完整、缺乏互動性

#### 主要API端點
- `POST /api/content-management/quality` - 計算品質評分
- `GET /api/content-management/quality` - 獲取品質評分
- `POST /api/content-management/batch?operation=calculate-quality` - 批量計算評分

#### 使用示例
```typescript
// 計算品質評分
const qualityScore = await contentManagementService.calculateQualityScore(
  'course',
  'course-123'
)

// 批量計算評分
const results = await contentManagementService.batchCalculateQualityScores('course')
```

## 數據庫架構

### 核心表結構

#### content_versions (內容版本表)
```sql
CREATE TABLE content_versions (
    id UUID PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    version_number INTEGER NOT NULL,
    content_data JSONB NOT NULL,
    change_summary TEXT,
    created_by UUID REFERENCES users(id),
    is_published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### content_schedules (內容排程表)
```sql
CREATE TABLE content_schedules (
    id UUID PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    scheduled_at TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### content_tags (內容標籤表)
```sql
CREATE TABLE content_tags (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7),
    category VARCHAR(50),
    is_system_tag BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### content_quality_scores (內容品質評分表)
```sql
CREATE TABLE content_quality_scores (
    id UUID PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    overall_score DECIMAL(3,2) NOT NULL,
    completeness_score DECIMAL(3,2),
    accuracy_score DECIMAL(3,2),
    engagement_score DECIMAL(3,2),
    multimedia_score DECIMAL(3,2),
    language_quality_score DECIMAL(3,2),
    last_calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 前端組件

### ContentManagementDashboard
主要的內容管理儀表板，整合所有功能模塊。

### ContentVersionControl
版本控制組件，提供版本創建、發布、回復等功能。

### ContentScheduler
內容排程組件，管理定時發布任務。

### ContentTagManager
標籤管理組件，支持手動和自動標籤功能。

### ContentQualityScore
品質評分組件，顯示詳細的評分信息和改善建議。

## 管理後台

### 訪問路徑
`/admin/content-management`

### 功能模塊
1. **總覽**: 顯示系統統計信息和快速操作
2. **品質評分**: 查看和管理內容品質評分
3. **審計日誌**: 查看系統操作記錄
4. **標籤管理**: 管理系統標籤和分類

## 最佳實踐

### 版本控制
1. 在重要內容更新前創建版本
2. 提供清晰的變更摘要
3. 定期清理舊版本以節省存儲空間

### 內容排程
1. 合理安排發布時間，避免高峰期衝突
2. 定期檢查排程執行狀態
3. 為重要內容設置備用排程

### 標籤管理
1. 建立一致的標籤命名規範
2. 定期審查和合併重複標籤
3. 利用自動標籤提高效率

### 品質評分
1. 定期批量計算評分以保持數據新鮮
2. 根據評分結果優化內容品質
3. 關注低分內容並提供改善建議

## 性能優化

### 數據庫優化
- 為常用查詢字段添加索引
- 定期清理過期的審計日誌
- 使用分頁查詢處理大量數據

### 緩存策略
- 緩存品質評分結果
- 緩存熱門標籤列表
- 使用Redis緩存頻繁查詢的數據

### 批量操作
- 使用批量API減少網路請求
- 異步處理大量數據操作
- 提供操作進度反饋

## 安全考慮

### 權限控制
- 版本發布需要適當權限
- 批量操作限制管理員權限
- 審計日誌記錄所有重要操作

### 數據驗證
- 嚴格驗證輸入數據格式
- 防止惡意內容注入
- 限制文件上傳大小和類型

## 監控和日誌

### 操作審計
- 記錄所有內容管理操作
- 包含操作者、時間、IP地址等信息
- 支持按實體類型和操作類型篩選

### 性能監控
- 監控API響應時間
- 追蹤品質評分計算性能
- 監控數據庫查詢效率

### 錯誤處理
- 詳細的錯誤日誌記錄
- 用戶友好的錯誤信息
- 自動重試機制處理臨時故障