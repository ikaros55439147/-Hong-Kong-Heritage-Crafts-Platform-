import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { couponService } from '../coupon.service'
import { CouponData } from '@/types'

// Mock Prisma
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    coupon: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  })),
  DiscountType: {
    PERCENTAGE: 'PERCENTAGE',
    FIXED_AMOUNT: 'FIXED_AMOUNT'
  }
}))

const mockPrisma = {
  coupon: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
} as any

describe('CouponService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createCoupon', () => {
    it('should create a coupon successfully', async () => {
      const couponData: CouponData = {
        code: 'SAVE20',
        name: { 'zh-HK': '20% 折扣', en: '20% Discount' },
        description: { 'zh-HK': '全場 20% 折扣', en: '20% off everything' },
        discountType: 'PERCENTAGE',
        discountValue: 20,
        minimumOrderAmount: 100,
        validFrom: '2024-01-01',
        validUntil: '2024-12-31',
        applicableCategories: ['handicrafts'],
        usageLimit: 100
      }

      const mockCoupon = {
        id: 'coupon-1',
        ...couponData,
        usedCount: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        creator: { id: 'user-1', email: 'test@example.com' },
        orders: []
      }

      mockPrisma.coupon.findUnique.mockResolvedValue(null) // No existing coupon
      mockPrisma.coupon.create.mockResolvedValue(mockCoupon)

      const result = await couponService.createCoupon('user-1', couponData)

      expect(result).toEqual(mockCoupon)
      expect(mockPrisma.coupon.findUnique).toHaveBeenCalledWith({
        where: { code: 'SAVE20' }
      })
      expect(mockPrisma.coupon.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          code: 'SAVE20',
          discountType: 'PERCENTAGE',
          discountValue: 20,
          createdBy: 'user-1'
        }),
        include: {
          creator: true,
          orders: true
        }
      })
    })

    it('should throw error if coupon code already exists', async () => {
      const couponData: CouponData = {
        code: 'EXISTING',
        name: { en: 'Existing Coupon' },
        discountType: 'PERCENTAGE',
        discountValue: 10,
        validFrom: '2024-01-01',
        validUntil: '2024-12-31'
      }

      mockPrisma.coupon.findUnique.mockResolvedValue({ id: 'existing-coupon' })

      await expect(couponService.createCoupon('user-1', couponData))
        .rejects.toThrow('Coupon code already exists')
    })

    it('should throw error if valid from date is after valid until date', async () => {
      const couponData: CouponData = {
        code: 'INVALID_DATES',
        name: { en: 'Invalid Dates' },
        discountType: 'PERCENTAGE',
        discountValue: 10,
        validFrom: '2024-12-31',
        validUntil: '2024-01-01' // Before validFrom
      }

      mockPrisma.coupon.findUnique.mockResolvedValue(null)

      await expect(couponService.createCoupon('user-1', couponData))
        .rejects.toThrow('Valid from date must be before valid until date')
    })
  })

  describe('validateCoupon', () => {
    it('should validate a valid coupon successfully', async () => {
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

      const result = await couponService.validateCoupon('SAVE20', 100, [], [])

      expect(result.isValid).toBe(true)
      expect(result.coupon).toEqual(mockCoupon)
      expect(result.discount).toBe(20) // 20% of 100
    })

    it('should reject expired coupon', async () => {
      const mockCoupon = {
        id: 'coupon-1',
        code: 'EXPIRED',
        validFrom: new Date('2023-01-01'),
        validUntil: new Date('2023-12-31'), // Expired
        isActive: true,
        usageLimit: null,
        usedCount: 0,
        minimumOrderAmount: 0
      }

      mockPrisma.coupon.findUnique.mockResolvedValue(mockCoupon)

      const result = await couponService.validateCoupon('EXPIRED', 100, [], [])

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Coupon is not valid at this time')
    })

    it('should reject coupon with insufficient order amount', async () => {
      const mockCoupon = {
        id: 'coupon-1',
        code: 'MIN100',
        minimumOrderAmount: 100,
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2024-12-31'),
        isActive: true,
        usageLimit: null,
        usedCount: 0
      }

      mockPrisma.coupon.findUnique.mockResolvedValue(mockCoupon)

      const result = await couponService.validateCoupon('MIN100', 50, [], []) // Order amount too low

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Minimum order amount of $100 required')
    })

    it('should apply maximum discount limit', async () => {
      const mockCoupon = {
        id: 'coupon-1',
        code: 'MAXDISCOUNT',
        discountType: 'PERCENTAGE',
        discountValue: 50,
        maximumDiscountAmount: 25, // Max $25 discount
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

      const result = await couponService.validateCoupon('MAXDISCOUNT', 100, [], [])

      expect(result.isValid).toBe(true)
      expect(result.discount).toBe(25) // Should be capped at $25, not $50 (50% of $100)
    })
  })

  describe('getCoupons', () => {
    it('should return paginated coupons', async () => {
      const mockCoupons = [
        { id: 'coupon-1', code: 'SAVE10', creator: null, orders: [] },
        { id: 'coupon-2', code: 'SAVE20', creator: null, orders: [] }
      ]

      mockPrisma.coupon.findMany.mockResolvedValue(mockCoupons)
      mockPrisma.coupon.count.mockResolvedValue(2)

      const result = await couponService.getCoupons({ page: 1, limit: 10 })

      expect(result.data).toEqual(mockCoupons)
      expect(result.total).toBe(2)
      expect(result.page).toBe(1)
      expect(result.totalPages).toBe(1)
    })

    it('should filter coupons by active status', async () => {
      const mockCoupons = [
        { id: 'coupon-1', code: 'ACTIVE', isActive: true, creator: null, orders: [] }
      ]

      mockPrisma.coupon.findMany.mockResolvedValue(mockCoupons)
      mockPrisma.coupon.count.mockResolvedValue(1)

      await couponService.getCoupons({}, { isActive: true })

      expect(mockPrisma.coupon.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        include: { creator: true, orders: true },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10
      })
    })
  })

  describe('applyCoupon', () => {
    it('should increment coupon usage count', async () => {
      const mockUpdatedCoupon = {
        id: 'coupon-1',
        usedCount: 11
      }

      mockPrisma.coupon.update.mockResolvedValue(mockUpdatedCoupon)

      await couponService.applyCoupon('coupon-1')

      expect(mockPrisma.coupon.update).toHaveBeenCalledWith({
        where: { id: 'coupon-1' },
        data: {
          usedCount: {
            increment: 1
          }
        }
      })
    })
  })

  describe('deleteCoupon', () => {
    it('should delete coupon if not used', async () => {
      const mockCoupon = {
        id: 'coupon-1',
        orders: [] // No orders using this coupon
      }

      mockPrisma.coupon.findUnique.mockResolvedValue(mockCoupon)
      mockPrisma.coupon.delete.mockResolvedValue(mockCoupon)

      await couponService.deleteCoupon('coupon-1')

      expect(mockPrisma.coupon.delete).toHaveBeenCalledWith({
        where: { id: 'coupon-1' }
      })
    })

    it('should throw error if coupon has been used', async () => {
      const mockCoupon = {
        id: 'coupon-1',
        orders: [{ id: 'order-1' }] // Has orders using this coupon
      }

      mockPrisma.coupon.findUnique.mockResolvedValue(mockCoupon)

      await expect(couponService.deleteCoupon('coupon-1'))
        .rejects.toThrow('Cannot delete coupon that has been used in orders')
    })
  })
})