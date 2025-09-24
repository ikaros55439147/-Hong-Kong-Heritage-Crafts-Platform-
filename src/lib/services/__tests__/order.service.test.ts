import { describe, it, expect, beforeEach, vi } from 'vitest'
import { OrderService } from '../order.service'

// Mock dependencies
vi.mock('@prisma/client', () => {
  const mockPrisma = {
    order: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn()
    },
    product: {
      findUnique: vi.fn()
    },
    $transaction: vi.fn()
  }

  return {
    PrismaClient: vi.fn(() => mockPrisma),
    OrderStatus: {
      PENDING: 'PENDING',
      CONFIRMED: 'CONFIRMED',
      PROCESSING: 'PROCESSING',
      SHIPPED: 'SHIPPED',
      DELIVERED: 'DELIVERED',
      CANCELLED: 'CANCELLED'
    },
    PaymentStatus: {
      PENDING: 'PENDING',
      COMPLETED: 'COMPLETED',
      FAILED: 'FAILED',
      REFUNDED: 'REFUNDED'
    },
    UserRole: {
      LEARNER: 'LEARNER',
      CRAFTSMAN: 'CRAFTSMAN',
      ADMIN: 'ADMIN'
    },
    VerificationStatus: {
      PENDING: 'PENDING',
      VERIFIED: 'VERIFIED',
      REJECTED: 'REJECTED'
    },
    CourseStatus: {
      ACTIVE: 'ACTIVE',
      INACTIVE: 'INACTIVE',
      DRAFT: 'DRAFT'
    },
    BookingStatus: {
      PENDING: 'PENDING',
      CONFIRMED: 'CONFIRMED',
      CANCELLED: 'CANCELLED',
      COMPLETED: 'COMPLETED'
    },
    ProductStatus: {
      ACTIVE: 'ACTIVE',
      INACTIVE: 'INACTIVE',
      OUT_OF_STOCK: 'OUT_OF_STOCK'
    },
    LearningMaterialType: {
      VIDEO: 'VIDEO',
      DOCUMENT: 'DOCUMENT',
      IMAGE: 'IMAGE',
      STEP_BY_STEP: 'STEP_BY_STEP',
      QUIZ: 'QUIZ',
      ASSIGNMENT: 'ASSIGNMENT'
    }
  }
})

vi.mock('../product.service', () => ({
  productService: {
    reserveInventory: vi.fn(),
    releaseInventory: vi.fn()
  }
}))

vi.mock('../cart.service', () => ({
  cartService: {
    validateCart: vi.fn(),
    getCart: vi.fn(),
    clearCart: vi.fn()
  }
}))

