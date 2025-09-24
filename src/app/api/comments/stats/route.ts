import { NextRequest, NextResponse } from 'next/server'
import { commentService } from '@/lib/services/comment.service'
import { ApiResponse } from '@/types'
import { EntityType } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const entityType = searchParams.get('entityType') as EntityType
    const entityId = searchParams.get('entityId')
    
    if (!entityType || !entityId) {
      return NextResponse.json(
        { success: false, error: 'Missing entityType or entityId' },
        { status: 400 }
      )
    }

    const stats = await commentService.getCommentStats(entityType, entityId)

    const response: ApiResponse = {
      success: true,
      data: stats
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Get comment stats error:', error)
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get comment statistics'
    }

    return NextResponse.json(response, { status: 500 })
  }
}