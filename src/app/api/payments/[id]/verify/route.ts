import { NextRequest, NextResponse } from 'next/server'
import { paymentService } from '@/lib/services/payment.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { orderService } from '@/lib/services/order.service'
import { ApiResponse } from '@/types'

/**
 * POST /api/payments/[id]/verify - Verify payment status with provider
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const paymentId = params.id

    // Validate payment ID
    if (!paymentId) {
      return NextResponse.json(
        { success: false, error: 'Payment ID is required' },
        { status: 400 }
      )
    }

    // Authenticate user
    const authResult = await authMiddleware(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Only admin or craftsman can verify payments
    if (authResult.user.role !== 'ADMIN' && authResult.user.role !== 'CRAFTSMAN') {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    const paymentRecord = await paymentService.getPaymentRecord(paymentId)

    if (!paymentRecord) {
      return NextResponse.json(
        { success: false, error: 'Payment record not found' },
        { status: 404 }
      )
    }

    // For craftsman, verify they have products in the order
    if (authResult.user.role === 'CRAFTSMAN' && authResult.user.craftsmanProfile) {
      const order = await orderService.getOrderById(paymentRecord.orderId)
      if (!order) {
        return NextResponse.json(
          { success: false, error: 'Associated order not found' },
          { status: 404 }
        )
      }

      const hasProducts = order.orderItems.some(item => 
        item.product.craftsmanId === authResult.user.craftsmanProfile?.id
      )

      if (!hasProducts) {
        return NextResponse.json(
          { success: false, error: 'Access denied' },
          { status: 403 }
        )
      }
    }

    // Verify payment status with provider
    const status = await paymentService.verifyPaymentStatus(paymentId)

    const response: ApiResponse = {
      success: true,
      data: {
        paymentId,
        status,
        verifiedAt: new Date()
      },
      message: 'Payment status verified successfully'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error verifying payment:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to verify payment'
    }

    return NextResponse.json(response, { status: 500 })
  }
}