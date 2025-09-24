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

    const preferences = await notificationService.getNotificationPreferences(authResult.user.id)

    const response: ApiResponse = {
      success: true,
      data: preferences
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Get notification preferences error:', error)
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get notification preferences'
    }

    return NextResponse.json(response, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const updates = await request.json()
    
    // Validate the updates
    const validFields = [
      'emailNotifications',
      'pushNotifications', 
      'newFollowerNotify',
      'courseUpdateNotify',
      'productUpdateNotify',
      'orderStatusNotify',
      'craftsmanStatusNotify',
      'eventNotify',
      'commentNotify',
      'likeNotify',
      'reminderNotify',
      'marketingNotify'
    ]
    
    const filteredUpdates: any = {}
    Object.keys(updates).forEach(key => {
      if (validFields.includes(key) && typeof updates[key] === 'boolean') {
        filteredUpdates[key] = updates[key]
      }
    })
    
    const preferences = await notificationService.updateNotificationPreferences(
      authResult.user.id,
      filteredUpdates
    )

    const response: ApiResponse = {
      success: true,
      data: preferences,
      message: 'Notification preferences updated'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Update notification preferences error:', error)
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to update notification preferences'
    }

    return NextResponse.json(response, { status: 500 })
  }
}