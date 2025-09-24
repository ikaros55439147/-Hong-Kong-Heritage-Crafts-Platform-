import { NextRequest, NextResponse } from 'next/server'
import { paymentService } from '@/lib/services/payment.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { orderService } from '@/lib/services/order.service'
import { validateUUID } from '@/lib/validations'
import { ApiResponse } from '@/types'

/**
 * GET /api/orders/[id]/payments - Get payment records for order
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id

    // Validate order ID
    if (!validateUUID(orderId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid order ID' },
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

    // Verify order access
    const order = await orderService.getOrderById(orderId)
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
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

    const paymentRecords = await paymentService.getPaymentRecords(orderId)

    const response: ApiResponse = {
      success: true,
      data: paymentRecords
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error getting payment records:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get payment records'
    }

    return NextResponse.json(response, { status: 500 })
  }
}