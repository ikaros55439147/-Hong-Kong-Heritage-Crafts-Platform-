import { describe, it, expect, beforeEach, vi } from 'vitest'
import { followService } from '../follow.service'
import { notificationService } from '../notification.service'
import { prisma } from '@/lib/database'

// Mock the notification service
vi.mock('../notification.service', () => ({
  notificationService: {
    notifyNewFollower: vi.fn()
  }
}))

// Mock Prisma
vi.mock('@/lib/database', () => ({
  prisma: {
    follow: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn()
    },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn()
    },
    course: {
      findMany: vi.fn()
    },
    product: {
      findMany: vi.fn()
    }
  }
}))

describe('FollowService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('followUser', () => {
    it('should successfully follow a user', async () => {
      const followerId = 'user1'
      const followingId = 'user2'

      // Mock that no existing follow exists
      vi.mocked(prisma.follow.findUnique).mockResolvedValue(null)
      
      // Mock that the user to follow exists
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: followingId,
        email: 'user2@example.com',
        passwordHash: 'hash',
        role: 'CRAFTSMAN',
        preferredLanguage: 'zh-HK',
        createdAt: new Date(),
        updatedAt: new Date()
      })

      // Mock follow creation
      const mockFollow = {
        id: 'follow1',
        followerId,
        followingId,
        createdAt: new Date()
      }
      vi.mocked(prisma.follow.create).mockResolvedValue(mockFollow)

      // Mock notification service
      vi.mocked(notificationService.notifyNewFollower).mockResolvedValue()

      const result = await followService.followUser(followerId, followingId)

      expect(result).toEqual(mockFollow)
      expect(prisma.follow.create).toHaveBeenCalledWith({
        data: { followerId, followingId }
      })
      expect(notificationService.notifyNewFollower).toHaveBeenCalledWith(followingId, followerId)
    })

    it('should throw error if already following', async () => {
      const followerId = 'user1'
      const followingId = 'user2'

      // Mock existing follow
      vi.mocked(prisma.follow.findUnique).mockResolvedValue({
        id: 'existing',
        followerId,
        followingId,
        createdAt: new Date()
      })

      await expect(followService.followUser(followerId, followingId))
        .rejects.toThrow('Already following this user')
    })

    it('should throw error if trying to follow yourself', async () => {
      const userId = 'user1'

      // Mock that no existing follow exists
      vi.mocked(prisma.follow.findUnique).mockResolvedValue(null)

      await expect(followService.followUser(userId, userId))
        .rejects.toThrow('Cannot follow yourself')
    })

    it('should throw error if user to follow does not exist', async () => {
      const followerId = 'user1'
      const followingId = 'nonexistent'

      vi.mocked(prisma.follow.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      await expect(followService.followUser(followerId, followingId))
        .rejects.toThrow('User not found')
    })
  })

  describe('unfollowUser', () => {
    it('should successfully unfollow a user', async () => {
      const followerId = 'user1'
      const followingId = 'user2'

      // Mock existing follow
      vi.mocked(prisma.follow.findUnique).mockResolvedValue({
        id: 'follow1',
        followerId,
        followingId,
        createdAt: new Date()
      })

      vi.mocked(prisma.follow.delete).mockResolvedValue({
        id: 'follow1',
        followerId,
        followingId,
        createdAt: new Date()
      })

      await followService.unfollowUser(followerId, followingId)

      expect(prisma.follow.delete).toHaveBeenCalledWith({
        where: {
          followerId_followingId: {
            followerId,
            followingId
          }
        }
      })
    })

    it('should throw error if not following user', async () => {
      const followerId = 'user1'
      const followingId = 'user2'

      vi.mocked(prisma.follow.findUnique).mockResolvedValue(null)

      await expect(followService.unfollowUser(followerId, followingId))
        .rejects.toThrow('Not following this user')
    })
  })

  describe('getFollowing', () => {
    it('should return paginated list of following users', async () => {
      const userId = 'user1'
      const mockFollows = [
        {
          id: 'follow1',
          followerId: userId,
          followingId: 'user2',
          createdAt: new Date(),
          following: {
            id: 'user2',
            email: 'user2@example.com',
            passwordHash: 'hash',
            role: 'CRAFTSMAN' as const,
            preferredLanguage: 'zh-HK',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        }
      ]

      vi.mocked(prisma.follow.findMany).mockResolvedValue(mockFollows)
      vi.mocked(prisma.follow.count).mockResolvedValue(1)

      const result = await followService.getFollowing(userId, { page: 1, limit: 20 })

      expect(result).toEqual({
        data: [mockFollows[0].following],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1
      })
    })
  })

  describe('getFollowers', () => {
    it('should return paginated list of followers', async () => {
      const userId = 'user1'
      const mockFollows = [
        {
          id: 'follow1',
          followerId: 'user2',
          followingId: userId,
          createdAt: new Date(),
          follower: {
            id: 'user2',
            email: 'user2@example.com',
            passwordHash: 'hash',
            role: 'LEARNER' as const,
            preferredLanguage: 'zh-HK',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        }
      ]

      vi.mocked(prisma.follow.findMany).mockResolvedValue(mockFollows)
      vi.mocked(prisma.follow.count).mockResolvedValue(1)

      const result = await followService.getFollowers(userId, { page: 1, limit: 20 })

      expect(result).toEqual({
        data: [mockFollows[0].follower],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1
      })
    })
  })

  describe('isFollowing', () => {
    it('should return true if following', async () => {
      const followerId = 'user1'
      const followingId = 'user2'

      vi.mocked(prisma.follow.findUnique).mockResolvedValue({
        id: 'follow1',
        followerId,
        followingId,
        createdAt: new Date()
      })

      const result = await followService.isFollowing(followerId, followingId)
      expect(result).toBe(true)
    })

    it('should return false if not following', async () => {
      const followerId = 'user1'
      const followingId = 'user2'

      vi.mocked(prisma.follow.findUnique).mockResolvedValue(null)

      const result = await followService.isFollowing(followerId, followingId)
      expect(result).toBe(false)
    })
  })

  describe('getFollowCounts', () => {
    it('should return follow counts', async () => {
      const userId = 'user1'

      vi.mocked(prisma.follow.count)
        .mockResolvedValueOnce(5) // following count
        .mockResolvedValueOnce(10) // followers count

      const result = await followService.getFollowCounts(userId)

      expect(result).toEqual({
        followingCount: 5,
        followersCount: 10
      })
    })
  })

  describe('getActivityFeed', () => {
    it('should return empty feed if not following anyone', async () => {
      const userId = 'user1'

      vi.mocked(prisma.follow.findMany).mockResolvedValue([])

      const result = await followService.getActivityFeed(userId)

      expect(result).toEqual({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0
      })
    })

    it('should return activity feed with courses and products', async () => {
      const userId = 'user1'

      // Mock following
      vi.mocked(prisma.follow.findMany).mockResolvedValue([
        { followingId: 'craftsman1' }
      ] as any)

      // Mock courses
      vi.mocked(prisma.course.findMany).mockResolvedValue([
        {
          id: 'course1',
          title: { 'zh-HK': '手雕麻將課程' },
          description: { 'zh-HK': '學習傳統手雕麻將技藝' },
          craftCategory: 'mahjong',
          createdAt: new Date(),
          craftsman: {
            userId: 'craftsman1',
            user: {
              id: 'craftsman1',
              email: 'craftsman@example.com',
              passwordHash: 'hash',
              role: 'CRAFTSMAN' as const,
              preferredLanguage: 'zh-HK',
              createdAt: new Date(),
              updatedAt: new Date()
            }
          }
        }
      ] as any)

      // Mock products
      vi.mocked(prisma.product.findMany).mockResolvedValue([])

      // Mock new followers
      vi.mocked(prisma.follow.findMany)
        .mockResolvedValueOnce([{ followingId: 'craftsman1' }] as any)
        .mockResolvedValueOnce([])

      const result = await followService.getActivityFeed(userId)

      expect(result.data).toHaveLength(1)
      expect(result.data[0].type).toBe('new_course')
      expect(result.data[0].title).toBe('New course: 手雕麻將課程')
    })
  })

  describe('getSuggestedFollows', () => {
    it('should return suggested craftsmen to follow', async () => {
      const userId = 'user1'

      // Mock current following
      vi.mocked(prisma.follow.findMany).mockResolvedValue([
        { followingId: 'craftsman1' }
      ] as any)

      // Mock suggested craftsmen
      const mockCraftsmen = [
        {
          id: 'craftsman2',
          email: 'craftsman2@example.com',
          passwordHash: 'hash',
          role: 'CRAFTSMAN' as const,
          preferredLanguage: 'zh-HK',
          createdAt: new Date(),
          updatedAt: new Date(),
          craftsmanProfile: {
            id: 'profile2',
            verificationStatus: 'VERIFIED'
          },
          followers: [
            { followerId: 'user3' },
            { followerId: 'user4' }
          ]
        }
      ]

      vi.mocked(prisma.user.findMany).mockResolvedValue(mockCraftsmen as any)

      const result = await followService.getSuggestedFollows(userId, 5)

      expect(result).toEqual(mockCraftsmen)
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          id: { notIn: ['craftsman1', userId] },
          role: 'CRAFTSMAN',
          craftsmanProfile: {
            verificationStatus: 'VERIFIED'
          }
        },
        include: {
          craftsmanProfile: true,
          followers: {
            select: { followerId: true }
          }
        },
        take: 10 // limit * 2
      })
    })
  })
})