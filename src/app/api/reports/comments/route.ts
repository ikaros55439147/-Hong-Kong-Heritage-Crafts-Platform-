import { NextRequest, NextResponse } from 'next/server'
import { commentService } from '@/lib/services/comment.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { ApiResponse, PaginationParams } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin
    if (authResult.user.role !== 'ADMIN') {
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

    const reportedComments = await commentService.getReportedComments(pagination)

    const response: ApiResponse = {
      success: true,
      data: reportedComments
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