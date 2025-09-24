import { NextRequest, NextResponse } from 'next/server'
import { commentService } from '@/lib/services/comment.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { ApiResponse, PaginationParams } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { commentId, reason, description } = await request.json()

    if (!commentId || !reason) {
      return NextResponse.json(
        { success: false, error: 'Missing commentId or reason' },
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

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Report comment error:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to report comment'
    }

    return NextResponse.json(response, { status: 400 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request)
    if (!authResult.success || !authResult.user || authResult.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    
    const pagination: PaginationParams = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20')
    }

    const reports = await commentService.getReportedComments(pagination)

    const response: ApiResponse = {
      success: true,
      data: reports
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Get reported comments error:', error)
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get reported comments'
    }

    return NextResponse.json(response, { status: 500 })
  }
}