# 增強通知系統文檔

## 概述

增強通知系統為香港弱勢行業傳承平台提供了全面的通知功能，包括師傅狀態變更通知、即時推送通知、郵件通知和細化的通知偏好設置。

## 主要功能

### 1. 師傅狀態變更通知功能

當師傅的認證狀態發生變更時，系統會自動發送通知給相關用戶。

#### 支持的狀態變更
- `PENDING` → `VERIFIED`: 審核通過
- `PENDING` → `REJECTED`: 審核拒絕
- `VERIFIED` → `PENDING`: 重新審核
- `REJECTED` → `PENDING`: 重新提交審核

#### 實現方式
```typescript
// 在 CraftsmanService 中調用
await notificationService.notifyCraftsmanStatusChange(
  craftsmanUserId,
  oldStatus,
  newStatus,
  adminNotes
)
```

### 2. 即時推送通知系統

系統支持瀏覽器推送通知，為用戶提供即時的通知體驗。

#### 功能特點
- 支持 Web Push API
- 自動註冊 Service Worker
- 支持通知操作按鈕
- 智能 URL 路由
- 離線通知緩存

#### 推送通知結構
```typescript
interface PushNotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  data?: Record<string, any>
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
}
```

### 3. 郵件通知模板和發送機制

系統提供多語言郵件模板，支持 HTML 和純文字格式。

#### 支持的通知類型
- 新關注者通知
- 師傅狀態變更
- 課程更新
- 產品更新
- 訂單狀態更新
- 預約確認/取消
- 付款確認
- 課程提醒

#### 郵件模板結構
```typescript
interface EmailTemplate {
  subject: MultiLanguageContent
  htmlContent: MultiLanguageContent
  textContent: MultiLanguageContent
}
```

#### 模板變數
- `{{userName}}`: 用戶名稱
- `{{title}}`: 通知標題
- `{{message}}`: 通知內容
- `{{actionUrl}}`: 操作連結
- `{{metadata}}`: 額外資料

### 4. 通知偏好細化設置

用戶可以細化控制各種類型的通知接收偏好。

#### 通知偏好類別

**通知方式**
- `emailNotifications`: 電子郵件通知
- `pushNotifications`: 推送通知

**社交互動**
- `newFollowerNotify`: 新關注者通知
- `commentNotify`: 評論通知
- `likeNotify`: 點讚通知

**課程和產品**
- `courseUpdateNotify`: 課程更新通知
- `productUpdateNotify`: 產品更新通知
- `reminderNotify`: 提醒通知

**訂單和交易**
- `orderStatusNotify`: 訂單狀態通知

**師傅相關**
- `craftsmanStatusNotify`: 師傅狀態變更通知

**活動和其他**
- `eventNotify`: 活動通知
- `marketingNotify`: 行銷通知

## API 端點

### 通知管理
- `GET /api/notifications` - 獲取通知列表
- `GET /api/notifications/count` - 獲取未讀通知數量
- `PATCH /api/notifications/:id` - 標記通知為已讀
- `DELETE /api/notifications/:id` - 刪除通知
- `PATCH /api/notifications` - 批量操作通知

### 通知偏好
- `GET /api/notifications/preferences` - 獲取通知偏好
- `PUT /api/notifications/preferences` - 更新通知偏好

### 推送通知
- `POST /api/notifications/push` - 發送推送通知
- `PUT /api/notifications/push` - 註冊推送訂閱

### 郵件通知
- `POST /api/notifications/email` - 發送郵件通知
- `GET /api/notifications/email` - 獲取郵件模板預覽

### 批量和排程通知
- `POST /api/notifications/batch` - 批量發送通知
- `POST /api/notifications/schedule` - 排程通知

## React 組件

### NotificationPreferences
通知偏好設置組件，提供用戶友好的設置界面。

```tsx
import NotificationPreferences from '@/components/notifications/NotificationPreferences'

<NotificationPreferences />
```

### RealTimeNotifications
即時通知組件，顯示通知鈴鐺和通知面板。

