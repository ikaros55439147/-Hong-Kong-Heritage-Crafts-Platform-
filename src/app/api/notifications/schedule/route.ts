import { NextRequest, NextResponse } from 'next/server'
import { notificationService } from '@/lib/services/notification.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { ApiResponse } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { userId, notificationData, scheduledFor } = await request.json()
    
    if (!userId || !notificationData || !scheduledFor) {
      return NextResponse.json(
        { success: false, error: 'userId, notificationData, and scheduledFor are required' },
        { status: 400 }
      )
    }

    const scheduledDate = new Date(scheduledFor)
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid scheduledFor date' },
        { status: 400 }
      )
    }

    // Schedule notification
    await notificationService.scheduleNotification(userId, notificationData, scheduledDate)

    const response: ApiResponse = {
      success: true,
      message: 'Notification scheduled successfully'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Schedule notification error:', error)
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to schedule notification'
    }

    return NextResponse.json(response, { status: 500 })
  }
}