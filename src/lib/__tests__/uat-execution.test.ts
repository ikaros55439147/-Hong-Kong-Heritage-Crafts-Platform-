import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { Page, Browser, chromium } from 'playwright'
import { PrismaClient } from '@prisma/client'
import { feedbackService } from '@/lib/services/feedback.service'

const prisma = new PrismaClient()

interface UATTestResult {
  testId: string
  testName: string
  requirement: string
  status: 'passed' | 'failed' | 'blocked'
  issues: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical'
    description: string
    reproductionSteps: string[]
    expectedBehavior: string
    actualBehavior: string
    screenshot?: string
  }>
  executionTime: number
  notes?: string
}

describe('UAT 執行和問題收集', () => {
  let browser: Browser
  let page: Page
  let testResults: UATTestResult[] = []
  let testUsers: any[] = []

  beforeAll(async () => {
    browser = await chromium.launch({ 
      headless: false,
      slowMo: 1000 // 放慢操作速度以便觀察
    })
    page = await browser.newPage()
    
    // 創建多個測試用戶
    testUsers = await createTestUsers()
    
    // 設置錯誤監聽
    page.on('pageerror', (error) => {
      console.error('Page error:', error)
    })
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('Console error:', msg.text())
      }
    })
  })

  afterAll(async () => {
    await browser.close()
    await cleanupTestData()
    await generateUATReport()
  })

  describe('完整用戶流程測試', () => {
    test('UAT-FLOW-001: 新用戶註冊到完成首次購買的完整流程', async () => {
      const startTime = Date.now()
      const testResult: UATTestResult = {
        testId: 'UAT-FLOW-001',
        testName: '新用戶完整購買流程',
        requirement: '需求 1, 6',
        status: 'passed',
        issues: [],
        executionTime: 0
      }

      try {
        // 步驟 1: 用戶註冊
        await page.goto('http://localhost:3000/auth/register')
        await page.fill('[data-testid=email]', 'newuser@uat.test')
        await page.fill('[data-testid=password]', 'TestPassword123!')
        await page.fill('[data-testid=confirm-password]', 'TestPassword123!')
        await page.fill('[data-testid=name]', '測試用戶')
        await page.click('[data-testid=register-button]')

        // 驗證註冊成功
        await expect(page.locator('[data-testid=registration-success]')).toBeVisible({ timeout: 10000 })

        // 步驟 2: 瀏覽產品
        await page.goto('http://localhost:3000/products')
        await expect(page.locator('[data-testid=product-grid]')).toBeVisible()

        // 步驟 3: 查看產品詳情
        await page.click('[data-testid=product-card]:first-child')
        await expect(page.locator('[data-testid=product-details]')).toBeVisible()

        // 步驟 4: 加入購物車
        await page.click('[data-testid=add-to-cart]')
        await expect(page.locator('[data-testid=cart-notification]')).toBeVisible()

        // 步驟 5: 前往購物車
        await page.click('[data-testid=cart-icon]')
        await expect(page.locator('[data-testid=cart-items]')).toBeVisible()

        // 步驟 6: 結帳
        await page.click('[data-testid=checkout-button]')
        await page.fill('[data-testid=shipping-name]', '測試用戶')
        await page.fill('[data-testid=shipping-address]', '香港九龍旺角道123號')
        await page.fill('[data-testid=shipping-phone]', '12345678')
        await page.click('[data-testid=place-order]')

        // 驗證訂單成功
        await expect(page.locator('[data-testid=order-success]')).toBeVisible({ timeout: 15000 })

      } catch (error) {
        testResult.status = 'failed'
        testResult.issues.push({
          severity: 'high',
          description: '新用戶完整購買流程失敗',
          reproductionSteps: [
            '1. 前往註冊頁面',
            '2. 填寫註冊資訊',
            '3. 瀏覽產品',
            '4. 加入購物車',
            '5. 進行結帳'
          ],
          expectedBehavior: '用戶能夠順利完成從註冊到購買的完整流程',
          actualBehavior: `流程在某個步驟失敗: ${error}`,
          screenshot: await page.screenshot({ path: `uat-flow-001-error.png` })
        })
      }

      testResult.executionTime = Date.now() - startTime
      testResults.push(testResult)
    })

    test('UAT-FLOW-002: 師傅創建課程到學員預約的完整流程', async () => {
      const startTime = Date.now()
      const testResult: UATTestResult = {
        testId: 'UAT-FLOW-002',
        testName: '師傅創建課程到學員預約流程',
        requirement: '需求 1, 2',
        status: 'passed',
        issues: [],
        executionTime: 0
      }

      try {
        // 師傅登入
        await page.goto('http://localhost:3000/auth/login')
        await page.fill('[data-testid=email]', 'craftsman@uat.test')
        await page.fill('[data-testid=password]', 'password')
        await page.click('[data-testid=login-button]')

        // 創建課程
        await page.goto('http://localhost:3000/courses/create')
        await page.fill('[data-testid=course-title]', 'UAT測試課程')
        await page.fill('[data-testid=course-description]', '這是一個UAT測試課程')
        await page.selectOption('[data-testid=craft-category]', '手雕麻將')
        await page.fill('[data-testid=max-participants]', '5')
        await page.fill('[data-testid=duration-hours]', '3')
        await page.fill('[data-testid=price]', '300')
        await page.click('[data-testid=create-course]')

        await expect(page.locator('[data-testid=course-created]')).toBeVisible()

        // 切換到學員帳戶
        await page.goto('http://localhost:3000/auth/logout')
        await page.goto('http://localhost:3000/auth/login')
        await page.fill('[data-testid=email]', 'learner@uat.test')
        await page.fill('[data-testid=password]', 'password')
        await page.click('[data-testid=login-button]')

        // 搜索並預約課程
        await page.goto('http://localhost:3000/courses')
        await page.fill('[data-testid=search-input]', 'UAT測試課程')
        await page.click('[data-testid=search-button]')
        
        await page.click('[data-testid=course-card]:first-child')
        await page.click('[data-testid=book-course]')
        await page.fill('[data-testid=booking-notes]', '我想學習基礎技巧')
        await page.click('[data-testid=confirm-booking]')

        await expect(page.locator('[data-testid=booking-success]')).toBeVisible()

      } catch (error) {
        testResult.status = 'failed'
        testResult.issues.push({
          severity: 'high',
          description: '師傅創建課程到學員預約流程失敗',
          reproductionSteps: [
            '1. 師傅登入',
            '2. 創建新課程',
            '3. 學員登入',
            '4. 搜索課程',
            '5. 預約課程'
          ],
          expectedBehavior: '師傅能創建課程，學員能成功預約',
          actualBehavior: `流程失敗: ${error}`
        })
      }

      testResult.executionTime = Date.now() - startTime
      testResults.push(testResult)
    })

    test('UAT-FLOW-003: 多語言切換和內容顯示測試', async () => {
      const startTime = Date.now()
      const testResult: UATTestResult = {
        testId: 'UAT-FLOW-003',
        testName: '多語言功能測試',
        requirement: '需求 5',
        status: 'passed',
        issues: [],
        executionTime: 0
      }

      try {
        await page.goto('http://localhost:3000')

        // 測試繁體中文（默認）
        await expect(page.locator('text=傳統工藝')).toBeVisible()

        // 切換到英文
        await page.click('[data-testid=language-switcher]')
        await page.click('[data-testid=lang-en]')
        await expect(page.locator('text=Heritage Crafts')).toBeVisible()

        // 切換到簡體中文
        await page.click('[data-testid=language-switcher]')
        await page.click('[data-testid=lang-zh-CN]')
        await expect(page.locator('text=传统工艺')).toBeVisible()

        // 測試內容頁面的多語言
        await page.goto('http://localhost:3000/craftsmen')
        await page.click('[data-testid=craftsman-card]:first-child')
        
        // 驗證師傅檔案的多語言內容
        const profileContent = await page.locator('[data-testid=craftsman-bio]').textContent()
        expect(profileContent).toBeTruthy()

      } catch (error) {
        testResult.status = 'failed'
        testResult.issues.push({
          severity: 'medium',
          description: '多語言切換功能異常',
          reproductionSteps: [
            '1. 訪問首頁',
            '2. 點擊語言切換器',
            '3. 選擇不同語言',
            '4. 檢查內容是否正確切換'
          ],
          expectedBehavior: '語言切換正常，內容正確顯示對應語言',
          actualBehavior: `多語言功能異常: ${error}`
        })
      }

      testResult.executionTime = Date.now() - startTime
      testResults.push(testResult)
    })

    test('UAT-FLOW-004: 行動裝置響應式設計測試', async () => {
      const startTime = Date.now()
      const testResult: UATTestResult = {
        testId: 'UAT-FLOW-004',
        testName: '行動裝置響應式測試',
        requirement: '需求 7',
        status: 'passed',
        issues: [],
        executionTime: 0
      }

      try {
        // 測試不同螢幕尺寸
        const viewports = [
          { width: 375, height: 667, name: 'iPhone SE' },
          { width: 414, height: 896, name: 'iPhone 11' },
          { width: 768, height: 1024, name: 'iPad' },
          { width: 1024, height: 768, name: 'iPad Landscape' }
        ]

        for (const viewport of viewports) {
          await page.setViewportSize({ width: viewport.width, height: viewport.height })
          await page.goto('http://localhost:3000')

          // 檢查行動版導航
          if (viewport.width < 768) {
            await expect(page.locator('[data-testid=mobile-menu-button]')).toBeVisible()
            await page.click('[data-testid=mobile-menu-button]')
            await expect(page.locator('[data-testid=mobile-menu]')).toBeVisible()
          }

          // 檢查內容是否正確顯示
          await expect(page.locator('[data-testid=main-content]')).toBeVisible()

          // 測試觸控操作
          await page.goto('http://localhost:3000/products')
          await page.tap('[data-testid=product-card]:first-child')
          await expect(page.locator('[data-testid=product-details]')).toBeVisible()
        }

        // 恢復桌面尺寸
        await page.setViewportSize({ width: 1920, height: 1080 })

      } catch (error) {
        testResult.status = 'failed'
        testResult.issues.push({
          severity: 'medium',
          description: '響應式設計在某些裝置上顯示異常',
          reproductionSteps: [
            '1. 調整瀏覽器視窗大小',
            '2. 測試不同裝置尺寸',
            '3. 檢查導航和內容顯示',
            '4. 測試觸控操作'
          ],
          expectedBehavior: '在所有裝置尺寸下都能正常顯示和操作',
          actualBehavior: `響應式設計問題: ${error}`
        })
      }

      testResult.executionTime = Date.now() - startTime
      testResults.push(testResult)
    })

    test('UAT-FLOW-005: 社群互動功能測試', async () => {
      const startTime = Date.now()
      const testResult: UATTestResult = {
        testId: 'UAT-FLOW-005',
        testName: '社群互動功能測試',
        requirement: '需求 4',
        status: 'passed',
        issues: [],
        executionTime: 0
      }

      try {
        // 用戶登入
        await page.goto('http://localhost:3000/auth/login')
        await page.fill('[data-testid=email]', 'learner@uat.test')
        await page.fill('[data-testid=password]', 'password')
        await page.click('[data-testid=login-button]')

        // 前往師傅檔案頁面
        await page.goto('http://localhost:3000/craftsmen')
        await page.click('[data-testid=craftsman-card]:first-child')

        // 測試關注功能
        await page.click('[data-testid=follow-button]')
        await expect(page.locator('[data-testid=following-indicator]')).toBeVisible()

        // 測試評論功能
        await page.fill('[data-testid=comment-input]', '師傅的作品真的很棒！')
        await page.click('[data-testid=submit-comment]')
        await expect(page.locator('text=師傅的作品真的很棒！')).toBeVisible()

        // 測試點讚功能
        await page.click('[data-testid=like-button]:first-child')
        await expect(page.locator('[data-testid=like-count]')).toContainText('1')

        // 測試分享功能
        await page.click('[data-testid=share-button]')
        await expect(page.locator('[data-testid=share-modal]')).toBeVisible()

      } catch (error) {
        testResult.status = 'failed'
        testResult.issues.push({
          severity: 'medium',
          description: '社群互動功能異常',
          reproductionSteps: [
            '1. 用戶登入',
            '2. 前往師傅檔案',
            '3. 測試關注功能',
            '4. 發表評論',
            '5. 點讚和分享'
          ],
          expectedBehavior: '所有社群互動功能正常運作',
          actualBehavior: `社群功能問題: ${error}`
        })
      }

      testResult.executionTime = Date.now() - startTime
      testResults.push(testResult)
    })
  })

  // 輔助函數
  async function createTestUsers() {
    const users = [
      {
        email: 'craftsman@uat.test',
        role: 'craftsman',
        name: 'UAT師傅'
      },
      {
        email: 'learner@uat.test',
        role: 'learner',
        name: 'UAT學員'
      },
      {
        email: 'admin@uat.test',
        role: 'admin',
        name: 'UAT管理員'
      }
    ]

    const createdUsers = []
    for (const userData of users) {
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          passwordHash: 'hashed-password',
          role: userData.role,
          preferredLanguage: 'zh-HK'
        }
      })

      if (userData.role === 'craftsman') {
        await prisma.craftsmanProfile.create({
          data: {
            userId: user.id,
            craftSpecialties: ['手雕麻將', '竹編'],
            bio: { 'zh-HK': 'UAT測試師傅', 'en': 'UAT Test Craftsman' },
            experienceYears: 10,
            workshopLocation: '香港',
            verificationStatus: 'verified'
          }
        })
      }

      createdUsers.push(user)
    }

    return createdUsers
  }

  async function cleanupTestData() {
    // 清理測試數據
    await prisma.user.deleteMany({
      where: {
        email: {
          endsWith: '@uat.test'
        }
      }
    })
  }

  async function generateUATReport() {
    const report = {
      executionDate: new Date().toISOString(),
      totalTests: testResults.length,
      passedTests: testResults.filter(t => t.status === 'passed').length,
      failedTests: testResults.filter(t => t.status === 'failed').length,
      blockedTests: testResults.filter(t => t.status === 'blocked').length,
      totalIssues: testResults.reduce((sum, t) => sum + t.issues.length, 0),
      criticalIssues: testResults.reduce((sum, t) => sum + t.issues.filter(i => i.severity === 'critical').length, 0),
      highIssues: testResults.reduce((sum, t) => sum + t.issues.filter(i => i.severity === 'high').length, 0),
      averageExecutionTime: testResults.reduce((sum, t) => sum + t.executionTime, 0) / testResults.length,
      testResults,
      recommendations: generateRecommendations()
    }

    // 將報告保存到文件
    const fs = await import('fs/promises')
    await fs.writeFile(
      'uat-report.json',
      JSON.stringify(report, null, 2)
    )

    // 收集反饋到系統
    const feedbackItems = testResults.flatMap(test => 
      test.issues.map(issue => ({
        userId: 'uat-system',
        category: 'bug' as const,
        title: `UAT Issue: ${test.testName}`,
        description: issue.description,
        severity: issue.severity,
        status: 'open' as const,
        page: test.testId,
        reproductionSteps: issue.reproductionSteps,
        expectedBehavior: issue.expectedBehavior,
        actualBehavior: issue.actualBehavior
      }))
    )

    if (feedbackItems.length > 0) {
      await feedbackService.collectBatchFeedback(feedbackItems)
    }

    console.log('UAT Report generated:', report)
  }

  function generateRecommendations(): string[] {
    const recommendations: string[] = []
    
    const failedTests = testResults.filter(t => t.status === 'failed')
    const criticalIssues = testResults.reduce((sum, t) => sum + t.issues.filter(i => i.severity === 'critical').length, 0)
    const highIssues = testResults.reduce((sum, t) => sum + t.issues.filter(i => i.severity === 'high').length, 0)

    if (criticalIssues > 0) {
      recommendations.push(`立即修復 ${criticalIssues} 個嚴重問題，這些問題會阻止系統正常運作`)
    }

    if (highIssues > 0) {
      recommendations.push(`優先處理 ${highIssues} 個高優先級問題，改善用戶體驗`)
    }

    if (failedTests.length > testResults.length * 0.2) {
      recommendations.push('測試失敗率過高，建議進行全面的系統檢查和修復')
    }

    const avgExecutionTime = testResults.reduce((sum, t) => sum + t.executionTime, 0) / testResults.length
    if (avgExecutionTime > 30000) { // 30秒
      recommendations.push('測試執行時間過長，可能存在性能問題')
    }

    return recommendations
  }
})