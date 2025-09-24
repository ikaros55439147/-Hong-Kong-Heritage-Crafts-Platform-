import { PrismaClient, PaymentStatus } from '@prisma/client'
import { PaymentData, PaymentResult } from '@/types'
import { orderService } from './order.service'
import Stripe from 'stripe'
import paypal from 'paypal-rest-sdk'

const prisma = new PrismaClient()

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia'
})

// Initialize PayPal
paypal.configure({
  mode: process.env.PAYPAL_MODE || 'sandbox',
  client_id: process.env.PAYPAL_CLIENT_ID || '',
  client_secret: process.env.PAYPAL_CLIENT_SECRET || ''
})

export interface PaymentRecord {
  id: string
  orderId: string
  method: string
  amount: number
  currency: string
  status: PaymentStatus
  transactionId?: string
  metadata?: any
  createdAt: Date
  updatedAt: Date
}

export interface PaymentProvider {
  processPayment(paymentData: PaymentData): Promise<PaymentResult>
  refundPayment(transactionId: string, amount: number): Promise<PaymentResult>
  getPaymentStatus(transactionId: string): Promise<PaymentStatus>
}

// Real Stripe provider
class StripeProvider implements PaymentProvider {
  async processPayment(paymentData: PaymentData): Promise<PaymentResult> {
    try {
      if (paymentData.amount <= 0) {
        throw new Error('Invalid amount')
      }

      // Create payment intent with Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(paymentData.amount * 100), // Convert to cents
        currency: paymentData.currency.toLowerCase(),
        payment_method: paymentData.paymentMethodId,
        confirm: true,
        return_url: paymentData.returnUrl || `${process.env.NEXTAUTH_URL}/payment/success`,
        metadata: {
          orderId: paymentData.orderId || '',
          ...paymentData.metadata
        }
      })

      if (paymentIntent.status === 'succeeded') {
        return {
          success: true,
          transactionId: paymentIntent.id
        }
      } else if (paymentIntent.status === 'requires_action') {
        return {
          success: false,
          error: 'Payment requires additional authentication',
          requiresAction: true,
          clientSecret: paymentIntent.client_secret
        }
      } else {
        return {
          success: false,
          error: 'Payment failed'
        }
      }
    } catch (error) {
      console.error('Stripe payment error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment processing failed'
      }
    }
  }

  async refundPayment(transactionId: string, amount: number): Promise<PaymentResult> {
    try {
      const refund = await stripe.refunds.create({
        payment_intent: transactionId,
        amount: Math.round(amount * 100) // Convert to cents
      })

      if (refund.status === 'succeeded') {
        return {
          success: true,
          transactionId: refund.id
        }
      } else {
        return {
          success: false,
          error: 'Refund failed'
        }
      }
    } catch (error) {
      console.error('Stripe refund error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Refund processing failed'
      }
    }
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentStatus> {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(transactionId)
      
      switch (paymentIntent.status) {
        case 'succeeded':
          return PaymentStatus.COMPLETED
        case 'processing':
          return PaymentStatus.PENDING
        case 'requires_payment_method':
        case 'requires_confirmation':
        case 'requires_action':
          return PaymentStatus.PENDING
        case 'canceled':
          return PaymentStatus.CANCELLED
        default:
          return PaymentStatus.FAILED
      }
    } catch (error) {
      console.error('Stripe status check error:', error)
      return PaymentStatus.FAILED
    }
  }

  async createPaymentIntent(amount: number, currency: string, metadata?: any): Promise<{ clientSecret: string; paymentIntentId: string }> {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: currency.toLowerCase(),
        metadata
      })

      return {
        clientSecret: paymentIntent.client_secret!,
        paymentIntentId: paymentIntent.id
      }
    } catch (error) {
      console.error('Stripe payment intent creation error:', error)
      throw error
    }
  }
}

