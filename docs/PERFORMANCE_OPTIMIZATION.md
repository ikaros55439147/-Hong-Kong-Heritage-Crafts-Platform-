# 性能優化文檔

## 概述

本文檔描述了香港弱勢行業傳承平台的性能優化實施方案，包括圖片和影片懶加載、內容預載和緩存策略、數據庫查詢優化以及離線功能增強。

## 功能特性

### 1. 圖片和影片懶加載

#### LazyImage 組件
- **位置**: `src/components/media/LazyImage.tsx`
- **功能**: 
  - 使用 Intersection Observer API 實現懶加載
  - 支持優先級加載（priority）
  - 提供載入狀態和錯誤處理
  - 自動緩存已載入的圖片

#### LazyVideo 組件
- **位置**: `src/components/media/LazyVideo.tsx`
- **功能**:
  - 影片懶加載和預載入控制
  - 支持海報圖片和播放控制
  - 載入失敗時的優雅降級

#### 使用方式
```tsx
import { LazyImage, LazyVideo } from '@/components/media'

// 基本圖片懶加載
<LazyImage 
  src="/path/to/image.jpg" 
  alt="描述文字"
  width={300}
  height={200}
/>

// 優先級圖片（立即載入）
<LazyImage 
  src="/hero-image.jpg" 
  alt="主要圖片"
  priority={true}
/>

// 影片懶加載
<LazyVideo 
  src="/path/to/video.mp4"
  poster="/path/to/poster.jpg"
  controls={true}
/>
```

### 2. 內容預載和緩存策略

#### 緩存服務
- **位置**: `src/lib/services/cache.service.ts`
- **功能**:
  - 多層緩存系統（記憶體、API、圖片）
  - TTL（生存時間）管理
  - 自動清理過期內容
  - 緩存統計和監控

#### 內容預載器
- **位置**: `src/lib/services/cache.service.ts`
- **功能**:
  - 關鍵內容預載入
  - 預載入隊列管理
  - 圖片批量預載入
  - 背景預載入處理

#### 使用方式
```tsx
import { usePreloader } from '@/lib/hooks/usePreloader'
import { contentPreloader } from '@/lib/services/cache.service'

// 使用預載入 Hook
const { isPreloading, progress } = usePreloader({
  preloadImages: ['/image1.jpg', '/image2.jpg'],
  preloadUrls: ['/api/courses', '/api/products']
})

// 手動預載入
await contentPreloader.preloadCriticalContent()
contentPreloader.queuePreload('/api/additional-data')
```

### 3. 數據庫查詢優化

#### 查詢優化器服務
- **位置**: `src/lib/services/query-optimizer.service.ts`
- **功能**:
  - 游標分頁（適用於大數據集）
  - 偏移分頁（適用於小數據集）
  - 批量操作優化
  - 全文搜索優化
  - 查詢性能監控

#### 使用方式
```typescript
import { QueryOptimizerService } from '@/lib/services/query-optimizer.service'

const queryOptimizer = new QueryOptimizerService(prisma)

// 游標分頁
const { data, nextCursor } = await queryOptimizer.paginateWithCursor(
  prisma.course, 
  { limit: 20, sortBy: 'createdAt' }
)

// 批量創建
await queryOptimizer.batchCreate(prisma.product, productsData)

// 性能監控
const result = await queryOptimizer.executeWithTiming(
  'complex-query',
  () => prisma.course.findMany({ include: { craftsman: true } })
)
```

### 4. 離線功能增強

#### 離線服務
- **位置**: `src/lib/services/offline.service.ts`
- **功能**:
  - 離線狀態檢測
  - 操作隊列管理
  - 離線數據存儲
  - 自動重試機制
  - 背景同步

#### 使用方式
```tsx
import { useOffline } from '@/lib/hooks/useOffline'

const { isOnline, pendingActions, queueAction, storeOfflineData } = useOffline()

// 離線時隊列操作
if (!isOnline) {
  queueAction('CREATE_BOOKING', bookingData)
}

// 存儲離線數據
storeOfflineData('course-123', courseData, 60) // 60分鐘TTL
```

### 5. 增強的服務工作器

#### 服務工作器功能
- **位置**: `public/sw.js`
- **功能**:
  - 多層緩存策略
  - 圖片緩存優化
  - API 響應緩存
  - 離線頁面支持
  - 背景同步
  - 推送通知處理

