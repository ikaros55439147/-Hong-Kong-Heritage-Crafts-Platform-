import { NextRequest, NextResponse } from 'next/server'
import { followService } from '@/lib/services/follow.service'
import { ApiResponse } from '@/types'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const stats = await followService.getFollowCounts(params.id)

    const response: ApiResponse = {
      success: true,
      data: stats
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Get user stats error:', error)
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get user stats'
    }

    return NextResponse.json(response, { status: 500 })
  }
}