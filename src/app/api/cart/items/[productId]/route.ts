import { NextRequest, NextResponse } from 'next/server'
import { cartService } from '@/lib/services/cart.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { validateUUID } from '@/lib/validations'
import { ApiResponse } from '@/types'

/**
 * PUT /api/cart/items/[productId] - Update cart item
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const productId = params.productId

    // Validate product ID
    if (!validateUUID(productId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid product ID' },
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

    const body = await request.json()
    const { quantity, customizationNotes } = body

    // Validate quantity
    if (typeof quantity !== 'number' || quantity < 0) {
      return NextResponse.json(
        { success: false, error: 'Valid quantity is required' },
        { status: 400 }
      )
    }

    const cart = await cartService.updateCartItem(
      authResult.user.id, 
      productId, 
      quantity, 
      customizationNotes
    )

    const response: ApiResponse = {
      success: true,
      data: cart,
      message: 'Cart item updated successfully'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error updating cart item:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update cart item'
    }

    return NextResponse.json(response, { status: 500 })
  }
}

/**
 * DELETE /api/cart/items/[productId] - Remove item from cart
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const productId = params.productId

    // Validate product ID
    if (!validateUUID(productId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid product ID' },
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

    const cart = await cartService.removeFromCart(authResult.user.id, productId)

    const response: ApiResponse = {
      success: true,
      data: cart,
      message: 'Item removed from cart successfully'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error removing cart item:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove cart item'
    }

    return NextResponse.json(response, { status: 500 })
  }
}