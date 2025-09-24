import { NextRequest, NextResponse } from 'next/server'
import { commentService } from '@/lib/services/comment.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { ApiResponse } from '@/types'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authMiddleware(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const commentId = params.id

    const result = await commentService.toggleLike(
      authResult.user.id,
      'COMMENT',
      commentId
    )

    const response: ApiResponse = {
      success: true,
      data: result,
      message: result.isLiked ? 'Comment liked' : 'Comment unliked'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Toggle comment like error:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to toggle like'
    }

    return NextResponse.json(response, { status: 400 })
  }
}