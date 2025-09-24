import React, { useState } from 'react'
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Alert,
  Badge,
  LoadingSpinner,
  LoadingButton,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Form,
  FormField,
  FormLabel,
  Textarea,
  Select,
  Checkbox,
  Grid,
  GridItem,
  Container,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Dropdown,
  DropdownItem,
  Navigation,
  Navbar,
  NavLink,
  Breadcrumb
} from './index'

export const UIShowcase: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTab, setSelectedTab] = useState('buttons')

  const handleLoadingDemo = () => {
    setIsLoading(true)
    setTimeout(() => setIsLoading(false), 2000)
  }

  const selectOptions = [
    { value: 'option1', label: '選項 1' },
    { value: 'option2', label: '選項 2' },
    { value: 'option3', label: '選項 3' }
  ]

  const breadcrumbItems = [
    { label: '首頁', href: '/' },
    { label: '組件', href: '/components' },
    { label: 'UI 展示', current: true }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <Navigation>
        <Navbar
          brand={
            <div className="flex items-center">
              <span className="text-xl font-bold text-primary-600">香港傳統工藝平台</span>
            </div>
          }
        >
          <NavLink href="/" active>首頁</NavLink>
          <NavLink href="/crafts">工藝</NavLink>
          <NavLink href="/courses">課程</NavLink>
          <NavLink href="/products">產品</NavLink>
        </Navbar>
      </Navigation>

      <Container className="py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">UI 組件展示</h1>
          <Breadcrumb items={breadcrumbItems} />
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="mb-8">
            <TabsTrigger value="buttons">按鈕</TabsTrigger>
            <TabsTrigger value="forms">表單</TabsTrigger>
            <TabsTrigger value="feedback">反饋</TabsTrigger>
            <TabsTrigger value="layout">佈局</TabsTrigger>
          </TabsList>

          <TabsContent value="buttons">
            <Grid cols={1} gap="lg">
              <Card>
                <CardHeader>
                  <CardTitle>按鈕組件</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">按鈕變體</h4>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="primary">主要按鈕</Button>
                        <Button variant="secondary">次要按鈕</Button>
                        <Button variant="outline">邊框按鈕</Button>
                        <Button variant="ghost">幽靈按鈕</Button>
                        <Button variant="destructive">危險按鈕</Button>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">按鈕大小</h4>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button size="xs">極小</Button>
                        <Button size="sm">小</Button>
                        <Button size="md">中等</Button>
                        <Button size="lg">大</Button>
                        <Button size="xl">極大</Button>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">載入按鈕</h4>
                      <div className="flex gap-2">
                        <LoadingButton
                          isLoading={isLoading}
                          onClick={handleLoadingDemo}
                          loadingText="處理中..."
                        >
                          點擊測試載入
                        </LoadingButton>
                        <LoadingSpinner size="md" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Grid>
          </TabsContent>

          <TabsContent value="forms">
            <Grid cols={1} gap="lg">
              <Card>
                <CardHeader>
                  <CardTitle>表單組件</CardTitle>
                </CardHeader>
                <CardContent>
                  <Form className="space-y-6">
                    <FormField>
                      <Input
                        label="電子郵件"
                        type="email"
                        placeholder="請輸入您的電子郵件"
                        helperText="我們不會分享您的電子郵件地址"
                      />
                    </FormField>

                    <FormField>
                      <Input
                        label="密碼"
                        type="password"
                        placeholder="請輸入密碼"
                        error="密碼至少需要8個字符"
                      />
                    </FormField>

                    <FormField>
                      <Textarea
                        label="描述"
                        placeholder="請輸入描述..."
                        rows={4}
                        helperText="最多500個字符"
                      />
                    </FormField>

                    <FormField>
                      <Select
                        label="選擇工藝類型"
                        options={selectOptions}
                        placeholder="請選擇..."
                      />
                    </FormField>

                    <FormField>
                      <Checkbox
                        label="我同意服務條款"
                        description="閱讀並同意我們的服務條款和隱私政策"
                      />
                    </FormField>

                    <div className="flex gap-2">
                      <Button type="submit">提交</Button>
                      <Button variant="outline" type="button">取消</Button>
                    </div>
                  </Form>
                </CardContent>
              </Card>
            </Grid>
          </TabsContent>

          <TabsContent value="feedback">
            <Grid cols={1} gap="lg">
              <Card>
                <CardHeader>
                  <CardTitle>反饋組件</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">警告框</h4>
                      <div className="space-y-3">
                        <Alert variant="info" title="信息">
                          這是一個信息提示框
                        </Alert>
                        <Alert variant="success" title="成功">
                          操作已成功完成
                        </Alert>
                        <Alert variant="warning" title="警告">
                          請注意這個重要信息
                        </Alert>
                        <Alert variant="error" title="錯誤">
                          發生了一個錯誤，請重試
                        </Alert>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">徽章</h4>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="default">默認</Badge>
                        <Badge variant="primary">主要</Badge>
                        <Badge variant="secondary">次要</Badge>
                        <Badge variant="success">成功</Badge>
                        <Badge variant="warning">警告</Badge>
                        <Badge variant="error">錯誤</Badge>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">模態框</h4>
                      <Button onClick={() => setIsModalOpen(true)}>
                        打開模態框
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Grid>
          </TabsContent>

          <TabsContent value="layout">
            <Grid cols={1} gap="lg">
              <Card>
                <CardHeader>
                  <CardTitle>佈局組件</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">網格佈局</h4>
                      <Grid cols={3} gap="md">
                        <GridItem>
                          <Card variant="outlined" padding="sm">
                            <p className="text-center text-gray-600">網格項目 1</p>
                          </Card>
                        </GridItem>
                        <GridItem>
                          <Card variant="outlined" padding="sm">
                            <p className="text-center text-gray-600">網格項目 2</p>
                          </Card>
                        </GridItem>
                        <GridItem>
                          <Card variant="outlined" padding="sm">
                            <p className="text-center text-gray-600">網格項目 3</p>
                          </Card>
                        </GridItem>
                      </Grid>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">卡片變體</h4>
                      <Grid cols={3} gap="md">
                        <Card variant="default">
                          <CardContent>
                            <p className="text-center">默認卡片</p>
                          </CardContent>
                        </Card>
                        <Card variant="elevated">
                          <CardContent>
                            <p className="text-center">陰影卡片</p>
                          </CardContent>
                        </Card>
                        <Card variant="outlined">
                          <CardContent>
                            <p className="text-center">邊框卡片</p>
                          </CardContent>
                        </Card>
                      </Grid>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">下拉選單</h4>
                      <Dropdown
                        trigger={
                          <Button variant="outline">
                            操作選單 ▼
                          </Button>
                        }
                      >
                        <DropdownItem>編輯</DropdownItem>
                        <DropdownItem>複製</DropdownItem>
                        <DropdownItem destructive>刪除</DropdownItem>
                      </Dropdown>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Grid>
          </TabsContent>
        </Tabs>

        {/* Modal */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
          <ModalHeader onClose={() => setIsModalOpen(false)}>
            示例模態框
          </ModalHeader>
          <ModalBody>
            <p className="text-gray-600">
              這是一個示例模態框。您可以在這裡放置任何內容，如表單、圖片或其他組件。
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              取消
            </Button>
            <Button onClick={() => setIsModalOpen(false)}>
              確認
            </Button>
          </ModalFooter>
        </Modal>
      </Container>
    </div>
  )
}