import { NextRequest, NextResponse } from 'next/server'
import { orderService } from '@/lib/services/order.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { validateUUID } from '@/lib/validations'
import { ApiResponse } from '@/types'

/**
 * GET /api/orders/[id] - Get order by ID
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

    const order = await orderService.getOrderById(orderId)

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    // Check if user has access to this order
    if (authResult.user.role !== 'ADMIN' && order.userId !== authResult.user.id) {
      // Check if user is a craftsman with products in this order
      const craftsmanProfile = authResult.user.craftsmanProfile
      if (!craftsmanProfile) {
        return NextResponse.json(
          { success: false, error: 'Access denied' },
          { status: 403 }
        )
      }

      const hasProducts = order.orderItems.some(item => 
        item.product.craftsmanId === craftsmanProfile.id
      )

      if (!hasProducts) {
        return NextResponse.json(
          { success: false, error: 'Access denied' },
          { status: 403 }
        )
      }
    }

    const response: ApiResponse = {
      success: true,
      data: order
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error getting order:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get order'
    }

    return NextResponse.json(response, { status: 500 })
  }
}