import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { couponService } from '../coupon.service'
import { productReviewService } from '../product-review.service'
import { inventoryAlertService } from '../inventory-alert.service'
import { productRecommendationService } from '../product-recommendation.service'

// Mock Prisma
vi.mock('@prisma/client')
const mockPrisma = {
  coupon: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  product: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  productReview: {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
  },
  inventoryAlert: {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
  },
  userProductInteraction: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  productRecommendation: {
    create: vi.fn(),
    upsert: vi.fn(),
    deleteMany: vi.fn(),
  },
  order: {
    findMany: vi.fn(),
  },
  craftsmanProfile: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn(),
} as any

vi.mocked(PrismaClient).mockImplementation(() => mockPrisma)

// Mock notification service
vi.mock('../notification.service', () => ({
  notificationService: {
    createNotification: vi.fn()
  }
}))

describe('E-commerce Enhancements Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Coupon and Order Integration', () => {
    it('should validate and apply coupon to order', async () => {
      const mockCoupon = {
        id: 'coupon-1',
        code: 'SAVE20',
        discountType: 'PERCENTAGE',
        discountValue: 20,
        minimumOrderAmount: 50,
        maximumDiscountAmount: null,
        usageLimit: 100,
        usedCount: 10,
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2024-12-31'),
        isActive: true,
        applicableCategories: [],
        applicableCraftsmen: [],
        creator: null,
        orders: []
      }

      mockPrisma.coupon.findUnique.mockResolvedValue(mockCoupon)
      mockPrisma.coupon.update.mockResolvedValue({ ...mockCoupon, usedCount: 11 })

      // Validate coupon
      const validation = await couponService.validateCoupon('SAVE20', 100, [], [])
      expect(validation.isValid).toBe(true)
      expect(validation.discount).toBe(20)

      // Apply coupon
      await couponService.applyCoupon('coupon-1')
      expect(mockPrisma.coupon.update).toHaveBeenCalledWith({
        where: { id: 'coupon-1' },
        data: { usedCount: { increment: 1 } }
      })
    })

    it('should handle category-specific coupons', async () => {
      const mockCoupon = {
        id: 'coupon-1',
        code: 'POTTERY20',
        discountType: 'PERCENTAGE',
        discountValue: 20,
        minimumOrderAmount: 0,
        maximumDiscountAmount: null,
        usageLimit: null,
        usedCount: 0,
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2024-12-31'),
        isActive: true,
        applicableCategories: ['pottery', 'ceramics'],
        applicableCraftsmen: [],
        creator: null,
        orders: []
      }

      mockPrisma.coupon.findUnique.mockResolvedValue(mockCoupon)

      // Should be valid for pottery category
      const validResult = await couponService.validateCoupon('POTTERY20', 100, ['pottery'], [])
      expect(validResult.isValid).toBe(true)

      // Should be invalid for other categories
      const invalidResult = await couponService.validateCoupon('POTTERY20', 100, ['woodwork'], [])
      expect(invalidResult.isValid).toBe(false)
      expect(invalidResult.error).toBe('Coupon not applicable to selected products')
    })
  })

  describe('Product Reviews and Ratings Integration', () => {
    it('should create review and update product rating automatically', async () => {
      const mockProduct = {
        id: 'product-1',
        name: { 'zh-HK': '手工陶瓷', en: 'Handmade Pottery' },
        averageRating: 4.0,
        reviewCount: 2
      }

      const mockOrder = {
        id: 'order-1',
        userId: 'user-1',
        orderItems: [{ productId: 'product-1' }]
      }

      const mockReview = {
        id: 'review-1',
        productId: 'product-1',
        userId: 'user-1',
        orderId: 'order-1',
        rating: 5,
        title: 'Excellent craftsmanship',
        comment: 'Beautiful handmade pottery, highly recommended!',
        isVerifiedPurchase: true,
        helpfulCount: 0,
        createdAt: new Date(),
        user: { id: 'user-1', email: 'test@example.com', role: 'LEARNER' },
        product: mockProduct,
        order: mockOrder,
        helpfulnessVotes: []
      }

      mockPrisma.product.findUnique.mockResolvedValue(mockProduct)
      mockPrisma.productReview.findUnique.mockResolvedValue(null)
      mockPrisma.order.findFirst.mockResolvedValue(mockOrder)
      mockPrisma.productReview.create.mockResolvedValue(mockReview)

      const result = await productReviewService.createReview('user-1', {
        productId: 'product-1',
        orderId: 'order-1',
        rating: 5,
        title: 'Excellent craftsmanship',
        comment: 'Beautiful handmade pottery, highly recommended!'
      })

      expect(result.isVerifiedPurchase).toBe(true)
      expect(mockPrisma.productReview.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          rating: 5,
          isVerifiedPurchase: true
        }),
        include: expect.any(Object)
      })
    })

    it('should get comprehensive review statistics', async () => {
      mockPrisma.productReview.count
        .mockResolvedValueOnce(25) // Total reviews
        .mockResolvedValueOnce(18) // Verified purchase count

      mockPrisma.productReview.aggregate.mockResolvedValue({
        _avg: { rating: 4.3 }
      })

      mockPrisma.productReview.groupBy.mockResolvedValue([
        { rating: 5, _count: { rating: 12 } },
        { rating: 4, _count: { rating: 8 } },
        { rating: 3, _count: { rating: 3 } },
        { rating: 2, _count: { rating: 1 } },
        { rating: 1, _count: { rating: 1 } }
      ])

      const stats = await productReviewService.getProductReviewStatistics('product-1')

      expect(stats).toEqual({
        totalReviews: 25,
        averageRating: 4.3,
        ratingDistribution: [
          { rating: 5, count: 12 },
          { rating: 4, count: 8 },
          { rating: 3, count: 3 },
          { rating: 2, count: 1 },
          { rating: 1, count: 1 }
        ],
        verifiedPurchaseCount: 18
      })
    })
  })

  describe('Inventory Alerts Integration', () => {
    it('should create low stock alerts and send notifications', async () => {
      const mockProducts = [
        {
          id: 'product-1',
          name: { 'zh-HK': '手工陶瓷', en: 'Handmade Pottery' },
          inventoryQuantity: 3, // Low stock
          status: 'ACTIVE',
          craftsmanId: 'craftsman-1',
          craftsman: {
            id: 'craftsman-1',
            userId: 'user-1',
            user: { id: 'user-1', email: 'craftsman@example.com' }
          }
        },
        {
          id: 'product-2',
          name: { 'zh-HK': '竹編籃', en: 'Bamboo Basket' },
          inventoryQuantity: 0, // Out of stock
          status: 'ACTIVE',
          craftsmanId: 'craftsman-1',
          craftsman: {
            id: 'craftsman-1',
            userId: 'user-1',
            user: { id: 'user-1', email: 'craftsman@example.com' }
          }
        }
      ]

      const mockAlerts = [
        {
          id: 'alert-1',
          productId: 'product-1',
          craftsmanId: 'craftsman-1',
          alertType: 'LOW_STOCK',
          currentQuantity: 3,
          thresholdQuantity: 5,
          product: mockProducts[0],
          craftsman: mockProducts[0].craftsman
        },
        {
          id: 'alert-2',
          productId: 'product-2',
          craftsmanId: 'craftsman-1',
          alertType: 'OUT_OF_STOCK',
          currentQuantity: 0,
          thresholdQuantity: 5,
          product: mockProducts[1],
          craftsman: mockProducts[1].craftsman
        }
      ]

      mockPrisma.product.findMany.mockResolvedValue(mockProducts)
      mockPrisma.inventoryAlert.findFirst.mockResolvedValue(null) // No recent alerts
      mockPrisma.inventoryAlert.create
        .mockResolvedValueOnce(mockAlerts[0])
        .mockResolvedValueOnce(mockAlerts[1])

      const alerts = await inventoryAlertService.checkLowStockAlerts('craftsman-1')

      expect(alerts).toHaveLength(2)
      expect(alerts[0].alertType).toBe('LOW_STOCK')
      expect(alerts[1].alertType).toBe('OUT_OF_STOCK')
    })

    it('should acknowledge alerts', async () => {
      const mockAlert = {
        id: 'alert-1',
        craftsmanId: 'craftsman-1',
        isAcknowledged: false,
        acknowledgedAt: null
      }

      const acknowledgedAlert = {
        ...mockAlert,
        isAcknowledged: true,
        acknowledgedAt: new Date(),
        product: { id: 'product-1', name: 'Test Product' },
        craftsman: { id: 'craftsman-1', user: { id: 'user-1' } }
      }

      mockPrisma.inventoryAlert.findFirst.mockResolvedValue(mockAlert)
      mockPrisma.inventoryAlert.update.mockResolvedValue(acknowledgedAlert)

      const result = await inventoryAlertService.acknowledgeAlert('alert-1', 'craftsman-1')

      expect(result.isAcknowledged).toBe(true)
      expect(result.acknowledgedAt).toBeDefined()
    })
  })

  describe('Product Recommendations Integration', () => {
    it('should track user interactions and generate personalized recommendations', async () => {
      const mockInteractions = [
        {
          id: 'interaction-1',
          userId: 'user-1',
          productId: 'product-1',
          interactionType: 'VIEW',
          product: {
            id: 'product-1',
            craftCategory: 'pottery',
            craftsmanId: 'craftsman-1',
            craftsman: { id: 'craftsman-1', user: { id: 'user-1' } }
          }
        },
        {
          id: 'interaction-2',
          userId: 'user-1',
          productId: 'product-2',
          interactionType: 'PURCHASE',
          product: {
            id: 'product-2',
            craftCategory: 'pottery',
            craftsmanId: 'craftsman-1',
            craftsman: { id: 'craftsman-1', user: { id: 'user-1' } }
          }
        }
      ]

      const mockSimilarProducts = [
        {
          id: 'product-3',
          name: { 'zh-HK': '陶瓷花瓶', en: 'Ceramic Vase' },
          craftCategory: 'pottery',
          status: 'ACTIVE',
          averageRating: 4.5,
          reviewCount: 10,
          craftsman: {
            id: 'craftsman-2',
            user: { id: 'user-2', email: 'craftsman2@example.com' }
          }
        }
      ]

      mockPrisma.userProductInteraction.create.mockResolvedValue({})
      mockPrisma.userProductInteraction.findMany.mockResolvedValue(mockInteractions)
      mockPrisma.product.findMany.mockResolvedValue(mockSimilarProducts)
      mockPrisma.productRecommendation.deleteMany.mockResolvedValue({})
      mockPrisma.productRecommendation.upsert.mockResolvedValue({})

      // Track interaction
      await productRecommendationService.trackInteraction('user-1', 'product-1', 'VIEW')

      expect(mockPrisma.userProductInteraction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          productId: 'product-1',
          interactionType: 'VIEW',
          interactionData: undefined
        }
      })

      // Get personalized recommendations
      const recommendations = await productRecommendationService.getPersonalizedRecommendations('user-1', 5)

      expect(recommendations).toEqual(mockSimilarProducts)
    })

    it('should get frequently bought together products', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          orderItems: [
            { productId: 'product-1', product: { id: 'product-1' } },
            { productId: 'product-2', product: { id: 'product-2' } },
            { productId: 'product-3', product: { id: 'product-3' } }
          ]
        },
        {
          id: 'order-2',
          orderItems: [
            { productId: 'product-1', product: { id: 'product-1' } },
            { productId: 'product-2', product: { id: 'product-2' } }
          ]
        }
      ]

      const mockProducts = [
        {
          id: 'product-2',
          name: { 'zh-HK': '陶瓷杯', en: 'Ceramic Cup' },
          status: 'ACTIVE',
          craftsman: { id: 'craftsman-1', user: { id: 'user-1' } }
        },
        {
          id: 'product-3',
          name: { 'zh-HK': '陶瓷盤', en: 'Ceramic Plate' },
          status: 'ACTIVE',
          craftsman: { id: 'craftsman-1', user: { id: 'user-1' } }
        }
      ]

      mockPrisma.order.findMany.mockResolvedValue(mockOrders)
      mockPrisma.product.findMany.mockResolvedValue(mockProducts)

      const frequentlyBought = await productRecommendationService.getFrequentlyBoughtTogether('product-1', 5)

      expect(frequentlyBought).toHaveLength(2)
      expect(frequentlyBought[0].id).toBe('product-2') // Most frequently bought together
      expect(frequentlyBought[1].id).toBe('product-3')
    })

    it('should get cross-sell recommendations for cart', async () => {
      const cartProductIds = ['product-1', 'product-2']
      
      // Mock frequently bought together for each product in cart
      mockPrisma.order.findMany
        .mockResolvedValueOnce([
          {
            orderItems: [
              { productId: 'product-1' },
              { productId: 'product-3' },
              { productId: 'product-4' }
            ]
          }
        ])
        .mockResolvedValueOnce([
          {
            orderItems: [
              { productId: 'product-2' },
              { productId: 'product-3' },
              { productId: 'product-5' }
            ]
          }
        ])

      const mockRecommendedProducts = [
        {
          id: 'product-3',
          name: { 'zh-HK': '配套產品', en: 'Complementary Product' },
          status: 'ACTIVE',
          craftsman: { id: 'craftsman-1', user: { id: 'user-1' } }
        }
      ]

      mockPrisma.product.findMany.mockResolvedValue(mockRecommendedProducts)

      const crossSellRecommendations = await productRecommendationService.getCrossSellRecommendations(cartProductIds, 3)

      expect(crossSellRecommendations).toHaveLength(1)
      expect(crossSellRecommendations[0].id).toBe('product-3')
    })
  })

  describe('Complete E-commerce Flow Integration', () => {
    it('should handle complete purchase flow with all enhancements', async () => {
      // 1. User views product (tracking interaction)
      mockPrisma.userProductInteraction.create.mockResolvedValue({})
      await productRecommendationService.trackInteraction('user-1', 'product-1', 'VIEW')

      // 2. User adds to cart (tracking interaction)
      await productRecommendationService.trackInteraction('user-1', 'product-1', 'CART_ADD')

      // 3. User applies coupon
      const mockCoupon = {
        id: 'coupon-1',
        code: 'WELCOME10',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        minimumOrderAmount: 0,
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2024-12-31'),
        isActive: true,
        usageLimit: null,
        usedCount: 0,
        applicableCategories: [],
        applicableCraftsmen: []
      }

      mockPrisma.coupon.findUnique.mockResolvedValue(mockCoupon)
      const couponValidation = await couponService.validateCoupon('WELCOME10', 100)
      expect(couponValidation.isValid).toBe(true)
      expect(couponValidation.discount).toBe(10)

      // 4. User completes purchase (tracking interaction)
      await productRecommendationService.trackInteraction('user-1', 'product-1', 'PURCHASE')

      // 5. User leaves review
      const mockProduct = { id: 'product-1', name: 'Test Product' }
      const mockOrder = {
        id: 'order-1',
        userId: 'user-1',
        orderItems: [{ productId: 'product-1' }]
      }

      mockPrisma.product.findUnique.mockResolvedValue(mockProduct)
      mockPrisma.productReview.findUnique.mockResolvedValue(null)
      mockPrisma.order.findFirst.mockResolvedValue(mockOrder)
      mockPrisma.productReview.create.mockResolvedValue({
        id: 'review-1',
        rating: 5,
        isVerifiedPurchase: true
      })

      const review = await productReviewService.createReview('user-1', {
        productId: 'product-1',
        orderId: 'order-1',
        rating: 5,
        comment: 'Excellent product!'
      })

      expect(review.isVerifiedPurchase).toBe(true)

      // 6. System checks inventory and creates alerts if needed
      const mockLowStockProduct = {
        id: 'product-1',
        inventoryQuantity: 2,
        status: 'ACTIVE',
        craftsmanId: 'craftsman-1',
        craftsman: {
          id: 'craftsman-1',
          userId: 'user-2',
          user: { id: 'user-2', email: 'craftsman@example.com' }
        }
      }

      mockPrisma.product.findMany.mockResolvedValue([mockLowStockProduct])
      mockPrisma.inventoryAlert.findFirst.mockResolvedValue(null)
      mockPrisma.inventoryAlert.create.mockResolvedValue({
        id: 'alert-1',
        alertType: 'LOW_STOCK',
        currentQuantity: 2
      })

      const alerts = await inventoryAlertService.checkLowStockAlerts()
      expect(alerts).toHaveLength(1)
      expect(alerts[0].alertType).toBe('LOW_STOCK')

      // Verify all interactions were tracked
      expect(mockPrisma.userProductInteraction.create).toHaveBeenCalledTimes(3)
    })
  })
})