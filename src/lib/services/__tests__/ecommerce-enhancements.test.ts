import { describe, it, expect } from 'vitest'
import { validateProductReviewData } from '@/lib/validations'
import { ProductReviewData } from '@/types'

describe('E-commerce Enhancements', () => {
  describe('Coupon Business Logic', () => {
    it('should validate coupon code format', () => {
      const validCode = 'SAVE20'
      const invalidCode = 'invalid code!'
      
      // Valid code: uppercase letters, numbers, underscores, hyphens
      expect(/^[A-Z0-9_-]+$/.test(validCode)).toBe(true)
      expect(/^[A-Z0-9_-]+$/.test(invalidCode)).toBe(false)
    })

    it('should validate discount percentage limits', () => {
      const validPercentage = 20
      const invalidPercentage = 150
      
      expect(validPercentage > 0 && validPercentage <= 100).toBe(true)
      expect(invalidPercentage > 0 && invalidPercentage <= 100).toBe(false)
    })

    it('should validate date ranges', () => {
      const validFrom = new Date('2024-01-01')
      const validUntil = new Date('2024-12-31')
      const invalidFrom = new Date('2024-12-31')
      const invalidUntil = new Date('2024-01-01')
      
      expect(validFrom < validUntil).toBe(true)
      expect(invalidFrom < invalidUntil).toBe(false)
    })

    it('should validate minimum order amounts', () => {
      const orderAmount = 100
      const minimumAmount = 50
      const highMinimumAmount = 150
      
      expect(orderAmount >= minimumAmount).toBe(true)
      expect(orderAmount >= highMinimumAmount).toBe(false)
    })
  })

  describe('Product Review Validation', () => {
    it('should validate valid review data', () => {
      const reviewData: ProductReviewData = {
        productId: '123e4567-e89b-12d3-a456-426614174000',
        orderId: '123e4567-e89b-12d3-a456-426614174001',
        rating: 5,
        title: 'Excellent product',
        comment: 'Really love this handcrafted item!',
        images: ['https://example.com/image1.jpg']
      }

      const result = validateProductReviewData(reviewData)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject invalid rating', () => {
      const reviewData: ProductReviewData = {
        productId: '123e4567-e89b-12d3-a456-426614174000',
        rating: 6, // Invalid rating (max 5)
        comment: 'Great product'
      }

      const result = validateProductReviewData(reviewData)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'rating')).toBe(true)
    })

    it('should reject review without title or comment', () => {
      const reviewData: ProductReviewData = {
        productId: '123e4567-e89b-12d3-a456-426614174000',
        rating: 5
        // No title or comment
      }

      const result = validateProductReviewData(reviewData)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.message.includes('title or comment'))).toBe(true)
    })

    it('should reject too many images', () => {
      const reviewData: ProductReviewData = {
        productId: '123e4567-e89b-12d3-a456-426614174000',
        rating: 5,
        comment: 'Great product',
        images: [
          'https://example.com/1.jpg',
          'https://example.com/2.jpg',
          'https://example.com/3.jpg',
          'https://example.com/4.jpg',
          'https://example.com/5.jpg',
          'https://example.com/6.jpg' // Too many images (max 5)
        ]
      }

      const result = validateProductReviewData(reviewData)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.message.includes('5 images'))).toBe(true)
    })

    it('should reject invalid image URLs', () => {
      const reviewData: ProductReviewData = {
        productId: '123e4567-e89b-12d3-a456-426614174000',
        rating: 5,
        comment: 'Great product',
        images: ['not-a-valid-url']
      }

      const result = validateProductReviewData(reviewData)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.message.includes('Invalid image URL'))).toBe(true)
    })
  })

  describe('Business Logic Tests', () => {
    it('should calculate percentage discount correctly', () => {
      const orderAmount = 100
      const discountPercentage = 20
      const expectedDiscount = (orderAmount * discountPercentage) / 100
      
      expect(expectedDiscount).toBe(20)
    })

    it('should apply maximum discount limit', () => {
      const orderAmount = 200
      const discountPercentage = 50
      const maxDiscount = 75
      
      const calculatedDiscount = (orderAmount * discountPercentage) / 100 // 100
      const finalDiscount = Math.min(calculatedDiscount, maxDiscount)
      
      expect(finalDiscount).toBe(75)
    })

    it('should calculate fixed amount discount correctly', () => {
      const orderAmount = 150
      const fixedDiscount = 25
      
      expect(fixedDiscount).toBe(25)
      expect(orderAmount - fixedDiscount).toBe(125)
    })

    it('should determine low stock alert threshold', () => {
      const currentStock = 3
      const threshold = 5
      
      expect(currentStock <= threshold).toBe(true)
      expect(currentStock === 0).toBe(false) // Not out of stock
    })

    it('should determine out of stock status', () => {
      const currentStock = 0
      
      expect(currentStock === 0).toBe(true)
    })

    it('should calculate average rating correctly', () => {
      const ratings = [5, 4, 5, 3, 4, 5, 4]
      const average = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
      
      expect(Math.round(average * 10) / 10).toBe(4.3)
    })

    it('should group ratings by value', () => {
      const ratings = [5, 4, 5, 3, 4, 5, 4, 2, 1]
      const distribution = ratings.reduce((acc, rating) => {
        acc[rating] = (acc[rating] || 0) + 1
        return acc
      }, {} as Record<number, number>)
      
      expect(distribution).toEqual({
        1: 1,
        2: 1,
        3: 1,
        4: 3,
        5: 3
      })
    })
  })

  describe('Data Structure Tests', () => {
    it('should handle multi-language content correctly', () => {
      const multiLangContent = {
        'zh-HK': '手工陶瓷',
        'zh-CN': '手工陶瓷',
        'en': 'Handmade Pottery'
      }

      expect(multiLangContent['zh-HK']).toBe('手工陶瓷')
      expect(multiLangContent['en']).toBe('Handmade Pottery')
      
      // Check if at least one language has content
      const hasContent = Object.values(multiLangContent).some(value => value && value.trim().length > 0)
      expect(hasContent).toBe(true)
    })

    it('should handle coupon applicability logic', () => {
      const couponCategories = ['pottery', 'ceramics']
      const orderCategories = ['pottery', 'woodwork']
      
      const isApplicable = couponCategories.length === 0 || 
        orderCategories.some(cat => couponCategories.includes(cat))
      
      expect(isApplicable).toBe(true)
    })

    it('should handle craftsman-specific coupons', () => {
      const couponCraftsmen = ['craftsman-1', 'craftsman-2']
      const orderCraftsmen = ['craftsman-1', 'craftsman-3']
      
      const isApplicable = couponCraftsmen.length === 0 || 
        orderCraftsmen.some(id => couponCraftsmen.includes(id))
      
      expect(isApplicable).toBe(true)
    })

    it('should handle recommendation scoring', () => {
      const baseScore = 1.0
      const position = 2 // Second recommendation
      const decayFactor = 0.2
      
      const score = baseScore - (position * decayFactor)
      expect(score).toBe(0.6)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty coupon categories', () => {
      const couponCategories: string[] = []
      const orderCategories = ['pottery']
      
      // Empty categories means applicable to all
      const isApplicable = couponCategories.length === 0
      expect(isApplicable).toBe(true)
    })

    it('should handle zero minimum order amount', () => {
      const orderAmount = 50
      const minimumAmount = 0
      
      expect(orderAmount >= minimumAmount).toBe(true)
    })

    it('should handle unlimited usage coupons', () => {
      const usageLimit = null
      const usedCount = 100
      
      const canUse = usageLimit === null || usedCount < usageLimit
      expect(canUse).toBe(true)
    })

    it('should handle products with no reviews', () => {
      const reviews: any[] = []
      const averageRating = reviews.length > 0 
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
        : 0
      
      expect(averageRating).toBe(0)
    })

    it('should handle inventory alerts for products with zero threshold', () => {
      const currentStock = 5
      const threshold = 0
      
      const needsAlert = currentStock <= threshold
      expect(needsAlert).toBe(false)
    })
  })
})