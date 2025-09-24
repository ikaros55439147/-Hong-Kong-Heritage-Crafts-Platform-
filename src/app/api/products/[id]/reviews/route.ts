import { NextRequest, NextResponse } from 'next/server'
import { productReviewService } from '@/lib/services/product-review.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { ApiResponse, ProductReviewData, PaginationParams } from '@/types'

/**
 * GET /api/products/[id]/reviews - Get reviews for a product
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    
    const pagination: PaginationParams = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10')
    }

    const filters = {
      rating: searchParams.get('rating') ? parseInt(searchParams.get('rating')!) : undefined,
      verifiedOnly: searchParams.get('verifiedOnly') === 'true',
      sortBy: (searchParams.get('sortBy') as 'newest' | 'oldest' | 'rating_high' | 'rating_low' | 'helpful') || 'newest'
    }

    const result = await productReviewService.getProductReviews(params.id, pagination, filters)

    const response: ApiResponse = {
      success: true,
      data: result
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching product reviews:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch product reviews'
    }

    return NextResponse.json(response, { status: 500 })
  }
}

/**
 * POST /api/products/[id]/reviews - Create a review for a product
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
    const reviewData: ProductReviewData = {
      ...body,
      productId: params.id
    }

    const review = await productReviewService.createReview(authResult.user.id, reviewData)

    const response: ApiResponse = {
      success: true,
      data: review,
      message: 'Review created successfully'
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Error creating product review:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create product review'
    }

    return NextResponse.json(response, { status: 500 })
  }
}