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

    // Send email notification
    await notificationService.sendEmailNotification(authResult.user.id, notificationData)

    const response: ApiResponse = {
      success: true,
      message: 'Email notification sent'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Send email notification error:', error)
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to send email notification'
    }

    return NextResponse.json(response, { status: 500 })
  }
}

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
    const type = searchParams.get('type') as any
    const language = searchParams.get('language') || 'zh-HK'

    if (!type) {
      return NextResponse.json(
        { success: false, error: 'Notification type is required' },
        { status: 400 }
      )
    }

    // Get email template preview
    const template = (notificationService as any).getEmailTemplate(type, language)

    const response: ApiResponse = {
      success: true,
      data: template
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Get email template error:', error)
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get email template'
    }

    return NextResponse.json(response, { status: 500 })
  }
}