import { NextRequest, NextResponse } from 'next/server'
import { productRecommendationService } from '@/lib/services/product-recommendation.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { ApiResponse } from '@/types'

/**
 * GET /api/products/[id]/recommendations - Get recommendations for a product page
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Try to authenticate user (optional)
    const authResult = await authMiddleware(request)
    const userId = authResult.success && authResult.user ? authResult.user.id : undefined

    const recommendations = await productRecommendationService.getProductPageRecommendations(
      params.id,
      userId
    )

    const response: ApiResponse = {
      success: true,
      data: recommendations
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching product recommendations:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch product recommendations'
    }

    return NextResponse.json(response, { status: 500 })
  }
}