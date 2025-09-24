# UI Component Library

這是香港傳統工藝平台的 UI 組件庫，提供了一套完整的、響應式的、可重用的 React 組件。

## 特性

- 🎨 **現代設計** - 基於 Tailwind CSS 的現代化設計系統
- 📱 **響應式** - 完全響應式設計，支持所有設備尺寸
- ♿ **無障礙** - 遵循 WCAG 2.1 無障礙標準
- 🌐 **多語言** - 支持繁體中文、簡體中文和英文
- 🧪 **測試覆蓋** - 完整的單元測試覆蓋
- 📦 **TypeScript** - 完整的 TypeScript 支持

## 組件分類

### 核心組件 (Core Components)

#### Button
多功能按鈕組件，支持多種變體和大小。

```tsx
import { Button } from '@/components/ui'

<Button variant="primary" size="md">
  點擊我
</Button>
```

**Props:**
- `variant`: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
- `size`: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
- `leftIcon`, `rightIcon`: React.ReactNode
- `fullWidth`: boolean

#### Input
輸入框組件，支持標籤、錯誤提示和圖標。

```tsx
import { Input } from '@/components/ui'

<Input
  label="電子郵件"
  type="email"
  error="請輸入有效的電子郵件地址"
  leftIcon={<EmailIcon />}
/>
```

#### Card
卡片容器組件，用於組織內容。

```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui'

<Card variant="elevated">
  <CardHeader>
    <CardTitle>卡片標題</CardTitle>
  </CardHeader>
  <CardContent>
    卡片內容
  </CardContent>
</Card>
```

### 佈局組件 (Layout Components)

#### Grid
響應式網格系統。

```tsx
import { Grid, GridItem } from '@/components/ui'

<Grid cols={3} gap="md" responsive={{ sm: 1, md: 2, lg: 3 }}>
  <GridItem>項目 1</GridItem>
  <GridItem>項目 2</GridItem>
  <GridItem>項目 3</GridItem>
</Grid>
```

#### Container
響應式容器組件。

```tsx
import { Container } from '@/components/ui'

<Container size="lg" padding="md">
  內容
</Container>
```

### 表單組件 (Form Components)

#### Form
表單容器和相關組件。

```tsx
import { Form, FormField, FormLabel, Textarea, Select } from '@/components/ui'

<Form>
  <FormField>
    <FormLabel>描述</FormLabel>
    <Textarea placeholder="請輸入描述..." />
  </FormField>
  
  <FormField>
    <Select
      label="選擇選項"
      options={[
        { value: '1', label: '選項 1' },
        { value: '2', label: '選項 2' }
      ]}
    />
  </FormField>
</Form>
```

### 反饋組件 (Feedback Components)

#### Alert
警告和通知組件。

```tsx
import { Alert } from '@/components/ui'

<Alert variant="success" title="成功">
  操作已成功完成！
</Alert>
```

#### Badge
徽章組件，用於顯示狀態或標籤。

```tsx
import { Badge, StatusBadge } from '@/components/ui'

<Badge variant="primary">新</Badge>
<StatusBadge status="active" />
```

#### Loading
載入狀態組件。

```tsx
import { LoadingSpinner, LoadingButton, LoadingOverlay } from '@/components/ui'

<LoadingSpinner size="lg" />
<LoadingButton isLoading={true} loadingText="處理中...">
  提交
</LoadingButton>
```

### 覆蓋組件 (Overlay Components)

#### Modal
模態框組件。

```tsx
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui'

<Modal isOpen={isOpen} onClose={handleClose}>
  <ModalHeader>標題</ModalHeader>
  <ModalBody>內容</ModalBody>
  <ModalFooter>
    <Button onClick={handleClose}>關閉</Button>
  </ModalFooter>
</Modal>
```

#### Dropdown
下拉選單組件。

