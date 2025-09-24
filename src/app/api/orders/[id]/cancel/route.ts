import { NextRequest, NextResponse } from 'next/server'
import { orderService } from '@/lib/services/order.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { validateUUID } from '@/lib/validations'
import { ApiResponse } from '@/types'

/**
 * POST /api/orders/[id]/cancel - Cancel order
 */
export async function POST(
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

    // Cancel order (service will check permissions)
    const order = await orderService.cancelOrder(orderId, authResult.user.id)

    const response: ApiResponse = {
      success: true,
      data: order,
      message: 'Order cancelled successfully'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error cancelling order:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel order'
    }

    return NextResponse.json(response, { status: 500 })
  }
}