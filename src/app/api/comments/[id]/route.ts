import { NextRequest, NextResponse } from 'next/server'
import { commentService } from '@/lib/services/comment.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { ApiResponse } from '@/types'

export async function PUT(
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
    const { content } = await request.json()

    if (!content) {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400 }
      )
    }

    const comment = await commentService.updateComment(
      commentId,
      authResult.user.id,
      content
    )

    const response: ApiResponse = {
      success: true,
      data: comment,
      message: 'Comment updated successfully'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Update comment error:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update comment'
    }

    return NextResponse.json(response, { status: 400 })
  }
}

export async function DELETE(
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
    const isAdmin = authResult.user.role === 'ADMIN'

    await commentService.deleteComment(commentId, authResult.user.id, isAdmin)

    const response: ApiResponse = {
      success: true,
      message: 'Comment deleted successfully'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Delete comment error:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete comment'
    }

    return NextResponse.json(response, { status: 400 })
  }
}