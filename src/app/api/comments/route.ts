import { NextRequest, NextResponse } from 'next/server'
import { commentService } from '@/lib/services/comment.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { ApiResponse, PaginationParams } from '@/types'
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

    const { entityType, entityId, content, parentId } = await request.json()

    if (!entityType || !entityId || !content) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const comment = await commentService.createComment(
      authResult.user.id,
      entityType as EntityType,
      entityId,
      { content, parentId }
    )

    const response: ApiResponse = {
      success: true,
      data: comment,
      message: 'Comment created successfully'
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Create comment error:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create comment'
    }

    return NextResponse.json(response, { status: 400 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request)
    const { searchParams } = new URL(request.url)
    
    const entityType = searchParams.get('entityType') as EntityType
    const entityId = searchParams.get('entityId')
    
    if (!entityType || !entityId) {
      return NextResponse.json(
        { success: false, error: 'Missing entityType or entityId' },
        { status: 400 }
      )
    }

    const pagination: PaginationParams = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20')
    }

    const comments = await commentService.getComments(
      entityType,
      entityId,
      pagination,
      authResult.user?.id
    )

    const response: ApiResponse = {
      success: true,
      data: comments
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Get comments error:', error)
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get comments'
    }

    return NextResponse.json(response, { status: 500 })
  }
}