import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PaymentService } from '../payment.service'
import { PaymentData } from '@/types'

// Mock dependencies
vi.mock('../order.service', () => ({
  orderService: {
    getOrderById: vi.fn(),
    updatePaymentStatus: vi.fn()
  }
}))

describe('PaymentService', () => {
  let paymentService: PaymentService
  
  const mockOrder = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    userId: '550e8400-e29b-41d4-a716-446655440001',
    totalAmount: 1500,
    status: 'PENDING',
    paymentStatus: 'PENDING',
    orderItems: []
  }

  const mockPaymentData: PaymentData = {
    method: 'stripe',
    amount: 1500,
    currency: 'HKD',
    metadata: { test: true }
  }

  beforeEach(() => {
    paymentService = new PaymentService()
    vi.clearAllMocks()
  })

  describe('processPayment', () => {
    it('should process payment successfully', async () => {
      const { orderService } = await import('../order.service')
      orderService.getOrderById = vi.fn().mockResolvedValue(mockOrder)
      orderService.updatePaymentStatus = vi.fn()

      const result = await paymentService.processPayment(mockOrder.id, mockPaymentData)

      expect(orderService.getOrderById).toHaveBeenCalledWith(mockOrder.id)
      expect(result.success).toBe(true)
      expect(result.transactionId).toBeDefined()
    })

    it('should throw error if order not found', async () => {
      const { orderService } = await import('../order.service')
      orderService.getOrderById = vi.fn().mockResolvedValue(null)

      const result = await paymentService.processPayment('invalid-order', mockPaymentData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Order not found')
    })

    it('should throw error if payment amount does not match order total', async () => {
      const { orderService } = await import('../order.service')
      orderService.getOrderById = vi.fn().mockResolvedValue(mockOrder)

      const invalidPaymentData = { ...mockPaymentData, amount: 2000 }
      const result = await paymentService.processPayment(mockOrder.id, invalidPaymentData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Payment amount does not match order total')
    })

    it('should throw error for unsupported payment method', async () => {
      const { orderService } = await import('../order.service')
      orderService.getOrderById = vi.fn().mockResolvedValue(mockOrder)

      const invalidPaymentData = { ...mockPaymentData, method: 'bitcoin' as any }
      const result = await paymentService.processPayment(mockOrder.id, invalidPaymentData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Payment method bitcoin not supported')
    })
  })

  describe('processRefund', () => {
    it('should process refund successfully', async () => {
      const { orderService } = await import('../order.service')
      const completedOrder = { ...mockOrder, paymentStatus: 'COMPLETED' }
      orderService.getOrderById = vi.fn().mockResolvedValue(completedOrder)
      orderService.updatePaymentStatus = vi.fn()

      // First process a payment to create a payment record
      await paymentService.processPayment(mockOrder.id, mockPaymentData)

      const result = await paymentService.processRefund(mockOrder.id)

      expect(result.success).toBe(true)
      expect(result.transactionId).toBeDefined()
    })

    it('should throw error if order not found', async () => {
      const { orderService } = await import('../order.service')
      orderService.getOrderById = vi.fn().mockResolvedValue(null)

      const result = await paymentService.processRefund('invalid-order')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Order not found')
    })

    it('should throw error if order payment is not completed', async () => {
      const { orderService } = await import('../order.service')
      orderService.getOrderById = vi.fn().mockResolvedValue(mockOrder)

      const result = await paymentService.processRefund(mockOrder.id)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Order payment is not completed')
    })

    it('should throw error if refund amount exceeds payment amount', async () => {
      const { orderService } = await import('../order.service')
      const completedOrder = { ...mockOrder, paymentStatus: 'COMPLETED' }
      orderService.getOrderById = vi.fn().mockResolvedValue(completedOrder)
      orderService.updatePaymentStatus = vi.fn()

      // First process a payment
      await paymentService.processPayment(mockOrder.id, mockPaymentData)

      const result = await paymentService.processRefund(mockOrder.id, 2000)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Refund amount cannot exceed payment amount')
    })
  })

  describe('getPaymentRecords', () => {
    it('should return payment records for order', async () => {
      const { orderService } = await import('../order.service')
      orderService.getOrderById = vi.fn().mockResolvedValue(mockOrder)
      orderService.updatePaymentStatus = vi.fn()

      // Process a payment first
      await paymentService.processPayment(mockOrder.id, mockPaymentData)

      const records = await paymentService.getPaymentRecords(mockOrder.id)

      expect(records).toHaveLength(1)
      expect(records[0].orderId).toBe(mockOrder.id)
      expect(records[0].method).toBe('stripe')
      expect(records[0].amount).toBe(1500)
    })

    it('should return empty array for order with no payments', async () => {
      const records = await paymentService.getPaymentRecords('no-payments-order')

      expect(records).toHaveLength(0)
    })
  })

  describe('getPaymentRecord', () => {
    it('should return payment record by ID', async () => {
      const { orderService } = await import('../order.service')
      orderService.getOrderById = vi.fn().mockResolvedValue(mockOrder)
      orderService.updatePaymentStatus = vi.fn()

      // Process a payment first
      await paymentService.processPayment(mockOrder.id, mockPaymentData)
      const records = await paymentService.getPaymentRecords(mockOrder.id)
      const paymentId = records[0].id

      const record = await paymentService.getPaymentRecord(paymentId)

      expect(record).toBeDefined()
      expect(record?.id).toBe(paymentId)
    })

    it('should return null for invalid payment ID', async () => {
      const record = await paymentService.getPaymentRecord('invalid-id')

      expect(record).toBeNull()
    })
  })

  describe('getSupportedPaymentMethods', () => {
    it('should return list of supported payment methods', () => {
      const methods = paymentService.getSupportedPaymentMethods()

      expect(methods).toContain('stripe')
      expect(methods).toContain('paypal')
      expect(methods.length).toBeGreaterThan(0)
    })
  })

  describe('calculateProcessingFee', () => {
    it('should calculate correct processing fee for stripe', () => {
      const fee = paymentService.calculateProcessingFee(1000, 'stripe')

      expect(fee).toBe(29) // 2.9% of 1000
    })

    it('should calculate correct processing fee for paypal', () => {
      const fee = paymentService.calculateProcessingFee(1000, 'paypal')

      expect(fee).toBe(34) // 3.4% of 1000
    })

    it('should use default rate for unknown payment method', () => {
      const fee = paymentService.calculateProcessingFee(1000, 'unknown')

      expect(fee).toBe(30) // 3% of 1000 (default rate)
    })
  })

  describe('validatePaymentData', () => {
    it('should validate correct payment data', () => {
      const validation = paymentService.validatePaymentData(mockPaymentData)

      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should reject payment data without method', () => {
      const invalidData = { ...mockPaymentData, method: '' as any }
      const validation = paymentService.validatePaymentData(invalidData)

      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('Payment method is required')
    })

    it('should reject unsupported payment method', () => {
      const invalidData = { ...mockPaymentData, method: 'bitcoin' as any }
      const validation = paymentService.validatePaymentData(invalidData)

      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('Payment method bitcoin is not supported')
    })

    it('should reject invalid amount', () => {
      const invalidData = { ...mockPaymentData, amount: 0 }
      const validation = paymentService.validatePaymentData(invalidData)

      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('Valid payment amount is required')
    })

    it('should reject invalid currency', () => {
      const invalidData = { ...mockPaymentData, currency: 'INVALID' }
      const validation = paymentService.validatePaymentData(invalidData)

      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('Currency must be 3 characters')
    })
  })

  describe('verifyPaymentStatus', () => {
    it('should verify payment status with provider', async () => {
      const { orderService } = await import('../order.service')
      orderService.getOrderById = vi.fn().mockResolvedValue(mockOrder)
      orderService.updatePaymentStatus = vi.fn()

      // Process a payment first
      await paymentService.processPayment(mockOrder.id, mockPaymentData)
      const records = await paymentService.getPaymentRecords(mockOrder.id)
      const paymentId = records[0].id

      const status = await paymentService.verifyPaymentStatus(paymentId)

      expect(status).toBeDefined()
      expect(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']).toContain(status)
    })

    it('should throw error for invalid payment ID', async () => {
      await expect(
        paymentService.verifyPaymentStatus('invalid-id')
      ).rejects.toThrow('Payment record not found')
    })
  })

  describe('handlePaymentWebhook', () => {
    it('should handle webhook without errors', async () => {
      const mockPayload = { event: 'payment.completed', data: {} }

      await expect(
        paymentService.handlePaymentWebhook('stripe', mockPayload)
      ).resolves.not.toThrow()
    })
  })
})