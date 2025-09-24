import { NextRequest, NextResponse } from 'next/server'
import { productRecommendationService } from '@/lib/services/product-recommendation.service'
import { ApiResponse } from '@/types'

/**
 * POST /api/recommendations/cross-sell - Get cross-sell recommendations for cart
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productIds, limit = 5 } = body

    if (!Array.isArray(productIds)) {
      return NextResponse.json(
        { success: false, error: 'productIds must be an array' },
        { status: 400 }
      )
    }

    const recommendations = await productRecommendationService.getCrossSellRecommendations(
      productIds,
      limit
    )

    const response: ApiResponse = {
      success: true,
      data: recommendations
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching cross-sell recommendations:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch cross-sell recommendations'
    }

    return NextResponse.json(response, { status: 500 })
  }
}