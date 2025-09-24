import { prisma } from '@/lib/database'
import { Notification, NotificationPreference, NotificationType, VerificationStatus } from '@prisma/client'
import { PaginationParams, PaginationResult, MultiLanguageContent } from '@/types'

export interface NotificationData {
  type: NotificationType
  title: MultiLanguageContent
  message: MultiLanguageContent
  metadata?: Record<string, any>
}

export interface NotificationPreferenceData {
  emailNotifications?: boolean
  pushNotifications?: boolean
  newFollowerNotify?: boolean
  courseUpdateNotify?: boolean
  productUpdateNotify?: boolean
  orderStatusNotify?: boolean
  craftsmanStatusNotify?: boolean
  eventNotify?: boolean
  commentNotify?: boolean
  likeNotify?: boolean
  reminderNotify?: boolean
  marketingNotify?: boolean
}

export interface EmailTemplate {
  subject: MultiLanguageContent
  htmlContent: MultiLanguageContent
  textContent: MultiLanguageContent
}

export interface PushNotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  data?: Record<string, any>
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
}

export class NotificationService {
  /**
   * Create a notification for a user
   */
  async createNotification(
    userId: string,
    notificationData: NotificationData
  ): Promise<Notification> {
    // Check user's notification preferences
    const preferences = await this.getNotificationPreferences(userId)
    
    // Check if user wants this type of notification
    const shouldNotify = this.shouldSendNotification(notificationData.type, preferences)
    
    if (!shouldNotify) {
      throw new Error('User has disabled this type of notification')
    }

    return await prisma.notification.create({
      data: {
        userId,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        metadata: notificationData.metadata
      }
    })
  }

