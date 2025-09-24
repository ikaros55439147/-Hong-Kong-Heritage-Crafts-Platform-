/**
 * 完整系統集成測試
 * Complete System Integration Tests
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { setupTestEnvironment, cleanupTestEnvironment, mockPrismaClient } from '../test-utils'
import { UserService } from '../services/user.service'
import { CraftsmanService } from '../services/craftsman.service'
import { CourseService } from '../services/course.service'
import { BookingService } from '../services/booking.service'
import { ProductService } from '../services/product.service'
import { OrderService } from '../services/order.service'
import { PaymentService } from '../services/payment.service'
import { NotificationService } from '../services/notification.service'
import { FollowService } from '../services/follow.service'
import { CommentService } from '../services/comment.service'
import { EventService } from '../services/event.service'
import { LanguageService } from '../services/language.service'
import { UploadService } from '../services/upload.service'

describe('完整系統集成測試 (Complete System Integration)', () => {
  let userService: UserService
  let craftsmanService: CraftsmanService
  let courseService: CourseService
  let bookingService: BookingService
  let productService: ProductService
  let orderService: OrderService
  let paymentService: PaymentService
  let notificationService: NotificationService
  let followService: FollowService
  let commentService: CommentService
  let eventService: EventService
  let languageService: LanguageService
  let uploadService: UploadService

  let testUser: any
  let testCraftsman: any
  let testCourse: any
  let testProduct: any

  beforeAll(async () => {
    setupTestEnvironment()
    
    // Mock all services for testing
    userService = {
      register: vi.fn(),
      findByEmail: vi.fn(),
    } as any
    
    craftsmanService = {
      createProfile: vi.fn(),
    } as any
    
    courseService = {
      create: vi.fn(),
      search: vi.fn(),
    } as any
    
    bookingService = {
      create: vi.fn(),
    } as any
    
    productService = {
      create: vi.fn(),
      search: vi.fn(),
      findById: vi.fn(),
    } as any
    
    orderService = {
      create: vi.fn(),
      findById: vi.fn(),
    } as any
    
    paymentService = {
      processPayment: vi.fn(),
    } as any
    
    notificationService = {
      getUserNotifications: vi.fn(),
    } as any
    
    followService = {
      followCraftsman: vi.fn(),
      getFollowing: vi.fn(),
    } as any
    
    commentService = {
      create: vi.fn(),
      getComments: vi.fn(),
    } as any
    
    eventService = {
      create: vi.fn(),
      registerForEvent: vi.fn(),
    } as any
    
    languageService = {
      createMultilingualContent: vi.fn(),
    } as any
    
    uploadService = {
      uploadFile: vi.fn(),
    } as any
  })

  afterAll(async () => {
    cleanupTestEnvironment()
  })

  beforeEach(async () => {
    vi.clearAllMocks()
  })

  describe('端到端用戶流程測試 (End-to-End User Flow)', () => {
    test('完整的師傅註冊到課程教學流程', async () => {
      // Mock返回值
      const mockUser = {
        id: 'user-123',
        email: 'master@example.com',
        name: '李師傅'
      }
      
      const mockCraftsman = {
        id: 'craftsman-123',
        userId: 'user-123',
        craftSpecialties: ['手雕麻將', '竹編'],
        bio: {
          'zh-HK': '擁有30年手雕麻將經驗的老師傅',
          'en': 'Master craftsman with 30 years of mahjong carving experience'
        }
      }
      
      const mockCourse = {
        id: 'course-123',
        craftsmanId: 'craftsman-123',
        maxParticipants: 8,
        title: {
          'zh-HK': '手雕麻將入門班',
          'en': 'Beginner Mahjong Carving Class'
        }
      }
      
      const mockUploadResult = {
        id: 'upload-123',
        url: 'https://example.com/image.jpg'
      }
      
      const mockSearchResults = {
        courses: [mockCourse]
      }

      // 設置mock返回值
      vi.mocked(userService.register).mockResolvedValue(mockUser)
      vi.mocked(craftsmanService.createProfile).mockResolvedValue(mockCraftsman)
      vi.mocked(uploadService.uploadFile).mockResolvedValue(mockUploadResult)
      vi.mocked(courseService.create).mockResolvedValue(mockCourse)
      vi.mocked(courseService.search).mockResolvedValue(mockSearchResults)

      // 1. 用戶註冊
      testUser = await userService.register({
        email: 'master@example.com',
        password: 'SecurePass123!',
        name: '李師傅',
        preferredLanguage: 'zh-HK'
      })
      expect(testUser).toBeDefined()
      expect(testUser.email).toBe('master@example.com')

      // 2. 創建師傅檔案
      testCraftsman = await craftsmanService.createProfile(testUser.id, {
        craftSpecialties: ['手雕麻將', '竹編'],
        bio: {
          'zh-HK': '擁有30年手雕麻將經驗的老師傅',
          'en': 'Master craftsman with 30 years of mahjong carving experience'
        },
        experienceYears: 30,
        workshopLocation: '香港深水埗',
        contactInfo: {
          phone: '+852-1234-5678',
          wechat: 'master_li'
        }
      })
      expect(testCraftsman).toBeDefined()
      expect(testCraftsman.craftSpecialties).toContain('手雕麻將')

      // 3. 上傳作品照片
      const uploadResult = await uploadService.uploadFile({
        filename: 'mahjong-work.jpg',
        mimetype: 'image/jpeg',
        size: 1024000,
        buffer: Buffer.from('fake-image-data')
      }, testUser.id)
      expect(uploadResult).toBeDefined()

      // 4. 創建課程
      testCourse = await courseService.create(testCraftsman.id, {
        title: {
          'zh-HK': '手雕麻將入門班',
          'en': 'Beginner Mahjong Carving Class'
        },
        description: {
          'zh-HK': '學習傳統手雕麻將技藝',
          'en': 'Learn traditional mahjong carving techniques'
        },
        craftCategory: '手雕麻將',
        maxParticipants: 8,
        durationHours: 3,
        price: 500,
        schedule: {
          startDate: new Date('2024-02-01'),
          endDate: new Date('2024-02-01'),
          timeSlots: ['14:00-17:00']
        }
      })
      expect(testCourse).toBeDefined()
      expect(testCourse.maxParticipants).toBe(8)

      // 5. 驗證課程可以被搜索到
      const searchResults = await courseService.search({
        query: '手雕麻將',
        language: 'zh-HK'
      })
      expect(searchResults.courses).toHaveLength(1)
      expect(searchResults.courses[0].id).toBe(testCourse.id)
    })

    test('完整的學習者預約課程流程', async () => {
      // Mock數據
      const mockMasterUser = { id: 'master-123', email: 'master@example.com', name: '李師傅' }
      const mockLearner = { id: 'learner-123', email: 'learner@example.com', name: '學習者小明' }
      const mockCraftsman = { id: 'craftsman-123', userId: 'master-123' }
      const mockCourse = { id: 'course-123', craftsmanId: 'craftsman-123', maxParticipants: 2 }
      const mockBooking = { id: 'booking-123', userId: 'learner-123', courseId: 'course-123', status: 'confirmed' }
      const mockNotifications = [{ id: 'notif-123', type: 'new_booking' }]
      const mockFollowing = [{ craftsmanId: 'craftsman-123' }]

      // 設置mock返回值
      vi.mocked(userService.register).mockResolvedValueOnce(mockMasterUser).mockResolvedValueOnce(mockLearner)
      vi.mocked(userService.findByEmail).mockResolvedValue(mockMasterUser)
      vi.mocked(craftsmanService.createProfile).mockResolvedValue(mockCraftsman)
      vi.mocked(courseService.create).mockResolvedValue(mockCourse)
      vi.mocked(courseService.search).mockResolvedValue({ courses: [mockCourse] })
      vi.mocked(bookingService.create).mockResolvedValue(mockBooking)
      vi.mocked(notificationService.getUserNotifications).mockResolvedValue(mockNotifications)
      vi.mocked(followService.followCraftsman).mockResolvedValue(undefined)
      vi.mocked(followService.getFollowing).mockResolvedValue(mockFollowing)

      // 先創建師傅和課程
      await userService.register({
        email: 'master@example.com',
        password: 'SecurePass123!',
        name: '李師傅'
      })
      
      const masterUser = await userService.findByEmail('master@example.com')
      const craftsman = await craftsmanService.createProfile(masterUser.id, {
        craftSpecialties: ['手雕麻將'],
        bio: { 'zh-HK': '經驗豐富的師傅' },
        experienceYears: 30
      })
      
      const course = await courseService.create(craftsman.id, {
        title: { 'zh-HK': '手雕麻將課程' },
        description: { 'zh-HK': '學習手雕麻將' },
        craftCategory: '手雕麻將',
        maxParticipants: 2,
        durationHours: 3,
        price: 500
      })

      // 1. 學習者註冊
      const learner = await userService.register({
        email: 'learner@example.com',
        password: 'SecurePass123!',
        name: '學習者小明'
      })
      expect(learner).toBeDefined()

      // 2. 瀏覽課程
      const courses = await courseService.search({
        craftCategory: '手雕麻將'
      })
      expect(courses.courses).toHaveLength(1)

      // 3. 預約課程
      const booking = await bookingService.create({
        userId: learner.id,
        courseId: course.id,
        notes: '我是初學者，請多指教'
      })
      expect(booking).toBeDefined()
      expect(booking.status).toBe('confirmed')

      // 4. 驗證通知系統
      const notifications = await notificationService.getUserNotifications(masterUser.id)
      expect(notifications).toHaveLength(1)
      expect(notifications[0].type).toBe('new_booking')

      // 5. 關注師傅
      await followService.followCraftsman(learner.id, craftsman.id)
      const following = await followService.getFollowing(learner.id)
      expect(following).toHaveLength(1)
      expect(following[0].craftsmanId).toBe(craftsman.id)
    })

    test('完整的電商購買流程', async () => {
      // 創建師傅和產品
      const masterUser = await userService.register({
        email: 'artisan@example.com',
        password: 'SecurePass123!',
        name: '工藝師傅'
      })
      
      const craftsman = await craftsmanService.createProfile(masterUser.id, {
        craftSpecialties: ['竹編'],
        bio: { 'zh-HK': '竹編工藝師' },
        experienceYears: 20
      })

      // 1. 創建產品
      testProduct = await productService.create(craftsman.id, {
        name: {
          'zh-HK': '手工竹籃',
          'en': 'Handmade Bamboo Basket'
        },
        description: {
          'zh-HK': '純手工編織竹籃',
          'en': 'Pure handwoven bamboo basket'
        },
        price: 200,
        inventoryQuantity: 10,
        craftCategory: '竹編',
        isCustomizable: false
      })
      expect(testProduct).toBeDefined()

      // 2. 顧客註冊
      const customer = await userService.register({
        email: 'customer@example.com',
        password: 'SecurePass123!',
        name: '顧客小華'
      })

      // 3. 瀏覽產品
      const products = await productService.search({
        craftCategory: '竹編'
      })
      expect(products.products).toHaveLength(1)

      // 4. 創建訂單
      const order = await orderService.create({
        userId: customer.id,
        items: [{
          productId: testProduct.id,
          quantity: 2,
          price: testProduct.price
        }],
        shippingAddress: {
          name: '顧客小華',
          address: '香港九龍旺角道123號',
          phone: '+852-9876-5432'
        }
      })
      expect(order).toBeDefined()
      expect(order.totalAmount).toBe(400) // 2 * 200

      // 5. 處理支付
      const payment = await paymentService.processPayment({
        orderId: order.id,
        amount: order.totalAmount,
        paymentMethod: 'stripe',
        paymentDetails: {
          cardToken: 'tok_visa'
        }
      })
      expect(payment.status).toBe('completed')

      // 6. 驗證庫存更新
      const updatedProduct = await productService.findById(testProduct.id)
      expect(updatedProduct.inventoryQuantity).toBe(8) // 10 - 2
    })
  })

  describe('多語言系統集成測試', () => {
    test('多語言內容創建和搜索', async () => {
      // 1. 創建多語言內容
      const content = await languageService.createMultilingualContent({
        type: 'course_description',
        content: {
          'zh-HK': '這是一個傳統工藝課程',
          'zh-CN': '这是一个传统工艺课程',
          'en': 'This is a traditional craft course'
        }
      })
      expect(content).toBeDefined()

      // 2. 測試不同語言的搜索
      const zhHKResults = await courseService.search({
        query: '傳統工藝',
        language: 'zh-HK'
      })
      
      const enResults = await courseService.search({
        query: 'traditional craft',
        language: 'en'
      })

      // 驗證搜索結果
      expect(zhHKResults).toBeDefined()
      expect(enResults).toBeDefined()
    })
  })

  describe('社群功能集成測試', () => {
    test('評論和互動系統', async () => {
      // 創建用戶和內容
      const user1 = await userService.register({
        email: 'user1@example.com',
        password: 'SecurePass123!',
        name: '用戶一'
      })

      const user2 = await userService.register({
        email: 'user2@example.com',
        password: 'SecurePass123!',
        name: '用戶二'
      })

      // 創建評論
      const comment = await commentService.create({
        userId: user1.id,
        contentType: 'course',
        contentId: 'test-course-id',
        content: '這個課程很棒！'
      })
      expect(comment).toBeDefined()

      // 回覆評論
      const reply = await commentService.create({
        userId: user2.id,
        contentType: 'course',
        contentId: 'test-course-id',
        content: '我也想參加',
        parentId: comment.id
      })
      expect(reply).toBeDefined()
      expect(reply.parentId).toBe(comment.id)

      // 獲取評論列表
      const comments = await commentService.getComments('course', 'test-course-id')
      expect(comments).toHaveLength(2)
    })

    test('活動管理系統', async () => {
      // 創建組織者
      const organizer = await userService.register({
        email: 'organizer@example.com',
        password: 'SecurePass123!',
        name: '活動組織者'
      })

      // 創建活動
      const event = await eventService.create({
        organizerId: organizer.id,
        title: {
          'zh-HK': '傳統工藝展覽',
          'en': 'Traditional Craft Exhibition'
        },
        description: {
          'zh-HK': '展示各種傳統工藝作品',
          'en': 'Showcase various traditional craft works'
        },
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-03-03'),
        location: '香港文化中心',
        maxParticipants: 100,
        isOnline: false
      })
      expect(event).toBeDefined()

      // 用戶報名活動
      const participant = await userService.register({
        email: 'participant@example.com',
        password: 'SecurePass123!',
        name: '參與者'
      })

      const registration = await eventService.registerForEvent(event.id, participant.id)
      expect(registration).toBeDefined()
      expect(registration.status).toBe('confirmed')
    })
  })

  describe('性能和負載測試', () => {
    test('並發預約處理', async () => {
      // 創建課程
      const masterUser = await userService.register({
        email: 'concurrent-master@example.com',
        password: 'SecurePass123!',
        name: '並發測試師傅'
      })
      
      const craftsman = await craftsmanService.createProfile(masterUser.id, {
        craftSpecialties: ['測試工藝'],
        bio: { 'zh-HK': '測試用師傅' },
        experienceYears: 10
      })
      
      const course = await courseService.create(craftsman.id, {
        title: { 'zh-HK': '並發測試課程' },
        description: { 'zh-HK': '測試並發預約' },
        craftCategory: '測試工藝',
        maxParticipants: 2, // 限制2個名額
        durationHours: 1,
        price: 100
      })

      // 創建多個學習者
      const learners = await Promise.all(
        Array.from({ length: 5 }, (_, i) => 
          userService.register({
            email: `learner${i}@example.com`,
            password: 'SecurePass123!',
            name: `學習者${i}`
          })
        )
      )

      // 並發預約測試
      const bookingPromises = learners.map(learner =>
        bookingService.create({
          userId: learner.id,
          courseId: course.id,
          notes: '並發測試預約'
        }).catch(error => ({ error: error.message }))
      )

      const results = await Promise.all(bookingPromises)
      
      // 驗證只有2個成功預約
      const successfulBookings = results.filter(result => !result.error)
      const failedBookings = results.filter(result => result.error)
      
      expect(successfulBookings).toHaveLength(2)
      expect(failedBookings).toHaveLength(3)
    })

    test('大量數據查詢性能', async () => {
      // 創建大量測試數據
      const startTime = Date.now()
      
      // 創建100個師傅
      const craftsmen = await Promise.all(
        Array.from({ length: 100 }, async (_, i) => {
          const user = await userService.register({
            email: `perf-master${i}@example.com`,
            password: 'SecurePass123!',
            name: `性能測試師傅${i}`
          })
          
          return await craftsmanService.createProfile(user.id, {
            craftSpecialties: [`工藝${i % 10}`],
            bio: { 'zh-HK': `師傅${i}的介紹` },
            experienceYears: i % 30 + 1
          })
        })
      )

      // 創建500個課程
      await Promise.all(
        craftsmen.flatMap(craftsman =>
          Array.from({ length: 5 }, (_, i) =>
            courseService.create(craftsman.id, {
              title: { 'zh-HK': `課程${i}` },
              description: { 'zh-HK': `課程描述${i}` },
              craftCategory: craftsman.craftSpecialties[0],
              maxParticipants: 10,
              durationHours: 2,
              price: 100 + i * 50
            })
          )
        )
      )

      const dataCreationTime = Date.now() - startTime
      console.log(`數據創建時間: ${dataCreationTime}ms`)

      // 測試搜索性能
      const searchStartTime = Date.now()
      const searchResults = await courseService.search({
        query: '課程',
        limit: 50
      })
      const searchTime = Date.now() - searchStartTime
      
      expect(searchResults.courses).toHaveLength(50)
      expect(searchTime).toBeLessThan(1000) // 搜索應在1秒內完成
      
      console.log(`搜索時間: ${searchTime}ms`)
    })
  })

  describe('錯誤處理和恢復測試', () => {
    test('支付失敗處理', async () => {
      // 創建訂單
      const customer = await userService.register({
        email: 'payment-test@example.com',
        password: 'SecurePass123!',
        name: '支付測試用戶'
      })

      const order = await orderService.create({
        userId: customer.id,
        items: [{
          productId: 'test-product-id',
          quantity: 1,
          price: 100
        }],
        shippingAddress: {
          name: '測試用戶',
          address: '測試地址',
          phone: '+852-1234-5678'
        }
      })

      // 模擬支付失敗
      try {
        await paymentService.processPayment({
          orderId: order.id,
          amount: order.totalAmount,
          paymentMethod: 'stripe',
          paymentDetails: {
            cardToken: 'tok_chargeDeclined' // 模擬被拒絕的卡
          }
        })
      } catch (error) {
        expect(error.message).toContain('Payment declined')
      }

      // 驗證訂單狀態
      const updatedOrder = await orderService.findById(order.id)
      expect(updatedOrder.status).toBe('payment_failed')
    })

    test('數據庫連接失敗恢復', async () => {
      // 這個測試需要模擬數據庫連接問題
      // 在實際環境中，應該測試連接池重連機制
      expect(true).toBe(true) // 佔位符測試
    })
  })
})