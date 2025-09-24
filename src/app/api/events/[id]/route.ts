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
    const eventId = params.id

    const event = await eventService.getEvent(eventId, authResult.user?.id)

    const response: ApiResponse = {
      success: true,
      data: event
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Get event error:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get event'
    }

    return NextResponse.json(response, { status: 404 })
  }
}

export async function PUT(
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
    const updates = await request.json()

    // Convert date strings to Date objects if present
    if (updates.startDateTime) {
      updates.startDateTime = new Date(updates.startDateTime)
    }
    if (updates.endDateTime) {
      updates.endDateTime = new Date(updates.endDateTime)
    }

    // Validate dates if both are provided
    if (updates.startDateTime && updates.endDateTime) {
      if (updates.startDateTime >= updates.endDateTime) {
        return NextResponse.json(
          { success: false, error: 'End time must be after start time' },
          { status: 400 }
        )
      }
    }

    const event = await eventService.updateEvent(eventId, authResult.user.id, updates)

    const response: ApiResponse = {
      success: true,
      data: event,
      message: 'Event updated successfully'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Update event error:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update event'
    }

    return NextResponse.json(response, { status: 400 })
  }
}