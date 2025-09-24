import { NextRequest, NextResponse } from 'next/server'
import { shippingService } from '@/lib/services/shipping.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { orderService } from '@/lib/services/order.service'
import { validateUUID } from '@/lib/validations'
import { ApiResponse } from '@/types'

/**
 * POST /api/shipping/quote - Get shipping quotes for order
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
    const { orderId, weight, dimensions, serviceType } = body

    // Validate input
    if (!orderId || !validateUUID(orderId)) {
      return NextResponse.json(
        { success: false, error: 'Valid order ID is required' },
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

    // Check if user has access to this order
    let hasAccess = false
    if (authResult.user.role === 'ADMIN') {
      hasAccess = true
    } else if (order.userId === authResult.user.id) {
      hasAccess = true
    } else if (authResult.user.role === 'CRAFTSMAN' && authResult.user.craftsmanProfile) {
      // Check if craftsman has products in this order
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

    // Use provided dimensions/weight or calculate from order
    let packageDetails
    if (weight && dimensions) {
      // Validate provided dimensions
      if (typeof weight !== 'number' || weight <= 0) {
        return NextResponse.json(
          { success: false, error: 'Valid weight is required' },
          { status: 400 }
        )
      }

      if (!dimensions.length || !dimensions.width || !dimensions.height ||
          dimensions.length <= 0 || dimensions.width <= 0 || dimensions.height <= 0) {
        return NextResponse.json(
          { success: false, error: 'Valid dimensions are required' },
          { status: 400 }
        )
      }

      packageDetails = { weight, dimensions }
    } else {
      // Calculate from order items
      packageDetails = await shippingService.calculatePackageDetails(orderId)
    }

    // Get shipping quotes
    const quotes = await shippingService.getShippingQuote(
      orderId,
      packageDetails.weight,
      packageDetails.dimensions,
      serviceType || 'standard'
    )

    const response: ApiResponse = {
      success: true,
      data: {
        orderId,
        packageDetails,
        quotes
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error getting shipping quotes:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get shipping quotes'
    }

    return NextResponse.json(response, { status: 500 })
  }
}