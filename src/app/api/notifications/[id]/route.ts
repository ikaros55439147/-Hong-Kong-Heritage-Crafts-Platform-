import { NextRequest, NextResponse } from 'next/server'
import { notificationService } from '@/lib/services/notification.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { ApiResponse } from '@/types'

export async function PATCH(
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

    const notificationId = params.id
    const notification = await notificationService.markAsRead(
      notificationId,
      authResult.user.id
    )

    const response: ApiResponse = {
      success: true,
      data: notification,
      message: 'Notification marked as read'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Mark notification as read error:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to mark notification as read'
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

    const notificationId = params.id
    await notificationService.deleteNotification(
      notificationId,
      authResult.user.id
    )

    const response: ApiResponse = {
      success: true,
      message: 'Notification deleted'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Delete notification error:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete notification'
    }

    return NextResponse.json(response, { status: 400 })
  }
}