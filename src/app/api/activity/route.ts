import { NextRequest, NextResponse } from 'next/server'
import { followService } from '@/lib/services/follow.service'
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

    const { searchParams } = new URL(request.url)
    
    const pagination: PaginationParams = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20')
    }

    const activityFeed = await followService.getActivityFeed(authResult.user.id, pagination)

    const response: ApiResponse = {
      success: true,
      data: activityFeed
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Get activity feed error:', error)
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get activity feed'
    }

    return NextResponse.json(response, { status: 500 })
  }
}