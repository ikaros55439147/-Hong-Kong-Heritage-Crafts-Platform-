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
    const { userId, attended } = await request.json()

    if (!userId || attended === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing userId or attended status' },
        { status: 400 }
      )
    }

    const registration = await eventService.markAttendance(
      eventId,
      userId,
      authResult.user.id,
      attended
    )

    const response: ApiResponse = {
      success: true,
      data: registration,
      message: `Attendance marked as ${attended ? 'attended' : 'no-show'}`
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Mark attendance error:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to mark attendance'
    }

    return NextResponse.json(response, { status: 400 })
  }
}