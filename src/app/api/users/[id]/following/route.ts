import { NextRequest, NextResponse } from 'next/server'
import { followService } from '@/lib/services/follow.service'
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
      limit: parseInt(searchParams.get('limit') || '20')
    }

    const following = await followService.getFollowing(params.id, pagination)

    const response: ApiResponse = {
      success: true,
      data: following
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Get following error:', error)
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get following'
    }

    return NextResponse.json(response, { status: 500 })
  }
}