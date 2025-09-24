import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { productReviewService } from '../product-review.service'
import { ProductReviewData } from '@/types'

// Mock Prisma
vi.mock('@prisma/client')
const mockPrisma = {
  product: {
    findUnique: vi.fn(),
  },
  order: {
    findFirst: vi.fn(),
  },
  productReview: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
  },
  reviewHelpfulness: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
} as any

vi.mocked(PrismaClient).mockImplementation(() => mockPrisma)

describe('ProductReviewService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createReview', () => {
    it('should create a product review successfully', async () => {
      const reviewData: ProductReviewData = {
        productId: 'product-1',
        orderId: 'order-1',
        rating: 5,
        title: 'Excellent product',
        comment: 'Really love this handcrafted item!',
        images: ['https://example.com/image1.jpg']
      }

      const mockProduct = { id: 'product-1', name: 'Test Product' }
      const mockOrder = {
        id: 'order-1',
        userId: 'user-1',
        orderItems: [{ productId: 'product-1' }]
      }
      const mockReview = {
        id: 'review-1',
        ...reviewData,
        userId: 'user-1',
        isVerifiedPurchase: true,
        helpfulCount: 0,
        createdAt: new Date(),
        user: { id: 'user-1', email: 'test@example.com', role: 'LEARNER' },
        product: mockProduct,
        order: mockOrder,
        helpfulnessVotes: []
      }

      mockPrisma.product.findUnique.mockResolvedValue(mockProduct)
      mockPrisma.productReview.findUnique.mockResolvedValue(null) // No existing review
      mockPrisma.order.findFirst.mockResolvedValue(mockOrder)
      mockPrisma.productReview.create.mockResolvedValue(mockReview)

      const result = await productReviewService.createReview('user-1', reviewData)

      expect(result).toEqual(mockReview)
      expect(mockPrisma.productReview.create).toHaveBeenCalledWith({
        data: {
          productId: 'product-1',
          userId: 'user-1',
          orderId: 'order-1',
          rating: 5,
          title: 'Excellent product',
          comment: 'Really love this handcrafted item!',
          images: ['https://example.com/image1.jpg'],
          isVerifiedPurchase: true
        },
        include: expect.any(Object)
      })
    })

    it('should throw error if product not found', async () => {
      const reviewData: ProductReviewData = {
        productId: 'nonexistent-product',
        rating: 5,
        comment: 'Great product'
      }

      mockPrisma.product.findUnique.mockResolvedValue(null)

      await expect(productReviewService.createReview('user-1', reviewData))
        .rejects.toThrow('Product not found')
    })

    it('should throw error if user already reviewed this product for this order', async () => {
      const reviewData: ProductReviewData = {
        productId: 'product-1',
        orderId: 'order-1',
        rating: 5,
        comment: 'Great product'
      }

      const mockProduct = { id: 'product-1', name: 'Test Product' }
      const existingReview = { id: 'existing-review' }

      mockPrisma.product.findUnique.mockResolvedValue(mockProduct)
      mockPrisma.productReview.findUnique.mockResolvedValue(existingReview)

      await expect(productReviewService.createReview('user-1', reviewData))
        .rejects.toThrow('You have already reviewed this product for this order')
    })

    it('should create review without order verification', async () => {
      const reviewData: ProductReviewData = {
        productId: 'product-1',
        rating: 4,
        comment: 'Good product'
        // No orderId
      }

      const mockProduct = { id: 'product-1', name: 'Test Product' }
      const mockReview = {
        id: 'review-1',
        ...reviewData,
        userId: 'user-1',
        isVerifiedPurchase: false,
        helpfulCount: 0,
        createdAt: new Date(),
        user: { id: 'user-1', email: 'test@example.com', role: 'LEARNER' },
        product: mockProduct,
        order: null,
        helpfulnessVotes: []
      }

      mockPrisma.product.findUnique.mockResolvedValue(mockProduct)
      mockPrisma.productReview.create.mockResolvedValue(mockReview)

      const result = await productReviewService.createReview('user-1', reviewData)

      expect(result.isVerifiedPurchase).toBe(false)
      expect(mockPrisma.productReview.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isVerifiedPurchase: false
        }),
        include: expect.any(Object)
      })
    })
  })

  describe('getProductReviews', () => {
    it('should return paginated product reviews', async () => {
      const mockReviews = [
        {
          id: 'review-1',
          rating: 5,
          comment: 'Great product',
          user: { id: 'user-1', email: 'test@example.com', role: 'LEARNER' },
          product: { id: 'product-1', name: 'Test Product' },
          helpfulnessVotes: []
        },
        {
          id: 'review-2',
          rating: 4,
          comment: 'Good product',
          user: { id: 'user-2', email: 'test2@example.com', role: 'LEARNER' },
          product: { id: 'product-1', name: 'Test Product' },
          helpfulnessVotes: []
        }
      ]

      mockPrisma.productReview.findMany.mockResolvedValue(mockReviews)
      mockPrisma.productReview.count.mockResolvedValue(2)

      const result = await productReviewService.getProductReviews('product-1', { page: 1, limit: 10 })

      expect(result.data).toEqual(mockReviews)
      expect(result.total).toBe(2)
      expect(result.page).toBe(1)
      expect(result.totalPages).toBe(1)
    })

    it('should filter reviews by rating', async () => {
      const mockReviews = [
        {
          id: 'review-1',
          rating: 5,
          comment: 'Excellent',
          user: { id: 'user-1', email: 'test@example.com', role: 'LEARNER' },
          helpfulnessVotes: []
        }
      ]

      mockPrisma.productReview.findMany.mockResolvedValue(mockReviews)
      mockPrisma.productReview.count.mockResolvedValue(1)

      await productReviewService.getProductReviews('product-1', {}, { rating: 5 })

      expect(mockPrisma.productReview.findMany).toHaveBeenCalledWith({
        where: { productId: 'product-1', rating: 5 },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10
      })
    })

    it('should sort reviews by helpfulness', async () => {
      await productReviewService.getProductReviews('product-1', {}, { sortBy: 'helpful' })

      expect(mockPrisma.productReview.findMany).toHaveBeenCalledWith({
        where: { productId: 'product-1' },
        include: expect.any(Object),
        orderBy: { helpfulCount: 'desc' },
        skip: 0,
        take: 10
      })
    })
  })

  describe('markReviewHelpful', () => {
    it('should create new helpfulness vote', async () => {
      mockPrisma.reviewHelpfulness.findUnique.mockResolvedValue(null) // No existing vote
      mockPrisma.reviewHelpfulness.create.mockResolvedValue({})
      mockPrisma.reviewHelpfulness.count.mockResolvedValue(5)
      mockPrisma.productReview.update.mockResolvedValue({})

      await productReviewService.markReviewHelpful('review-1', 'user-1', true)

      expect(mockPrisma.reviewHelpfulness.create).toHaveBeenCalledWith({
        data: {
          reviewId: 'review-1',
          userId: 'user-1',
          isHelpful: true
        }
      })

      expect(mockPrisma.productReview.update).toHaveBeenCalledWith({
        where: { id: 'review-1' },
        data: { helpfulCount: 5 }
      })
    })

    it('should update existing helpfulness vote', async () => {
      const existingVote = { id: 'vote-1', isHelpful: false }
      mockPrisma.reviewHelpfulness.findUnique.mockResolvedValue(existingVote)
      mockPrisma.reviewHelpfulness.update.mockResolvedValue({})
      mockPrisma.reviewHelpfulness.count.mockResolvedValue(3)
      mockPrisma.productReview.update.mockResolvedValue({})

      await productReviewService.markReviewHelpful('review-1', 'user-1', true)

      expect(mockPrisma.reviewHelpfulness.update).toHaveBeenCalledWith({
        where: {
          reviewId_userId: {
            reviewId: 'review-1',
            userId: 'user-1'
          }
        },
        data: { isHelpful: true }
      })
    })
  })

  describe('getProductReviewStatistics', () => {
    it('should return review statistics', async () => {
      mockPrisma.productReview.count
        .mockResolvedValueOnce(10) // Total reviews
        .mockResolvedValueOnce(7)  // Verified purchase count

      mockPrisma.productReview.aggregate.mockResolvedValue({
        _avg: { rating: 4.5 }
      })

      mockPrisma.productReview.groupBy.mockResolvedValue([
        { rating: 5, _count: { rating: 6 } },
        { rating: 4, _count: { rating: 3 } },
        { rating: 3, _count: { rating: 1 } }
      ])

      const result = await productReviewService.getProductReviewStatistics('product-1')

      expect(result).toEqual({
        totalReviews: 10,
        averageRating: 4.5,
        ratingDistribution: [
          { rating: 5, count: 6 },
          { rating: 4, count: 3 },
          { rating: 3, count: 1 }
        ],
        verifiedPurchaseCount: 7
      })
    })
  })

  describe('updateReview', () => {
    it('should update review successfully', async () => {
      const existingReview = {
        id: 'review-1',
        userId: 'user-1',
        rating: 4,
        comment: 'Good product'
      }

      const updates = {
        rating: 5,
        comment: 'Excellent product!'
      }

      const updatedReview = {
        ...existingReview,
        ...updates,
        user: { id: 'user-1', email: 'test@example.com', role: 'LEARNER' },
        product: { id: 'product-1', name: 'Test Product' },
        helpfulnessVotes: []
      }

      mockPrisma.productReview.findFirst.mockResolvedValue(existingReview)
      mockPrisma.productReview.update.mockResolvedValue(updatedReview)

      const result = await productReviewService.updateReview('review-1', 'user-1', updates)

      expect(result).toEqual(updatedReview)
      expect(mockPrisma.productReview.update).toHaveBeenCalledWith({
        where: { id: 'review-1' },
        data: updates,
        include: expect.any(Object)
      })
    })

    it('should throw error if review not found or access denied', async () => {
      mockPrisma.productReview.findFirst.mockResolvedValue(null)

      await expect(productReviewService.updateReview('review-1', 'user-1', { rating: 5 }))
        .rejects.toThrow('Review not found or access denied')
    })
  })

  describe('deleteReview', () => {
    it('should delete review successfully', async () => {
      const existingReview = {
        id: 'review-1',
        userId: 'user-1'
      }

      mockPrisma.productReview.findFirst.mockResolvedValue(existingReview)
      mockPrisma.productReview.delete.mockResolvedValue(existingReview)

      await productReviewService.deleteReview('review-1', 'user-1')

      expect(mockPrisma.productReview.delete).toHaveBeenCalledWith({
        where: { id: 'review-1' }
      })
    })

    it('should throw error if review not found or access denied', async () => {
      mockPrisma.productReview.findFirst.mockResolvedValue(null)

      await expect(productReviewService.deleteReview('review-1', 'user-1'))
        .rejects.toThrow('Review not found or access denied')
    })
  })
})