import { NextRequest, NextResponse } from 'next/server'
import { paymentService } from '@/lib/services/payment.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { orderService } from '@/lib/services/order.service'
import { validatePaymentData } from '@/lib/validations'
import { ApiResponse, PaymentData } from '@/types'

/**
 * POST /api/payments - Process payment
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authMiddleware(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { orderId, paymentData } = body

    // Validate input
    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      )
    }

    // Validate payment data
    const validation = validatePaymentData(paymentData)
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid payment data',
          details: validation.errors
        },
        { status: 400 }
      )
    }

    // Verify order belongs to user
    const order = await orderService.getOrderById(orderId)
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    if (order.userId !== authResult.user.id) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    // Check if order is in valid state for payment
    if (order.status === 'CANCELLED') {
      return NextResponse.json(
        { success: false, error: 'Cannot pay for cancelled order' },
        { status: 400 }
      )
    }

    if (order.paymentStatus === 'COMPLETED') {
      return NextResponse.json(
        { success: false, error: 'Order is already paid' },
        { status: 400 }
      )
    }

    // Process payment
    const result = await paymentService.processPayment(orderId, paymentData)

    if (result.success) {
      const response: ApiResponse = {
        success: true,
        data: {
          transactionId: result.transactionId,
          orderId: orderId
        },
        message: 'Payment processed successfully'
      }

      return NextResponse.json(response)
    } else {
      const response: ApiResponse = {
        success: false,
        error: result.error || 'Payment processing failed'
      }

      return NextResponse.json(response, { status: 400 })
    }
  } catch (error) {
    console.error('Error processing payment:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Payment processing failed'
    }

    return NextResponse.json(response, { status: 500 })
  }
}

/**
 * GET /api/payments - Get supported payment methods
 */
export async function GET(request: NextRequest) {
  try {
    const methods = paymentService.getSupportedPaymentMethods()

    const response: ApiResponse = {
      success: true,
      data: {
        methods: methods.map(method => ({
          id: method,
          name: method.charAt(0).toUpperCase() + method.slice(1),
          processingFee: paymentService.calculateProcessingFee(100, method) // Example fee for $100
        }))
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error getting payment methods:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get payment methods'
    }

    return NextResponse.json(response, { status: 500 })
  }
}