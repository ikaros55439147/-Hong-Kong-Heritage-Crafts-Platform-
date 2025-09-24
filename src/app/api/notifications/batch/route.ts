import { NextRequest, NextResponse } from 'next/server'
import { notificationService } from '@/lib/services/notification.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { ApiResponse } from '@/types'
import { UserRole } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admins can send batch notifications
    if (authResult.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { success: false, error: 'Admin permissions required' },
        { status: 403 }
      )
    }

    const { notifications, batchSize } = await request.json()
    
    if (!notifications || !Array.isArray(notifications)) {
      return NextResponse.json(
        { success: false, error: 'Notifications array is required' },
        { status: 400 }
      )
    }

    // Validate notification structure
    for (const notification of notifications) {
      if (!notification.userId || !notification.notificationData) {
        return NextResponse.json(
          { success: false, error: 'Each notification must have userId and notificationData' },
          { status: 400 }
        )
      }
    }

    // Send batch notifications
    await notificationService.sendBatchNotifications(notifications, batchSize || 50)

    const response: ApiResponse = {
      success: true,
      message: `Batch notifications sent to ${notifications.length} users`
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Send batch notifications error:', error)
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to send batch notifications'
    }

    return NextResponse.json(response, { status: 500 })
  }
}