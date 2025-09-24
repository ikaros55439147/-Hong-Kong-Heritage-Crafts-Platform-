import { NextRequest, NextResponse } from 'next/server'
import { eventService } from '@/lib/services/event.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { ApiResponse } from '@/types'

export async function POST(
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

    const event = await eventService.publishEvent(eventId, authResult.user.id)

    const response: ApiResponse = {
      success: true,
      data: event,
      message: 'Event published successfully'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Publish event error:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to publish event'
    }

    return NextResponse.json(response, { status: 400 })
  }
}