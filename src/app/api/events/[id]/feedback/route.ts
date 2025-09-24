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
    const { feedback, rating } = await request.json()

    if (!feedback || !rating) {
      return NextResponse.json(
        { success: false, error: 'Missing feedback or rating' },
        { status: 400 }
      )
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    const registration = await eventService.submitFeedback(
      eventId,
      authResult.user.id,
      feedback,
      rating
    )

    const response: ApiResponse = {
      success: true,
      data: registration,
      message: 'Feedback submitted successfully'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Submit feedback error:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit feedback'
    }

    return NextResponse.json(response, { status: 400 })
  }
}