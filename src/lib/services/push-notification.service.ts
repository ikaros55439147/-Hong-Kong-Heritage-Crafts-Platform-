import admin from 'firebase-admin'
import webpush from 'web-push'

export interface PushNotificationData {
  title: string
  body: string
  icon?: string
  badge?: string
  image?: string
  data?: Record<string, any>
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
  tag?: string
  requireInteraction?: boolean
  silent?: boolean
}

export interface PushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export interface PushResult {
  success: boolean
  messageId?: string
  error?: string
}

export interface PushProvider {
  sendNotification(token: string, notification: PushNotificationData): Promise<PushResult>
  sendToMultiple(tokens: string[], notification: PushNotificationData): Promise<PushResult[]>
}

// Firebase Cloud Messaging provider
class FirebaseProvider implements PushProvider {
  private app: admin.app.App | null = null

  constructor() {
    try {
      if (!admin.apps.length) {
        this.app = admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL
          })
        })
      } else {
        this.app = admin.apps[0]
      }
    } catch (error) {
      console.error('Firebase initialization error:', error)
    }
  }

  async sendNotification(token: string, notification: PushNotificationData): Promise<PushResult> {
    try {
      if (!this.app) {
        throw new Error('Firebase not initialized')
      }

      const message = {
        token,
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.image
        },
        data: notification.data ? Object.fromEntries(
          Object.entries(notification.data).map(([key, value]) => [key, String(value)])
        ) : undefined,
        android: {
          notification: {
            icon: notification.icon,
            color: '#2563eb',
            tag: notification.tag,
            clickAction: 'FLUTTER_NOTIFICATION_CLICK'
          }
        },
        apns: {
          payload: {
            aps: {
              badge: notification.badge ? parseInt(notification.badge) : undefined,
              sound: notification.silent ? undefined : 'default'
            }
          }
        },
        webpush: {
          notification: {
            icon: notification.icon || '/icons/icon-192x192.png',
            badge: notification.badge || '/icons/badge-72x72.png',
            image: notification.image,
            tag: notification.tag,
            requireInteraction: notification.requireInteraction,
            silent: notification.silent,
            actions: notification.actions
          }
        }
      }

      const response = await admin.messaging().send(message)
      return {
        success: true,
        messageId: response
      }
    } catch (error) {
      console.error('Firebase push notification error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Push notification failed'
      }
    }
  }

  async sendToMultiple(tokens: string[], notification: PushNotificationData): Promise<PushResult[]> {
    try {
      if (!this.app) {
        throw new Error('Firebase not initialized')
      }

      const message = {
        tokens,
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.image
        },
        data: notification.data ? Object.fromEntries(
          Object.entries(notification.data).map(([key, value]) => [key, String(value)])
        ) : undefined,
        android: {
          notification: {
            icon: notification.icon,
            color: '#2563eb',
            tag: notification.tag
          }
        },
        webpush: {
          notification: {
            icon: notification.icon || '/icons/icon-192x192.png',
            badge: notification.badge || '/icons/badge-72x72.png',
            image: notification.image,
            tag: notification.tag,
            requireInteraction: notification.requireInteraction,
            silent: notification.silent,
            actions: notification.actions
          }
        }
      }

      const response = await admin.messaging().sendEachForMulticast(message)
      
      return response.responses.map((result, index) => ({
        success: result.success,
        messageId: result.messageId,
        error: result.error?.message
      }))
    } catch (error) {
      console.error('Firebase multicast push notification error:', error)
      return tokens.map(() => ({
        success: false,
        error: error instanceof Error ? error.message : 'Push notification failed'
      }))
    }
  }
}

// Web Push provider (using VAPID)
class WebPushProvider implements PushProvider {
  constructor() {
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      )
    }
  }

  async sendNotification(subscriptionString: string, notification: PushNotificationData): Promise<PushResult> {
    try {
      const subscription = JSON.parse(subscriptionString) as PushSubscription
      
      const payload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        icon: notification.icon || '/icons/icon-192x192.png',
        badge: notification.badge || '/icons/badge-72x72.png',
        image: notification.image,
        data: notification.data,
        actions: notification.actions,
        tag: notification.tag,
        requireInteraction: notification.requireInteraction,
        silent: notification.silent
      })

      const response = await webpush.sendNotification(subscription, payload)
      
      return {
        success: true,
        messageId: response.headers?.['x-message-id'] as string
      }
    } catch (error) {
      console.error('Web Push notification error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Push notification failed'
      }
    }
  }

  async sendToMultiple(subscriptions: string[], notification: PushNotificationData): Promise<PushResult[]> {
    const results = await Promise.allSettled(
      subscriptions.map(subscription => this.sendNotification(subscription, notification))
    )

    return results.map(result => 
      result.status === 'fulfilled' 
        ? result.value 
        : { success: false, error: result.reason?.message || 'Push notification failed' }
    )
  }
}

export class PushNotificationService {
  private provider: PushProvider

  constructor() {
    const pushService = process.env.PUSH_SERVICE || 'firebase'
    
    switch (pushService) {
      case 'web-push':
        this.provider = new WebPushProvider()
        break
      case 'firebase':
      default:
        this.provider = new FirebaseProvider()
        break
    }
  }

  /**
   * Send push notification to a single device
   */
  async sendNotification(token: string, notification: PushNotificationData): Promise<PushResult> {
    return this.provider.sendNotification(token, notification)
  }

