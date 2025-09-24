import { NextRequest, NextResponse } from 'next/server'
import { productReviewService } from '@/lib/services/product-review.service'
import { ApiResponse } from '@/types'

/**
 * GET /api/products/[id]/reviews/stats - Get review statistics for a product
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const stats = await productReviewService.getProductReviewStatistics(params.id)

    const response: ApiResponse = {
      success: true,
      data: stats
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching product review statistics:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch product review statistics'
    }

    return NextResponse.json(response, { status: 500 })
  }
}