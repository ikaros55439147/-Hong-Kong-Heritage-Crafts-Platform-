import { PrismaClient, DiscountType } from '@prisma/client'
import { 
  CouponData, 
  CouponWithUsage, 
  PaginationParams, 
  PaginationResult,
  ValidationResult
} from '@/types'
import { validateCouponData } from '@/lib/validations'

let prisma: PrismaClient

// Allow injection for testing
export function setPrismaInstance(instance: PrismaClient) {
  prisma = instance
}

if (!prisma) {
  prisma = new PrismaClient()
}

export class CouponService {
  /**
   * Create a new coupon
   */
  async createCoupon(createdBy: string, couponData: CouponData): Promise<CouponWithUsage> {
    // Validate coupon data
    const validation = validateCouponData(couponData)
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`)
    }

    // Check if coupon code already exists
    const existingCoupon = await prisma.coupon.findUnique({
      where: { code: couponData.code }
    })

    if (existingCoupon) {
      throw new Error('Coupon code already exists')
    }

    // Validate date range
    if (new Date(couponData.validFrom) >= new Date(couponData.validUntil)) {
      throw new Error('Valid from date must be before valid until date')
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: couponData.code,
        name: couponData.name,
        description: couponData.description,
        discountType: couponData.discountType,
        discountValue: couponData.discountValue,
        minimumOrderAmount: couponData.minimumOrderAmount || 0,
        maximumDiscountAmount: couponData.maximumDiscountAmount,
        usageLimit: couponData.usageLimit,
        validFrom: new Date(couponData.validFrom),
        validUntil: new Date(couponData.validUntil),
        applicableCategories: couponData.applicableCategories || [],
        applicableCraftsmen: couponData.applicableCraftsmen || [],
        createdBy
      },
      include: {
        creator: true,
        orders: true
      }
    })

    return coupon
  }

  /**
   * Get coupon by code
   */
  async getCouponByCode(code: string): Promise<CouponWithUsage | null> {
    const coupon = await prisma.coupon.findUnique({
      where: { code },
      include: {
        creator: true,
        orders: true
      }
    })

    return coupon
  }

  /**
   * Get coupon by ID
   */
  async getCouponById(couponId: string): Promise<CouponWithUsage | null> {
    const coupon = await prisma.coupon.findUnique({
      where: { id: couponId },
      include: {
        creator: true,
        orders: true
      }
    })

    return coupon
  }

  /**
   * Validate coupon for order
   */
  async validateCoupon(
    code: string, 
    orderAmount: number, 
    categories: string[] = [], 
    craftsmanIds: string[] = []
  ): Promise<{
    isValid: boolean
    coupon?: CouponWithUsage
    discount?: number
    error?: string
  }> {
    const coupon = await this.getCouponByCode(code)

    if (!coupon) {
      return { isValid: false, error: 'Coupon not found' }
    }

    if (!coupon.isActive) {
      return { isValid: false, error: 'Coupon is not active' }
    }

    const now = new Date()
    if (now < coupon.validFrom || now > coupon.validUntil) {
      return { isValid: false, error: 'Coupon is not valid at this time' }
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return { isValid: false, error: 'Coupon usage limit exceeded' }
    }

    if (orderAmount < Number(coupon.minimumOrderAmount)) {
      return { 
        isValid: false, 
        error: `Minimum order amount of $${coupon.minimumOrderAmount} required` 
      }
    }

    // Check category restrictions
    if (coupon.applicableCategories.length > 0) {
      const hasValidCategory = categories.some(cat => 
        coupon.applicableCategories.includes(cat)
      )
      if (!hasValidCategory) {
        return { isValid: false, error: 'Coupon not applicable to selected products' }
      }
    }

    // Check craftsman restrictions
    if (coupon.applicableCraftsmen.length > 0) {
      const hasValidCraftsman = craftsmanIds.some(id => 
        coupon.applicableCraftsmen.includes(id)
      )
      if (!hasValidCraftsman) {
        return { isValid: false, error: 'Coupon not applicable to selected craftsmen' }
      }
    }

    // Calculate discount
    let discount = 0
    if (coupon.discountType === DiscountType.PERCENTAGE) {
      discount = (orderAmount * Number(coupon.discountValue)) / 100
    } else {
      discount = Number(coupon.discountValue)
    }

    // Apply maximum discount limit
    if (coupon.maximumDiscountAmount && discount > Number(coupon.maximumDiscountAmount)) {
      discount = Number(coupon.maximumDiscountAmount)
    }

    return { isValid: true, coupon, discount }
  }

  /**
   * Apply coupon to order (increment usage count)
   */
  async applyCoupon(couponId: string): Promise<void> {
    await prisma.coupon.update({
      where: { id: couponId },
      data: {
        usedCount: {
          increment: 1
        }
      }
    })
  }

  /**
   * Get all coupons with pagination
   */
  async getCoupons(
    pagination: PaginationParams = {},
    filters: {
      isActive?: boolean
      createdBy?: string
      category?: string
    } = {}
  ): Promise<PaginationResult<CouponWithUsage>> {
    const { page = 1, limit = 10 } = pagination
    const skip = (page - 1) * limit

    const where: any = {}

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive
    }

    if (filters.createdBy) {
      where.createdBy = filters.createdBy
    }

    if (filters.category) {
      where.applicableCategories = {
        has: filters.category
      }
    }

    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({
        where,
        include: {
          creator: true,
          orders: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.coupon.count({ where })
    ])

    return {
      data: coupons,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  /**
   * Update coupon
   */
  async updateCoupon(
    couponId: string, 
    updates: Partial<CouponData>
  ): Promise<CouponWithUsage> {
    // Validate updates
    if (Object.keys(updates).length > 0) {
      const validation = validateCouponData(updates, true) // partial validation
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`)
      }
    }

    // Check if code is being updated and already exists
    if (updates.code) {
      const existingCoupon = await prisma.coupon.findFirst({
        where: {
          code: updates.code,
          id: { not: couponId }
        }
      })

      if (existingCoupon) {
        throw new Error('Coupon code already exists')
      }
    }

    const coupon = await prisma.coupon.update({
      where: { id: couponId },
      data: updates,
      include: {
        creator: true,
        orders: true
      }
    })

    return coupon
  }

  /**
   * Delete coupon
   */
  async deleteCoupon(couponId: string): Promise<void> {
    // Check if coupon has been used
    const coupon = await prisma.coupon.findUnique({
      where: { id: couponId },
      include: {
        orders: true
      }
    })

    if (!coupon) {
      throw new Error('Coupon not found')
    }

    if (coupon.orders.length > 0) {
      throw new Error('Cannot delete coupon that has been used in orders')
    }

    await prisma.coupon.delete({
      where: { id: couponId }
    })
  }

  /**
   * Get coupon usage statistics
   */
  async getCouponStatistics(couponId: string): Promise<{
    totalUsage: number
    totalDiscount: number
    averageOrderAmount: number
    usageByMonth: { month: string; count: number; discount: number }[]
  }> {
    const coupon = await prisma.coupon.findUnique({
      where: { id: couponId },
      include: {
        orders: {
          select: {
            totalAmount: true,
            couponDiscount: true,
            createdAt: true
          }
        }
      }
    })

    if (!coupon) {
      throw new Error('Coupon not found')
    }

    const totalUsage = coupon.orders.length
    const totalDiscount = coupon.orders.reduce((sum, order) => 
      sum + Number(order.couponDiscount), 0
    )
    const averageOrderAmount = totalUsage > 0 
      ? coupon.orders.reduce((sum, order) => sum + Number(order.totalAmount), 0) / totalUsage
      : 0

    // Group usage by month
    const usageByMonth = coupon.orders.reduce((acc, order) => {
      const month = order.createdAt.toISOString().substring(0, 7) // YYYY-MM
      const existing = acc.find(item => item.month === month)
      
      if (existing) {
        existing.count += 1
        existing.discount += Number(order.couponDiscount)
      } else {
        acc.push({
          month,
          count: 1,
          discount: Number(order.couponDiscount)
        })
      }
      
      return acc
    }, [] as { month: string; count: number; discount: number }[])

    return {
      totalUsage,
      totalDiscount,
      averageOrderAmount,
      usageByMonth: usageByMonth.sort((a, b) => a.month.localeCompare(b.month))
    }
  }

  /**
   * Get active coupons for user
   */
  async getActiveCouponsForUser(
    categories: string[] = [], 
    craftsmanIds: string[] = []
  ): Promise<CouponWithUsage[]> {
    const now = new Date()

    const coupons = await prisma.coupon.findMany({
      where: {
        isActive: true,
        validFrom: { lte: now },
        validUntil: { gte: now },
        OR: [
          { usageLimit: null },
          { usedCount: { lt: prisma.coupon.fields.usageLimit } }
        ]
      },
      include: {
        creator: true,
        orders: true
      },
      orderBy: { discountValue: 'desc' }
    })

    // Filter by applicable categories and craftsmen
    return coupons.filter(coupon => {
      if (coupon.applicableCategories.length > 0) {
        const hasValidCategory = categories.some(cat => 
          coupon.applicableCategories.includes(cat)
        )
        if (!hasValidCategory) return false
      }

      if (coupon.applicableCraftsmen.length > 0) {
        const hasValidCraftsman = craftsmanIds.some(id => 
          coupon.applicableCraftsmen.includes(id)
        )
        if (!hasValidCraftsman) return false
      }

      return true
    })
  }
}

export const couponService = new CouponService()