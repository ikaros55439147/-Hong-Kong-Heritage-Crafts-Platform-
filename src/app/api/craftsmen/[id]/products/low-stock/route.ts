import { NextRequest, NextResponse } from 'next/server'
import { productService } from '@/lib/services/product.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { validateUUID } from '@/lib/validations'
import { ApiResponse } from '@/types'

/**
 * GET /api/craftsmen/[id]/products/low-stock - Get low stock products for craftsman
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const craftsmanId = params.id

    // Validate craftsman ID
    if (!validateUUID(craftsmanId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid craftsman ID' },
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

    // Check if user is the craftsman or admin
    const craftsmanProfile = authResult.user.craftsmanProfile
    if (authResult.user.role !== 'ADMIN' && 
        (!craftsmanProfile || craftsmanProfile.id !== craftsmanId)) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const threshold = parseInt(searchParams.get('threshold') || '5')

    const products = await productService.getLowStockProducts(craftsmanId, threshold)

    const response: ApiResponse = {
      success: true,
      data: products
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error getting low stock products:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get low stock products'
    }

    return NextResponse.json(response, { status: 500 })
  }
}