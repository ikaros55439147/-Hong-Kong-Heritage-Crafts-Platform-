import { NextRequest, NextResponse } from 'next/server'
import { feedbackService } from '@/lib/services/feedback.service'
import { authMiddleware } from '@/lib/auth/middleware'

export async function POST(request: NextRequest) {
  try {
    const user = await authMiddleware(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      category,
      title,
      description,
      severity,
      page,
      screenshots,
      reproductionSteps,
      expectedBehavior,
      actualBehavior
    } = body

    // 驗證必填欄位
    if (!category || !title || !description || !severity) {
      return NextResponse.json(
        { error: 'Missing required fields: category, title, description, severity' },
        { status: 400 }
      )
    }

    // 收集用戶代理資訊
    const userAgent = request.headers.get('user-agent') || undefined

    const feedback = await feedbackService.collectFeedback({
      userId: user.id,
      category,
      title,
      description,
      severity,
      status: 'open',
      page,
      userAgent,
      screenshots,
      reproductionSteps,
      expectedBehavior,
      actualBehavior
    })

    return NextResponse.json({
      success: true,
      feedback,
      message: '感謝您的反饋！我們會盡快處理。'
    })
  } catch (error) {
    console.error('Error submitting feedback:', error)
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await authMiddleware(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const category = searchParams.get('category')
    const severity = searchParams.get('severity')
    const status = searchParams.get('status')

    let dateRange
    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate),
        end: new Date(endDate)
      }
    }

    const analytics = await feedbackService.getFeedbackAnalytics(dateRange)

    return NextResponse.json({
      success: true,
      analytics
    })
  } catch (error) {
    console.error('Error getting feedback analytics:', error)
    return NextResponse.json(
      { error: 'Failed to get feedback analytics' },
      { status: 500 }
    )
  }
}