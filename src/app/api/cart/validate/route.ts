import { NextRequest, NextResponse } from 'next/server'
import { cartService } from '@/lib/services/cart.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { ApiResponse } from '@/types'

/**
 * GET /api/cart/validate - Validate cart before checkout
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

    const validation = await cartService.validateCart(authResult.user.id)

    const response: ApiResponse = {
      success: true,
      data: validation
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error validating cart:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to validate cart'
    }

    return NextResponse.json(response, { status: 500 })
  }
}