  /**
   * Send push notification to multiple devices
   */
  async sendToMultiple(tokens: string[], notification: PushNotificationData): Promise<PushResult[]> {
    return this.provider.sendToMultiple(tokens, notification)
  }

  /**
   * Send course booking notification
   */
  async sendBookingNotification(token: string, bookingDetails: {
    courseName: string
    craftsmanName: string
    bookingDate: string
  }): Promise<PushResult> {
    return this.sendNotification(token, {
      title: '課程預約確認',
      body: `您已成功預約 ${bookingDetails.craftsmanName} 的「${bookingDetails.courseName}」課程`,
      icon: '/icons/booking-icon.png',
      data: {
        type: 'booking_confirmation',
        courseName: bookingDetails.courseName,
        craftsmanName: bookingDetails.craftsmanName,
        bookingDate: bookingDetails.bookingDate
      },
      actions: [
        {
          action: 'view',
          title: '查看詳情'
        },
        {
          action: 'calendar',
          title: '加入日曆'
        }
      ]
    })
  }

  /**
   * Send order status notification
   */
  async sendOrderStatusNotification(token: string, orderDetails: {
    orderId: string
    status: string
    trackingNumber?: string
  }): Promise<PushResult> {
    const statusMessages = {
      confirmed: '訂單已確認',
      processing: '訂單處理中',
      shipped: '訂單已出貨',
      delivered: '訂單已送達'
    }

    return this.sendNotification(token, {
      title: '訂單狀態更新',
      body: `訂單 ${orderDetails.orderId} ${statusMessages[orderDetails.status as keyof typeof statusMessages] || '狀態已更新'}`,
      icon: '/icons/order-icon.png',
      data: {
        type: 'order_status',
        orderId: orderDetails.orderId,
        status: orderDetails.status,
        trackingNumber: orderDetails.trackingNumber
      },
      actions: [
        {
          action: 'view_order',
          title: '查看訂單'
        },
        ...(orderDetails.trackingNumber ? [{
          action: 'track',
          title: '追蹤包裹'
        }] : [])
      ]
    })
  }

  /**
   * Send new follower notification
   */
  async sendFollowerNotification(token: string, followerName: string): Promise<PushResult> {
    return this.sendNotification(token, {
      title: '新的關注者',
      body: `${followerName} 開始關注您`,
      icon: '/icons/follow-icon.png',
      data: {
        type: 'new_follower',
        followerName
      },
      actions: [
        {
          action: 'view_profile',
          title: '查看檔案'
        }
      ]
    })
  }

  /**
   * Send course reminder notification
   */
  async sendCourseReminderNotification(token: string, courseDetails: {
    courseName: string
    craftsmanName: string
    startTime: string
    location?: string
  }): Promise<PushResult> {
    return this.sendNotification(token, {
      title: '課程提醒',
      body: `您的課程「${courseDetails.courseName}」將在 ${courseDetails.startTime} 開始`,
      icon: '/icons/reminder-icon.png',
      data: {
        type: 'course_reminder',
        courseName: courseDetails.courseName,
        craftsmanName: courseDetails.craftsmanName,
        startTime: courseDetails.startTime,
        location: courseDetails.location
      },
      actions: [
        {
          action: 'view_course',
          title: '查看課程'
        },
        {
          action: 'get_directions',
          title: '取得路線'
        }
      ],
      requireInteraction: true
    })
  }

  /**
   * Send craftsman status notification
   */
  async sendCraftsmanStatusNotification(token: string, status: string): Promise<PushResult> {
    const statusMessages = {
      approved: '師傅檔案已通過審核',
      rejected: '師傅檔案審核未通過',
      pending: '師傅檔案審核中'
    }

    return this.sendNotification(token, {
      title: '師傅檔案狀態更新',
      body: statusMessages[status as keyof typeof statusMessages] || '檔案狀態已更新',
      icon: '/icons/craftsman-icon.png',
      data: {
        type: 'craftsman_status',
        status
      },
      actions: [
        {
          action: 'view_profile',
          title: '查看檔案'
        }
      ]
    })
  }

  /**
   * Send promotional notification
   */
  async sendPromotionalNotification(tokens: string[], promotion: {
    title: string
    description: string
    imageUrl?: string
    actionUrl?: string
  }): Promise<PushResult[]> {
    return this.sendToMultiple(tokens, {
      title: promotion.title,
      body: promotion.description,
      image: promotion.imageUrl,
      icon: '/icons/promotion-icon.png',
      data: {
        type: 'promotion',
        actionUrl: promotion.actionUrl
      },
      actions: promotion.actionUrl ? [
        {
          action: 'view_promotion',
          title: '查看詳情'
        }
      ] : undefined
    })
  }

  /**
   * Get VAPID public key for web push subscriptions
   */
  getVapidPublicKey(): string | null {
    return process.env.VAPID_PUBLIC_KEY || null
  }

  /**
   * Validate push subscription
   */
  validateSubscription(subscription: any): boolean {
    try {
      return !!(
        subscription &&
        subscription.endpoint &&
        subscription.keys &&
        subscription.keys.p256dh &&
        subscription.keys.auth
      )
    } catch {
      return false
    }
  }
}

export const pushNotificationService = new PushNotificationService()