import { NextRequest, NextResponse } from 'next/server'
import { orderService } from '@/lib/services/order.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { validateOrderData, validateShippingAddress } from '@/lib/validations'
import { ApiResponse, OrderData, PaginationParams } from '@/types'

/**
 * GET /api/orders - Get user's orders
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authMiddleware(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    
    const pagination: PaginationParams = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10')
    }

    const result = await orderService.getOrdersByUser(authResult.user.id, pagination)

    const response: ApiResponse = {
      success: true,
      data: result
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error getting orders:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get orders'
    }

    return NextResponse.json(response, { status: 500 })
  }
}

/**
 * POST /api/orders - Create order
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
    const { fromCart, orderData } = body

    let order

    if (fromCart) {
      // Create order from cart
      const { shippingAddress } = body
      
      // Validate shipping address
      const addressValidation = validateShippingAddress(shippingAddress)
      if (!addressValidation.isValid) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid shipping address',
            details: addressValidation.errors
          },
          { status: 400 }
        )
      }

      order = await orderService.createOrderFromCart(authResult.user.id, shippingAddress)
    } else {
      // Create order from provided data
      const validation = validateOrderData(orderData)
      if (!validation.isValid) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid order data',
            details: validation.errors
          },
          { status: 400 }
        )
      }

      order = await orderService.createOrder(authResult.user.id, orderData)
    }

    const response: ApiResponse = {
      success: true,
      data: order,
      message: 'Order created successfully'
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Error creating order:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create order'
    }

    return NextResponse.json(response, { status: 500 })
  }
}