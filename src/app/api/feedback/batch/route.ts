import { NextRequest, NextResponse } from 'next/server'
import { feedbackService } from '@/lib/services/feedback.service'
import { authMiddleware } from '@/lib/auth/middleware'

export async function POST(request: NextRequest) {
  try {
    const user = await authMiddleware(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { feedbackList } = body

    if (!Array.isArray(feedbackList) || feedbackList.length === 0) {
      return NextResponse.json(
        { error: 'Invalid feedback list' },
        { status: 400 }
      )
    }

    // 驗證每個反饋項目
    for (const feedback of feedbackList) {
      if (!feedback.category || !feedback.title || !feedback.description || !feedback.severity) {
        return NextResponse.json(
          { error: 'Each feedback item must have category, title, description, and severity' },
          { status: 400 }
        )
      }
    }

    const results = await feedbackService.collectBatchFeedback(feedbackList)

    return NextResponse.json({
      success: true,
      count: results.length,
      feedback: results,
      message: `Successfully collected ${results.length} feedback items`
    })
  } catch (error) {
    console.error('Error submitting batch feedback:', error)
    return NextResponse.json(
      { error: 'Failed to submit batch feedback' },
      { status: 500 }
    )
  }
}