import { NextRequest, NextResponse } from 'next/server'
import { notificationService } from '@/lib/services/notification.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { ApiResponse, PaginationParams } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    
    const pagination: PaginationParams = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20')
    }

    const unreadOnly = searchParams.get('unread') === 'true'

    const notifications = await notificationService.getUserNotifications(
      authResult.user.id,
      pagination,
      unreadOnly
    )

    const response: ApiResponse = {
      success: true,
      data: notifications
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Get notifications error:', error)
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get notifications'
    }

    return NextResponse.json(response, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { action } = await request.json()

    if (action === 'mark_all_read') {
      const count = await notificationService.markAllAsRead(authResult.user.id)
      
      const response: ApiResponse = {
        success: true,
        data: { markedCount: count },
        message: 'All notifications marked as read'
      }

      return NextResponse.json(response)
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Update notifications error:', error)
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to update notifications'
    }

    return NextResponse.json(response, { status: 500 })
  }
}