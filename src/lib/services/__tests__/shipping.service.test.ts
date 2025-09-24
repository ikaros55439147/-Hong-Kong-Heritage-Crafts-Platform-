import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ShippingService, ShippingStatus } from '../shipping.service'

// Mock dependencies
vi.mock('../order.service', () => ({
  orderService: {
    getOrderById: vi.fn(),
    updateOrderStatus: vi.fn()
  }
}))

describe('ShippingService', () => {
  let shippingService: ShippingService
  
  const mockOrder = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    userId: '550e8400-e29b-41d4-a716-446655440001',
    status: 'CONFIRMED',
    shippingAddress: {
      recipientName: 'John Doe',
      phone: '+85212345678',
      addressLine1: '123 Main St',
      city: 'Hong Kong',
      district: 'Central',
      country: 'Hong Kong'
    },
    orderItems: [
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        quantity: 2,
        product: {
          id: '550e8400-e29b-41d4-a716-446655440003',
          craftCategory: '手工藝品',
          craftsmanId: '550e8400-e29b-41d4-a716-446655440004'
        }
      }
    ]
  }

  const mockDimensions = {
    length: 20,
    width: 15,
    height: 10
  }

  const mockAddress = {
    name: 'John Doe',
    phone: '+85212345678',
    addressLine1: '123 Main St',
    city: 'Hong Kong',
    district: 'Central',
    country: 'Hong Kong'
  }

  beforeEach(() => {
    shippingService = new ShippingService()
    vi.clearAllMocks()
  })

  describe('getShippingQuote', () => {
    it('should return shipping quotes for order', async () => {
      const { orderService } = await import('../order.service')
      orderService.getOrderById = vi.fn().mockResolvedValue(mockOrder)

      const quotes = await shippingService.getShippingQuote(
        mockOrder.id,
        1.5,
        mockDimensions,
        'standard'
      )

      expect(orderService.getOrderById).toHaveBeenCalledWith(mockOrder.id)
      expect(quotes).toHaveLength(2) // hongkong_post and sf_express
      expect(quotes[0]).toHaveProperty('provider')
      expect(quotes[0]).toHaveProperty('cost')
      expect(quotes[0]).toHaveProperty('estimatedDays')
      expect(quotes[0].cost).toBeGreaterThan(0)
    })

    it('should throw error if order not found', async () => {
      const { orderService } = await import('../order.service')
      orderService.getOrderById = vi.fn().mockResolvedValue(null)

      await expect(
        shippingService.getShippingQuote('invalid-order', 1.5, mockDimensions)
      ).rejects.toThrow('Order not found')
    })

    it('should sort quotes by cost', async () => {
      const { orderService } = await import('../order.service')
      orderService.getOrderById = vi.fn().mockResolvedValue(mockOrder)

      const quotes = await shippingService.getShippingQuote(
        mockOrder.id,
        1.5,
        mockDimensions,
        'standard'
      )

      // Verify quotes are sorted by cost (ascending)
      for (let i = 1; i < quotes.length; i++) {
        expect(quotes[i].cost).toBeGreaterThanOrEqual(quotes[i - 1].cost)
      }
    })
  })

  describe('createShipment', () => {
    it('should create shipment successfully', async () => {
      const { orderService } = await import('../order.service')
      orderService.getOrderById = vi.fn().mockResolvedValue(mockOrder)
      orderService.updateOrderStatus = vi.fn()

      const shipmentData = {
        sender: mockAddress,
        recipient: mockAddress,
        weight: 1.5,
        dimensions: mockDimensions,
        serviceType: 'standard' as const,
        specialInstructions: 'Handle with care'
      }

      const result = await shippingService.createShipment(
        mockOrder.id,
        'hongkong_post',
        shipmentData
      )

      expect(orderService.getOrderById).toHaveBeenCalledWith(mockOrder.id)
      expect(orderService.updateOrderStatus).toHaveBeenCalledWith(mockOrder.id, 'SHIPPED')
      expect(result).toHaveProperty('id')
      expect(result).toHaveProperty('trackingNumber')
      expect(result.orderId).toBe(mockOrder.id)
      expect(result.provider).toBe('hongkong_post')
      expect(result.status).toBe(ShippingStatus.PENDING)
    })

    it('should throw error if order not found', async () => {
      const { orderService } = await import('../order.service')
      orderService.getOrderById = vi.fn().mockResolvedValue(null)

      const shipmentData = {
        sender: mockAddress,
        recipient: mockAddress,
        weight: 1.5,
        dimensions: mockDimensions,
        serviceType: 'standard' as const
      }

      await expect(
        shippingService.createShipment('invalid-order', 'hongkong_post', shipmentData)
      ).rejects.toThrow('Order not found')
    })

    it('should throw error if order not confirmed', async () => {
      const { orderService } = await import('../order.service')
      const pendingOrder = { ...mockOrder, status: 'PENDING' }
      orderService.getOrderById = vi.fn().mockResolvedValue(pendingOrder)

      const shipmentData = {
        sender: mockAddress,
        recipient: mockAddress,
        weight: 1.5,
        dimensions: mockDimensions,
        serviceType: 'standard' as const
      }

      await expect(
        shippingService.createShipment(mockOrder.id, 'hongkong_post', shipmentData)
      ).rejects.toThrow('Order must be confirmed before shipping')
    })

    it('should throw error for invalid provider', async () => {
      const { orderService } = await import('../order.service')
      orderService.getOrderById = vi.fn().mockResolvedValue(mockOrder)

      const shipmentData = {
        sender: mockAddress,
        recipient: mockAddress,
        weight: 1.5,
        dimensions: mockDimensions,
        serviceType: 'standard' as const
      }

      await expect(
        shippingService.createShipment(mockOrder.id, 'invalid_provider', shipmentData)
      ).rejects.toThrow('Shipping provider invalid_provider not found')
    })
  })

  describe('trackShipment', () => {
    it('should track shipment successfully', async () => {
      const { orderService } = await import('../order.service')
      orderService.getOrderById = vi.fn().mockResolvedValue(mockOrder)
      orderService.updateOrderStatus = vi.fn()

      // First create a shipment
      const shipmentData = {
        sender: mockAddress,
        recipient: mockAddress,
        weight: 1.5,
        dimensions: mockDimensions,
        serviceType: 'standard' as const
      }

      const shippingRecord = await shippingService.createShipment(
        mockOrder.id,
        'hongkong_post',
        shipmentData
      )

      // Then track it
      const trackingInfo = await shippingService.trackShipment(shippingRecord.trackingNumber)

      expect(trackingInfo).toHaveProperty('trackingNumber')
      expect(trackingInfo).toHaveProperty('status')
      expect(trackingInfo).toHaveProperty('events')
      expect(trackingInfo.trackingNumber).toBe(shippingRecord.trackingNumber)
      expect(trackingInfo.events).toBeInstanceOf(Array)
      expect(trackingInfo.events.length).toBeGreaterThan(0)
    })

    it('should throw error for invalid tracking number', async () => {
      await expect(
        shippingService.trackShipment('invalid-tracking')
      ).rejects.toThrow('Shipping record not found')
    })
  })

  describe('getShippingByOrderId', () => {
    it('should return shipping record for order', async () => {
      const { orderService } = await import('../order.service')
      orderService.getOrderById = vi.fn().mockResolvedValue(mockOrder)
      orderService.updateOrderStatus = vi.fn()

      // Create a shipment first
      const shipmentData = {
        sender: mockAddress,
        recipient: mockAddress,
        weight: 1.5,
        dimensions: mockDimensions,
        serviceType: 'standard' as const
      }

      await shippingService.createShipment(mockOrder.id, 'hongkong_post', shipmentData)

      const shippingRecord = await shippingService.getShippingByOrderId(mockOrder.id)

      expect(shippingRecord).toBeDefined()
      expect(shippingRecord?.orderId).toBe(mockOrder.id)
    })

    it('should return null for order without shipping', async () => {
      const shippingRecord = await shippingService.getShippingByOrderId('no-shipping-order')

      expect(shippingRecord).toBeNull()
    })
  })

  describe('getShippingByTrackingNumber', () => {
    it('should return shipping record by tracking number', async () => {
      const { orderService } = await import('../order.service')
      orderService.getOrderById = vi.fn().mockResolvedValue(mockOrder)
      orderService.updateOrderStatus = vi.fn()

      // Create a shipment first
      const shipmentData = {
        sender: mockAddress,
        recipient: mockAddress,
        weight: 1.5,
        dimensions: mockDimensions,
        serviceType: 'standard' as const
      }

      const createdRecord = await shippingService.createShipment(
        mockOrder.id,
        'hongkong_post',
        shipmentData
      )

      const shippingRecord = await shippingService.getShippingByTrackingNumber(
        createdRecord.trackingNumber
      )

      expect(shippingRecord).toBeDefined()
      expect(shippingRecord?.trackingNumber).toBe(createdRecord.trackingNumber)
    })

    it('should return null for invalid tracking number', async () => {
      const shippingRecord = await shippingService.getShippingByTrackingNumber('invalid-tracking')

      expect(shippingRecord).toBeNull()
    })
  })

  describe('cancelShipment', () => {
    it('should cancel shipment successfully', async () => {
      const { orderService } = await import('../order.service')
      orderService.getOrderById = vi.fn().mockResolvedValue(mockOrder)
      orderService.updateOrderStatus = vi.fn()

      // Create a shipment first
      const shipmentData = {
        sender: mockAddress,
        recipient: mockAddress,
        weight: 1.5,
        dimensions: mockDimensions,
        serviceType: 'standard' as const
      }

      const shippingRecord = await shippingService.createShipment(
        mockOrder.id,
        'hongkong_post',
        shipmentData
      )

      const success = await shippingService.cancelShipment(shippingRecord.trackingNumber)

      expect(success).toBe(true)

      // Verify status updated
      const updatedRecord = await shippingService.getShippingByTrackingNumber(
        shippingRecord.trackingNumber
      )
      expect(updatedRecord?.status).toBe(ShippingStatus.CANCELLED)
    })

    it('should throw error for delivered shipment', async () => {
      const { orderService } = await import('../order.service')
      orderService.getOrderById = vi.fn().mockResolvedValue(mockOrder)
      orderService.updateOrderStatus = vi.fn()

      // Create a shipment first
      const shipmentData = {
        sender: mockAddress,
        recipient: mockAddress,
        weight: 1.5,
        dimensions: mockDimensions,
        serviceType: 'standard' as const
      }

      const shippingRecord = await shippingService.createShipment(
        mockOrder.id,
        'hongkong_post',
        shipmentData
      )

      // Manually set status to delivered
      const record = await shippingService.getShippingByTrackingNumber(shippingRecord.trackingNumber)
      if (record) {
        record.status = ShippingStatus.DELIVERED
      }

      await expect(
        shippingService.cancelShipment(shippingRecord.trackingNumber)
      ).rejects.toThrow('Cannot cancel delivered shipment')
    })
  })

  describe('getAvailableProviders', () => {
    it('should return list of available providers', () => {
      const providers = shippingService.getAvailableProviders()

      expect(providers).toBeInstanceOf(Array)
      expect(providers.length).toBeGreaterThan(0)
      expect(providers[0]).toHaveProperty('id')
      expect(providers[0]).toHaveProperty('name')
    })
  })

  describe('validateShippingAddress', () => {
    it('should validate correct address', () => {
      const validation = shippingService.validateShippingAddress(mockAddress)

      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should reject address without name', () => {
      const invalidAddress = { ...mockAddress, name: '' }
      const validation = shippingService.validateShippingAddress(invalidAddress)

      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('Recipient name is required')
    })

    it('should reject address with invalid phone', () => {
      const invalidAddress = { ...mockAddress, phone: 'invalid' }
      const validation = shippingService.validateShippingAddress(invalidAddress)

      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('Valid phone number is required')
    })

    it('should reject address without required fields', () => {
      const invalidAddress = {
        name: 'John Doe',
        phone: '+85212345678',
        addressLine1: '',
        city: '',
        district: '',
        country: ''
      }
      const validation = shippingService.validateShippingAddress(invalidAddress)

      expect(validation.isValid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
    })
  })

  describe('calculatePackageDetails', () => {
    it('should calculate package details from order', async () => {
      const { orderService } = await import('../order.service')
      orderService.getOrderById = vi.fn().mockResolvedValue(mockOrder)

      const packageDetails = await shippingService.calculatePackageDetails(mockOrder.id)

      expect(packageDetails).toHaveProperty('weight')
      expect(packageDetails).toHaveProperty('dimensions')
      expect(packageDetails.weight).toBeGreaterThan(0)
      expect(packageDetails.dimensions.length).toBeGreaterThan(0)
      expect(packageDetails.dimensions.width).toBeGreaterThan(0)
      expect(packageDetails.dimensions.height).toBeGreaterThan(0)
    })

    it('should throw error if order not found', async () => {
      const { orderService } = await import('../order.service')
      orderService.getOrderById = vi.fn().mockResolvedValue(null)

      await expect(
        shippingService.calculatePackageDetails('invalid-order')
      ).rejects.toThrow('Order not found')
    })
  })
})