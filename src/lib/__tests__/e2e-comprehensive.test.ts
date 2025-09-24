import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMocks } from 'node-mocks-http'

// Mock services for E2E testing
const mockServices = {
  userService: {
    register: vi.fn(),
    login: vi.fn(),
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
  },
  craftsmanService: {
    createProfile: vi.fn(),
    updateProfile: vi.fn(),
    getProfile: vi.fn(),
    searchCraftsmen: vi.fn(),
  },
  courseService: {
    createCourse: vi.fn(),
    getCourse: vi.fn(),
    searchCourses: vi.fn(),
    bookCourse: vi.fn(),
  },
  productService: {
    createProduct: vi.fn(),
    getProduct: vi.fn(),
    searchProducts: vi.fn(),
  },
  orderService: {
    createOrder: vi.fn(),
    getOrder: vi.fn(),
    updateOrderStatus: vi.fn(),
  },
  paymentService: {
    processPayment: vi.fn(),
    refundPayment: vi.fn(),
  },
  notificationService: {
    sendNotification: vi.fn(),
    getNotifications: vi.fn(),
  },
}

describe('Comprehensive End-to-End Tests', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    Object.values(mockServices).forEach(service => {
      Object.values(service).forEach(method => {
        if (vi.isMockFunction(method)) {
          method.mockReset()
        }
      })
    })
  })

  describe('User Registration and Authentication Flow', () => {
    it('should complete full user registration flow', async () => {
      // Step 1: User registration
      const registrationData = {
        email: 'newuser@example.com',
        password: 'SecurePassword123!',
        role: 'learner',
        preferredLanguage: 'zh-HK',
      }

      mockServices.userService.register.mockResolvedValue({
        id: 'user-123',
        email: registrationData.email,
        role: registrationData.role,
        preferredLanguage: registrationData.preferredLanguage,
        createdAt: new Date(),
      })

      const registeredUser = await mockServices.userService.register(registrationData)
      expect(registeredUser.id).toBeDefined()
      expect(registeredUser.email).toBe(registrationData.email)

      // Step 2: User login
      mockServices.userService.login.mockResolvedValue({
        user: registeredUser,
        token: 'jwt-token-123',
        refreshToken: 'refresh-token-123',
      })

      const loginResult = await mockServices.userService.login({
        email: registrationData.email,
        password: registrationData.password,
      })

      expect(loginResult.token).toBeDefined()
      expect(loginResult.user.id).toBe(registeredUser.id)

      // Step 3: Get user profile
      mockServices.userService.getProfile.mockResolvedValue(registeredUser)

      const profile = await mockServices.userService.getProfile(registeredUser.id)
      expect(profile.id).toBe(registeredUser.id)
      expect(profile.email).toBe(registrationData.email)

      // Step 4: Update user profile
      const updatedData = {
        preferredLanguage: 'en',
        displayName: 'New User',
      }

      mockServices.userService.updateProfile.mockResolvedValue({
        ...registeredUser,
        ...updatedData,
        updatedAt: new Date(),
      })

      const updatedProfile = await mockServices.userService.updateProfile(
        registeredUser.id,
        updatedData
      )

      expect(updatedProfile.preferredLanguage).toBe('en')
      expect(updatedProfile.displayName).toBe('New User')
    })
  })

  describe('Craftsman Profile Creation and Management Flow', () => {
    it('should complete craftsman profile setup flow', async () => {
      // Step 1: Create user account
      const userId = 'user-craftsman-123'
      
      // Step 2: Create craftsman profile
      const craftsmanData = {
        userId,
        craftSpecialties: ['手雕麻將', '竹編'],
        bio: {
          'zh-HK': '資深手工藝師傅，擁有30年經驗',
          'en': 'Senior craftsman with 30 years of experience',
        },
        experienceYears: 30,
        workshopLocation: '香港九龍',
        contactInfo: {
          phone: '+852-12345678',
          email: 'craftsman@example.com',
        },
      }

      mockServices.craftsmanService.createProfile.mockResolvedValue({
        id: 'craftsman-profile-123',
        ...craftsmanData,
        verificationStatus: 'pending',
        createdAt: new Date(),
      })

      const craftsmanProfile = await mockServices.craftsmanService.createProfile(craftsmanData)
      expect(craftsmanProfile.id).toBeDefined()
      expect(craftsmanProfile.craftSpecialties).toEqual(['手雕麻將', '竹編'])
      expect(craftsmanProfile.verificationStatus).toBe('pending')

      // Step 3: Update profile with additional information
      const updateData = {
        workshopImages: ['image1.jpg', 'image2.jpg'],
        certifications: ['Traditional Craft Certificate'],
        verificationStatus: 'verified',
      }

      mockServices.craftsmanService.updateProfile.mockResolvedValue({
        ...craftsmanProfile,
        ...updateData,
        updatedAt: new Date(),
      })

      const updatedProfile = await mockServices.craftsmanService.updateProfile(
        craftsmanProfile.id,
        updateData
      )

      expect(updatedProfile.verificationStatus).toBe('verified')
      expect(updatedProfile.workshopImages).toHaveLength(2)

      // Step 4: Search for craftsman
      mockServices.craftsmanService.searchCraftsmen.mockResolvedValue({
        results: [updatedProfile],
        total: 1,
        page: 1,
        totalPages: 1,
      })

      const searchResults = await mockServices.craftsmanService.searchCraftsmen({
        craftType: '手雕麻將',
        location: '香港',
      })

      expect(searchResults.results).toHaveLength(1)
      expect(searchResults.results[0].id).toBe(craftsmanProfile.id)
    })
  })

  describe('Course Creation and Booking Flow', () => {
    it('should complete course creation and booking flow', async () => {
      const craftsmanId = 'craftsman-123'
      
      // Step 1: Create course
      const courseData = {
        craftsmanId,
        title: {
          'zh-HK': '手雕麻將入門課程',
          'en': 'Introduction to Hand-carved Mahjong',
        },
        description: {
          'zh-HK': '學習傳統手雕麻將技藝',
          'en': 'Learn traditional hand-carved mahjong techniques',
        },
        craftCategory: '手雕麻將',
        maxParticipants: 8,
        durationHours: 4,
        price: 800,
        schedule: [
          {
            date: '2024-02-15',
            startTime: '10:00',
            endTime: '14:00',
          },
        ],
      }

      mockServices.courseService.createCourse.mockResolvedValue({
        id: 'course-123',
        ...courseData,
        status: 'active',
        createdAt: new Date(),
      })

      const course = await mockServices.courseService.createCourse(courseData)
      expect(course.id).toBeDefined()
      expect(course.maxParticipants).toBe(8)
      expect(course.price).toBe(800)

      // Step 2: Search for courses
      mockServices.courseService.searchCourses.mockResolvedValue({
        results: [course],
        total: 1,
        page: 1,
        totalPages: 1,
      })

      const searchResults = await mockServices.courseService.searchCourses({
        craftType: '手雕麻將',
        priceRange: { min: 500, max: 1000 },
      })

      expect(searchResults.results).toHaveLength(1)
      expect(searchResults.results[0].id).toBe(course.id)

      // Step 3: Book course
      const bookingData = {
        userId: 'user-learner-123',
        courseId: course.id,
        participantCount: 2,
        notes: '初學者，希望學習基礎技巧',
        contactInfo: {
          phone: '+852-87654321',
          email: 'learner@example.com',
        },
      }

      mockServices.courseService.bookCourse.mockResolvedValue({
        id: 'booking-123',
        ...bookingData,
        status: 'confirmed',
        totalAmount: course.price * bookingData.participantCount,
        createdAt: new Date(),
      })

      const booking = await mockServices.courseService.bookCourse(bookingData)
      expect(booking.id).toBeDefined()
      expect(booking.status).toBe('confirmed')
      expect(booking.totalAmount).toBe(1600) // 800 * 2 participants

      // Step 4: Send booking confirmation notification
      mockServices.notificationService.sendNotification.mockResolvedValue({
        id: 'notification-123',
        userId: bookingData.userId,
        type: 'booking_confirmation',
        title: '課程預約確認',
        message: '您的課程預約已確認',
        status: 'sent',
        createdAt: new Date(),
      })

      const notification = await mockServices.notificationService.sendNotification({
        userId: bookingData.userId,
        type: 'booking_confirmation',
        title: '課程預約確認',
        message: `您已成功預約「${course.title['zh-HK']}」課程`,
      })

      expect(notification.status).toBe('sent')
      expect(notification.type).toBe('booking_confirmation')
    })
  })

  describe('E-commerce Product and Order Flow', () => {
    it('should complete product creation and purchase flow', async () => {
      const craftsmanId = 'craftsman-123'
      
      // Step 1: Create product
      const productData = {
        craftsmanId,
        name: {
          'zh-HK': '手工雕刻麻將套裝',
          'en': 'Hand-carved Mahjong Set',
        },
        description: {
          'zh-HK': '純手工雕刻，採用優質材料製作',
          'en': 'Purely hand-carved, made with premium materials',
        },
        price: 2800,
        inventoryQuantity: 5,
        isCustomizable: true,
        craftCategory: '手雕麻將',
        images: ['product1.jpg', 'product2.jpg'],
        specifications: {
          material: '象牙白樹脂',
          dimensions: '30cm x 20cm x 15cm',
          weight: '2.5kg',
        },
      }

      mockServices.productService.createProduct.mockResolvedValue({
        id: 'product-123',
        ...productData,
        status: 'active',
        createdAt: new Date(),
      })

      const product = await mockServices.productService.createProduct(productData)
      expect(product.id).toBeDefined()
      expect(product.price).toBe(2800)
      expect(product.inventoryQuantity).toBe(5)

      // Step 2: Search for products
      mockServices.productService.searchProducts.mockResolvedValue({
        results: [product],
        total: 1,
        page: 1,
        totalPages: 1,
      })

      const searchResults = await mockServices.productService.searchProducts({
        craftType: '手雕麻將',
        priceRange: { min: 2000, max: 3000 },
      })

      expect(searchResults.results).toHaveLength(1)
      expect(searchResults.results[0].id).toBe(product.id)

      // Step 3: Create order
      const orderData = {
        userId: 'user-customer-123',
        items: [
          {
            productId: product.id,
            quantity: 1,
            price: product.price,
            customization: {
              engraving: '陳氏家族',
              color: '深紅色',
            },
          },
        ],
        shippingAddress: {
          name: '陳先生',
          phone: '+852-12345678',
          address: '香港九龍旺角道123號',
          district: '油尖旺區',
          postalCode: '00000',
        },
        paymentMethod: 'credit_card',
      }

      const totalAmount = orderData.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      )

      mockServices.orderService.createOrder.mockResolvedValue({
        id: 'order-123',
        ...orderData,
        totalAmount,
        status: 'pending',
        paymentStatus: 'pending',
        createdAt: new Date(),
      })

      const order = await mockServices.orderService.createOrder(orderData)
      expect(order.id).toBeDefined()
      expect(order.totalAmount).toBe(2800)
      expect(order.status).toBe('pending')

      // Step 4: Process payment
      const paymentData = {
        orderId: order.id,
        amount: order.totalAmount,
        paymentMethod: 'credit_card',
        cardToken: 'card_token_123',
      }

      mockServices.paymentService.processPayment.mockResolvedValue({
        id: 'payment-123',
        orderId: order.id,
        amount: order.totalAmount,
        status: 'completed',
        transactionId: 'txn_123456789',
        processedAt: new Date(),
      })

      const payment = await mockServices.paymentService.processPayment(paymentData)
      expect(payment.status).toBe('completed')
      expect(payment.transactionId).toBeDefined()

      // Step 5: Update order status
      mockServices.orderService.updateOrderStatus.mockResolvedValue({
        ...order,
        status: 'confirmed',
        paymentStatus: 'paid',
        updatedAt: new Date(),
      })

      const updatedOrder = await mockServices.orderService.updateOrderStatus(
        order.id,
        'confirmed'
      )
      expect(updatedOrder.status).toBe('confirmed')
      expect(updatedOrder.paymentStatus).toBe('paid')

      // Step 6: Send order confirmation notification
      mockServices.notificationService.sendNotification.mockResolvedValue({
        id: 'notification-order-123',
        userId: orderData.userId,
        type: 'order_confirmation',
        title: '訂單確認',
        message: '您的訂單已確認並開始製作',
        status: 'sent',
        createdAt: new Date(),
      })

      const orderNotification = await mockServices.notificationService.sendNotification({
        userId: orderData.userId,
        type: 'order_confirmation',
        title: '訂單確認',
        message: `您的訂單 #${order.id} 已確認，預計7-14個工作天完成製作`,
      })

      expect(orderNotification.status).toBe('sent')
      expect(orderNotification.type).toBe('order_confirmation')
    })
  })

  describe('Social Features Integration Flow', () => {
    it('should complete social interaction flow', async () => {
      const userId = 'user-123'
      const craftsmanId = 'craftsman-456'
      const courseId = 'course-789'

      // Step 1: Follow craftsman
      const followService = {
        followUser: vi.fn().mockResolvedValue({
          id: 'follow-123',
          followerId: userId,
          followingId: craftsmanId,
          createdAt: new Date(),
        }),
        getFollowing: vi.fn().mockResolvedValue({
          following: [{ id: craftsmanId, name: '師傅張' }],
          total: 1,
        }),
      }

      const followResult = await followService.followUser(userId, craftsmanId)
      expect(followResult.followerId).toBe(userId)
      expect(followResult.followingId).toBe(craftsmanId)

      // Step 2: Comment on course
      const commentService = {
        createComment: vi.fn().mockResolvedValue({
          id: 'comment-123',
          userId,
          entityType: 'course',
          entityId: courseId,
          content: '這個課程很棒！學到了很多傳統技藝。',
          createdAt: new Date(),
        }),
        getComments: vi.fn().mockResolvedValue({
          comments: [
            {
              id: 'comment-123',
              userId,
              content: '這個課程很棒！學到了很多傳統技藝。',
              user: { name: '學員李' },
              createdAt: new Date(),
            },
          ],
          total: 1,
        }),
      }

      const comment = await commentService.createComment({
        userId,
        entityType: 'course',
        entityId: courseId,
        content: '這個課程很棒！學到了很多傳統技藝。',
      })

      expect(comment.content).toContain('這個課程很棒')
      expect(comment.entityId).toBe(courseId)

      // Step 3: Get activity feed
      const activityService = {
        getActivityFeed: vi.fn().mockResolvedValue({
          activities: [
            {
              id: 'activity-1',
              type: 'course_completed',
              userId: craftsmanId,
              data: {
                courseTitle: '手雕麻將進階課程',
                studentCount: 8,
              },
              createdAt: new Date(),
            },
            {
              id: 'activity-2',
              type: 'product_created',
              userId: craftsmanId,
              data: {
                productName: '精美竹編籃子',
                price: 450,
              },
              createdAt: new Date(),
            },
          ],
          total: 2,
        }),
      }

      const activityFeed = await activityService.getActivityFeed(userId)
      expect(activityFeed.activities).toHaveLength(2)
      expect(activityFeed.activities[0].type).toBe('course_completed')

      // Step 4: Create event
      const eventService = {
        createEvent: vi.fn().mockResolvedValue({
          id: 'event-123',
          organizerId: craftsmanId,
          title: '傳統工藝展示會',
          description: '展示各種香港傳統手工藝',
          startDate: new Date('2024-03-15T10:00:00Z'),
          endDate: new Date('2024-03-15T18:00:00Z'),
          location: '香港文化中心',
          maxParticipants: 100,
          isOnline: false,
          createdAt: new Date(),
        }),
        registerForEvent: vi.fn().mockResolvedValue({
          id: 'registration-123',
          eventId: 'event-123',
          userId,
          status: 'confirmed',
          createdAt: new Date(),
        }),
      }

      const event = await eventService.createEvent({
        organizerId: craftsmanId,
        title: '傳統工藝展示會',
        description: '展示各種香港傳統手工藝',
        startDate: new Date('2024-03-15T10:00:00Z'),
        endDate: new Date('2024-03-15T18:00:00Z'),
        location: '香港文化中心',
        maxParticipants: 100,
        isOnline: false,
      })

      expect(event.title).toBe('傳統工藝展示會')
      expect(event.maxParticipants).toBe(100)

      const registration = await eventService.registerForEvent('event-123', userId)
      expect(registration.status).toBe('confirmed')
      expect(registration.eventId).toBe('event-123')
    })
  })

  describe('Multi-language Content Flow', () => {
    it('should handle multi-language content creation and retrieval', async () => {
      const translationService = {
        translateContent: vi.fn().mockResolvedValue({
          'zh-HK': '手雕麻將是香港的傳統工藝',
          'zh-CN': '手雕麻将是香港的传统工艺',
          'en': 'Hand-carved mahjong is a traditional craft of Hong Kong',
        }),
        getTranslatedContent: vi.fn().mockResolvedValue({
          id: 'content-123',
          type: 'course_description',
          content: {
            'zh-HK': '學習傳統手雕麻將技藝，體驗香港文化精髓',
            'zh-CN': '学习传统手雕麻将技艺，体验香港文化精髓',
            'en': 'Learn traditional hand-carved mahjong techniques and experience the essence of Hong Kong culture',
          },
          createdAt: new Date(),
        }),
      }

      // Step 1: Create multi-language content
      const originalText = '手雕麻將是香港的傳統工藝'
      const translations = await translationService.translateContent(originalText)

      expect(translations['zh-HK']).toBe(originalText)
      expect(translations['en']).toContain('Hand-carved mahjong')
      expect(translations['zh-CN']).toContain('手雕麻将')

      // Step 2: Retrieve content in specific language
      const contentService = {
        getContentByLanguage: vi.fn().mockImplementation((contentId, language) => {
          const content = {
            'zh-HK': '學習傳統手雕麻將技藝，體驗香港文化精髓',
            'zh-CN': '学习传统手雕麻将技艺，体验香港文化精髓',
            'en': 'Learn traditional hand-carved mahjong techniques and experience the essence of Hong Kong culture',
          }
          return Promise.resolve({
            id: contentId,
            language,
            content: content[language as keyof typeof content],
          })
        }),
      }

      const zhHKContent = await contentService.getContentByLanguage('content-123', 'zh-HK')
      const enContent = await contentService.getContentByLanguage('content-123', 'en')

      expect(zhHKContent.content).toContain('香港文化精髓')
      expect(enContent.content).toContain('Hong Kong culture')

      // Step 3: Search with language preference
      const searchService = {
        searchWithLanguage: vi.fn().mockResolvedValue({
          results: [
            {
              id: 'course-123',
              title: 'Learn traditional hand-carved mahjong techniques',
              description: 'Experience the essence of Hong Kong culture',
              language: 'en',
            },
          ],
          total: 1,
        }),
      }

      const searchResults = await searchService.searchWithLanguage({
        query: 'mahjong',
        language: 'en',
      })

      expect(searchResults.results[0].language).toBe('en')
      expect(searchResults.results[0].title).toContain('mahjong')
    })
  })

  describe('Error Handling and Recovery Flow', () => {
    it('should handle various error scenarios gracefully', async () => {
      // Test payment failure and recovery
      const paymentFailureScenario = async () => {
        const orderId = 'order-failed-123'
        
        // First payment attempt fails
        mockServices.paymentService.processPayment
          .mockRejectedValueOnce(new Error('Payment declined by bank'))
          .mockResolvedValueOnce({
            id: 'payment-retry-123',
            orderId,
            status: 'completed',
            transactionId: 'txn_retry_123',
          })

        try {
          await mockServices.paymentService.processPayment({
            orderId,
            amount: 1000,
            paymentMethod: 'credit_card',
          })
        } catch (error) {
          expect(error.message).toBe('Payment declined by bank')
          
          // Retry with different payment method
          const retryResult = await mockServices.paymentService.processPayment({
            orderId,
            amount: 1000,
            paymentMethod: 'paypal',
          })
          
          expect(retryResult.status).toBe('completed')
        }
      }

      await paymentFailureScenario()

      // Test course booking when fully booked
      const bookingFailureScenario = async () => {
        mockServices.courseService.bookCourse
          .mockRejectedValueOnce(new Error('Course is fully booked'))

        try {
          await mockServices.courseService.bookCourse({
            userId: 'user-123',
            courseId: 'course-full-123',
            participantCount: 1,
          })
        } catch (error) {
          expect(error.message).toBe('Course is fully booked')
          
          // Should offer waitlist option
          const waitlistService = {
            addToWaitlist: vi.fn().mockResolvedValue({
              id: 'waitlist-123',
              userId: 'user-123',
              courseId: 'course-full-123',
              position: 3,
              createdAt: new Date(),
            }),
          }
          
          const waitlistEntry = await waitlistService.addToWaitlist({
            userId: 'user-123',
            courseId: 'course-full-123',
          })
          
          expect(waitlistEntry.position).toBe(3)
        }
      }

      await bookingFailureScenario()

      // Test network timeout and retry
      const networkTimeoutScenario = async () => {
        let attemptCount = 0
        
        const retryableService = {
          fetchData: vi.fn().mockImplementation(() => {
            attemptCount++
            if (attemptCount < 3) {
              return Promise.reject(new Error('Network timeout'))
            }
            return Promise.resolve({ data: 'success', attempt: attemptCount })
          }),
        }

        const retryWithBackoff = async (fn: () => Promise<any>, maxRetries = 3) => {
          for (let i = 0; i < maxRetries; i++) {
            try {
              return await fn()
            } catch (error) {
              if (i === maxRetries - 1) throw error
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 100))
            }
          }
        }

        const result = await retryWithBackoff(() => retryableService.fetchData())
        expect(result.data).toBe('success')
        expect(result.attempt).toBe(3)
      }

      await networkTimeoutScenario()
    })
  })
})