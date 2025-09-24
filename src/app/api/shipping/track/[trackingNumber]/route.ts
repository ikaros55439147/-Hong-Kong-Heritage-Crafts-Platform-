import { NextRequest, NextResponse } from 'next/server'
import { shippingService } from '@/lib/services/shipping.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { orderService } from '@/lib/services/order.service'
import { ApiResponse } from '@/types'

/**
 * GET /api/shipping/track/[trackingNumber] - Track shipment
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { trackingNumber: string } }
) {
  try {
    const trackingNumber = params.trackingNumber

    if (!trackingNumber) {
      return NextResponse.json(
        { success: false, error: 'Tracking number is required' },
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

    // Get shipping record to verify access
    const shippingRecord = await shippingService.getShippingByTrackingNumber(trackingNumber)
    if (!shippingRecord) {
      return NextResponse.json(
        { success: false, error: 'Shipment not found' },
        { status: 404 }
      )
    }

    // Verify user has access to this shipment
    const order = await orderService.getOrderById(shippingRecord.orderId)
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Associated order not found' },
        { status: 404 }
      )
    }

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

    // Track shipment
    const trackingInfo = await shippingService.trackShipment(trackingNumber)

    const response: ApiResponse = {
      success: true,
      data: {
        ...trackingInfo,
        shippingRecord
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error tracking shipment:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to track shipment'
    }

    return NextResponse.json(response, { status: 500 })
  }
}