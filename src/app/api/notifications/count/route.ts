import { NextRequest, NextResponse } from 'next/server'
import { notificationService } from '@/lib/services/notification.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { ApiResponse } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const unreadCount = await notificationService.getUnreadCount(authResult.user.id)

    const response: ApiResponse = {
      success: true,
      data: { unreadCount }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Get unread count error:', error)
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get unread count'
    }

    return NextResponse.json(response, { status: 500 })
  }
}