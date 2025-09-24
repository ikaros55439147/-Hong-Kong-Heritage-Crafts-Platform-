import { NextRequest, NextResponse } from 'next/server'
import { productRecommendationService } from '@/lib/services/product-recommendation.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { ApiResponse } from '@/types'
import { InteractionType } from '@prisma/client'

/**
 * POST /api/interactions/track - Track user product interaction
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
    const { productId, interactionType, interactionData } = body

    if (!productId || !interactionType) {
      return NextResponse.json(
        { success: false, error: 'productId and interactionType are required' },
        { status: 400 }
      )
    }

    // Validate interaction type
    if (!Object.values(InteractionType).includes(interactionType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid interaction type' },
        { status: 400 }
      )
    }

    await productRecommendationService.trackInteraction(
      authResult.user.id,
      productId,
      interactionType,
      interactionData
    )

    const response: ApiResponse = {
      success: true,
      message: 'Interaction tracked successfully'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error tracking interaction:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to track interaction'
    }

    return NextResponse.json(response, { status: 500 })
  }
}