// Real PayPal provider
class PayPalProvider implements PaymentProvider {
  async processPayment(paymentData: PaymentData): Promise<PaymentResult> {
    return new Promise((resolve) => {
      try {
        if (paymentData.amount <= 0) {
          throw new Error('Invalid amount')
        }

        const payment = {
          intent: 'sale',
          payer: {
            payment_method: 'paypal'
          },
          redirect_urls: {
            return_url: paymentData.returnUrl || `${process.env.NEXTAUTH_URL}/payment/success`,
            cancel_url: paymentData.cancelUrl || `${process.env.NEXTAUTH_URL}/payment/cancel`
          },
          transactions: [{
            amount: {
              currency: paymentData.currency,
              total: paymentData.amount.toFixed(2)
            },
            description: paymentData.description || 'Heritage Crafts Platform Purchase'
          }]
        }

        paypal.payment.create(payment, (error, payment) => {
          if (error) {
            console.error('PayPal payment creation error:', error)
            resolve({
              success: false,
              error: error.message || 'PayPal payment creation failed'
            })
          } else {
            const approvalUrl = payment.links?.find(link => link.rel === 'approval_url')?.href
            resolve({
              success: true,
              transactionId: payment.id!,
              approvalUrl
            })
          }
        })
      } catch (error) {
        resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Payment processing failed'
        })
      }
    })
  }

  async executePayment(paymentId: string, payerId: string): Promise<PaymentResult> {
    return new Promise((resolve) => {
      const execute_payment_json = {
        payer_id: payerId
      }

      paypal.payment.execute(paymentId, execute_payment_json, (error, payment) => {
        if (error) {
          console.error('PayPal payment execution error:', error)
          resolve({
            success: false,
            error: error.message || 'PayPal payment execution failed'
          })
        } else {
          resolve({
            success: true,
            transactionId: payment.id!
          })
        }
      })
    })
  }

  async refundPayment(transactionId: string, amount: number): Promise<PaymentResult> {
    return new Promise((resolve) => {
      try {
        // First get the payment details to find the sale transaction
        paypal.payment.get(transactionId, (error, payment) => {
          if (error) {
            resolve({
              success: false,
              error: error.message || 'Failed to retrieve payment details'
            })
            return
          }

          const saleId = payment.transactions?.[0]?.related_resources?.[0]?.sale?.id
          if (!saleId) {
            resolve({
              success: false,
              error: 'Sale transaction not found'
            })
            return
          }

          const refund_data = {
            amount: {
              currency: payment.transactions![0].amount!.currency,
              total: amount.toFixed(2)
            }
          }

          paypal.sale.refund(saleId, refund_data, (refundError, refund) => {
            if (refundError) {
              console.error('PayPal refund error:', refundError)
              resolve({
                success: false,
                error: refundError.message || 'Refund processing failed'
              })
            } else {
              resolve({
                success: true,
                transactionId: refund.id!
              })
            }
          })
        })
      } catch (error) {
        resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Refund processing failed'
        })
      }
    })
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentStatus> {
    return new Promise((resolve) => {
      paypal.payment.get(transactionId, (error, payment) => {
        if (error) {
          console.error('PayPal status check error:', error)
          resolve(PaymentStatus.FAILED)
          return
        }

        switch (payment.state) {
          case 'approved':
            resolve(PaymentStatus.COMPLETED)
            break
          case 'created':
            resolve(PaymentStatus.PENDING)
            break
          case 'cancelled':
            resolve(PaymentStatus.CANCELLED)
            break
          case 'failed':
          default:
            resolve(PaymentStatus.FAILED)
            break
        }
      })
    })
  }
}

export class PaymentService {
  private providers: Map<string, PaymentProvider> = new Map()
  private paymentRecords: Map<string, PaymentRecord> = new Map() // In-memory storage for demo

  constructor() {
    // Initialize payment providers
    this.providers.set('stripe', new StripeProvider())
    this.providers.set('paypal', new PayPalProvider())
  }

