import { NextRequest, NextResponse } from 'next/server'
import { pushNotificationService } from '@/lib/services/push-notification.service'
import { prisma } from '@/lib/database'
import { getServerSession } from 'next-auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { subscription, deviceType } = await request.json()

    // Validate subscription
    if (!pushNotificationService.validateSubscription(subscription)) {
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      )
    }

    // Store subscription in database
    await prisma.pushSubscription.upsert({
      where: {
        userId_endpoint: {
          userId: session.user.id,
          endpoint: subscription.endpoint
        }
      },
      update: {
        p256dhKey: subscription.keys.p256dh,
        authKey: subscription.keys.auth,
        deviceType: deviceType || 'web',
        updatedAt: new Date()
      },
      create: {
        userId: session.user.id,
        endpoint: subscription.endpoint,
        p256dhKey: subscription.keys.p256dh,
        authKey: subscription.keys.auth,
        deviceType: deviceType || 'web'
      }
    })

    // Send welcome notification
    await pushNotificationService.sendNotification(
      JSON.stringify(subscription),
      {
        title: '通知已啟用',
        body: '您將收到重要更新和提醒',
        icon: '/icons/notification-icon.png'
      }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Push subscription error:', error)
    return NextResponse.json(
      { error: 'Failed to subscribe to push notifications' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { endpoint } = await request.json()

    // Remove subscription from database
    await prisma.pushSubscription.delete({
      where: {
        userId_endpoint: {
          userId: session.user.id,
          endpoint
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Push unsubscription error:', error)
    return NextResponse.json(
      { error: 'Failed to unsubscribe from push notifications' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Return VAPID public key for web push
    const vapidPublicKey = pushNotificationService.getVapidPublicKey()
    
    if (!vapidPublicKey) {
      return NextResponse.json(
        { error: 'Push notifications not configured' },
        { status: 503 }
      )
    }

    return NextResponse.json({ vapidPublicKey })
  } catch (error) {
    console.error('VAPID key error:', error)
    return NextResponse.json(
      { error: 'Failed to get VAPID key' },
      { status: 500 }
    )
  }
}