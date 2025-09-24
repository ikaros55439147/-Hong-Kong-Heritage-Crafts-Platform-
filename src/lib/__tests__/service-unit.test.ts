/**
 * Service Unit Tests
 * Tests individual service methods in isolation
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { setupTestEnvironment, cleanupTestEnvironment, createMockUser, createMockCraftsman, createMockCourse, createMockProduct, createMockBooking, createMockOrder, mockPrismaClient } from '@/lib/test-utils'

// Mock Prisma client
const mockPrisma = mockPrismaClient()
vi.mock('@/lib/database', () => ({
  prisma: mockPrisma
}))

// Mock external services
vi.mock('@/lib/services/notification.service')
vi.mock('@/lib/services/payment.service')
vi.mock('@/lib/services/upload.service')

describe('Service Unit Tests', () => {
  beforeEach(() => {
    setupTestEnvironment()
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanupTestEnvironment()
  })

  describe('UserService', () => {
    test('should create user with valid data', async () => {
      const { UserService } = await import('@/lib/services/user.service')
      const mockUser = createMockUser()
      
      mockPrisma.user.create.mockResolvedValue(mockUser)
      mockPrisma.user.findUnique.mockResolvedValue(null) // Email not exists
      
      const userService = new UserService()
      const result = await userService.createUser({
        email: 'test@example.com',
        password: 'SecurePass123!',
        role: 'LEARNER'
      })

      expect(result).toEqual(mockUser)
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'test@example.com',
          role: 'LEARNER'
        })
      })
    })

    test('should throw error for duplicate email', async () => {
      const { UserService } = await import('@/lib/services/user.service')
      const existingUser = createMockUser()
      
      mockPrisma.user.findUnique.mockResolvedValue(existingUser)
      
      const userService = new UserService()
      
      await expect(userService.createUser({
        email: 'existing@example.com',
        password: 'SecurePass123!',
        role: 'LEARNER'
      })).rejects.toThrow('Email already exists')
    })

    test('should update user profile', async () => {
      const { UserService } = await import('@/lib/services/user.service')
      const mockUser = createMockUser()
      const updatedUser = { ...mockUser, preferredLanguage: 'en' }
      
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockPrisma.user.update.mockResolvedValue(updatedUser)
      
      const userService = new UserService()
      const result = await userService.updateProfile(mockUser.id, {
        preferredLanguage: 'en'
      })

      expect(result.preferredLanguage).toBe('en')
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { preferredLanguage: 'en' }
      })
    })

    test('should search users with filters', async () => {
      const { UserService } = await import('@/lib/services/user.service')
      const mockUsers = [createMockUser(), createMockUser({ id: 'user-456' })]
      
      mockPrisma.user.findMany.mockResolvedValue(mockUsers)
      
      const userService = new UserService()
      const result = await userService.searchUsers({
        role: 'LEARNER',
        limit: 10,
        offset: 0
      })

      expect(result).toHaveLength(2)
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: { role: 'LEARNER' },
        take: 10,
        skip: 0,
        select: expect.any(Object)
      })
    })
  })

  describe('CraftsmanService', () => {
    test('should create craftsman profile', async () => {
      const { CraftsmanService } = await import('@/lib/services/craftsman.service')
      const mockCraftsman = createMockCraftsman()
      
      mockPrisma.craftsmanProfile.create.mockResolvedValue(mockCraftsman)
      mockPrisma.craftsmanProfile.findUnique.mockResolvedValue(null)
      
      const craftsmanService = new CraftsmanService()
      const result = await craftsmanService.createProfile('user-123', {
        craftSpecialties: ['手雕麻將'],
        bio: { 'zh-HK': '資深師傅' },
        experienceYears: 20
      })

      expect(result).toEqual(mockCraftsman)
      expect(mockPrisma.craftsmanProfile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          craftSpecialties: ['手雕麻將']
        })
      })
    })

    test('should update craftsman profile', async () => {
      const { CraftsmanService } = await import('@/lib/services/craftsman.service')
      const mockCraftsman = createMockCraftsman()
      const updatedCraftsman = { ...mockCraftsman, experienceYears: 25 }
      
      mockPrisma.craftsmanProfile.findUnique.mockResolvedValue(mockCraftsman)
      mockPrisma.craftsmanProfile.update.mockResolvedValue(updatedCraftsman)
      
      const craftsmanService = new CraftsmanService()
      const result = await craftsmanService.updateProfile(mockCraftsman.id, 'user-123', {
        experienceYears: 25
      })

      expect(result.experienceYears).toBe(25)
    })

    test('should prevent unauthorized profile updates', async () => {
      const { CraftsmanService } = await import('@/lib/services/craftsman.service')
      const mockCraftsman = createMockCraftsman({ userId: 'user-123' })
      
      mockPrisma.craftsmanProfile.findUnique.mockResolvedValue(mockCraftsman)
      
      const craftsmanService = new CraftsmanService()
      
      await expect(craftsmanService.updateProfile(mockCraftsman.id, 'user-456', {
        experienceYears: 25
      })).rejects.toThrow('Unauthorized')
    })

    test('should search craftsmen by specialty', async () => {
      const { CraftsmanService } = await import('@/lib/services/craftsman.service')
      const mockCraftsmen = [createMockCraftsman()]
      
      mockPrisma.craftsmanProfile.findMany.mockResolvedValue(mockCraftsmen)
      
      const craftsmanService = new CraftsmanService()
      const result = await craftsmanService.searchCraftsmen({
        specialty: '手雕麻將',
        location: '香港',
        verified: true
      })

      expect(result).toHaveLength(1)
      expect(mockPrisma.craftsmanProfile.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          craftSpecialties: { has: '手雕麻將' },
          verificationStatus: 'VERIFIED'
        }),
        include: expect.any(Object)
      })
    })
  })

  describe('CourseService', () => {
    test('should create course with valid data', async () => {
      const { CourseService } = await import('@/lib/services/course.service')
      const mockCourse = createMockCourse()
      
      mockPrisma.course.create.mockResolvedValue(mockCourse)
      
      const courseService = new CourseService()
      const result = await courseService.createCourse('craftsman-123', {
        title: { 'zh-HK': '手雕麻將入門課程' },
        description: { 'zh-HK': '學習傳統手雕麻將技藝' },
        craftCategory: '手雕麻將',
        maxParticipants: 8,
        price: 500
      })

      expect(result).toEqual(mockCourse)
      expect(mockPrisma.course.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          craftsmanId: 'craftsman-123',
          craftCategory: '手雕麻將'
        })
      })
    })

    test('should update course status', async () => {
      const { CourseService } = await import('@/lib/services/course.service')
      const mockCourse = createMockCourse()
      const updatedCourse = { ...mockCourse, status: 'INACTIVE' }
      
      mockPrisma.course.findUnique.mockResolvedValue(mockCourse)
      mockPrisma.course.update.mockResolvedValue(updatedCourse)
      
      const courseService = new CourseService()
      const result = await courseService.updateCourseStatus(mockCourse.id, 'INACTIVE')

      expect(result.status).toBe('INACTIVE')
    })

    test('should search courses with filters', async () => {
      const { CourseService } = await import('@/lib/services/course.service')
      const mockCourses = [createMockCourse()]
      
      mockPrisma.course.findMany.mockResolvedValue(mockCourses)
      
      const courseService = new CourseService()
      const result = await courseService.searchCourses({
        category: '手雕麻將',
        priceRange: { min: 100, max: 1000 },
        status: 'ACTIVE'
      })

      expect(result).toHaveLength(1)
      expect(mockPrisma.course.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          craftCategory: '手雕麻將',
          status: 'ACTIVE'
        }),
        include: expect.any(Object)
      })
    })

    test('should get course availability', async () => {
      const { CourseService } = await import('@/lib/services/course.service')
      const mockCourse = createMockCourse({ maxParticipants: 8 })
      const mockBookings = [createMockBooking(), createMockBooking()]
      
      mockPrisma.course.findUnique.mockResolvedValue(mockCourse)
      mockPrisma.booking.count.mockResolvedValue(2)
      
      const courseService = new CourseService()
      const result = await courseService.getCourseAvailability(mockCourse.id)

      expect(result.available).toBe(true)
      expect(result.currentBookings).toBe(2)
      expect(result.maxParticipants).toBe(8)
      expect(result.availableSpots).toBe(6)
    })
  })

  describe('ProductService', () => {
    test('should create product with inventory', async () => {
      const { ProductService } = await import('@/lib/services/product.service')
      const mockProduct = createMockProduct()
      
      mockPrisma.product.create.mockResolvedValue(mockProduct)
      
      const productService = new ProductService()
      const result = await productService.createProduct('craftsman-123', {
        name: { 'zh-HK': '手工麻將' },
        price: 2000,
        inventoryQuantity: 5,
        craftCategory: '手雕麻將'
      })

      expect(result).toEqual(mockProduct)
      expect(mockPrisma.product.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          craftsmanId: 'craftsman-123',
          inventoryQuantity: 5
        })
      })
    })

    test('should update inventory correctly', async () => {
      const { ProductService } = await import('@/lib/services/product.service')
      const mockProduct = createMockProduct({ inventoryQuantity: 10 })
      const updatedProduct = { ...mockProduct, inventoryQuantity: 7 }
      
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct)
      mockPrisma.product.update.mockResolvedValue(updatedProduct)
      
      const productService = new ProductService()
      const result = await productService.updateInventory(mockProduct.id, 'craftsman-123', -3)

      expect(result.inventoryQuantity).toBe(7)
      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: mockProduct.id },
        data: { inventoryQuantity: 7 }
      })
    })

    test('should prevent negative inventory', async () => {
      const { ProductService } = await import('@/lib/services/product.service')
      const mockProduct = createMockProduct({ inventoryQuantity: 2 })
      
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct)
      
      const productService = new ProductService()
      
      await expect(productService.updateInventory(mockProduct.id, 'craftsman-123', -5))
        .rejects.toThrow('Insufficient inventory')
    })

    test('should search products with filters', async () => {
      const { ProductService } = await import('@/lib/services/product.service')
      const mockProducts = [createMockProduct()]
      
      mockPrisma.product.findMany.mockResolvedValue(mockProducts)
      
      const productService = new ProductService()
      const result = await productService.searchProducts({
        category: '手雕麻將',
        priceRange: { min: 1000, max: 3000 },
        inStock: true
      })

      expect(result).toHaveLength(1)
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          craftCategory: '手雕麻將',
          inventoryQuantity: { gt: 0 }
        }),
        include: expect.any(Object)
      })
    })
  })

  describe('BookingService', () => {
    test('should create booking when course available', async () => {
      const { BookingService } = await import('@/lib/services/booking.service')
      const mockBooking = createMockBooking()
      const mockCourse = createMockCourse({ maxParticipants: 8 })
      
      mockPrisma.course.findUnique.mockResolvedValue(mockCourse)
      mockPrisma.booking.count.mockResolvedValue(3) // Current bookings
      mockPrisma.booking.findFirst.mockResolvedValue(null) // No existing booking
      mockPrisma.booking.create.mockResolvedValue(mockBooking)
      
      const bookingService = new BookingService()
      const result = await bookingService.createBooking('user-123', 'course-123', {
        notes: 'Looking forward to learning'
      })

      expect(result).toEqual(mockBooking)
      expect(mockPrisma.booking.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          courseId: 'course-123',
          status: 'CONFIRMED'
        })
      })
    })

    test('should create waitlist booking when course full', async () => {
      const { BookingService } = await import('@/lib/services/booking.service')
      const mockBooking = createMockBooking({ status: 'WAITLISTED' })
      const mockCourse = createMockCourse({ maxParticipants: 5 })
      
      mockPrisma.course.findUnique.mockResolvedValue(mockCourse)
      mockPrisma.booking.count.mockResolvedValue(5) // Course full
      mockPrisma.booking.findFirst.mockResolvedValue(null)
      mockPrisma.booking.create.mockResolvedValue(mockBooking)
      
      const bookingService = new BookingService()
      const result = await bookingService.createBooking('user-123', 'course-123', {})

      expect(result.status).toBe('WAITLISTED')
    })

    test('should prevent duplicate bookings', async () => {
      const { BookingService } = await import('@/lib/services/booking.service')
      const existingBooking = createMockBooking()
      
      mockPrisma.booking.findFirst.mockResolvedValue(existingBooking)
      
      const bookingService = new BookingService()
      
      await expect(bookingService.createBooking('user-123', 'course-123', {}))
        .rejects.toThrow('User already has a booking for this course')
    })

    test('should cancel booking and process waitlist', async () => {
      const { BookingService } = await import('@/lib/services/booking.service')
      const mockBooking = createMockBooking({ status: 'CONFIRMED' })
      const waitlistBooking = createMockBooking({ 
        id: 'booking-456', 
        userId: 'user-456', 
        status: 'WAITLISTED' 
      })
      
      mockPrisma.booking.findUnique.mockResolvedValue(mockBooking)
      mockPrisma.booking.update.mockResolvedValue({ ...mockBooking, status: 'CANCELLED' })
      mockPrisma.booking.findFirst.mockResolvedValue(waitlistBooking)
      mockPrisma.booking.update.mockResolvedValue({ ...waitlistBooking, status: 'CONFIRMED' })
      
      const bookingService = new BookingService()
      const result = await bookingService.cancelBooking(mockBooking.id, 'user-123')

      expect(result.status).toBe('CANCELLED')
      expect(mockPrisma.booking.update).toHaveBeenCalledTimes(2) // Cancel + promote waitlist
    })
  })

  describe('OrderService', () => {
    test('should create order with multiple items', async () => {
      const { OrderService } = await import('@/lib/services/order.service')
      const mockOrder = createMockOrder()
      const mockProduct = createMockProduct({ price: new Decimal(1000) })
      
      mockPrisma.product.findMany.mockResolvedValue([mockProduct])
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrisma)
      })
      mockPrisma.order.create.mockResolvedValue(mockOrder)
      
      const orderService = new OrderService()
      const result = await orderService.createOrder('user-123', {
        items: [
          { productId: 'product-123', quantity: 2 }
        ],
        shippingAddress: {
          recipientName: 'John Doe',
          phone: '+852-12345678',
          addressLine1: '123 Test Street',
          city: 'Hong Kong',
          district: 'Central',
          country: 'HK'
        }
      })

      expect(result).toEqual(mockOrder)
      expect(mockPrisma.$transaction).toHaveBeenCalled()
    })

    test('should calculate correct order total', async () => {
      const { OrderService } = await import('@/lib/services/order.service')
      const products = [
        createMockProduct({ id: 'product-1', price: new Decimal(1000) }),
        createMockProduct({ id: 'product-2', price: new Decimal(1500) })
      ]
      
      const orderService = new OrderService()
      const total = orderService.calculateOrderTotal([
        { productId: 'product-1', quantity: 2, price: 1000 },
        { productId: 'product-2', quantity: 1, price: 1500 }
      ])

      expect(total).toBe(3500) // (1000 * 2) + (1500 * 1)
    })

    test('should update order status', async () => {
      const { OrderService } = await import('@/lib/services/order.service')
      const mockOrder = createMockOrder()
      const updatedOrder = { ...mockOrder, status: 'PROCESSING' }
      
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder)
      mockPrisma.order.update.mockResolvedValue(updatedOrder)
      
      const orderService = new OrderService()
      const result = await orderService.updateOrderStatus(mockOrder.id, 'PROCESSING')

      expect(result.status).toBe('PROCESSING')
    })
  })

  describe('PaymentService', () => {
    test('should process successful payment', async () => {
      const { PaymentService } = await import('@/lib/services/payment.service')
      
      // Mock Stripe payment
      const mockStripePayment = {
        id: 'pi_test123',
        status: 'succeeded',
        amount: 200000, // $2000 in cents
        currency: 'hkd'
      }
      
      const paymentService = new PaymentService()
      
      // Mock Stripe client
      vi.spyOn(paymentService as any, 'stripe', 'get').mockReturnValue({
        paymentIntents: {
          create: vi.fn().mockResolvedValue(mockStripePayment),
          confirm: vi.fn().mockResolvedValue(mockStripePayment)
        }
      })
      
      const result = await paymentService.processPayment('order-123', {
        method: 'stripe',
        amount: 2000,
        currency: 'HKD'
      })

      expect(result.success).toBe(true)
      expect(result.transactionId).toBe('pi_test123')
    })

    test('should handle payment failures', async () => {
      const { PaymentService } = await import('@/lib/services/payment.service')
      
      const paymentService = new PaymentService()
      
      // Mock failed payment
      vi.spyOn(paymentService as any, 'stripe', 'get').mockReturnValue({
        paymentIntents: {
          create: vi.fn().mockRejectedValue(new Error('Card declined'))
        }
      })
      
      const result = await paymentService.processPayment('order-123', {
        method: 'stripe',
        amount: 2000,
        currency: 'HKD'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Card declined')
    })

    test('should process refunds', async () => {
      const { PaymentService } = await import('@/lib/services/payment.service')
      
      const mockRefund = {
        id: 're_test123',
        status: 'succeeded',
        amount: 100000 // $1000 in cents
      }
      
      const paymentService = new PaymentService()
      
      vi.spyOn(paymentService as any, 'stripe', 'get').mockReturnValue({
        refunds: {
          create: vi.fn().mockResolvedValue(mockRefund)
        }
      })
      
      const result = await paymentService.processRefund('pi_test123', 1000, 'Customer request')

      expect(result.success).toBe(true)
      expect(result.refundId).toBe('re_test123')
    })
  })

  describe('NotificationService', () => {
    test('should send notification to user', async () => {
      const { NotificationService } = await import('@/lib/services/notification.service')
      const mockNotification = {
        id: 'notif-123',
        userId: 'user-123',
        type: 'BOOKING_CONFIRMATION',
        title: { 'zh-HK': '預約確認' },
        message: { 'zh-HK': '您的課程預約已確認' },
        isRead: false,
        createdAt: new Date()
      }
      
      mockPrisma.notification.create.mockResolvedValue(mockNotification)
      
      const notificationService = new NotificationService()
      const result = await notificationService.createNotification('user-123', {
        type: 'BOOKING_CONFIRMATION',
        title: { 'zh-HK': '預約確認' },
        message: { 'zh-HK': '您的課程預約已確認' }
      })

      expect(result).toEqual(mockNotification)
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          type: 'BOOKING_CONFIRMATION'
        })
      })
    })

    test('should mark notifications as read', async () => {
      const { NotificationService } = await import('@/lib/services/notification.service')
      
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 3 })
      
      const notificationService = new NotificationService()
      const result = await notificationService.markAsRead('user-123', ['notif-1', 'notif-2', 'notif-3'])

      expect(result.count).toBe(3)
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['notif-1', 'notif-2', 'notif-3'] },
          userId: 'user-123'
        },
        data: { isRead: true }
      })
    })

    test('should get user notification preferences', async () => {
      const { NotificationService } = await import('@/lib/services/notification.service')
      const mockPreferences = {
        userId: 'user-123',
        emailNotifications: true,
        pushNotifications: false,
        newFollowerNotify: true,
        courseUpdateNotify: true,
        productUpdateNotify: false,
        orderStatusNotify: true
      }
      
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(mockPreferences)
      
      const notificationService = new NotificationService()
      const result = await notificationService.getPreferences('user-123')

      expect(result).toEqual(mockPreferences)
    })
  })

  describe('UploadService', () => {
    test('should generate presigned URL for file upload', async () => {
      const { UploadService } = await import('@/lib/services/upload.service')
      
      const uploadService = new UploadService()
      
      // Mock AWS S3 client
      vi.spyOn(uploadService as any, 's3Client', 'get').mockReturnValue({
        getSignedUrl: vi.fn().mockResolvedValue('https://s3.amazonaws.com/presigned-url')
      })
      
      const result = await uploadService.generatePresignedUrl('image.jpg', 'image/jpeg', 'user-123')

      expect(result.uploadUrl).toContain('presigned-url')
      expect(result.fileKey).toContain('user-123')
    })

    test('should validate file type and size', async () => {
      const { UploadService } = await import('@/lib/services/upload.service')
      
      const uploadService = new UploadService()
      
      // Test valid file
      const validResult = uploadService.validateFile('image.jpg', 'image/jpeg', 1024 * 1024)
      expect(validResult.isValid).toBe(true)
      
      // Test invalid file type
      const invalidTypeResult = uploadService.validateFile('script.exe', 'application/exe', 1024)
      expect(invalidTypeResult.isValid).toBe(false)
      
      // Test file too large
      const tooLargeResult = uploadService.validateFile('large.jpg', 'image/jpeg', 50 * 1024 * 1024)
      expect(tooLargeResult.isValid).toBe(false)
    })

    test('should process uploaded media file', async () => {
      const { UploadService } = await import('@/lib/services/upload.service')
      const mockMediaFile = {
        id: 'media-123',
        uploaderId: 'user-123',
        fileName: 'image.jpg',
        fileType: 'image/jpeg',
        fileSize: 1024 * 1024,
        fileUrl: 'https://s3.amazonaws.com/bucket/image.jpg',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      mockPrisma.mediaFile.create.mockResolvedValue(mockMediaFile)
      
      const uploadService = new UploadService()
      const result = await uploadService.processUploadedFile('file-key-123', 'user-123', {
        title: 'Test Image',
        description: 'A test image upload'
      })

      expect(result).toEqual(mockMediaFile)
      expect(mockPrisma.mediaFile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          uploaderId: 'user-123',
          fileName: 'image.jpg'
        })
      })
    })
  })
})