  /**
   * Process payment for order
   */
  async processPayment(orderId: string, paymentData: PaymentData): Promise<PaymentResult> {
    try {
      // Get order details
      const order = await orderService.getOrderById(orderId)
      if (!order) {
        throw new Error('Order not found')
      }

      // Validate payment amount matches order total
      if (Math.abs(paymentData.amount - Number(order.totalAmount)) > 0.01) {
        throw new Error('Payment amount does not match order total')
      }

      // Get payment provider
      const provider = this.providers.get(paymentData.method)
      if (!provider) {
        throw new Error(`Payment method ${paymentData.method} not supported`)
      }

      // Create payment record
      const paymentRecord: PaymentRecord = {
        id: `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        orderId,
        method: paymentData.method,
        amount: paymentData.amount,
        currency: paymentData.currency,
        status: PaymentStatus.PENDING,
        metadata: paymentData.metadata,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      this.paymentRecords.set(paymentRecord.id, paymentRecord)

      // Process payment with provider
      const result = await provider.processPayment(paymentData)

      if (result.success) {
        // Update payment record
        paymentRecord.status = PaymentStatus.COMPLETED
        paymentRecord.transactionId = result.transactionId
        paymentRecord.updatedAt = new Date()
        this.paymentRecords.set(paymentRecord.id, paymentRecord)

        // Update order payment status
        await orderService.updatePaymentStatus(orderId, PaymentStatus.COMPLETED)

        return {
          success: true,
          transactionId: result.transactionId
        }
      } else {
        // Update payment record
        paymentRecord.status = PaymentStatus.FAILED
        paymentRecord.updatedAt = new Date()
        this.paymentRecords.set(paymentRecord.id, paymentRecord)

        // Update order payment status
        await orderService.updatePaymentStatus(orderId, PaymentStatus.FAILED)

        return {
          success: false,
          error: result.error
        }
      }
    } catch (error) {
      console.error('Payment processing error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment processing failed'
      }
    }
  }

  /**
   * Process refund for order
   */
  async processRefund(orderId: string, amount?: number): Promise<PaymentResult> {
    try {
      // Get order details
      const order = await orderService.getOrderById(orderId)
      if (!order) {
        throw new Error('Order not found')
      }

      if (order.paymentStatus !== PaymentStatus.COMPLETED) {
        throw new Error('Order payment is not completed')
      }

      // Find payment record for this order
      const paymentRecord = Array.from(this.paymentRecords.values())
        .find(record => record.orderId === orderId && record.status === PaymentStatus.COMPLETED)

      if (!paymentRecord || !paymentRecord.transactionId) {
        throw new Error('Payment record not found')
      }

      // Use provided amount or full order amount
      const refundAmount = amount || Number(order.totalAmount)

      if (refundAmount > paymentRecord.amount) {
        throw new Error('Refund amount cannot exceed payment amount')
      }

      // Get payment provider
      const provider = this.providers.get(paymentRecord.method)
      if (!provider) {
        throw new Error(`Payment method ${paymentRecord.method} not supported`)
      }

      // Process refund with provider
      const result = await provider.refundPayment(paymentRecord.transactionId, refundAmount)

      if (result.success) {
        // Create refund record
        const refundRecord: PaymentRecord = {
          id: `refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          orderId,
          method: paymentRecord.method,
          amount: -refundAmount, // Negative amount for refund
          currency: paymentRecord.currency,
          status: PaymentStatus.REFUNDED,
          transactionId: result.transactionId,
          metadata: { originalPaymentId: paymentRecord.id },
          createdAt: new Date(),
          updatedAt: new Date()
        }

        this.paymentRecords.set(refundRecord.id, refundRecord)

        // Update order payment status
        await orderService.updatePaymentStatus(orderId, PaymentStatus.REFUNDED)

        return {
          success: true,
          transactionId: result.transactionId
        }
      } else {
        return {
          success: false,
          error: result.error
        }
      }
    } catch (error) {
      console.error('Refund processing error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Refund processing failed'
      }
    }
  }

  /**
   * Get payment records for order
   */
  async getPaymentRecords(orderId: string): Promise<PaymentRecord[]> {
    return Array.from(this.paymentRecords.values())
      .filter(record => record.orderId === orderId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  }

  /**
   * Get payment record by ID
   */
  async getPaymentRecord(paymentId: string): Promise<PaymentRecord | null> {
    return this.paymentRecords.get(paymentId) || null
  }

  /**
   * Verify payment status with provider
   */
  async verifyPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    const paymentRecord = this.paymentRecords.get(paymentId)
    if (!paymentRecord || !paymentRecord.transactionId) {
      throw new Error('Payment record not found')
    }

    const provider = this.providers.get(paymentRecord.method)
    if (!provider) {
      throw new Error(`Payment method ${paymentRecord.method} not supported`)
    }

    const status = await provider.getPaymentStatus(paymentRecord.transactionId)

    // Update local record if status changed
    if (status !== paymentRecord.status) {
      paymentRecord.status = status
      paymentRecord.updatedAt = new Date()
      this.paymentRecords.set(paymentId, paymentRecord)

      // Update order payment status if needed
      await orderService.updatePaymentStatus(paymentRecord.orderId, status)
    }

    return status
  }

  /**
   * Get supported payment methods
   */
  getSupportedPaymentMethods(): string[] {
    return Array.from(this.providers.keys())
  }

  /**
   * Calculate payment processing fee
   */
  calculateProcessingFee(amount: number, method: string): number {
    const feeRates = {
      stripe: 0.029, // 2.9%
      paypal: 0.034, // 3.4%
      alipay: 0.025, // 2.5%
      wechat_pay: 0.025 // 2.5%
    }

    const rate = feeRates[method as keyof typeof feeRates] || 0.03
    return Math.round(amount * rate * 100) / 100 // Round to 2 decimal places
  }

  /**
   * Validate payment data
   */
  validatePaymentData(paymentData: PaymentData): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!paymentData.method) {
      errors.push('Payment method is required')
    } else if (!this.providers.has(paymentData.method)) {
      errors.push(`Payment method ${paymentData.method} is not supported`)
    }

    if (!paymentData.amount || paymentData.amount <= 0) {
      errors.push('Valid payment amount is required')
    }

    if (!paymentData.currency) {
      errors.push('Currency is required')
    } else if (paymentData.currency.length !== 3) {
      errors.push('Currency must be 3 characters')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Create Stripe payment intent
   */
  async createStripePaymentIntent(amount: number, currency: string, metadata?: any): Promise<{ clientSecret: string; paymentIntentId: string }> {
    const stripeProvider = this.providers.get('stripe') as StripeProvider
    if (!stripeProvider) {
      throw new Error('Stripe provider not available')
    }
    
    return stripeProvider.createPaymentIntent(amount, currency, metadata)
  }

  /**
   * Execute PayPal payment
   */
  async executePayPalPayment(paymentId: string, payerId: string): Promise<PaymentResult> {
    const paypalProvider = this.providers.get('paypal') as PayPalProvider
    if (!paypalProvider) {
      throw new Error('PayPal provider not available')
    }
    
    return paypalProvider.executePayment(paymentId, payerId)
  }

  /**
   * Handle payment webhook (for real payment providers)
   */
  async handlePaymentWebhook(provider: string, payload: any): Promise<void> {
    try {
      console.log(`Received webhook from ${provider}:`, payload)

      // Webhook handling is now implemented in the API routes
      // /api/integrations/stripe/webhook
      // /api/integrations/paypal/webhook
    } catch (error) {
      console.error('Webhook processing error:', error)
      throw error
    }
  }
}

export const paymentService = new PaymentService()