describe('OrderService', () => {
  let orderService: OrderService
  
  const mockOrderData = {
    items: [
      {
        productId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: 2,
        customizationNotes: 'Custom notes'
      }
    ],
    shippingAddress: {
      recipientName: 'John Doe',
      phone: '+85212345678',
      addressLine1: '123 Main St',
      city: 'Hong Kong',
      district: 'Central',
      country: 'Hong Kong'
    }
  }

  const mockProduct = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: { 'zh-HK': '手雕麻將' },
    price: 1500,
    inventoryQuantity: 10,
    status: 'ACTIVE',
    craftsman: {
      id: '550e8400-e29b-41d4-a716-446655440001',
      user: {
        id: '550e8400-e29b-41d4-a716-446655440002',
        email: 'craftsman@example.com'
      }
    }
  }

  const mockOrder = {
    id: '550e8400-e29b-41d4-a716-446655440003',
    userId: '550e8400-e29b-41d4-a716-446655440002',
    totalAmount: 3000,
    status: 'PENDING',
    paymentStatus: 'PENDING',
    shippingAddress: mockOrderData.shippingAddress,
    createdAt: new Date(),
    user: {
      id: '550e8400-e29b-41d4-a716-446655440002',
      email: 'user@example.com'
    },
    orderItems: [
      {
        id: '550e8400-e29b-41d4-a716-446655440004',
        productId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: 2,
        price: 1500,
        product: mockProduct
      }
    ]
  }

  beforeEach(() => {
    orderService = new OrderService()
    vi.clearAllMocks()
  })

  describe('createOrder', () => {
    it('should create order successfully', async () => {
      const { PrismaClient } = await import('@prisma/client')
      const { productService } = await import('../product.service')
      
      const mockPrisma = new PrismaClient() as any
      
      // Mock transaction
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          product: {
            findUnique: vi.fn().mockResolvedValue(mockProduct)
          },
          order: {
            create: vi.fn().mockResolvedValue(mockOrder)
          }
        }
        return await callback(tx)
      })

      productService.reserveInventory = vi.fn().mockResolvedValue(true)

      const result = await orderService.createOrder('user-1', mockOrderData)

      expect(productService.reserveInventory).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000', 2)
      expect(result).toEqual(mockOrder)
    })

    it('should throw error for invalid order data', async () => {
      const invalidOrderData = {
        items: [],
        shippingAddress: mockOrderData.shippingAddress
      }

      await expect(
        orderService.createOrder('user-1', invalidOrderData)
      ).rejects.toThrow('Validation failed')
    })

    it('should throw error if product not found', async () => {
      const { PrismaClient } = await import('@prisma/client')
      
      const mockPrisma = new PrismaClient() as any
      
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          product: {
            findUnique: vi.fn().mockResolvedValue(null)
          }
        }
        return await callback(tx)
      })

      await expect(
        orderService.createOrder('550e8400-e29b-41d4-a716-446655440002', mockOrderData)
      ).rejects.toThrow('Product 550e8400-e29b-41d4-a716-446655440000 not found')
    })

    it('should throw error if insufficient inventory', async () => {
      const { PrismaClient } = await import('@prisma/client')
      
      const mockPrisma = new PrismaClient() as any
      const lowInventoryProduct = { ...mockProduct, inventoryQuantity: 1 }
      
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          product: {
            findUnique: vi.fn().mockResolvedValue(lowInventoryProduct)
          }
        }
        return await callback(tx)
      })

      await expect(
        orderService.createOrder('550e8400-e29b-41d4-a716-446655440002', mockOrderData)
      ).rejects.toThrow('Insufficient inventory')
    })
  })

  describe('createOrderFromCart', () => {
    it('should create order from cart successfully', async () => {
      const { cartService } = await import('../cart.service')
      const { PrismaClient } = await import('@prisma/client')
      const { productService } = await import('../product.service')
      
      const mockPrisma = new PrismaClient() as any
      
      // Mock cart validation and data
      cartService.validateCart = vi.fn().mockResolvedValue({ isValid: true, errors: [] })
      cartService.getCart = vi.fn().mockResolvedValue({
        items: [
          {
            productId: '550e8400-e29b-41d4-a716-446655440000',
            quantity: 2,
            customizationNotes: 'Custom notes'
          }
        ]
      })
      cartService.clearCart = vi.fn()

      // Mock transaction
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          product: {
            findUnique: vi.fn().mockResolvedValue(mockProduct)
          },
          order: {
            create: vi.fn().mockResolvedValue(mockOrder)
          }
        }
        return await callback(tx)
      })

      productService.reserveInventory = vi.fn().mockResolvedValue(true)

      const result = await orderService.createOrderFromCart('550e8400-e29b-41d4-a716-446655440002', mockOrderData.shippingAddress)

      expect(cartService.validateCart).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440002')
      expect(cartService.getCart).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440002')
      expect(cartService.clearCart).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440002')
      expect(result).toEqual(mockOrder)
    })

    it('should throw error if cart validation fails', async () => {
      const { cartService } = await import('../cart.service')
      
      cartService.validateCart = vi.fn().mockResolvedValue({ 
        isValid: false, 
        errors: ['Cart is empty'] 
      })

      await expect(
        orderService.createOrderFromCart('550e8400-e29b-41d4-a716-446655440002', mockOrderData.shippingAddress)
      ).rejects.toThrow('Cart validation failed: Cart is empty')
    })
  })

  describe('getOrderById', () => {
    it('should return order by ID', async () => {
      const { PrismaClient } = await import('@prisma/client')
      
      const mockPrisma = new PrismaClient() as any
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder)

      const result = await orderService.getOrderById('550e8400-e29b-41d4-a716-446655440003')

      expect(mockPrisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: '550e8400-e29b-41d4-a716-446655440003' },
        include: expect.any(Object)
      })
      expect(result).toEqual(mockOrder)
    })

    it('should return null if order not found', async () => {
      const { PrismaClient } = await import('@prisma/client')
      
      const mockPrisma = new PrismaClient() as any
      mockPrisma.order.findUnique.mockResolvedValue(null)

      const result = await orderService.getOrderById('invalid-id')

      expect(result).toBeNull()
    })
  })

  describe('cancelOrder', () => {
    it('should cancel order successfully', async () => {
      const { PrismaClient } = await import('@prisma/client')
      const { productService } = await import('../product.service')
      
      const mockPrisma = new PrismaClient() as any
      const cancelledOrder = { ...mockOrder, status: 'CANCELLED' }
      
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder)
      
      // Mock transaction
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          order: {
            update: vi.fn().mockResolvedValue(cancelledOrder)
          }
        }
        return await callback(tx)
      })

      productService.releaseInventory = vi.fn().mockResolvedValue(true)

      const result = await orderService.cancelOrder('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002')

      expect(productService.releaseInventory).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000', 2)
      expect(result.status).toBe('CANCELLED')
    })

    it('should throw error if order not found', async () => {
      const { PrismaClient } = await import('@prisma/client')
      
      const mockPrisma = new PrismaClient() as any
      mockPrisma.order.findUnique.mockResolvedValue(null)

      await expect(
        orderService.cancelOrder('550e8400-e29b-41d4-a716-446655440099', '550e8400-e29b-41d4-a716-446655440002')
      ).rejects.toThrow('Order not found')
    })

    it('should throw error if access denied', async () => {
      const { PrismaClient } = await import('@prisma/client')
      
      const mockPrisma = new PrismaClient() as any
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder)

      await expect(
        orderService.cancelOrder('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440099')
      ).rejects.toThrow('Access denied')
    })

    it('should throw error if order cannot be cancelled', async () => {
      const { PrismaClient } = await import('@prisma/client')
      
      const mockPrisma = new PrismaClient() as any
      const deliveredOrder = { ...mockOrder, status: 'DELIVERED' }
      mockPrisma.order.findUnique.mockResolvedValue(deliveredOrder)

      await expect(
        orderService.cancelOrder('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002')
      ).rejects.toThrow('Order cannot be cancelled')
    })
  })

  describe('getOrderStatistics', () => {
    it('should return order statistics', async () => {
      const { PrismaClient } = await import('@prisma/client')
      
      const mockPrisma = new PrismaClient() as any
      
      mockPrisma.order.count
        .mockResolvedValueOnce(10) // totalOrders
        .mockResolvedValueOnce(3)  // pendingOrders
        .mockResolvedValueOnce(5)  // completedOrders
        .mockResolvedValueOnce(2)  // cancelledOrders

      mockPrisma.order.aggregate.mockResolvedValue({
        _sum: { totalAmount: 15000 }
      })

      const result = await orderService.getOrderStatistics('550e8400-e29b-41d4-a716-446655440001')

      expect(result).toEqual({
        totalOrders: 10,
        totalRevenue: 15000,
        pendingOrders: 3,
        completedOrders: 5,
        cancelledOrders: 2
      })
    })
  })
})