```tsx
import RealTimeNotifications from '@/components/notifications/RealTimeNotifications'

<RealTimeNotifications userId={userId} language="zh-HK" />
```

## Service Worker 增強

Service Worker 已增強以支持推送通知處理：

### 推送事件處理
- 接收推送通知資料
- 顯示系統通知
- 處理通知操作

### 通知點擊處理
- 智能 URL 路由
- 窗口焦點管理
- 新窗口開啟

### 通知關閉處理
- 追蹤通知關閉事件
- 統計分析支持

## 數據庫變更

### 新增通知偏好欄位
```sql
ALTER TABLE notification_preferences 
ADD COLUMN craftsman_status_notify BOOLEAN DEFAULT true,
ADD COLUMN event_notify BOOLEAN DEFAULT true,
ADD COLUMN comment_notify BOOLEAN DEFAULT true,
ADD COLUMN like_notify BOOLEAN DEFAULT true,
ADD COLUMN reminder_notify BOOLEAN DEFAULT true,
ADD COLUMN marketing_notify BOOLEAN DEFAULT false;
```

## 使用範例

### 發送師傅狀態變更通知
```typescript
import { notificationService } from '@/lib/services/notification.service'

await notificationService.notifyCraftsmanStatusChange(
  'user-id',
  'PENDING',
  'VERIFIED',
  '審核通過，恭喜您成為認證師傅！'
)
```

### 批量發送通知
```typescript
const notifications = [
  {
    userId: 'user1',
    notificationData: {
      type: 'COURSE_UPDATE',
      title: { 'zh-HK': '新課程發布' },
      message: { 'zh-HK': '您關注的師傅發布了新課程' }
    }
  }
]

await notificationService.sendBatchNotifications(notifications)
```

### 排程通知
```typescript
const scheduledDate = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24小時後

await notificationService.scheduleNotification(
  'user-id',
  {
    type: 'COURSE_REMINDER',
    title: { 'zh-HK': '課程提醒' },
    message: { 'zh-HK': '您的課程即將開始' }
  },
  scheduledDate
)
```

## 配置

### 環境變數
```env
# 推送通知
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key

# 郵件服務
EMAIL_SERVICE_API_KEY=your-email-service-key
EMAIL_FROM_ADDRESS=noreply@your-domain.com

# 應用程式 URL
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Service Worker 註冊
```javascript
// 在 app/layout.tsx 中
useEffect(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
  }
}, [])
```

## 測試

### 單元測試
```bash
npm test -- src/lib/services/__tests__/notification.service.test.ts
```

### 集成測試
```bash
npm test -- src/lib/services/__tests__/notification-integration.test.ts
```

## 性能考量

### 批量處理
- 支持批量發送通知，避免單個請求過多
- 內建速率限制，防止系統過載
- 批次間延遲處理，確保系統穩定

### 緩存策略
- 通知偏好緩存，減少數據庫查詢
- 郵件模板緩存，提升渲染性能
- 推送訂閱緩存，優化推送效率

### 錯誤處理
- 優雅的錯誤處理，不影響主要業務流程
- 詳細的錯誤日誌，便於問題排查
- 自動重試機制，提高通知送達率

## 安全考量

### 權限控制
- 用戶只能管理自己的通知偏好
- 管理員權限控制批量通知功能
- API 端點身份驗證和授權

### 資料保護
- 敏感資料加密存儲
- 推送訂閱資料安全處理
- 郵件內容防 XSS 攻擊

### 隱私保護
- 用戶可完全控制通知偏好
- 支持通知資料刪除
- 遵循資料保護法規

## 未來擴展

### 計劃功能
- SMS 短信通知支持
- 微信/WhatsApp 整合
- AI 智能通知推薦
- 通知分析和統計
- A/B 測試支持

### 技術改進
- WebSocket 即時通知
- 通知佇列系統
- 多語言自動翻譯
- 通知模板編輯器
- 通知效果追蹤