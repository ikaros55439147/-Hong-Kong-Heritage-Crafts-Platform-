import { NextRequest, NextResponse } from 'next/server'
import { commentService } from '@/lib/services/comment.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { ApiResponse } from '@/types'
import { EntityType } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { entityType, entityId } = await request.json()

    if (!entityType || !entityId) {
      return NextResponse.json(
        { success: false, error: 'Missing entityType or entityId' },
        { status: 400 }
      )
    }

    const result = await commentService.toggleLike(
      authResult.user.id,
      entityType as EntityType,
      entityId
    )

    const response: ApiResponse = {
      success: true,
      data: result,
      message: result.isLiked ? 'Liked successfully' : 'Unliked successfully'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Toggle like error:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to toggle like'
    }

    return NextResponse.json(response, { status: 400 })
  }
}