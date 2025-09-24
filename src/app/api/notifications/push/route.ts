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

    const { notificationData } = await request.json()
    
    if (!notificationData) {
      return NextResponse.json(
        { success: false, error: 'Notification data is required' },
        { status: 400 }
      )
    }

    // Send push notification
    await notificationService.sendPushNotification(authResult.user.id, notificationData)

    const response: ApiResponse = {
      success: true,
      message: 'Push notification sent'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Send push notification error:', error)
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to send push notification'
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

    const { subscription } = await request.json()
    
    if (!subscription) {
      return NextResponse.json(
        { success: false, error: 'Push subscription is required' },
        { status: 400 }
      )
    }

    // Store push subscription for the user
    // In a real implementation, you would store this in the database
    console.log('Push subscription registered for user:', authResult.user.id, subscription)

    const response: ApiResponse = {
      success: true,
      message: 'Push subscription registered'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Register push subscription error:', error)
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to register push subscription'
    }

    return NextResponse.json(response, { status: 500 })
  }
}