import { NextRequest, NextResponse } from 'next/server'
import { paymentService } from '@/lib/services/payment.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { orderService } from '@/lib/services/order.service'
import { validateUUID } from '@/lib/validations'
import { ApiResponse } from '@/types'

/**
 * POST /api/payments/refund - Process refund
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
    const { orderId, amount } = body

    // Validate input
    if (!orderId || !validateUUID(orderId)) {
      return NextResponse.json(
        { success: false, error: 'Valid order ID is required' },
        { status: 400 }
      )
    }

    if (amount !== undefined && (typeof amount !== 'number' || amount <= 0)) {
      return NextResponse.json(
        { success: false, error: 'Valid refund amount is required' },
        { status: 400 }
      )
    }

    // Verify order access
    const order = await orderService.getOrderById(orderId)
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    // Check if user has permission to refund
    // Only order owner, craftsman with products in order, or admin can refund
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

    // Process refund
    const result = await paymentService.processRefund(orderId, amount)

    if (result.success) {
      const response: ApiResponse = {
        success: true,
        data: {
          transactionId: result.transactionId,
          orderId: orderId,
          refundAmount: amount || Number(order.totalAmount)
        },
        message: 'Refund processed successfully'
      }

      return NextResponse.json(response)
    } else {
      const response: ApiResponse = {
        success: false,
        error: result.error || 'Refund processing failed'
      }

      return NextResponse.json(response, { status: 400 })
    }
  } catch (error) {
    console.error('Error processing refund:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Refund processing failed'
    }

    return NextResponse.json(response, { status: 500 })
  }
}