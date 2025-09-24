import { NextRequest, NextResponse } from 'next/server'
import { followService } from '@/lib/services/follow.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { ApiResponse } from '@/types'

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
    const limit = parseInt(searchParams.get('limit') || '10')

    const suggestions = await followService.getSuggestedFollows(authResult.user.id, limit)

    const response: ApiResponse = {
      success: true,
      data: suggestions
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Get follow suggestions error:', error)
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get follow suggestions'
    }

    return NextResponse.json(response, { status: 500 })
  }
}