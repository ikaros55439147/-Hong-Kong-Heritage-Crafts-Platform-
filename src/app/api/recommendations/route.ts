import { NextRequest, NextResponse } from 'next/server'
import { productRecommendationService } from '@/lib/services/product-recommendation.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { ApiResponse } from '@/types'

/**
 * GET /api/recommendations - Get personalized product recommendations
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    // Try to authenticate user (optional for recommendations)
    const authResult = await authMiddleware(request)
    
    let recommendations

    if (authResult.success && authResult.user) {
      // Get personalized recommendations for authenticated user
      recommendations = await productRecommendationService.getPersonalizedRecommendations(
        authResult.user.id,
        limit
      )
    } else {
      // Get trending products for anonymous users
      recommendations = await productRecommendationService.getTrendingProducts(limit)
    }

    const response: ApiResponse = {
      success: true,
      data: recommendations
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching recommendations:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch recommendations'
    }

    return NextResponse.json(response, { status: 500 })
  }
}