import { describe, it, expect, beforeEach, vi } from 'vitest'
import { userBehaviorService } from '../user-behavior.service'
import { prisma } from '../../database'

// Mock database
vi.mock('../../database', () => ({
  prisma: {
    $executeRaw: vi.fn(),
    $queryRaw: vi.fn(),
    user: {
      findUnique: vi.fn(),
    },
    craftsmanProfile: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    course: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    product: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    mediaFile: {
      findMany: vi.fn(),
    },
  },
}))

const mockPrisma = prisma as any

describe('UserBehaviorService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('trackEvent', () => {
    it('should track user behavior event', async () => {
      mockPrisma.$executeRaw.mockResolvedValue(undefined)

      const event = {
        userId: 'user1',
        eventType: 'view' as const,
        entityType: 'craftsman' as const,
        entityId: 'craftsman1',
        metadata: { duration: 30 },
      }

      await userBehaviorService.trackEvent(event)

      expect(mockPrisma.$executeRaw).toHaveBeenCalled()
    })

    it('should handle tracking errors gracefully', async () => {
      mockPrisma.$executeRaw.mockRejectedValue(new Error('Database error'))

      const event = {
        userId: 'user1',
        eventType: 'view' as const,
        entityType: 'craftsman' as const,
        entityId: 'craftsman1',
      }

      // Should not throw
      await expect(userBehaviorService.trackEvent(event)).resolves.toBeUndefined()
    })
  })

  describe('getUserPreferences', () => {
    it('should return user preferences based on behavior', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        preferredLanguage: 'zh-HK',
      })

      mockPrisma.$queryRaw.mockResolvedValue([
        {
          event_type: 'view',
          entity_type: 'craftsman',
          entity_id: 'craftsman1',
          metadata: {},
          created_at: new Date(),
        },
      ])

      mockPrisma.craftsmanProfile.findUnique.mockResolvedValue({
        craftSpecialties: ['手雕麻將'],
      })

      const preferences = await userBehaviorService.getUserPreferences('user1')

      expect(preferences.userId).toBe('user1')
      expect(preferences.preferredLanguage).toBe('zh-HK')
      expect(preferences.craftTypes).toContain('手雕麻將')
    })

    it('should return default preferences for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const preferences = await userBehaviorService.getUserPreferences('nonexistent')

      expect(preferences.userId).toBe('nonexistent')
      expect(preferences.craftTypes).toEqual([])
      expect(preferences.preferredLanguage).toBe('zh-HK')
    })
  })

  describe('getRecommendations', () => {
    it('should return personalized recommendations for logged-in user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        preferredLanguage: 'zh-HK',
      })

      mockPrisma.$queryRaw.mockResolvedValue([])

      mockPrisma.craftsmanProfile.findMany.mockResolvedValue([
        {
          id: 'craftsman1',
          craftSpecialties: ['手雕麻將'],
          bio: { name: { 'zh-HK': 'Test Craftsman' } },
          user: { email: 'test@example.com' },
        },
      ])

      mockPrisma.course.findMany.mockResolvedValue([])
      mockPrisma.product.findMany.mockResolvedValue([])

      const recommendations = await userBehaviorService.getRecommendations({
        userId: 'user1',
        limit: 5,
      })

      expect(recommendations).toBeInstanceOf(Array)
    })

    it('should return popular recommendations for anonymous users', async () => {
      mockPrisma.craftsmanProfile.findMany.mockResolvedValue([
        {
          id: 'craftsman1',
          craftSpecialties: ['手雕麻將'],
          bio: { name: { 'zh-HK': 'Popular Craftsman' } },
          user: { email: 'popular@example.com' },
          createdAt: new Date(),
        },
      ])

      mockPrisma.course.findMany.mockResolvedValue([])

      const recommendations = await userBehaviorService.getRecommendations({
        limit: 5,
      })

      expect(recommendations).toBeInstanceOf(Array)
    })
  })

  describe('getSimilarContent', () => {
    it('should return similar craftsmen', async () => {
      mockPrisma.craftsmanProfile.findUnique.mockResolvedValue({
        craftSpecialties: ['手雕麻將'],
        workshopLocation: 'Hong Kong',
      })

      mockPrisma.craftsmanProfile.findMany.mockResolvedValue([
        {
          id: 'similar1',
          craftSpecialties: ['手雕麻將'],
          bio: { name: { 'zh-HK': 'Similar Craftsman' } },
          user: { email: 'similar@example.com' },
        },
      ])

      const similar = await userBehaviorService.getSimilarContent(
        'craftsman',
        'craftsman1',
        5
      )

      expect(similar).toHaveLength(1)
      expect(similar[0].type).toBe('craftsman')
      expect(similar[0].reason).toBe('相似師傅')
    })

    it('should return similar courses', async () => {
      mockPrisma.course.findUnique.mockResolvedValue({
        craftCategory: '手雕麻將',
        price: 500,
      })

      mockPrisma.course.findMany.mockResolvedValue([
        {
          id: 'course1',
          craftCategory: '手雕麻將',
          title: { 'zh-HK': 'Similar Course' },
          craftsman: { user: { email: 'teacher@example.com' } },
        },
      ])

      const similar = await userBehaviorService.getSimilarContent(
        'course',
        'course1',
        5
      )

      expect(similar).toHaveLength(1)
      expect(similar[0].type).toBe('course')
      expect(similar[0].reason).toBe('相似課程')
    })
  })
})