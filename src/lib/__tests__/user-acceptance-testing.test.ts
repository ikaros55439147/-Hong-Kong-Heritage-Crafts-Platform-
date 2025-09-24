import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { Page, Browser, chromium } from 'playwright'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('用戶驗收測試 (User Acceptance Testing)', () => {
  let browser: Browser
  let page: Page
  let testUser: any
  let testCraftsman: any

  beforeAll(async () => {
    browser = await chromium.launch({ headless: false })
    page = await browser.newPage()
    
    // 創建測試用戶數據
    testUser = await prisma.user.create({
      data: {
        email: 'uat-user@test.com',
        passwordHash: 'hashed-password',
        role: 'learner',
        preferredLanguage: 'zh-HK'
      }
    })

    testCraftsman = await prisma.user.create({
      data: {
        email: 'uat-craftsman@test.com',
        passwordHash: 'hashed-password',
        role: 'craftsman',
        preferredLanguage: 'zh-HK',
        craftsmanProfile: {
          create: {
            craftSpecialties: ['手雕麻將', '竹編'],
            bio: { 'zh-HK': '資深師傅', 'en': 'Senior craftsman' },
            experienceYears: 20,
            workshopLocation: '香港',
            verificationStatus: 'verified'
          }
        }
      },
      include: {
        craftsmanProfile: true
      }
    })
  })

  afterAll(async () => {
    await browser.close()
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['uat-user@test.com', 'uat-craftsman@test.com']
        }
      }
    })
  })

  describe('需求 1: 工藝師傅檔案管理', () => {
    test('UAT-1.1: 師傅能夠創建和管理個人檔案', async () => {
      await page.goto('http://localhost:3000/auth/login')
      
      // 登入師傅帳戶
      await page.fill('[data-testid=email]', 'uat-craftsman@test.com')
      await page.fill('[data-testid=password]', 'password')
      await page.click('[data-testid=login-button]')
      
      // 導航到檔案編輯頁面
      await page.goto(`http://localhost:3000/craftsmen/${testCraftsman.craftsmanProfile.id}/edit`)
      
      // 驗證檔案編輯功能
      await expect(page.locator('[data-testid=craft-specialties]')).toBeVisible()
      await expect(page.locator('[data-testid=bio-editor]')).toBeVisible()
      await expect(page.locator('[data-testid=experience-years]')).toBeVisible()
      
      // 更新檔案資訊
      await page.fill('[data-testid=bio-editor]', '更新的個人介紹')
      await page.click('[data-testid=save-profile]')
      
      // 驗證更新成功
      await expect(page.locator('[data-testid=success-message]')).toBeVisible()
    })

    test('UAT-1.2: 師傅能夠上傳作品照片和影片', async () => {
      await page.goto(`http://localhost:3000/craftsmen/${testCraftsman.craftsmanProfile.id}/edit`)
      
      // 測試檔案上傳功能
      const fileInput = page.locator('[data-testid=media-upload]')
      await fileInput.setInputFiles('uploads/test-uuid.jpg')
      
      // 驗證上傳成功
      await expect(page.locator('[data-testid=uploaded-media]')).toBeVisible()
    })

    test('UAT-1.3: 檔案更新通知關注者', async () => {
      // 創建關注關係
      await prisma.follow.create({
        data: {
          followerId: testUser.id,
          followingId: testCraftsman.id
        }
      })

      // 更新師傅檔案
      await page.goto(`http://localhost:3000/craftsmen/${testCraftsman.craftsmanProfile.id}/edit`)
      await page.fill('[data-testid=bio-editor]', '最新更新的介紹')
      await page.click('[data-testid=save-profile]')

      // 驗證通知生成
      const notification = await prisma.notification.findFirst({
        where: {
          userId: testUser.id,
          type: 'craftsman_profile_updated'
        }
      })
      expect(notification).toBeTruthy()
    })
  })

  describe('需求 2: 技藝學習和教學', () => {
    test('UAT-2.1: 學習者能夠搜索和瀏覽課程', async () => {
      // 創建測試課程
      const testCourse = await prisma.course.create({
        data: {
          craftsmanId: testCraftsman.craftsmanProfile.id,
          title: { 'zh-HK': '手雕麻將入門課程', 'en': 'Mahjong Carving Basics' },
          description: { 'zh-HK': '學習傳統手雕麻將技藝', 'en': 'Learn traditional mahjong carving' },
          craftCategory: '手雕麻將',
          maxParticipants: 10,
          durationHours: 3,
          price: 500,
          status: 'active'
        }
      })

      await page.goto('http://localhost:3000/courses')
      
      // 測試搜索功能
      await page.fill('[data-testid=search-input]', '手雕麻將')
      await page.click('[data-testid=search-button]')
      
      // 驗證搜索結果
      await expect(page.locator('[data-testid=course-card]')).toBeVisible()
      await expect(page.locator('text=手雕麻將入門課程')).toBeVisible()
    })

    test('UAT-2.2: 學習者能夠預約課程', async () => {
      await page.goto('http://localhost:3000/auth/login')
      await page.fill('[data-testid=email]', 'uat-user@test.com')
      await page.fill('[data-testid=password]', 'password')
      await page.click('[data-testid=login-button]')

      // 瀏覽課程並預約
      await page.goto('http://localhost:3000/courses')
      await page.click('[data-testid=course-card]:first-child')
      await page.click('[data-testid=book-course-button]')
      
      // 填寫預約表單
      await page.fill('[data-testid=booking-notes]', '我是初學者，希望學習基礎技巧')
      await page.click('[data-testid=confirm-booking]')
      
      // 驗證預約成功
      await expect(page.locator('[data-testid=booking-success]')).toBeVisible()
    })

    test('UAT-2.3: 師傅能夠上傳教學材料', async () => {
      await page.goto('http://localhost:3000/auth/login')
      await page.fill('[data-testid=email]', 'uat-craftsman@test.com')
      await page.fill('[data-testid=password]', 'password')
      await page.click('[data-testid=login-button]')

      const course = await prisma.course.findFirst({
        where: { craftsmanId: testCraftsman.craftsmanProfile.id }
      })

      await page.goto(`http://localhost:3000/courses/${course?.id}/materials`)
      
      // 上傳教學材料
      await page.click('[data-testid=add-material-button]')
      await page.fill('[data-testid=material-title]', '基礎工具介紹')
      await page.fill('[data-testid=material-description]', '介紹手雕麻將所需的基本工具')
      await page.click('[data-testid=save-material]')
      
      // 驗證材料上傳成功
      await expect(page.locator('text=基礎工具介紹')).toBeVisible()
    })
  })

  describe('需求 3: 文化記錄和展示', () => {
    test('UAT-3.1: 用戶能夠瀏覽行業分類和工藝作品', async () => {
      await page.goto('http://localhost:3000')
      
      // 測試首頁展示
      await expect(page.locator('[data-testid=craft-categories]')).toBeVisible()
      await expect(page.locator('[data-testid=featured-craftsmen]')).toBeVisible()
      
      // 點擊分類瀏覽
      await page.click('[data-testid=category-手雕麻將]')
      await expect(page.locator('[data-testid=category-content]')).toBeVisible()
    })

    test('UAT-3.2: 搜索功能支持中英文關鍵字', async () => {
      await page.goto('http://localhost:3000')
      
      // 測試中文搜索
      await page.fill('[data-testid=global-search]', '手雕麻將')
      await page.press('[data-testid=global-search]', 'Enter')
      await expect(page.locator('[data-testid=search-results]')).toBeVisible()
      
      // 測試英文搜索
      await page.fill('[data-testid=global-search]', 'mahjong')
      await page.press('[data-testid=global-search]', 'Enter')
      await expect(page.locator('[data-testid=search-results]')).toBeVisible()
    })
  })

  describe('需求 4: 社群互動功能', () => {
    test('UAT-4.1: 用戶能夠發表評論和互動', async () => {
      await page.goto('http://localhost:3000/auth/login')
      await page.fill('[data-testid=email]', 'uat-user@test.com')
      await page.fill('[data-testid=password]', 'password')
      await page.click('[data-testid=login-button]')

      // 前往師傅檔案頁面
      await page.goto(`http://localhost:3000/craftsmen/${testCraftsman.craftsmanProfile.id}`)
      
      // 發表評論
      await page.fill('[data-testid=comment-input]', '師傅的作品非常精美！')
      await page.click('[data-testid=submit-comment]')
      
      // 驗證評論顯示
      await expect(page.locator('text=師傅的作品非常精美！')).toBeVisible()
    })

    test('UAT-4.2: 用戶能夠關注師傅並接收動態更新', async () => {
      await page.goto(`http://localhost:3000/craftsmen/${testCraftsman.craftsmanProfile.id}`)
      
      // 關注師傅
      await page.click('[data-testid=follow-button]')
      await expect(page.locator('[data-testid=following-status]')).toBeVisible()
      
      // 檢查動態更新
      await page.goto('http://localhost:3000/profile')
      await expect(page.locator('[data-testid=following-updates]')).toBeVisible()
    })
  })

  describe('需求 5: 多語言支持', () => {
    test('UAT-5.1: 語言切換功能正常運作', async () => {
      await page.goto('http://localhost:3000')
      
      // 切換到英文
      await page.click('[data-testid=language-switcher]')
      await page.click('[data-testid=lang-en]')
      
      // 驗證語言切換
      await expect(page.locator('text=Heritage Crafts')).toBeVisible()
      
      // 切換回繁體中文
      await page.click('[data-testid=language-switcher]')
      await page.click('[data-testid=lang-zh-HK]')
      
      // 驗證語言切換
      await expect(page.locator('text=傳統工藝')).toBeVisible()
    })

    test('UAT-5.2: 多語言內容正確顯示', async () => {
      await page.goto(`http://localhost:3000/craftsmen/${testCraftsman.craftsmanProfile.id}`)
      
      // 驗證中文內容
      await expect(page.locator('text=資深師傅')).toBeVisible()
      
      // 切換到英文
      await page.click('[data-testid=language-switcher]')
      await page.click('[data-testid=lang-en]')
      
      // 驗證英文內容
      await expect(page.locator('text=Senior craftsman')).toBeVisible()
    })
  })

  describe('需求 6: 產品販賣和電商功能', () => {
    test('UAT-6.1: 師傅能夠上架和管理產品', async () => {
      await page.goto('http://localhost:3000/auth/login')
      await page.fill('[data-testid=email]', 'uat-craftsman@test.com')
      await page.fill('[data-testid=password]', 'password')
      await page.click('[data-testid=login-button]')

      // 創建新產品
      await page.goto('http://localhost:3000/products/create')
      await page.fill('[data-testid=product-name]', '手工雕刻麻將')
      await page.fill('[data-testid=product-description]', '純手工雕刻的精美麻將')
      await page.fill('[data-testid=product-price]', '2000')
      await page.fill('[data-testid=product-inventory]', '5')
      await page.click('[data-testid=create-product]')
      
      // 驗證產品創建成功
      await expect(page.locator('[data-testid=product-created]')).toBeVisible()
    })

    test('UAT-6.2: 顧客能夠瀏覽和購買產品', async () => {
      await page.goto('http://localhost:3000/auth/login')
      await page.fill('[data-testid=email]', 'uat-user@test.com')
      await page.fill('[data-testid=password]', 'password')
      await page.click('[data-testid=login-button]')

      // 瀏覽產品
      await page.goto('http://localhost:3000/products')
      await page.click('[data-testid=product-card]:first-child')
      
      // 加入購物車
      await page.click('[data-testid=add-to-cart]')
      await expect(page.locator('[data-testid=cart-updated]')).toBeVisible()
      
      // 前往結帳
      await page.goto('http://localhost:3000/cart')
      await page.click('[data-testid=checkout-button]')
      
      // 填寫配送資訊
      await page.fill('[data-testid=shipping-address]', '香港九龍旺角道123號')
      await page.fill('[data-testid=phone-number]', '12345678')
      await page.click('[data-testid=place-order]')
      
      // 驗證訂單創建
      await expect(page.locator('[data-testid=order-success]')).toBeVisible()
    })
  })

  describe('需求 7: 行動裝置支援', () => {
    test('UAT-7.1: 響應式設計在不同螢幕尺寸下正常運作', async () => {
      // 測試手機尺寸
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('http://localhost:3000')
      
      // 驗證行動版導航
      await expect(page.locator('[data-testid=mobile-menu-button]')).toBeVisible()
      await page.click('[data-testid=mobile-menu-button]')
      await expect(page.locator('[data-testid=mobile-menu]')).toBeVisible()
      
      // 測試平板尺寸
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.reload()
      await expect(page.locator('[data-testid=tablet-layout]')).toBeVisible()
      
      // 恢復桌面尺寸
      await page.setViewportSize({ width: 1920, height: 1080 })
    })

    test('UAT-7.2: 觸控操作和手勢支持', async () => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('http://localhost:3000/products')
      
      // 測試滑動操作
      const productGrid = page.locator('[data-testid=product-grid]')
      await productGrid.hover()
      
      // 測試觸控點擊
      await page.tap('[data-testid=product-card]:first-child')
      await expect(page.locator('[data-testid=product-details]')).toBeVisible()
    })
  })
})