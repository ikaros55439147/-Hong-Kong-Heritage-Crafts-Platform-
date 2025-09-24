import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import { PaymentService } from '../services/payment.service'
import { OrderService } from '../services/order.service'

const prisma = new PrismaClient()

// Mock Stripe
vi.mock('stripe', () => ({
  default: vi.fn(() => ({
    paymentIntents: {
      create: vi.fn(),
      retrieve: vi.fn(),
      confirm: vi.fn()
    },
    refunds: {
      create: vi.fn()
    },
    webhooks: {
      constructEvent: vi.fn()
    }
  }))
}))

describe('Payment Flow Integration Tests', () => {
  let paymentService: PaymentService
  let orderService: OrderService
  let testUser: any
  let testCraftsman: any
  let testProduct: any
  let testOrder: any

  beforeAll(async () => {
    await prisma.$connect()
    paymentService = new PaymentService()
    orderService = new OrderService()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    // Clean up test data
    await prisma.orderItem.deleteMany()
    await prisma.order.deleteMany()
    await prisma.product.deleteMany()
    await prisma.craftsmanProfile.deleteMany()
    await prisma.user.deleteMany()

    // Create test users
    testUser = await prisma.user.create({
      data: {
        email: 'customer@example.com',
        passwordHash: await hash('password123', 12),
        role: 'learner',
        preferredLanguage: 'zh-HK'
      }
    })

    testCraftsman = await prisma.user.create({
      data: {
        email: 'craftsman@example.com',
        passwordHash: await hash('password123', 12),
        role: 'craftsman',
        preferredLanguage: 'zh-HK'
      }
    })

    const craftsmanProfile = await prisma.craftsmanProfile.create({
      data: {
        userId: testCraftsman.id,
        craftSpecialties: ['mahjong'],
        bio: { 'zh-HK': '測試師傅' },
        experienceYears: 15
      }
    })

    testProduct = await prisma.product.create({
      data: {
        craftsmanId: craftsmanProfile.id,
        name: { 'zh-HK': '手工麻將' },
        description: { 'zh-HK': '純手工雕刻麻將' },
        price: 2000,
        inventoryQuantity: 10,
        craftCategory: 'mahjong'
      }
    })

    testOrder = await prisma.order.create({
      data: {
        userId: testUser.id,
        totalAmount: 4000,
        status: 'pending',
        paymentStatus: 'pending',
        shippingAddress: {
          name: '測試客戶',
          address: '香港中環皇后大道中1號',
          phone: '12345678'
        }
      }
    })

    await prisma.orderItem.create({
      data: {
        orderId: testOrder.id,
        productId: testProduct.id,
        quantity: 2,
        price: 2000
      }
    })
  })

  describe('Payment Creation and Processing', () => {
    it('should create payment intent successfully', async () => {
      const mockPaymentIntent = {
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret',
        amount: 4000,
        currency: 'hkd',
        status: 'requires_payment_method'
      }

      // Mock Stripe payment intent creation
      vi.mocked(paymentService['stripe'].paymentIntents.create).mockResolvedValue(mockPaymentIntent as any)

      const paymentData = {
        orderId: testOrder.id,
        amount: 4000,
        currency: 'HKD',
        paymentMethod: 'stripe'
      }

      const result = await paymentService.createPayment(paymentData)

      expect(result).toHaveProperty('paymentIntentId', 'pi_test_123')
      expect(result).toHaveProperty('clientSecret', 'pi_test_123_secret')
      expect(result.status).toBe('pending')

      // Verify payment record created in database
      const payment = await prisma.payment.findFirst({
        where: { orderId: testOrder.id }
      })

      expect(payment).toBeDefined()
      expect(payment?.amount).toBe(4000)
      expect(payment?.status).toBe('pending')
    })

    it('should handle payment confirmation', async () => {
      // Create initial payment
      const payment = await prisma.payment.create({
        data: {
          orderId: testOrder.id,
          amount: 4000,
          currency: 'HKD',
          paymentMethod: 'stripe',
          paymentIntentId: 'pi_test_123',
          status: 'pending'
        }
      })

      const mockConfirmedPayment = {
        id: 'pi_test_123',
        status: 'succeeded',
        amount: 4000,
        currency: 'hkd'
      }

      vi.mocked(paymentService['stripe'].paymentIntents.retrieve).mockResolvedValue(mockConfirmedPayment as any)

      const result = await paymentService.confirmPayment(payment.id)

      expect(result.status).toBe('completed')

      // Verify database updates
      const updatedPayment = await prisma.payment.findUnique({
        where: { id: payment.id }
      })
      expect(updatedPayment?.status).toBe('completed')

      const updatedOrder = await prisma.order.findUnique({
        where: { id: testOrder.id }
      })
      expect(updatedOrder?.paymentStatus).toBe('completed')
      expect(updatedOrder?.status).toBe('processing')
    })

    it('should handle payment failure', async () => {
      const payment = await prisma.payment.create({
        data: {
          orderId: testOrder.id,
          amount: 4000,
          currency: 'HKD',
          paymentMethod: 'stripe',
          paymentIntentId: 'pi_test_failed',
          status: 'pending'
        }
      })

      const mockFailedPayment = {
        id: 'pi_test_failed',
        status: 'payment_failed',
        last_payment_error: {
          message: 'Your card was declined.'
        }
      }

      vi.mocked(paymentService['stripe'].paymentIntents.retrieve).mockResolvedValue(mockFailedPayment as any)

      const result = await paymentService.confirmPayment(payment.id)

      expect(result.status).toBe('failed')
      expect(result.errorMessage).toContain('declined')

      // Verify database updates
      const updatedPayment = await prisma.payment.findUnique({
        where: { id: payment.id }
      })
      expect(updatedPayment?.status).toBe('failed')

      const updatedOrder = await prisma.order.findUnique({
        where: { id: testOrder.id }
      })
      expect(updatedOrder?.paymentStatus).toBe('failed')
    })
  })

  describe('Refund Processing', () => {
    it('should process full refund successfully', async () => {
      // Create completed payment
      const payment = await prisma.payment.create({
        data: {
          orderId: testOrder.id,
          amount: 4000,
          currency: 'HKD',
          paymentMethod: 'stripe',
          paymentIntentId: 'pi_test_refund',
          status: 'completed'
        }
      })

      await prisma.order.update({
        where: { id: testOrder.id },
        data: {
          paymentStatus: 'completed',
          status: 'processing'
        }
      })

      const mockRefund = {
        id: 're_test_123',
        amount: 4000,
        currency: 'hkd',
        status: 'succeeded',
        payment_intent: 'pi_test_refund'
      }

      vi.mocked(paymentService['stripe'].refunds.create).mockResolvedValue(mockRefund as any)

      const refundData = {
        paymentId: payment.id,
        amount: 4000,
        reason: 'Customer requested cancellation'
      }

      const result = await paymentService.processRefund(refundData)

      expect(result.status).toBe('completed')
      expect(result.refundId).toBe('re_test_123')

      // Verify refund record created
      const refund = await prisma.refund.findFirst({
        where: { paymentId: payment.id }
      })

      expect(refund).toBeDefined()
      expect(refund?.amount).toBe(4000)
      expect(refund?.status).toBe('completed')

      // Verify order status updated
      const updatedOrder = await prisma.order.findUnique({
        where: { id: testOrder.id }
      })
      expect(updatedOrder?.status).toBe('refunded')
    })

    it('should process partial refund', async () => {
      const payment = await prisma.payment.create({
        data: {
          orderId: testOrder.id,
          amount: 4000,
          currency: 'HKD',
          paymentMethod: 'stripe',
          paymentIntentId: 'pi_test_partial',
          status: 'completed'
        }
      })

      const mockPartialRefund = {
        id: 're_test_partial',
        amount: 2000,
        currency: 'hkd',
        status: 'succeeded',
        payment_intent: 'pi_test_partial'
      }

      vi.mocked(paymentService['stripe'].refunds.create).mockResolvedValue(mockPartialRefund as any)

      const refundData = {
        paymentId: payment.id,
        amount: 2000,
        reason: 'Partial cancellation'
      }

      const result = await paymentService.processRefund(refundData)

      expect(result.status).toBe('completed')
      expect(result.amount).toBe(2000)

      // Order should remain in processing status for partial refund
      const updatedOrder = await prisma.order.findUnique({
        where: { id: testOrder.id }
      })
      expect(updatedOrder?.status).toBe('processing')
    })
  })

  describe('Inventory Management During Payment', () => {
    it('should lock inventory during payment processing', async () => {
      const initialInventory = testProduct.inventoryQuantity

      // Create payment (should lock inventory)
      const paymentData = {
        orderId: testOrder.id,
        amount: 4000,
        currency: 'HKD',
        paymentMethod: 'stripe'
      }

      await paymentService.createPayment(paymentData)

      // Verify inventory is locked
      const updatedProduct = await prisma.product.findUnique({
        where: { id: testProduct.id }
      })
      expect(updatedProduct?.inventoryQuantity).toBe(initialInventory - 2) // 2 items ordered
    })

    it('should release inventory on payment failure', async () => {
      const initialInventory = testProduct.inventoryQuantory

      // Create and fail payment
      const payment = await prisma.payment.create({
        data: {
          orderId: testOrder.id,
          amount: 4000,
          currency: 'HKD',
          paymentMethod: 'stripe',
          paymentIntentId: 'pi_test_fail_inventory',
          status: 'pending'
        }
      })

      // Lock inventory
      await prisma.product.update({
        where: { id: testProduct.id },
        data: {
          inventoryQuantity: {
            decrement: 2
          }
        }
      })

      // Simulate payment failure
      await paymentService.handlePaymentFailure(payment.id)

      // Verify inventory is released
      const updatedProduct = await prisma.product.findUnique({
        where: { id: testProduct.id }
      })
      expect(updatedProduct?.inventoryQuantity).toBe(initialInventory)
    })
  })

  describe('Webhook Processing', () => {
    it('should handle Stripe webhook events', async () => {
      const payment = await prisma.payment.create({
        data: {
          orderId: testOrder.id,
          amount: 4000,
          currency: 'HKD',
          paymentMethod: 'stripe',
          paymentIntentId: 'pi_webhook_test',
          status: 'pending'
        }
      })

      const mockWebhookEvent = {
        id: 'evt_test_webhook',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_webhook_test',
            status: 'succeeded',
            amount: 4000
          }
        }
      }

      vi.mocked(paymentService['stripe'].webhooks.constructEvent).mockReturnValue(mockWebhookEvent as any)

      const webhookPayload = JSON.stringify(mockWebhookEvent)
      const webhookSignature = 'test_signature'

      const result = await paymentService.handleWebhook(webhookPayload, webhookSignature)

      expect(result.processed).toBe(true)

      // Verify payment status updated
      const updatedPayment = await prisma.payment.findUnique({
        where: { id: payment.id }
      })
      expect(updatedPayment?.status).toBe('completed')
    })

    it('should handle duplicate webhook events', async () => {
      const payment = await prisma.payment.create({
        data: {
          orderId: testOrder.id,
          amount: 4000,
          currency: 'HKD',
          paymentMethod: 'stripe',
          paymentIntentId: 'pi_duplicate_test',
          status: 'completed' // Already processed
        }
      })

      const mockWebhookEvent = {
        id: 'evt_duplicate_test',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_duplicate_test',
            status: 'succeeded'
          }
        }
      }

      vi.mocked(paymentService['stripe'].webhooks.constructEvent).mockReturnValue(mockWebhookEvent as any)

      const result = await paymentService.handleWebhook(
        JSON.stringify(mockWebhookEvent),
        'test_signature'
      )

      expect(result.processed).toBe(false)
      expect(result.reason).toContain('already processed')
    })
  })

  describe('Payment Security Tests', () => {
    it('should validate payment amounts', async () => {
      const invalidPaymentData = {
        orderId: testOrder.id,
        amount: -100, // Invalid negative amount
        currency: 'HKD',
        paymentMethod: 'stripe'
      }

      await expect(
        paymentService.createPayment(invalidPaymentData)
      ).rejects.toThrow('Invalid payment amount')
    })

    it('should prevent payment amount tampering', async () => {
      const paymentData = {
        orderId: testOrder.id,
        amount: 100, // Much less than order total
        currency: 'HKD',
        paymentMethod: 'stripe'
      }

      await expect(
        paymentService.createPayment(paymentData)
      ).rejects.toThrow('Payment amount does not match order total')
    })

    it('should validate currency codes', async () => {
      const invalidCurrencyData = {
        orderId: testOrder.id,
        amount: 4000,
        currency: 'INVALID',
        paymentMethod: 'stripe'
      }

      await expect(
        paymentService.createPayment(invalidCurrencyData)
      ).rejects.toThrow('Invalid currency code')
    })
  })

  describe('Course Booking Payment Flow', () => {
    it('should handle course booking payment', async () => {
      // Create course booking
      const course = await prisma.course.create({
        data: {
          craftsmanId: (await prisma.craftsmanProfile.findFirst())!.id,
          title: { 'zh-HK': '付費課程' },
          craftCategory: 'mahjong',
          maxParticipants: 10,
          price: 500
        }
      })

      const booking = await prisma.booking.create({
        data: {
          userId: testUser.id,
          courseId: course.id,
          status: 'pending_payment'
        }
      })

      // Create payment for booking
      const paymentData = {
        bookingId: booking.id,
        amount: 500,
        currency: 'HKD',
        paymentMethod: 'stripe'
      }

      const mockPaymentIntent = {
        id: 'pi_booking_test',
        client_secret: 'pi_booking_test_secret',
        status: 'succeeded'
      }

      vi.mocked(paymentService['stripe'].paymentIntents.create).mockResolvedValue(mockPaymentIntent as any)

      const result = await paymentService.createBookingPayment(paymentData)

      expect(result.status).toBe('completed')

      // Verify booking status updated
      const updatedBooking = await prisma.booking.findUnique({
        where: { id: booking.id }
      })
      expect(updatedBooking?.status).toBe('confirmed')
    })
  })
})