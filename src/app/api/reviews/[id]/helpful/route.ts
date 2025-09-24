import { NextRequest, NextResponse } from 'next/server'
import { productReviewService } from '@/lib/services/product-review.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { ApiResponse } from '@/types'

/**
 * POST /api/reviews/[id]/helpful - Mark a review as helpful/unhelpful
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { isHelpful } = body

    if (typeof isHelpful !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'isHelpful must be a boolean' },
        { status: 400 }
      )
    }

    await productReviewService.markReviewHelpful(params.id, authResult.user.id, isHelpful)

    const response: ApiResponse = {
      success: true,
      message: 'Review helpfulness updated successfully'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error updating review helpfulness:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update review helpfulness'
    }

    return NextResponse.json(response, { status: 500 })
  }
}