  /**
   * Create notifications for multiple users
   */
  async createBulkNotifications(
    userIds: string[],
    notificationData: NotificationData
  ): Promise<Notification[]> {
    const notifications: Notification[] = []

    for (const userId of userIds) {
      try {
        const notification = await this.createNotification(userId, notificationData)
        notifications.push(notification)
      } catch (error) {
        // Continue with other users if one fails
        console.warn(`Failed to create notification for user ${userId}:`, error)
      }
    }

    return notifications
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(
    userId: string,
    pagination: PaginationParams = {},
    unreadOnly: boolean = false
  ): Promise<PaginationResult<Notification>> {
    const { page = 1, limit = 20 } = pagination
    const skip = (page - 1) * limit

    const where = {
      userId,
      ...(unreadOnly && { isRead: false })
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.notification.count({ where })
    ])

    return {
      data: notifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId
      }
    })

    if (!notification) {
      throw new Error('Notification not found')
    }

    return await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true }
    })
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false
      },
      data: { isRead: true }
    })

    return result.count
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId
      }
    })

    if (!notification) {
      throw new Error('Notification not found')
    }

    await prisma.notification.delete({
      where: { id: notificationId }
    })
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    return await prisma.notification.count({
      where: {
        userId,
        isRead: false
      }
    })
  }

  /**
   * Get or create notification preferences for a user
   */
  async getNotificationPreferences(userId: string): Promise<NotificationPreference> {
    let preferences = await prisma.notificationPreference.findUnique({
      where: { userId }
    })

    if (!preferences) {
      preferences = await prisma.notificationPreference.create({
        data: { userId }
      })
    }

    return preferences
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(
    userId: string,
    updates: NotificationPreferenceData
  ): Promise<NotificationPreference> {
    return await prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        ...updates
      },
      update: updates
    })
  }

  /**
   * Check if user should receive a specific type of notification
   */
  private shouldSendNotification(
    type: NotificationType,
    preferences: NotificationPreference
  ): boolean {
    switch (type) {
      case 'NEW_FOLLOWER':
        return preferences.newFollowerNotify
      case 'COURSE_UPDATE':
      case 'COURSE_REMINDER':
        return preferences.courseUpdateNotify
      case 'PRODUCT_UPDATE':
        return preferences.productUpdateNotify
      case 'BOOKING_CONFIRMED':
      case 'BOOKING_CANCELLED':
      case 'ORDER_STATUS_UPDATE':
      case 'PAYMENT_RECEIVED':
        return preferences.orderStatusNotify
      case 'ACTIVITY_UPDATE':
        return preferences.craftsmanStatusNotify
      default:
        return true
    }
  }

  /**
   * Send notification when craftsman verification status changes
   */
  async notifyCraftsmanStatusChange(
    craftsmanUserId: string,
    oldStatus: VerificationStatus,
    newStatus: VerificationStatus,
    adminNotes?: string
  ): Promise<void> {
    const statusMessages = {
      PENDING: {
        'zh-HK': '審核中',
        'zh-CN': '审核中',
        'en': 'Under Review'
      },
      VERIFIED: {
        'zh-HK': '已驗證',
        'zh-CN': '已验证',
        'en': 'Verified'
      },
      REJECTED: {
        'zh-HK': '已拒絕',
        'zh-CN': '已拒绝',
        'en': 'Rejected'
      }
    }

    const notificationData: NotificationData = {
      type: 'ACTIVITY_UPDATE',
      title: {
        'zh-HK': '師傅認證狀態更新',
        'zh-CN': '师傅认证状态更新',
        'en': 'Craftsman Verification Status Update'
      },
      message: {
        'zh-HK': `您的師傅認證狀態已從「${statusMessages[oldStatus]['zh-HK']}」更新為「${statusMessages[newStatus]['zh-HK']}」`,
        'zh-CN': `您的师傅认证状态已从「${statusMessages[oldStatus]['zh-CN']}」更新为「${statusMessages[newStatus]['zh-CN']}」`,
        'en': `Your craftsman verification status has been updated from "${statusMessages[oldStatus]['en']}" to "${statusMessages[newStatus]['en']}"`
      },
      metadata: {
        oldStatus,
        newStatus,
        adminNotes,
        timestamp: new Date().toISOString()
      }
    }

    await this.createNotification(craftsmanUserId, notificationData)

    // Send email notification if enabled
    const preferences = await this.getNotificationPreferences(craftsmanUserId)
    if (preferences.emailNotifications && preferences.craftsmanStatusNotify) {
      await this.sendEmailNotification(craftsmanUserId, notificationData)
    }

    // Send push notification if enabled
    if (preferences.pushNotifications && preferences.craftsmanStatusNotify) {
      await this.sendPushNotification(craftsmanUserId, notificationData)
    }
  }

  /**
   * Send real-time push notification
   */
  async sendPushNotification(
    userId: string,
    notificationData: NotificationData
  ): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        throw new Error('User not found')
      }

      const language = user.preferredLanguage || 'zh-HK'
      
      const payload: PushNotificationPayload = {
        title: typeof notificationData.title === 'string' 
          ? notificationData.title 
          : notificationData.title[language] || notificationData.title['zh-HK'],
        body: typeof notificationData.message === 'string'
          ? notificationData.message
          : notificationData.message[language] || notificationData.message['zh-HK'],
        icon: '/icons/notification-icon.png',
        badge: '/icons/badge-icon.png',
        data: {
          type: notificationData.type,
          metadata: notificationData.metadata,
          url: this.getNotificationUrl(notificationData.type, notificationData.metadata)
        },
        actions: [
          {
            action: 'view',
            title: language === 'en' ? 'View' : '查看',
            icon: '/icons/view-icon.png'
          },
          {
            action: 'dismiss',
            title: language === 'en' ? 'Dismiss' : '忽略',
            icon: '/icons/dismiss-icon.png'
          }
        ]
      }

      // Here you would integrate with a push notification service like Firebase FCM
      // For now, we'll log the payload
      console.log('Push notification payload:', payload)
      
      // TODO: Implement actual push notification sending
      // await this.pushNotificationProvider.send(userId, payload)
      
    } catch (error) {
      console.error('Failed to send push notification:', error)
      // Don't throw error to avoid breaking the main notification flow
    }
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(
    userId: string,
    notificationData: NotificationData
  ): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        throw new Error('User not found')
      }

      const language = user.preferredLanguage || 'zh-HK'
      const template = this.getEmailTemplate(notificationData.type, language)
      
      const emailData = {
        to: user.email,
        subject: typeof notificationData.title === 'string'
          ? notificationData.title
          : notificationData.title[language] || notificationData.title['zh-HK'],
        html: this.renderEmailTemplate(template.htmlContent[language], {
          userName: user.email,
          title: typeof notificationData.title === 'string'
            ? notificationData.title
            : notificationData.title[language] || notificationData.title['zh-HK'],
          message: typeof notificationData.message === 'string'
            ? notificationData.message
            : notificationData.message[language] || notificationData.message['zh-HK'],
          actionUrl: this.getNotificationUrl(notificationData.type, notificationData.metadata),
          metadata: notificationData.metadata
        }),
        text: this.renderEmailTemplate(template.textContent[language], {
          userName: user.email,
          title: typeof notificationData.title === 'string'
            ? notificationData.title
            : notificationData.title[language] || notificationData.title['zh-HK'],
          message: typeof notificationData.message === 'string'
            ? notificationData.message
            : notificationData.message[language] || notificationData.message['zh-HK'],
          actionUrl: this.getNotificationUrl(notificationData.type, notificationData.metadata),
          metadata: notificationData.metadata
        })
      }

      // Here you would integrate with an email service like SendGrid, AWS SES, etc.
      console.log('Email notification data:', emailData)
      
      // TODO: Implement actual email sending
      // await this.emailProvider.send(emailData)
      
    } catch (error) {
      console.error('Failed to send email notification:', error)
      // Don't throw error to avoid breaking the main notification flow
    }
  }

  /**
   * Get email template for notification type
   */
  private getEmailTemplate(type: NotificationType, language: string): EmailTemplate {
    const templates: Record<NotificationType, EmailTemplate> = {
      NEW_FOLLOWER: {
        subject: {
          'zh-HK': '新關注者通知',
          'zh-CN': '新关注者通知',
          'en': 'New Follower Notification'
        },
        htmlContent: {
          'zh-HK': `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>您有新的關注者！</h2>
              <p>{{message}}</p>
              <a href="{{actionUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">查看詳情</a>
            </div>
          `,
          'zh-CN': `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>您有新的关注者！</h2>
              <p>{{message}}</p>
              <a href="{{actionUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">查看详情</a>
            </div>
          `,
          'en': `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>You have a new follower!</h2>
              <p>{{message}}</p>
              <a href="{{actionUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Details</a>
            </div>
          `
        },
        textContent: {
          'zh-HK': '您有新的關注者！{{message}} 查看詳情：{{actionUrl}}',
          'zh-CN': '您有新的关注者！{{message}} 查看详情：{{actionUrl}}',
          'en': 'You have a new follower! {{message}} View details: {{actionUrl}}'
        }
      },
      ACTIVITY_UPDATE: {
        subject: {
          'zh-HK': '狀態更新通知',
          'zh-CN': '状态更新通知',
          'en': 'Status Update Notification'
        },
        htmlContent: {
          'zh-HK': `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>{{title}}</h2>
              <p>{{message}}</p>
              <a href="{{actionUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">查看詳情</a>
            </div>
          `,
          'zh-CN': `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>{{title}}</h2>
              <p>{{message}}</p>
              <a href="{{actionUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">查看详情</a>
            </div>
          `,
          'en': `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>{{title}}</h2>
              <p>{{message}}</p>
              <a href="{{actionUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Details</a>
            </div>
          `
        },
        textContent: {
          'zh-HK': '{{title}} {{message}} 查看詳情：{{actionUrl}}',
          'zh-CN': '{{title}} {{message}} 查看详情：{{actionUrl}}',
          'en': '{{title}} {{message}} View details: {{actionUrl}}'
        }
      },
      COURSE_UPDATE: {
        subject: {
          'zh-HK': '課程更新通知',
          'zh-CN': '课程更新通知',
          'en': 'Course Update Notification'
        },
        htmlContent: {
          'zh-HK': `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>課程更新</h2>
              <p>{{message}}</p>
              <a href="{{actionUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">查看課程</a>
            </div>
          `,
          'zh-CN': `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>课程更新</h2>
              <p>{{message}}</p>
              <a href="{{actionUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">查看课程</a>
            </div>
          `,
          'en': `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Course Update</h2>
              <p>{{message}}</p>
              <a href="{{actionUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Course</a>
            </div>
          `
        },
        textContent: {
          'zh-HK': '課程更新：{{message}} 查看課程：{{actionUrl}}',
          'zh-CN': '课程更新：{{message}} 查看课程：{{actionUrl}}',
          'en': 'Course Update: {{message}} View course: {{actionUrl}}'
        }
      },
      PRODUCT_UPDATE: {
        subject: {
          'zh-HK': '產品更新通知',
          'zh-CN': '产品更新通知',
          'en': 'Product Update Notification'
        },
        htmlContent: {
          'zh-HK': `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>產品更新</h2>
              <p>{{message}}</p>
              <a href="{{actionUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">查看產品</a>
            </div>
          `,
          'zh-CN': `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>产品更新</h2>
              <p>{{message}}</p>
              <a href="{{actionUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">查看产品</a>
            </div>
          `,
          'en': `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Product Update</h2>
              <p>{{message}}</p>
              <a href="{{actionUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Product</a>
            </div>
          `
        },
        textContent: {
          'zh-HK': '產品更新：{{message}} 查看產品：{{actionUrl}}',
          'zh-CN': '产品更新：{{message}} 查看产品：{{actionUrl}}',
          'en': 'Product Update: {{message}} View product: {{actionUrl}}'
        }
      },
      BOOKING_CONFIRMED: {
        subject: {
          'zh-HK': '預約確認通知',
          'zh-CN': '预约确认通知',
          'en': 'Booking Confirmation'
        },
        htmlContent: {
          'zh-HK': `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>預約已確認</h2>
              <p>{{message}}</p>
              <a href="{{actionUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">查看預約</a>
            </div>
          `,
          'zh-CN': `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>预约已确认</h2>
              <p>{{message}}</p>
              <a href="{{actionUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">查看预约</a>
            </div>
          `,
          'en': `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Booking Confirmed</h2>
              <p>{{message}}</p>
              <a href="{{actionUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Booking</a>
            </div>
          `
        },
        textContent: {
          'zh-HK': '預約已確認：{{message}} 查看預約：{{actionUrl}}',
          'zh-CN': '预约已确认：{{message}} 查看预约：{{actionUrl}}',
          'en': 'Booking Confirmed: {{message}} View booking: {{actionUrl}}'
        }
      },
      BOOKING_CANCELLED: {
        subject: {
          'zh-HK': '預約取消通知',
          'zh-CN': '预约取消通知',
          'en': 'Booking Cancellation'
        },
        htmlContent: {
          'zh-HK': `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>預約已取消</h2>
              <p>{{message}}</p>
              <a href="{{actionUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">查看詳情</a>
            </div>
          `,
          'zh-CN': `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>预约已取消</h2>
              <p>{{message}}</p>
              <a href="{{actionUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">查看详情</a>
            </div>
          `,
          'en': `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Booking Cancelled</h2>
              <p>{{message}}</p>
              <a href="{{actionUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Details</a>
            </div>
          `
        },
        textContent: {
          'zh-HK': '預約已取消：{{message}} 查看詳情：{{actionUrl}}',
          'zh-CN': '预约已取消：{{message}} 查看详情：{{actionUrl}}',
          'en': 'Booking Cancelled: {{message}} View details: {{actionUrl}}'
        }
      },
      ORDER_STATUS_UPDATE: {
        subject: {
          'zh-HK': '訂單狀態更新',
          'zh-CN': '订单状态更新',
          'en': 'Order Status Update'
        },
        htmlContent: {
          'zh-HK': `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>訂單狀態更新</h2>
              <p>{{message}}</p>
              <a href="{{actionUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">查看訂單</a>
            </div>
          `,
          'zh-CN': `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>订单状态更新</h2>
              <p>{{message}}</p>
              <a href="{{actionUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">查看订单</a>
            </div>
          `,
          'en': `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Order Status Update</h2>
              <p>{{message}}</p>
              <a href="{{actionUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Order</a>
            </div>
          `
        },
        textContent: {
          'zh-HK': '訂單狀態更新：{{message}} 查看訂單：{{actionUrl}}',
          'zh-CN': '订单状态更新：{{message}} 查看订单：{{actionUrl}}',
          'en': 'Order Status Update: {{message}} View order: {{actionUrl}}'
        }
      },
      PAYMENT_RECEIVED: {
        subject: {
          'zh-HK': '付款確認通知',
          'zh-CN': '付款确认通知',
          'en': 'Payment Confirmation'
        },
        htmlContent: {
          'zh-HK': `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>付款已確認</h2>
              <p>{{message}}</p>
              <a href="{{actionUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">查看詳情</a>
            </div>
          `,
          'zh-CN': `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>付款已确认</h2>
              <p>{{message}}</p>
              <a href="{{actionUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">查看详情</a>
            </div>
          `,
          'en': `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Payment Confirmed</h2>
              <p>{{message}}</p>
              <a href="{{actionUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Details</a>
            </div>
          `
        },
        textContent: {
          'zh-HK': '付款已確認：{{message}} 查看詳情：{{actionUrl}}',
          'zh-CN': '付款已确认：{{message}} 查看详情：{{actionUrl}}',
          'en': 'Payment Confirmed: {{message}} View details: {{actionUrl}}'
        }
      },
      COURSE_REMINDER: {
        subject: {
          'zh-HK': '課程提醒',
          'zh-CN': '课程提醒',
          'en': 'Course Reminder'
        },
        htmlContent: {
          'zh-HK': `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>課程提醒</h2>
              <p>{{message}}</p>
              <a href="{{actionUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">查看課程</a>
            </div>
          `,
          'zh-CN': `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>课程提醒</h2>
              <p>{{message}}</p>
              <a href="{{actionUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">查看课程</a>
            </div>
          `,
          'en': `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Course Reminder</h2>
              <p>{{message}}</p>
              <a href="{{actionUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Course</a>
            </div>
          `
        },
        textContent: {
          'zh-HK': '課程提醒：{{message}} 查看課程：{{actionUrl}}',
          'zh-CN': '课程提醒：{{message}} 查看课程：{{actionUrl}}',
          'en': 'Course Reminder: {{message}} View course: {{actionUrl}}'
        }
      }
    }

    return templates[type] || templates.ACTIVITY_UPDATE
  }

  /**
   * Render email template with variables
   */
  private renderEmailTemplate(template: string, variables: Record<string, any>): string {
    let rendered = template
    
    Object.keys(variables).forEach(key => {
      const value = variables[key]
      const placeholder = `{{${key}}}`
      rendered = rendered.replace(new RegExp(placeholder, 'g'), String(value))
    })
    
    return rendered
  }

  /**
   * Get notification URL based on type and metadata
   */
  private getNotificationUrl(type: NotificationType, metadata?: Record<string, any>): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    
    switch (type) {
      case 'NEW_FOLLOWER':
        return `${baseUrl}/profile/followers`
      case 'COURSE_UPDATE':
      case 'COURSE_REMINDER':
        return metadata?.courseId ? `${baseUrl}/courses/${metadata.courseId}` : `${baseUrl}/courses`
      case 'PRODUCT_UPDATE':
        return metadata?.productId ? `${baseUrl}/products/${metadata.productId}` : `${baseUrl}/products`
      case 'BOOKING_CONFIRMED':
      case 'BOOKING_CANCELLED':
        return metadata?.bookingId ? `${baseUrl}/bookings/${metadata.bookingId}` : `${baseUrl}/bookings`
      case 'ORDER_STATUS_UPDATE':
      case 'PAYMENT_RECEIVED':
        return metadata?.orderId ? `${baseUrl}/orders/${metadata.orderId}` : `${baseUrl}/orders`
      case 'ACTIVITY_UPDATE':
        return `${baseUrl}/profile/craftsman`
      default:
        return `${baseUrl}/notifications`
    }
  }

  /**
   * Send batch notifications with rate limiting
   */
  async sendBatchNotifications(
    notifications: Array<{
      userId: string
      notificationData: NotificationData
    }>,
    batchSize: number = 50
  ): Promise<void> {
    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize)
      
      await Promise.all(
        batch.map(async ({ userId, notificationData }) => {
          try {
            await this.createNotification(userId, notificationData)
          } catch (error) {
            console.error(`Failed to send notification to user ${userId}:`, error)
          }
        })
      )
      
      // Add delay between batches to avoid overwhelming the system
      if (i + batchSize < notifications.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
  }

  /**
   * Schedule notification for future delivery
   */
  async scheduleNotification(
    userId: string,
    notificationData: NotificationData,
    scheduledFor: Date
  ): Promise<void> {
    // In a real implementation, you would use a job queue like Bull or Agenda
    // For now, we'll use setTimeout for demonstration
    const delay = scheduledFor.getTime() - Date.now()
    
    if (delay > 0) {
      setTimeout(async () => {
        try {
          await this.createNotification(userId, notificationData)
        } catch (error) {
          console.error('Failed to send scheduled notification:', error)
        }
      }, delay)
    } else {
      // If scheduled time is in the past, send immediately
      await this.createNotification(userId, notificationData)
    }
  }

  /**
   * Send notification when someone follows a user
   */
  async notifyNewFollower(followedUserId: string, followerUserId: string): Promise<void> {
    const follower = await prisma.user.findUnique({
      where: { id: followerUserId }
    })

    if (!follower) {
      throw new Error('Follower not found')
    }

    const notificationData: NotificationData = {
      type: 'NEW_FOLLOWER',
      title: {
        'zh-HK': '新關注者',
        'zh-CN': '新关注者',
        'en': 'New Follower'
      },
      message: {
        'zh-HK': `${follower.email} 開始關注您`,
        'zh-CN': `${follower.email} 开始关注您`,
        'en': `${follower.email} started following you`
      },
      metadata: {
        followerId: followerUserId,
        followerEmail: follower.email
      }
    }

    await this.createNotification(followedUserId, notificationData)
  }

  /**
   * Send notification when a followed user creates new content
   */
  async notifyFollowersOfNewContent(
    creatorUserId: string,
    contentType: 'course' | 'product',
    contentId: string,
    contentTitle: string
  ): Promise<void> {
    // Get all followers of the creator
    const followers = await prisma.follow.findMany({
      where: { followingId: creatorUserId },
      select: { followerId: true }
    })

    if (followers.length === 0) {
      return
    }

    const followerIds = followers.map(f => f.followerId)

    const notificationData: NotificationData = {
      type: contentType === 'course' ? 'COURSE_UPDATE' : 'PRODUCT_UPDATE',
      title: {
        'zh-HK': contentType === 'course' ? '新課程發布' : '新產品上架',
        'zh-CN': contentType === 'course' ? '新课程发布' : '新产品上架',
        'en': contentType === 'course' ? 'New Course Available' : 'New Product Available'
      },
      message: {
        'zh-HK': `您關注的師傅發布了新${contentType === 'course' ? '課程' : '產品'}：${contentTitle}`,
        'zh-CN': `您关注的师傅发布了新${contentType === 'course' ? '课程' : '产品'}：${contentTitle}`,
        'en': `A craftsman you follow published a new ${contentType}: ${contentTitle}`
      },
      metadata: {
        contentType,
        contentId,
        creatorUserId
      }
    }

    await this.createBulkNotifications(followerIds, notificationData)
  }

  /**
   * Send course reminder notification
   */
  async sendCourseReminder(
    userId: string,
    courseId: string,
    courseTitle: string,
    reminderTime: Date
  ): Promise<void> {
    const notificationData: NotificationData = {
      type: 'COURSE_REMINDER',
      title: {
        'zh-HK': '課程提醒',
        'zh-CN': '课程提醒',
        'en': 'Course Reminder'
      },
      message: {
        'zh-HK': `您的課程「${courseTitle}」即將開始`,
        'zh-CN': `您的课程「${courseTitle}」即将开始`,
        'en': `Your course "${courseTitle}" is starting soon`
      },
      metadata: {
        courseId,
        reminderTime: reminderTime.toISOString()
      }
    }

    await this.createNotification(userId, notificationData)
  }
}

export const notificationService = new NotificationService()