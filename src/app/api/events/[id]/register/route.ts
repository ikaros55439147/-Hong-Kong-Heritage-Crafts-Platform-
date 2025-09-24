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
    const registrationData = await request.json()

    const registration = await eventService.registerForEvent(
      eventId,
      authResult.user.id,
      registrationData
    )

    const response: ApiResponse = {
      success: true,
      data: registration,
      message: registration.status === 'CONFIRMED' 
        ? 'Successfully registered for event'
        : 'Added to waitlist for event'
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Register for event error:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to register for event'
    }

    return NextResponse.json(response, { status: 400 })
  }
}

export async function DELETE(
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
    await eventService.cancelRegistration(eventId, authResult.user.id)

    const response: ApiResponse = {
      success: true,
      message: 'Registration cancelled successfully'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Cancel registration error:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel registration'
    }

    return NextResponse.json(response, { status: 400 })
  }
}