import { NextRequest, NextResponse } from 'next/server'
import { paymentService } from '@/lib/services/payment.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { orderService } from '@/lib/services/order.service'
import { validateUUID } from '@/lib/validations'
import { ApiResponse } from '@/types'

/**
 * GET /api/payments/[id] - Get payment record
 */
export async function GET(
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

    const paymentRecord = await paymentService.getPaymentRecord(paymentId)

    if (!paymentRecord) {
      return NextResponse.json(
        { success: false, error: 'Payment record not found' },
        { status: 404 }
      )
    }

    // Verify user has access to this payment record
    const order = await orderService.getOrderById(paymentRecord.orderId)
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Associated order not found' },
        { status: 404 }
      )
    }

    // Check permissions
    let hasPermission = false

    if (authResult.user.role === 'ADMIN') {
      hasPermission = true
    } else if (order.userId === authResult.user.id) {
      hasPermission = true
    } else if (authResult.user.role === 'CRAFTSMAN' && authResult.user.craftsmanProfile) {
      // Check if craftsman has products in this order
      const hasProducts = order.orderItems.some(item => 
        item.product.craftsmanId === authResult.user.craftsmanProfile?.id
      )
      hasPermission = hasProducts
    }

    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    const response: ApiResponse = {
      success: true,
      data: paymentRecord
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error getting payment record:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get payment record'
    }

    return NextResponse.json(response, { status: 500 })
  }
}