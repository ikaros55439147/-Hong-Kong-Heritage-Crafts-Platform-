import { NextRequest, NextResponse } from 'next/server'
import { shippingService } from '@/lib/services/shipping.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { orderService } from '@/lib/services/order.service'
import { validateUUID } from '@/lib/validations'
import { ApiResponse } from '@/types'

/**
 * GET /api/orders/[id]/shipping - Get shipping information for order
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
    let hasAccess = false
    if (authResult.user.role === 'ADMIN') {
      hasAccess = true
    } else if (order.userId === authResult.user.id) {
      hasAccess = true
    } else if (authResult.user.role === 'CRAFTSMAN' && authResult.user.craftsmanProfile) {
      const hasProducts = order.orderItems.some(item => 
        item.product.craftsmanId === authResult.user.craftsmanProfile?.id
      )
      hasAccess = hasProducts
    }

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    // Get shipping information
    const shippingRecord = await shippingService.getShippingByOrderId(orderId)

    let trackingInfo = null
    if (shippingRecord) {
      try {
        trackingInfo = await shippingService.trackShipment(shippingRecord.trackingNumber)
      } catch (error) {
        console.warn('Failed to get tracking info:', error)
      }
    }

    const response: ApiResponse = {
      success: true,
      data: {
        orderId,
        shippingRecord,
        trackingInfo
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error getting order shipping info:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get shipping information'
    }

    return NextResponse.json(response, { status: 500 })
  }
}