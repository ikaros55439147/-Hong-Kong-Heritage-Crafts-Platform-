import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { app } from '@/app'

const prisma = new PrismaClient()

describe('需求驗證測試 - 驗證所有功能需求的完整實現', () => {
  let testUser: any
  let testCraftsman: any
  let testCourse: any
  let testProduct: any
  let authToken: string

  beforeAll(async () => {
    // 創建測試數據
    testUser = await prisma.user.create({
      data: {
        email: 'requirements-test@test.com',
        passwordHash: 'hashed-password',
        role: 'learner',
        preferredLanguage: 'zh-HK'
      }
    })

    testCraftsman = await prisma.user.create({
      data: {
        email: 'craftsman-requirements@test.com',
        passwordHash: 'hashed-password',
        role: 'craftsman',
        preferredLanguage: 'zh-HK',
        craftsmanProfile: {
          create: {
            craftSpecialties: ['手雕麻將', '竹編'],
            bio: { 'zh-HK': '測試師傅', 'en': 'Test craftsman' },
            experienceYears: 15,
            workshopLocation: '香港',
            verificationStatus: 'verified'
          }
        }
      },
      include: {
        craftsmanProfile: true
      }
    })

    // 獲取認證令牌
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'requirements-test@test.com',
        password: 'password'
      })
    
    authToken = loginResponse.body.token
  })

  afterAll(async () => {
    // 清理測試數據
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['requirements-test@test.com', 'craftsman-requirements@test.com']
        }
      }
    })
  })

  describe('需求 1: 工藝師傅檔案管理', () => {
    test('需求 1.1: 師傅能夠創建包含個人資料、技藝專長、工作經歷的詳細檔案', async () => {
      // 驗證師傅檔案創建
      const response = await request(app)
        .get(`/api/craftsmen/${testCraftsman.craftsmanProfile.id}`)
        .expect(200)

      expect(response.body.craftsman).toMatchObject({
        craftSpecialties: expect.arrayContaining(['手雕麻將', '竹編']),
        bio: expect.objectContaining({
          'zh-HK': expect.any(String),
          'en': expect.any(String)
        }),
        experienceYears: expect.any(Number),
        workshopLocation: expect.any(String)
      })
    })

    test('需求 1.2: 師傅能夠上傳作品照片或影片並提供分類功能', async () => {
      // 測試媒體上傳功能
      const uploadResponse = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('fake image data'), 'test.jpg')
        .expect(200)

      expect(uploadResponse.body).toHaveProperty('fileUrl')
      expect(uploadResponse.body).toHaveProperty('fileId')
    })

    test('需求 1.3: 師傅更新檔案資訊時系統即時保存變更並通知關注者', async () => {
      // 創建關注關係
      await request(app)
        .post(`/api/users/${testCraftsman.id}/follow`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      // 更新師傅檔案
      const updateResponse = await request(app)
        .put(`/api/craftsmen/${testCraftsman.craftsmanProfile.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          bio: { 'zh-HK': '更新的個人介紹', 'en': 'Updated bio' }
        })
        .expect(200)

      // 驗證通知生成
      const notifications = await prisma.notification.findMany({
        where: {
          userId: testUser.id,
          type: 'craftsman_profile_updated'
        }
      })

      expect(notifications.length).toBeGreaterThan(0)
    })

    test('需求 1.4: 系統提供安全的聯絡機制保護隱私', async () => {
      // 測試聯絡功能（不直接暴露個人資訊）
      const contactResponse = await request(app)
        .post(`/api/craftsmen/${testCraftsman.craftsmanProfile.id}/contact`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: '我想了解您的課程',
          subject: '課程諮詢'
        })
        .expect(200)

      expect(contactResponse.body).toHaveProperty('success', true)
      // 驗證不會直接返回師傅的聯絡資訊
      expect(contactResponse.body).not.toHaveProperty('email')
      expect(contactResponse.body).not.toHaveProperty('phone')
    })
  })

  describe('需求 2: 技藝學習和教學', () => {
    beforeAll(async () => {
      // 創建測試課程
      testCourse = await prisma.course.create({
        data: {
          craftsmanId: testCraftsman.craftsmanProfile.id,
          title: { 'zh-HK': '手雕麻將基礎課程', 'en': 'Basic Mahjong Carving' },
          description: { 'zh-HK': '學習基礎手雕技巧', 'en': 'Learn basic carving techniques' },
          craftCategory: '手雕麻將',
          maxParticipants: 8,
          durationHours: 3,
          price: 400,
          status: 'active'
        }
      })
    })

    test('需求 2.1: 學習者能夠搜索特定技藝並顯示相關師傅列表和課程資訊', async () => {
      const searchResponse = await request(app)
        .get('/api/courses')
        .query({ search: '手雕麻將' })
        .expect(200)

      expect(searchResponse.body.courses).toBeInstanceOf(Array)
      expect(searchResponse.body.courses.length).toBeGreaterThan(0)
      expect(searchResponse.body.courses[0]).toMatchObject({
        title: expect.objectContaining({
          'zh-HK': expect.stringContaining('手雕麻將')
        }),
        craftCategory: '手雕麻將'
      })
    })

    test('需求 2.2: 學習者能夠預約課程並提供預約管理和確認機制', async () => {
      const bookingResponse = await request(app)
        .post(`/api/courses/${testCourse.id}/bookings`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          notes: '我是初學者，希望學習基礎技巧'
        })
        .expect(200)

      expect(bookingResponse.body).toHaveProperty('booking')
      expect(bookingResponse.body.booking).toMatchObject({
        userId: testUser.id,
        courseId: testCourse.id,
        status: 'confirmed'
      })
    })

    test('需求 2.3: 師傅能夠發布教學內容（影片教學、步驟圖解和文字說明）', async () => {
      const materialResponse = await request(app)
        .post(`/api/courses/${testCourse.id}/materials`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '工具介紹',
          description: '介紹手雕麻將所需的基本工具',
          type: 'text',
          content: '基本工具包括：雕刻刀、砂紙、拋光布...',
          order: 1
        })
        .expect(200)

      expect(materialResponse.body).toHaveProperty('material')
      expect(materialResponse.body.material).toMatchObject({
        title: '工具介紹',
        type: 'text'
      })
    })

    test('需求 2.4: 系統管理報名人數並提供候補機制', async () => {
      // 創建滿額課程
      const fullCourse = await prisma.course.create({
        data: {
          craftsmanId: testCraftsman.craftsmanProfile.id,
          title: { 'zh-HK': '滿額測試課程', 'en': 'Full Course Test' },
          description: { 'zh-HK': '測試候補功能', 'en': 'Test waitlist function' },
          craftCategory: '手雕麻將',
          maxParticipants: 1,
          durationHours: 2,
          price: 300,
          status: 'active'
        }
      })

      // 第一個預約（應該成功）
      await request(app)
        .post(`/api/courses/${fullCourse.id}/bookings`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ notes: '第一個預約' })
        .expect(200)

      // 第二個預約（應該進入候補）
      const waitlistResponse = await request(app)
        .post(`/api/courses/${fullCourse.id}/bookings`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ notes: '第二個預約' })
        .expect(200)

      expect(waitlistResponse.body.booking.status).toBe('waitlisted')
    })
  })

  describe('需求 3: 文化記錄和展示', () => {
    test('需求 3.1: 系統展示每個行業的歷史背景、工藝特色和現狀', async () => {
      const categoryResponse = await request(app)
        .get('/api/crafts/手雕麻將')
        .expect(200)

      expect(categoryResponse.body).toMatchObject({
        category: '手雕麻將',
        history: expect.any(String),
        characteristics: expect.any(String),
        currentStatus: expect.any(String)
      })
    })

    test('需求 3.2: 系統提供高質量圖片展示和詳細製作過程說明', async () => {
      const craftResponse = await request(app)
        .get(`/api/craftsmen/${testCraftsman.craftsmanProfile.id}`)
        .expect(200)

      expect(craftResponse.body.craftsman).toHaveProperty('portfolioImages')
      expect(craftResponse.body.craftsman).toHaveProperty('processDescription')
    })

    test('需求 3.3: 系統提供智能搜索功能支持中英文關鍵字', async () => {
      // 測試中文搜索
      const chineseSearchResponse = await request(app)
        .get('/api/search')
        .query({ q: '手雕麻將', lang: 'zh-HK' })
        .expect(200)

      expect(chineseSearchResponse.body.results).toBeInstanceOf(Array)

      // 測試英文搜索
      const englishSearchResponse = await request(app)
        .get('/api/search')
        .query({ q: 'mahjong carving', lang: 'en' })
        .expect(200)

      expect(englishSearchResponse.body.results).toBeInstanceOf(Array)
    })

    test('需求 3.4: 系統支持流暢播放和字幕功能', async () => {
      // 測試影片內容API
      const videoResponse = await request(app)
        .get('/api/media/video/test-video-id')
        .expect(200)

      expect(videoResponse.body).toMatchObject({
        videoUrl: expect.any(String),
        subtitles: expect.objectContaining({
          'zh-HK': expect.any(String),
          'en': expect.any(String)
        }),
        streamingQuality: expect.arrayContaining(['720p', '1080p'])
      })
    })
  })

  describe('需求 4: 社群互動功能', () => {
    test('需求 4.1: 用戶能夠發表評論或心得並支持文字、圖片分享', async () => {
      const commentResponse = await request(app)
        .post('/api/comments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetType: 'craftsman',
          targetId: testCraftsman.craftsmanProfile.id,
          content: '師傅的作品真的很精美！',
          images: ['image1.jpg', 'image2.jpg']
        })
        .expect(200)

      expect(commentResponse.body.comment).toMatchObject({
        content: '師傅的作品真的很精美！',
        images: expect.arrayContaining(['image1.jpg', 'image2.jpg'])
      })
    })

    test('需求 4.2: 用戶能夠關注師傅或其他用戶並提供動態更新通知', async () => {
      // 關注師傅
      await request(app)
        .post(`/api/users/${testCraftsman.id}/follow`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      // 獲取動態更新
      const updatesResponse = await request(app)
        .get('/api/users/following-updates')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(updatesResponse.body.updates).toBeInstanceOf(Array)
    })

    test('需求 4.3: 系統支持線上活動發布、報名和管理功能', async () => {
      // 創建活動
      const eventResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '傳統工藝展示會',
          description: '展示各種傳統工藝作品',
          startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 一週後
          endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
          location: '香港文化中心',
          maxParticipants: 100
        })
        .expect(200)

      // 報名活動
      const registrationResponse = await request(app)
        .post(`/api/events/${eventResponse.body.event.id}/register`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(registrationResponse.body).toHaveProperty('registration')
    })

    test('需求 4.4: 系統提供舉報和審核機制', async () => {
      // 舉報不當內容
      const reportResponse = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetType: 'comment',
          targetId: 'test-comment-id',
          reason: 'inappropriate_content',
          description: '內容不當'
        })
        .expect(200)

      expect(reportResponse.body).toHaveProperty('report')
      expect(reportResponse.body.report.status).toBe('pending')
    })
  })

  describe('需求 5: 多語言支持', () => {
    test('需求 5.1: 系統支持繁體中文、簡體中文和英文界面', async () => {
      // 測試不同語言的API響應
      const languages = ['zh-HK', 'zh-CN', 'en']
      
      for (const lang of languages) {
        const response = await request(app)
          .get('/api/translations')
          .query({ lang })
          .expect(200)

        expect(response.body).toHaveProperty('translations')
        expect(response.body.translations).toHaveProperty('common')
      }
    })

    test('需求 5.2: 系統提供多語言內容展示和翻譯功能', async () => {
      const translationResponse = await request(app)
        .post('/api/translations/translate')
        .send({
          text: '這是一個測試文本',
          from: 'zh-HK',
          to: 'en'
        })
        .expect(200)

      expect(translationResponse.body).toHaveProperty('translatedText')
      expect(translationResponse.body.translatedText).toBeTruthy()
    })

    test('需求 5.3: 師傅能夠上傳多語言內容', async () => {
      const multilingualContentResponse = await request(app)
        .put(`/api/craftsmen/${testCraftsman.craftsmanProfile.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          bio: {
            'zh-HK': '我是一位資深的手雕麻將師傅',
            'zh-CN': '我是一位资深的手雕麻将师傅',
            'en': 'I am an experienced mahjong carving craftsman'
          }
        })
        .expect(200)

      expect(multilingualContentResponse.body.craftsman.bio).toMatchObject({
        'zh-HK': expect.any(String),
        'zh-CN': expect.any(String),
        'en': expect.any(String)
      })
    })

    test('需求 5.4: 系統允許人工校正和編輯翻譯', async () => {
      const correctionResponse = await request(app)
        .put('/api/translations/correct')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          originalText: '這是一個測試文本',
          translatedText: 'This is a test text',
          correctedText: 'This is a test document',
          language: 'en'
        })
        .expect(200)

      expect(correctionResponse.body).toHaveProperty('success', true)
    })
  })

  describe('需求 6: 產品販賣和電商功能', () => {
    beforeAll(async () => {
      // 創建測試產品
      testProduct = await prisma.product.create({
        data: {
          craftsmanId: testCraftsman.craftsmanProfile.id,
          name: { 'zh-HK': '手工雕刻麻將', 'en': 'Hand-carved Mahjong Set' },
          description: { 'zh-HK': '純手工雕刻的精美麻將', 'en': 'Exquisite hand-carved mahjong set' },
          price: 2000,
          inventoryQuantity: 5,
          isCustomizable: true,
          craftCategory: '手雕麻將',
          status: 'active'
        }
      })
    })

    test('需求 6.1: 師傅能夠上架產品並管理照片、描述、價格和庫存', async () => {
      const productResponse = await request(app)
        .get(`/api/products/${testProduct.id}`)
        .expect(200)

      expect(productResponse.body.product).toMatchObject({
        name: expect.objectContaining({
          'zh-HK': expect.any(String),
          'en': expect.any(String)
        }),
        price: expect.any(Number),
        inventoryQuantity: expect.any(Number)
      })
    })

    test('需求 6.2: 顧客能夠瀏覽產品並查看詳細資訊', async () => {
      const productsResponse = await request(app)
        .get('/api/products')
        .expect(200)

      expect(productsResponse.body.products).toBeInstanceOf(Array)
      expect(productsResponse.body.products[0]).toHaveProperty('name')
      expect(productsResponse.body.products[0]).toHaveProperty('price')
      expect(productsResponse.body.products[0]).toHaveProperty('craftsman')
    })

    test('需求 6.3: 顧客能夠下單購買並提供安全的付款機制', async () => {
      // 加入購物車
      await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProduct.id,
          quantity: 1
        })
        .expect(200)

      // 創建訂單
      const orderResponse = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          shippingAddress: {
            name: '測試用戶',
            address: '香港九龍旺角道123號',
            phone: '12345678'
          }
        })
        .expect(200)

      expect(orderResponse.body.order).toHaveProperty('id')
      expect(orderResponse.body.order.status).toBe('pending')

      // 處理付款
      const paymentResponse = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId: orderResponse.body.order.id,
          paymentMethod: 'stripe',
          amount: testProduct.price
        })
        .expect(200)

      expect(paymentResponse.body).toHaveProperty('paymentIntent')
    })

    test('需求 6.4: 系統支持物流追蹤和配送狀態更新', async () => {
      // 創建配送
      const shippingResponse = await request(app)
        .post('/api/shipping/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId: 'test-order-id',
          carrier: 'SF Express',
          trackingNumber: 'SF123456789'
        })
        .expect(200)

      // 追蹤配送
      const trackingResponse = await request(app)
        .get('/api/shipping/track/SF123456789')
        .expect(200)

      expect(trackingResponse.body).toHaveProperty('status')
      expect(trackingResponse.body).toHaveProperty('updates')
    })

    test('需求 6.5: 系統支持客製化商品溝通和報價功能', async () => {
      const customizationResponse = await request(app)
        .post(`/api/products/${testProduct.id}/customize`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          requirements: '我想要刻上特殊圖案',
          specifications: {
            size: 'large',
            material: 'premium_wood',
            engraving: '龍鳳呈祥'
          }
        })
        .expect(200)

      expect(customizationResponse.body).toHaveProperty('customizationRequest')
      expect(customizationResponse.body.customizationRequest.status).toBe('pending_quote')
    })

    test('需求 6.6: 系統自動更新庫存狀態並提供補貨通知', async () => {
      // 模擬產品售罄
      await prisma.product.update({
        where: { id: testProduct.id },
        data: { inventoryQuantity: 0 }
      })

      const inventoryResponse = await request(app)
        .get(`/api/products/${testProduct.id}/inventory`)
        .expect(200)

      expect(inventoryResponse.body.status).toBe('out_of_stock')
      expect(inventoryResponse.body.restockNotificationEnabled).toBe(true)
    })
  })

  describe('需求 7: 行動裝置支援', () => {
    test('需求 7.1: 系統提供響應式設計和優化的使用體驗', async () => {
      // 測試行動版API端點
      const mobileResponse = await request(app)
        .get('/api/mobile/layout')
        .set('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)')
        .expect(200)

      expect(mobileResponse.body).toHaveProperty('mobileOptimized', true)
      expect(mobileResponse.body).toHaveProperty('touchFriendly', true)
    })

    test('需求 7.2: 系統支持觸控操作和適應不同螢幕尺寸', async () => {
      const responsiveResponse = await request(app)
        .get('/api/ui/responsive-config')
        .expect(200)

      expect(responsiveResponse.body).toHaveProperty('breakpoints')
      expect(responsiveResponse.body).toHaveProperty('touchTargetSize')
    })

    test('需求 7.3: 系統支持相機拍攝和檔案選擇功能', async () => {
      const cameraResponse = await request(app)
        .get('/api/mobile/camera-config')
        .expect(200)

      expect(cameraResponse.body).toHaveProperty('supportedFormats')
      expect(cameraResponse.body).toHaveProperty('maxFileSize')
    })

    test('需求 7.4: 系統提供離線瀏覽和內容緩存功能', async () => {
      const offlineResponse = await request(app)
        .get('/api/offline/manifest')
        .expect(200)

      expect(offlineResponse.body).toHaveProperty('cacheStrategy')
      expect(offlineResponse.body).toHaveProperty('offlinePages')
    })
  })

  // 綜合驗證測試
  describe('綜合功能驗證', () => {
    test('所有API端點都能正常響應', async () => {
      const endpoints = [
        '/api/health',
        '/api/craftsmen',
        '/api/courses',
        '/api/products',
        '/api/search',
        '/api/translations'
      ]

      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint)
        expect(response.status).toBeLessThan(500) // 不應該有服務器錯誤
      }
    })

    test('數據庫完整性檢查', async () => {
      // 檢查關鍵表是否存在且有數據
      const userCount = await prisma.user.count()
      const craftsmanCount = await prisma.craftsmanProfile.count()
      const courseCount = await prisma.course.count()
      const productCount = await prisma.product.count()

      expect(userCount).toBeGreaterThan(0)
      expect(craftsmanCount).toBeGreaterThan(0)
      expect(courseCount).toBeGreaterThan(0)
      expect(productCount).toBeGreaterThan(0)
    })

    test('安全性檢查 - 未授權訪問應被拒絕', async () => {
      const protectedEndpoints = [
        '/api/users/profile',
        '/api/craftsmen/create',
        '/api/courses/create',
        '/api/products/create'
      ]

      for (const endpoint of protectedEndpoints) {
        const response = await request(app).post(endpoint)
        expect(response.status).toBe(401) // 未授權
      }
    })

    test('性能檢查 - API響應時間應在合理範圍內', async () => {
      const startTime = Date.now()
      
      await request(app)
        .get('/api/craftsmen')
        .expect(200)
      
      const responseTime = Date.now() - startTime
      expect(responseTime).toBeLessThan(2000) // 2秒內響應
    })
  })
})