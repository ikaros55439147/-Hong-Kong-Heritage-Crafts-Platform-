import { NextRequest, NextResponse } from 'next/server'
import { feedbackService } from '@/lib/services/feedback.service'
import { authMiddleware } from '@/lib/auth/middleware'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authMiddleware(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { status, resolution, assignedTo } = body

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      )
    }

    const validStatuses = ['open', 'in_progress', 'resolved', 'closed']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    const updatedFeedback = await feedbackService.updateFeedbackStatus(
      params.id,
      status,
      resolution,
      assignedTo
    )

    return NextResponse.json({
      success: true,
      feedback: updatedFeedback,
      message: 'Feedback status updated successfully'
    })
  } catch (error) {
    console.error('Error updating feedback:', error)
    return NextResponse.json(
      { error: 'Failed to update feedback' },
      { status: 500 }
    )
  }
}