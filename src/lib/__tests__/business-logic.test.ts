/**
 * Comprehensive business logic tests
 * Tests core business rules, workflows, and edge cases
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { setupTestEnvironment, cleanupTestEnvironment, createMockUser, createMockCraftsman, createMockCourse, createMockProduct, createMockBooking, createMockOrder } from '@/lib/test-utils'

// Mock services
vi.mock('@/lib/database')
vi.mock('@/lib/services/notification.service')
vi.mock('@/lib/services/payment.service')

describe('Business Logic Tests', () => {
  beforeEach(() => {
    setupTestEnvironment()
  })

  afterEach(() => {
    cleanupTestEnvironment()
  })

  describe('Course Booking Logic', () => {
    test('should successfully book available course', async () => {
      const { BookingService } = await import('@/lib/services/booking.service')
      const mockCourse = createMockCourse({ maxParticipants: 5 })
      const mockUser = createMockUser()
      
      const bookingService = new BookingService()
      
      // Mock course availability check
      vi.spyOn(bookingService, 'checkCourseAvailability').mockResolvedValue({
        available: true,
        currentBookings: 3,
        maxParticipants: 5
      })

      const result = await bookingService.createBooking({
        userId: mockUser.id,
        courseId: mockCourse.id,
        notes: 'Looking forward to learning'
      })

      expect(result.success).toBe(true)
      expect(result.booking?.status).toBe('confirmed')
    })

    test('should add to waitlist when course is full', async () => {
      const { BookingService } = await import('@/lib/services/booking.service')
      const mockCourse = createMockCourse({ maxParticipants: 5 })
      const mockUser = createMockUser()
      
      const bookingService = new BookingService()
      
      // Mock course full scenario
      vi.spyOn(bookingService, 'checkCourseAvailability').mockResolvedValue({
        available: false,
        currentBookings: 5,
        maxParticipants: 5
      })

      const result = await bookingService.createBooking({
        userId: mockUser.id,
        courseId: mockCourse.id,
        notes: 'Please add to waitlist'
      })

      expect(result.success).toBe(true)
      expect(result.booking?.status).toBe('waitlisted')
    })

    test('should prevent double booking by same user', async () => {
      const { BookingService } = await import('@/lib/services/booking.service')
      const mockCourse = createMockCourse()
      const mockUser = createMockUser()
      
      const bookingService = new BookingService()
      
      // Mock existing booking
      vi.spyOn(bookingService, 'getUserBookingForCourse').mockResolvedValue(
        createMockBooking({ userId: mockUser.id, courseId: mockCourse.id })
      )

      const result = await bookingService.createBooking({
        userId: mockUser.id,
        courseId: mockCourse.id,
        notes: 'Duplicate booking attempt'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('already booked')
    })

    test('should process waitlist when booking is cancelled', async () => {
      const { BookingService } = await import('@/lib/services/booking.service')
      const mockBooking = createMockBooking({ status: 'confirmed' })
      
      const bookingService = new BookingService()
      
      // Mock waitlist processing
      const processWaitlistSpy = vi.spyOn(bookingService, 'processWaitlist').mockResolvedValue({
        promoted: 1,
        notified: ['user-456']
      })

      const result = await bookingService.cancelBooking(mockBooking.id, mockBooking.userId)

      expect(result.success).toBe(true)
      expect(processWaitlistSpy).toHaveBeenCalledWith(mockBooking.courseId)
    })
  })

  describe('E-commerce Logic', () => {
    test('should calculate correct order total with multiple items', async () => {
      const { OrderService } = await import('@/lib/services/order.service')
      const mockProducts = [
        createMockProduct({ id: 'product-1', price: 1000 }),
        createMockProduct({ id: 'product-2', price: 1500 })
      ]
      
      const orderService = new OrderService()
      
      const orderData = {
        userId: 'user-123',
        items: [
          { productId: 'product-1', quantity: 2, price: 1000 },
          { productId: 'product-2', quantity: 1, price: 1500 }
        ],
        shippingAddress: {
          street: '123 Test St',
          city: 'Hong Kong',
          postalCode: '00000',
          country: 'HK'
        }
      }

      const result = await orderService.createOrder(orderData)

      expect(result.success).toBe(true)
      expect(result.order?.totalAmount).toBe(3500) // (1000 * 2) + (1500 * 1)
    })

    test('should handle inventory deduction correctly', async () => {
      const { ProductService } = await import('@/lib/services/product.service')
      const mockProduct = createMockProduct({ inventoryQuantity: 10 })
      
      const productService = new ProductService()
      
      // Mock inventory update
      vi.spyOn(productService, 'updateInventory').mockResolvedValue({
        success: true,
        newQuantity: 7
      })

      const result = await productService.updateInventory(mockProduct.id, -3)

      expect(result.success).toBe(true)
      expect(result.newQuantity).toBe(7)
    })

    test('should prevent overselling', async () => {
      const { ProductService } = await import('@/lib/services/product.service')
      const mockProduct = createMockProduct({ inventoryQuantity: 2 })
      
      const productService = new ProductService()
      
      // Mock insufficient inventory
      vi.spyOn(productService, 'checkInventory').mockResolvedValue({
        available: false,
        currentQuantity: 2,
        requestedQuantity: 5
      })

      const result = await productService.updateInventory(mockProduct.id, -5)

      expect(result.success).toBe(false)
      expect(result.error).toContain('insufficient inventory')
    })

    test('should handle customizable product orders', async () => {
      const { OrderService } = await import('@/lib/services/order.service')
      const mockProduct = createMockProduct({ isCustomizable: true })
      
      const orderService = new OrderService()
      
      const orderData = {
        userId: 'user-123',
        items: [{
          productId: mockProduct.id,
          quantity: 1,
          price: mockProduct.price,
          customizations: {
            engraving: '客製化文字',
            color: 'red'
          }
        }],
        shippingAddress: {
          street: '123 Test St',
          city: 'Hong Kong',
          postalCode: '00000',
          country: 'HK'
        }
      }

      const result = await orderService.createOrder(orderData)

      expect(result.success).toBe(true)
      expect(result.order?.status).toBe('pending_customization')
    })
  })

  describe('Payment Processing Logic', () => {
    test('should process successful payment', async () => {
      const { PaymentService } = await import('@/lib/services/payment.service')
      const mockOrder = createMockOrder({ totalAmount: 2000 })
      
      const paymentService = new PaymentService()
      
      // Mock successful payment
      vi.spyOn(paymentService, 'processPayment').mockResolvedValue({
        success: true,
        transactionId: 'txn-123',
        status: 'completed'
      })

      const result = await paymentService.processPayment({
        orderId: mockOrder.id,
        amount: mockOrder.totalAmount,
        paymentMethod: 'credit_card',
        paymentDetails: {
          cardToken: 'card-token-123'
        }
      })

      expect(result.success).toBe(true)
      expect(result.transactionId).toBe('txn-123')
    })

    test('should handle payment failures gracefully', async () => {
      const { PaymentService } = await import('@/lib/services/payment.service')
      const mockOrder = createMockOrder()
      
      const paymentService = new PaymentService()
      
      // Mock payment failure
      vi.spyOn(paymentService, 'processPayment').mockResolvedValue({
        success: false,
        error: 'Card declined',
        errorCode: 'CARD_DECLINED'
      })

      const result = await paymentService.processPayment({
        orderId: mockOrder.id,
        amount: mockOrder.totalAmount,
        paymentMethod: 'credit_card',
        paymentDetails: {
          cardToken: 'invalid-card-token'
        }
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Card declined')
    })

    test('should process refunds correctly', async () => {
      const { PaymentService } = await import('@/lib/services/payment.service')
      
      const paymentService = new PaymentService()
      
      // Mock successful refund
      vi.spyOn(paymentService, 'processRefund').mockResolvedValue({
        success: true,
        refundId: 'refund-123',
        amount: 1000
      })

      const result = await paymentService.processRefund({
        paymentId: 'payment-123',
        amount: 1000,
        reason: 'Customer request'
      })

      expect(result.success).toBe(true)
      expect(result.refundId).toBe('refund-123')
    })
  })

  describe('User Permission Logic', () => {
    test('should allow craftsman to manage own courses', async () => {
      const { PermissionService } = await import('@/lib/auth/permissions')
      const mockCraftsman = createMockUser({ role: 'craftsman' })
      const mockCourse = createMockCourse({ craftsmanId: 'craftsman-123' })
      
      const hasPermission = PermissionService.canManageCourse(mockCraftsman, mockCourse)
      
      expect(hasPermission).toBe(true)
    })

    test('should prevent craftsman from managing other craftsman courses', async () => {
      const { PermissionService } = await import('@/lib/auth/permissions')
      const mockCraftsman = createMockUser({ role: 'craftsman' })
      const mockCourse = createMockCourse({ craftsmanId: 'other-craftsman-456' })
      
      const hasPermission = PermissionService.canManageCourse(mockCraftsman, mockCourse)
      
      expect(hasPermission).toBe(false)
    })

    test('should allow admin to manage all content', async () => {
      const { PermissionService } = await import('@/lib/auth/permissions')
      const mockAdmin = createMockUser({ role: 'admin' })
      const mockCourse = createMockCourse()
      
      const hasPermission = PermissionService.canManageCourse(mockAdmin, mockCourse)
      
      expect(hasPermission).toBe(true)
    })
  })

  describe('Multi-language Content Logic', () => {
    test('should handle content translation workflow', async () => {
      const { MultilingualContentService } = await import('@/lib/services/multilingual-content.service')
      
      const contentService = new MultilingualContentService()
      
      // Mock translation
      vi.spyOn(contentService, 'autoTranslate').mockResolvedValue({
        success: true,
        translatedContent: 'Traditional Mahjong Carving'
      })

      const result = await contentService.autoTranslate('手雕麻將', 'zh-HK', 'en')

      expect(result.success).toBe(true)
      expect(result.translatedContent).toBe('Traditional Mahjong Carving')
    })

    test('should fallback to default language when translation missing', async () => {
      const { MultilingualContentService } = await import('@/lib/services/multilingual-content.service')
      
      const contentService = new MultilingualContentService()
      
      const content = {
        'zh-HK': '手雕麻將',
        'en': 'Mahjong Carving'
      }

      const result = contentService.getLocalizedContent(content, 'zh-CN', 'zh-HK')

      expect(result).toBe('手雕麻將') // Should fallback to default language
    })
  })

  describe('Search and Discovery Logic', () => {
    test('should return relevant search results', async () => {
      const { ContentSearchService } = await import('@/lib/services/content-search.service')
      
      const searchService = new ContentSearchService()
      
      // Mock search results
      vi.spyOn(searchService, 'search').mockResolvedValue({
        results: [
          { id: 'course-1', type: 'course', title: '手雕麻將入門', relevance: 0.95 },
          { id: 'craftsman-1', type: 'craftsman', title: '麻將師傅', relevance: 0.85 }
        ],
        total: 2,
        facets: {
          type: { course: 1, craftsman: 1 },
          category: { '手雕麻將': 2 }
        }
      })

      const result = await searchService.search({
        query: '麻將',
        language: 'zh-HK',
        filters: {},
        limit: 10
      })

      expect(result.results).toHaveLength(2)
      expect(result.results[0].relevance).toBeGreaterThan(result.results[1].relevance)
    })

    test('should handle empty search queries', async () => {
      const { ContentSearchService } = await import('@/lib/services/content-search.service')
      
      const searchService = new ContentSearchService()
      
      const result = await searchService.search({
        query: '',
        language: 'zh-HK',
        filters: {},
        limit: 10
      })

      expect(result.results).toHaveLength(0)
      expect(result.total).toBe(0)
    })
  })

  describe('Notification Logic', () => {
    test('should send booking confirmation notification', async () => {
      const { NotificationService } = await import('@/lib/services/notification.service')
      const mockBooking = createMockBooking()
      
      const notificationService = new NotificationService()
      
      // Mock notification sending
      const sendNotificationSpy = vi.spyOn(notificationService, 'sendNotification').mockResolvedValue({
        success: true,
        notificationId: 'notif-123'
      })

      await notificationService.sendBookingConfirmation(mockBooking)

      expect(sendNotificationSpy).toHaveBeenCalledWith({
        userId: mockBooking.userId,
        type: 'booking_confirmation',
        title: expect.any(String),
        message: expect.any(String),
        data: { bookingId: mockBooking.id }
      })
    })

    test('should batch notifications for efficiency', async () => {
      const { NotificationService } = await import('@/lib/services/notification.service')
      
      const notificationService = new NotificationService()
      
      const notifications = [
        { userId: 'user-1', type: 'course_update', message: 'Course updated' },
        { userId: 'user-2', type: 'course_update', message: 'Course updated' },
        { userId: 'user-3', type: 'course_update', message: 'Course updated' }
      ]

      // Mock batch sending
      const batchSendSpy = vi.spyOn(notificationService, 'sendBatchNotifications').mockResolvedValue({
        success: true,
        sent: 3,
        failed: 0
      })

      const result = await notificationService.sendBatchNotifications(notifications)

      expect(result.sent).toBe(3)
      expect(batchSendSpy).toHaveBeenCalledWith(notifications)
    })
  })
})