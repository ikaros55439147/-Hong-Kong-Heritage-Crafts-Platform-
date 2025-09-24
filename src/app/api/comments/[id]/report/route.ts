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
    const { reason, description } = await request.json()

    if (!reason) {
      return NextResponse.json(
        { success: false, error: 'Report reason is required' },
        { status: 400 }
      )
    }

    const report = await commentService.reportComment(
      authResult.user.id,
      commentId,
      { reason, description }
    )

    const response: ApiResponse = {
      success: true,
      data: report,
      message: 'Comment reported successfully'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Report comment error:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to report comment'
    }

    return NextResponse.json(response, { status: 400 })
  }
}