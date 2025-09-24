import { NextRequest, NextResponse } from 'next/server'
import { eventService } from '@/lib/services/event.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { ApiResponse } from '@/types'

export async function GET(
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

    const eventId = params.id

    const stats = await eventService.getEventStats(eventId, authResult.user.id)

    const response: ApiResponse = {
      success: true,
      data: stats
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Get event stats error:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get event stats'
    }

    return NextResponse.json(response, { status: 500 })
  }
}