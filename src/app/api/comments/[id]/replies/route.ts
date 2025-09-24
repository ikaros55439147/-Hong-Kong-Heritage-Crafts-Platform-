import { NextRequest, NextResponse } from 'next/server'
import { commentService } from '@/lib/services/comment.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { ApiResponse, PaginationParams } from '@/types'

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

    // Get user ID if authenticated (for like status)
    let userId: string | undefined
    try {
      const authResult = await authMiddleware(request)
      if (authResult.success && authResult.user) {
        userId = authResult.user.id
      }
    } catch (error) {
      // Not authenticated, continue without user context
    }

    const replies = await commentService.getReplies(params.id, pagination, userId)

    const response: ApiResponse = {
      success: true,
      data: replies
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Get comment replies error:', error)
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get comment replies'
    }

    return NextResponse.json(response, { status: 500 })
  }
}