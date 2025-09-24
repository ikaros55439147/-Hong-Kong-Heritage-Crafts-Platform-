import { NextRequest, NextResponse } from 'next/server'
import { cartService } from '@/lib/services/cart.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { ApiResponse } from '@/types'

/**
 * GET /api/cart - Get user's cart
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

    const cart = await cartService.getCart(authResult.user.id)

    const response: ApiResponse = {
      success: true,
      data: cart
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error getting cart:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get cart'
    }

    return NextResponse.json(response, { status: 500 })
  }
}

/**
 * POST /api/cart - Add item to cart
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
    const { productId, quantity, customizationNotes } = body

    // Validate input
    if (!productId || typeof productId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      )
    }

    if (!quantity || typeof quantity !== 'number' || quantity <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid quantity is required' },
        { status: 400 }
      )
    }

    const cart = await cartService.addToCart(
      authResult.user.id, 
      productId, 
      quantity, 
      customizationNotes
    )

    const response: ApiResponse = {
      success: true,
      data: cart,
      message: 'Item added to cart successfully'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error adding to cart:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add item to cart'
    }

    return NextResponse.json(response, { status: 500 })
  }
}

/**
 * DELETE /api/cart - Clear cart
 */
export async function DELETE(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authMiddleware(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    await cartService.clearCart(authResult.user.id)

    const response: ApiResponse = {
      success: true,
      message: 'Cart cleared successfully'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error clearing cart:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clear cart'
    }

    return NextResponse.json(response, { status: 500 })
  }
}