```tsx
import { Dropdown, DropdownItem } from '@/components/ui'

<Dropdown trigger={<Button>選單</Button>}>
  <DropdownItem>編輯</DropdownItem>
  <DropdownItem>刪除</DropdownItem>
</Dropdown>
```

### 導航組件 (Navigation Components)

#### Navigation
導航欄組件。

```tsx
import { Navigation, Navbar, NavLink } from '@/components/ui'

<Navigation>
  <Navbar brand={<Logo />}>
    <NavLink href="/" active>首頁</NavLink>
    <NavLink href="/about">關於</NavLink>
  </Navbar>
</Navigation>
```

#### Tabs
標籤頁組件。

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui'

<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">標籤 1</TabsTrigger>
    <TabsTrigger value="tab2">標籤 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">內容 1</TabsContent>
  <TabsContent value="tab2">內容 2</TabsContent>
</Tabs>
```

#### Breadcrumb
麵包屑導航。

```tsx
import { Breadcrumb } from '@/components/ui'

<Breadcrumb
  items={[
    { label: '首頁', href: '/' },
    { label: '產品', href: '/products' },
    { label: '詳情', current: true }
  ]}
/>
```

### 響應式組件 (Responsive Components)

#### ResponsiveGrid
響應式網格佈局。

```tsx
import { ResponsiveGrid } from '@/components/ui'

<ResponsiveGrid
  cols={{ default: 1, sm: 2, md: 3, lg: 4 }}
  gap="md"
>
  {items.map(item => <div key={item.id}>{item.content}</div>)}
</ResponsiveGrid>
```

#### useResponsive Hook
響應式狀態 Hook。

```tsx
import { useResponsive } from '@/components/ui'

const { screenSize, isMobile, isTablet, isDesktop } = useResponsive()
```

## 設計系統

### 顏色
- **Primary**: 橙色調 (#ed7420)
- **Secondary**: 藍色調 (#0ea5e9)
- **Success**: 綠色 (#10b981)
- **Warning**: 黃色 (#f59e0b)
- **Error**: 紅色 (#ef4444)

### 字體
- **Sans**: Inter, system-ui, sans-serif
- **Chinese**: Noto Sans TC, system-ui, sans-serif

### 間距
- **xs**: 0.5rem (8px)
- **sm**: 0.75rem (12px)
- **md**: 1rem (16px)
- **lg**: 1.5rem (24px)
- **xl**: 2rem (32px)

### 斷點
- **sm**: 640px
- **md**: 768px
- **lg**: 1024px
- **xl**: 1280px
- **2xl**: 1536px

## 使用指南

### 安裝依賴
```bash
npm install clsx tailwind-merge
```

### 導入組件
```tsx
import { Button, Card, Input } from '@/components/ui'
```

### 自定義樣式
所有組件都支持 `className` prop 來添加自定義樣式：

```tsx
<Button className="my-custom-class">
  自定義按鈕
</Button>
```

### 主題定制
在 `tailwind.config.js` 中自定義主題：

```js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          // 自定義主色調
        }
      }
    }
  }
}
```

## 測試

運行組件測試：

```bash
npm run test src/components/ui/__tests__/ui-components.test.tsx
```

## 展示頁面

查看所有組件的展示頁面：

```tsx
import { UIShowcase } from '@/components/ui'

<UIShowcase />
```

## 最佳實踐

1. **一致性**: 使用設計系統中定義的顏色、間距和字體
2. **響應式**: 確保所有組件在不同設備上都能正常工作
3. **無障礙**: 使用適當的 ARIA 標籤和鍵盤導航
4. **性能**: 使用 React.memo 和 useMemo 優化性能
5. **測試**: 為所有組件編寫測試用例

## 貢獻

1. 遵循現有的代碼風格和命名約定
2. 為新組件添加 TypeScript 類型定義
3. 編寫測試用例
4. 更新文檔和示例

## 支持

如有問題或建議，請聯繫開發團隊或提交 Issue。