#### 緩存策略
- **靜態資源**: 緩存優先策略
- **API 響應**: 網路優先，緩存備用
- **圖片**: 緩存優先，背景更新
- **文檔**: 網路優先，離線頁面備用

### 6. 性能監控

#### 性能監控組件
- **位置**: `src/components/performance/PerformanceMonitor.tsx`
- **功能**:
  - 實時性能指標顯示
  - 載入時間監控
  - 記憶體使用監控
  - 網路狀態監控
  - 離線操作統計

#### 性能感知載入器
```tsx
import { PerformanceAwareLoader } from '@/components/performance/PerformanceMonitor'

<PerformanceAwareLoader isLoading={loading}>
  <YourComponent />
</PerformanceAwareLoader>
```

## 配置選項

### 緩存配置
```typescript
// 自定義緩存設置
const customCache = new CacheService({
  ttl: 10 * 60 * 1000, // 10分鐘
  maxSize: 200 // 最大項目數
})
```

### 懶加載配置
```tsx
// 自定義 Intersection Observer 設置
<LazyImage 
  src="/image.jpg"
  alt="圖片"
  // 提前50px開始載入
  rootMargin="50px"
  // 10%可見時觸發
  threshold={0.1}
/>
```

### 離線配置
```typescript
// 自定義重試設置
offlineService.maxRetries = 5
offlineService.retryDelay = 2000 // 2秒
```

## 性能指標

### 關鍵指標
- **首次內容繪製 (FCP)**: < 2秒
- **最大內容繪製 (LCP)**: < 3秒
- **首次輸入延遲 (FID)**: < 100毫秒
- **累積佈局偏移 (CLS)**: < 0.1

### 監控方式
```typescript
// 性能指標收集
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log(`${entry.name}: ${entry.duration}ms`)
  }
})

observer.observe({ entryTypes: ['measure', 'navigation'] })
```

## 最佳實踐

### 1. 圖片優化
- 使用適當的圖片格式（WebP、AVIF）
- 實施響應式圖片
- 設置適當的優先級
- 使用佔位符避免佈局偏移

### 2. 緩存策略
- 為不同類型的內容設置適當的 TTL
- 定期清理過期緩存
- 監控緩存命中率
- 實施緩存預熱

### 3. 數據庫優化
- 使用適當的分頁策略
- 實施查詢結果緩存
- 優化數據庫索引
- 監控慢查詢

### 4. 離線支持
- 緩存關鍵用戶數據
- 提供有意義的離線體驗
- 實施操作隊列
- 處理衝突解決

## 測試

### 單元測試
```bash
npm run test -- performance-optimization.test.ts
```

### 集成測試
```bash
npm run test -- performance-optimization-integration.test.ts
```

### 性能測試
```bash
# 使用 Lighthouse 進行性能測試
npm run lighthouse

# 使用 WebPageTest 進行詳細分析
npm run webpagetest
```

## 故障排除

### 常見問題

#### 1. 圖片載入失敗
- 檢查圖片路徑和權限
- 驗證 Intersection Observer 支持
- 檢查網路連接狀態

#### 2. 緩存未生效
- 檢查 TTL 設置
- 驗證緩存鍵的唯一性
- 檢查緩存大小限制

#### 3. 離線功能異常
- 檢查服務工作器註冊
- 驗證 localStorage 可用性
- 檢查網路狀態檢測

#### 4. 查詢性能問題
- 檢查數據庫索引
- 優化查詢條件
- 實施查詢緩存

### 調試工具
- Chrome DevTools Performance 面板
- Network 面板緩存分析
- Application 面板服務工作器狀態
- Console 面板性能日誌

## 未來改進

### 計劃功能
1. **智能預載入**: 基於用戶行為預測
2. **邊緣緩存**: CDN 集成
3. **圖片優化**: 自動格式轉換
4. **性能預算**: 自動性能監控和警報
5. **A/B 測試**: 性能優化效果測試

### 技術升級
- HTTP/3 支持
- Service Worker 更新策略
- WebAssembly 性能關鍵路徑
- 邊緣計算集成

## 相關文檔
- [PWA 實施指南](./PWA_IMPLEMENTATION.md)
- [緩存策略文檔](./CACHING_STRATEGY.md)
- [數據庫優化指南](./DATABASE_OPTIMIZATION.md)
- [離線功能文檔](./OFFLINE_FUNCTIONALITY.md)