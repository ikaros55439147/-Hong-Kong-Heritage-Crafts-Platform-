import { describe, it, expect, beforeEach, vi } from 'vitest'
import { notificationService } from '../notification.service'
import { prisma } from '@/lib/database'

// Mock Prisma
vi.mock('@/lib/database', () => ({
  prisma: {
    notification: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      count: vi.fn()
    },
    notificationPreference: {
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn()
    },
    user: {
      findUnique: vi.fn()
    },
    follow: {
      findMany: vi.fn()
    }
  }
}))

describe('NotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createNotification', () => {
    it('should create notification when user preferences allow it', async () => {
      const userId = 'user1'
      const notificationData = {
        type: 'NEW_FOLLOWER' as const,
        title: { 'zh-HK': '新關注者', 'en': 'New Follower' },
        message: { 'zh-HK': '有人關注了您', 'en': 'Someone followed you' }
      }

      // Mock preferences
      vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue({
        id: 'pref1',
        userId,
        emailNotifications: true,
        pushNotifications: true,
        newFollowerNotify: true,
        courseUpdateNotify: true,
        productUpdateNotify: true,
        orderStatusNotify: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })

      // Mock notification creation
      const mockNotification = {
        id: 'notif1',
        userId,
        type: 'NEW_FOLLOWER' as const,
        title: notificationData.title,
        message: notificationData.message,
        metadata: null,
        isRead: false,
        createdAt: new Date()
      }
      vi.mocked(prisma.notification.create).mockResolvedValue(mockNotification)

      const result = await notificationService.createNotification(userId, notificationData)

      expect(result).toEqual(mockNotification)
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId,
          type: notificationData.type,
          title: notificationData.title,
          message: notificationData.message,
          metadata: undefined
        }
      })
    })

    it('should throw error when user has disabled notification type', async () => {
      const userId = 'user1'
      const notificationData = {
        type: 'NEW_FOLLOWER' as const,
        title: { 'zh-HK': '新關注者', 'en': 'New Follower' },
        message: { 'zh-HK': '有人關注了您', 'en': 'Someone followed you' }
      }

      // Mock preferences with disabled new follower notifications
      vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue({
        id: 'pref1',
        userId,
        emailNotifications: true,
        pushNotifications: true,
        newFollowerNotify: false, // Disabled
        courseUpdateNotify: true,
        productUpdateNotify: true,
        orderStatusNotify: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })

      await expect(notificationService.createNotification(userId, notificationData))
        .rejects.toThrow('User has disabled this type of notification')
    })
  })

  describe('getUserNotifications', () => {
    it('should return paginated notifications', async () => {
      const userId = 'user1'
      const mockNotifications = [
        {
          id: 'notif1',
          userId,
          type: 'NEW_FOLLOWER' as const,
          title: { 'zh-HK': '新關注者' },
          message: { 'zh-HK': '有人關注了您' },
          metadata: null,
          isRead: false,
          createdAt: new Date()
        }
      ]

      vi.mocked(prisma.notification.findMany).mockResolvedValue(mockNotifications)
      vi.mocked(prisma.notification.count).mockResolvedValue(1)

      const result = await notificationService.getUserNotifications(userId, { page: 1, limit: 20 })

      expect(result).toEqual({
        data: mockNotifications,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1
      })
    })

    it('should filter unread notifications when requested', async () => {
      const userId = 'user1'

      vi.mocked(prisma.notification.findMany).mockResolvedValue([])
      vi.mocked(prisma.notification.count).mockResolvedValue(0)

      await notificationService.getUserNotifications(userId, { page: 1, limit: 20 }, true)

      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId, isRead: false },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' }
      })
    })
  })

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const notificationId = 'notif1'
      const userId = 'user1'

      const mockNotification = {
        id: notificationId,
        userId,
        type: 'NEW_FOLLOWER' as const,
        title: { 'zh-HK': '新關注者' },
        message: { 'zh-HK': '有人關注了您' },
        metadata: null,
        isRead: false,
        createdAt: new Date()
      }

      vi.mocked(prisma.notification.findFirst).mockResolvedValue(mockNotification)
      vi.mocked(prisma.notification.update).mockResolvedValue({
        ...mockNotification,
        isRead: true
      })

      const result = await notificationService.markAsRead(notificationId, userId)

      expect(result.isRead).toBe(true)
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: notificationId },
        data: { isRead: true }
      })
    })

    it('should throw error if notification not found', async () => {
      const notificationId = 'nonexistent'
      const userId = 'user1'

      vi.mocked(prisma.notification.findFirst).mockResolvedValue(null)

      await expect(notificationService.markAsRead(notificationId, userId))
        .rejects.toThrow('Notification not found')
    })
  })

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      const userId = 'user1'

      vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 5 })

      const result = await notificationService.markAllAsRead(userId)

      expect(result).toBe(5)
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId, isRead: false },
        data: { isRead: true }
      })
    })
  })

  describe('getUnreadCount', () => {
    it('should return unread notification count', async () => {
      const userId = 'user1'

      vi.mocked(prisma.notification.count).mockResolvedValue(3)

      const result = await notificationService.getUnreadCount(userId)

      expect(result).toBe(3)
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { userId, isRead: false }
      })
    })
  })

  describe('getNotificationPreferences', () => {
    it('should return existing preferences', async () => {
      const userId = 'user1'
      const mockPreferences = {
        id: 'pref1',
        userId,
        emailNotifications: true,
        pushNotifications: true,
        newFollowerNotify: true,
        courseUpdateNotify: true,
        productUpdateNotify: true,
        orderStatusNotify: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue(mockPreferences)

      const result = await notificationService.getNotificationPreferences(userId)

      expect(result).toEqual(mockPreferences)
    })

    it('should create default preferences if none exist', async () => {
      const userId = 'user1'
      const defaultPreferences = {
        id: 'pref1',
        userId,
        emailNotifications: true,
        pushNotifications: true,
        newFollowerNotify: true,
        courseUpdateNotify: true,
        productUpdateNotify: true,
        orderStatusNotify: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.notificationPreference.create).mockResolvedValue(defaultPreferences)

      const result = await notificationService.getNotificationPreferences(userId)

      expect(result).toEqual(defaultPreferences)
      expect(prisma.notificationPreference.create).toHaveBeenCalledWith({
        data: { userId }
      })
    })
  })

  describe('notifyNewFollower', () => {
    it('should create notification for new follower', async () => {
      const followedUserId = 'user1'
      const followerUserId = 'user2'

      const mockFollower = {
        id: followerUserId,
        email: 'follower@example.com',
        passwordHash: 'hash',
        role: 'LEARNER' as const,
        preferredLanguage: 'zh-HK',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockFollower)

      // Mock preferences
      vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue({
        id: 'pref1',
        userId: followedUserId,
        emailNotifications: true,
        pushNotifications: true,
        newFollowerNotify: true,
        courseUpdateNotify: true,
        productUpdateNotify: true,
        orderStatusNotify: true,
        craftsmanStatusNotify: true,
        eventNotify: true,
        commentNotify: true,
        likeNotify: true,
        reminderNotify: true,
        marketingNotify: false,
        createdAt: new Date(),
        updatedAt: new Date()
      })

      // Mock notification creation
      vi.mocked(prisma.notification.create).mockResolvedValue({
        id: 'notif1',
        userId: followedUserId,
        type: 'NEW_FOLLOWER',
        title: { 'zh-HK': '新關注者' },
        message: { 'zh-HK': `${mockFollower.email} 開始關注您` },
        metadata: { followerId: followerUserId, followerEmail: mockFollower.email },
        isRead: false,
        createdAt: new Date()
      })

      await notificationService.notifyNewFollower(followedUserId, followerUserId)

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: followedUserId,
          type: 'NEW_FOLLOWER',
          title: {
            'zh-HK': '新關注者',
            'zh-CN': '新关注者',
            'en': 'New Follower'
          },
          message: {
            'zh-HK': `${mockFollower.email} 開始關注您`,
            'zh-CN': `${mockFollower.email} 开始关注您`,
            'en': `${mockFollower.email} started following you`
          },
          metadata: {
            followerId: followerUserId,
            followerEmail: mockFollower.email
          }
        }
      })
    })

    it('should throw error if follower not found', async () => {
      const followedUserId = 'user1'
      const followerUserId = 'nonexistent'

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      await expect(notificationService.notifyNewFollower(followedUserId, followerUserId))
        .rejects.toThrow('Follower not found')
    })
  })

  describe('notifyCraftsmanStatusChange', () => {
    it('should create notification for craftsman status change', async () => {
      const craftsmanUserId = 'user1'
      const oldStatus = 'PENDING'
      const newStatus = 'VERIFIED'
      const adminNotes = 'Profile approved'

      // Mock preferences
      vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue({
        id: 'pref1',
        userId: craftsmanUserId,
        emailNotifications: true,
        pushNotifications: true,
        newFollowerNotify: true,
        courseUpdateNotify: true,
        productUpdateNotify: true,
        orderStatusNotify: true,
        craftsmanStatusNotify: true,
        eventNotify: true,
        commentNotify: true,
        likeNotify: true,
        reminderNotify: true,
        marketingNotify: false,
        createdAt: new Date(),
        updatedAt: new Date()
      })

      // Mock user for email/push notifications
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: craftsmanUserId,
        email: 'craftsman@example.com',
        passwordHash: 'hash',
        role: 'CRAFTSMAN' as const,
        preferredLanguage: 'zh-HK',
        createdAt: new Date(),
        updatedAt: new Date()
      })

      // Mock notification creation
      vi.mocked(prisma.notification.create).mockResolvedValue({
        id: 'notif1',
        userId: craftsmanUserId,
        type: 'ACTIVITY_UPDATE',
        title: { 'zh-HK': '師傅認證狀態更新' },
        message: { 'zh-HK': '您的師傅認證狀態已從「審核中」更新為「已驗證」' },
        metadata: { oldStatus, newStatus, adminNotes, timestamp: expect.any(String) },
        isRead: false,
        createdAt: new Date()
      })

      await notificationService.notifyCraftsmanStatusChange(
        craftsmanUserId,
        oldStatus as any,
        newStatus as any,
        adminNotes
      )

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: craftsmanUserId,
          type: 'ACTIVITY_UPDATE',
          title: {
            'zh-HK': '師傅認證狀態更新',
            'zh-CN': '师傅认证状态更新',
            'en': 'Craftsman Verification Status Update'
          },
          message: {
            'zh-HK': '您的師傅認證狀態已從「審核中」更新為「已驗證」',
            'zh-CN': '您的师傅认证状态已从「审核中」更新为「已验证」',
            'en': 'Your craftsman verification status has been updated from "Under Review" to "Verified"'
          },
          metadata: {
            oldStatus,
            newStatus,
            adminNotes,
            timestamp: expect.any(String)
          }
        }
      })
    })
  })

  describe('sendBatchNotifications', () => {
    it('should send notifications to multiple users', async () => {
      const notifications = [
        {
          userId: 'user1',
          notificationData: {
            type: 'COURSE_UPDATE' as const,
            title: { 'zh-HK': '課程更新' },
            message: { 'zh-HK': '新課程發布' }
          }
        },
        {
          userId: 'user2',
          notificationData: {
            type: 'PRODUCT_UPDATE' as const,
            title: { 'zh-HK': '產品更新' },
            message: { 'zh-HK': '新產品上架' }
          }
        }
      ]

      // Mock preferences for both users
      vi.mocked(prisma.notificationPreference.findUnique)
        .mockResolvedValueOnce({
          id: 'pref1',
          userId: 'user1',
          emailNotifications: true,
          pushNotifications: true,
          newFollowerNotify: true,
          courseUpdateNotify: true,
          productUpdateNotify: true,
          orderStatusNotify: true,
          craftsmanStatusNotify: true,
          eventNotify: true,
          commentNotify: true,
          likeNotify: true,
          reminderNotify: true,
          marketingNotify: false,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .mockResolvedValueOnce({
          id: 'pref2',
          userId: 'user2',
          emailNotifications: true,
          pushNotifications: true,
          newFollowerNotify: true,
          courseUpdateNotify: true,
          productUpdateNotify: true,
          orderStatusNotify: true,
          craftsmanStatusNotify: true,
          eventNotify: true,
          commentNotify: true,
          likeNotify: true,
          reminderNotify: true,
          marketingNotify: false,
          createdAt: new Date(),
          updatedAt: new Date()
        })

      // Mock notification creation
      vi.mocked(prisma.notification.create)
        .mockResolvedValueOnce({
          id: 'notif1',
          userId: 'user1',
          type: 'COURSE_UPDATE',
          title: { 'zh-HK': '課程更新' },
          message: { 'zh-HK': '新課程發布' },
          metadata: null,
          isRead: false,
          createdAt: new Date()
        })
        .mockResolvedValueOnce({
          id: 'notif2',
          userId: 'user2',
          type: 'PRODUCT_UPDATE',
          title: { 'zh-HK': '產品更新' },
          message: { 'zh-HK': '新產品上架' },
          metadata: null,
          isRead: false,
          createdAt: new Date()
        })

      await notificationService.sendBatchNotifications(notifications, 2)

      expect(prisma.notification.create).toHaveBeenCalledTimes(2)
    })
  })
})