import { describe, it, expect, beforeEach, vi } from 'vitest'
import { recommendationService } from '../recommendation.service'
import { userBehaviorService } from '../user-behavior.service'
import { prisma } from '../../database'

// Mock dependencies
vi.mock('../user-behavior.service')
vi.mock('../../database', () => ({
  prisma: {
    $queryRaw: vi.fn(),
    craftsmanProfile: {
      findMany: vi.fn(),
    },
    course: {
      findMany: vi.fn(),
    },
    product: {
      findMany: vi.fn(),
    },
  },
}))

const mockUserBehaviorService = userBehaviorService as any
const mockPrisma = prisma as any

describe('RecommendationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getRecommendations', () => {
    it('should return comprehensive recommendations for logged-in user', async () => {
      const mockPersonalRecs = [
        {
          id: 'course1',
          type: 'course' as const,
          title: 'Personal Course',
          url: '/courses/course1',
          score: 0.9,
          reason: 'Based on your interests',
        },
      ]

      const mockSimilarRecs = [
        {
          id: 'craftsman1',
          type: 'craftsman' as const,
          title: 'Similar Craftsman',
          url: '/craftsmen/craftsman1',
          score: 0.8,
          reason: 'Similar content',
        },
      ]

      mockUserBehaviorService.getRecommendations.mockResolvedValue(mockPersonalRecs)
      mockUserBehaviorService.getSimilarContent.mockResolvedValue(mockSimilarRecs)

      // Mock trending data
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([
          { entity_id: 'trending1', view_count: BigInt(100) },
        ])
        .mockResolvedValueOnce([
          { entity_id: 'trending2', interaction_count: BigInt(50) },
        ])

      mockPrisma.craftsmanProfile.findUnique.mockResolvedValue({
        id: 'trending1',
        bio: { name: { 'zh-HK': 'Trending Craftsman' } },
        user: { email: 'trending@example.com' },
        craftSpecialties: ['手雕麻將'],
      })

      mockPrisma.course.findUnique.mockResolvedValue({
        id: 'trending2',
        title: { 'zh-HK': 'Trending Course' },
        craftCategory: '手雕麻將',
        craftsman: { user: { email: 'teacher@example.com' } },
      })

      const context = {
        userId: 'user1',
        currentPage: 'home' as const,
        currentEntityId: 'entity1',
        currentEntityType: 'craftsman' as const,
      }

      const sections = await recommendationService.getRecommendations(context)

      expect(sections).toBeInstanceOf(Array)
      expect(sections.length).toBeGreaterThan(0)
      
      // Should have personal recommendations
      const personalSection = sections.find(s => s.type === 'personal')
      expect(personalSection).toBeDefined()
      expect(personalSection?.items).toEqual(mockPersonalRecs)
    })

    it('should return popular recommendations for anonymous users', async () => {
      mockUserBehaviorService.getRecommendations.mockResolvedValue([
        {
          id: 'popular1',
          type: 'craftsman' as const,
          title: 'Popular Craftsman',
          url: '/craftsmen/popular1',
          score: 0.6,
          reason: 'Popular content',
        },
      ])

      // Mock empty trending data
      mockPrisma.$queryRaw.mockResolvedValue([])

      const context = {
        currentPage: 'home' as const,
      }

      const sections = await recommendationService.getRecommendations(context)

      expect(sections).toBeInstanceOf(Array)
    })

    it('should handle location-based recommendations', async () => {
      mockPrisma.craftsmanProfile.findMany.mockResolvedValue([
        {
          id: 'local1',
          bio: { name: { 'zh-HK': 'Local Craftsman' } },
          user: { email: 'local@example.com' },
          craftSpecialties: ['竹編'],
          workshopLocation: 'Central, Hong Kong',
        },
      ])

      const context = {
        userLocation: 'Central',
      }

      const sections = await recommendationService.getRecommendations(context)

      const locationSection = sections.find(s => s.type === 'location')
      expect(locationSection).toBeDefined()
      expect(locationSection?.title).toBe('附近推薦')
    })
  })

  describe('getPersonalRecommendations', () => {
    it('should return personalized recommendations', async () => {
      mockUserBehaviorService.getRecommendations.mockResolvedValue([
        {
          id: 'personal1',
          type: 'course' as const,
          title: 'Personal Course',
          url: '/courses/personal1',
          score: 0.9,
          reason: 'Based on your preferences',
        },
      ])

      const section = await recommendationService.getPersonalRecommendations(
        'user1',
        { maxRecommendations: 20, diversityFactor: 0.3, recencyWeight: 0.2, popularityWeight: 0.3, personalWeight: 0.5 }
      )

      expect(section.type).toBe('personal')
      expect(section.title).toBe('為您推薦')
      expect(section.items).toHaveLength(1)
    })
  })

  describe('getTrendingRecommendations', () => {
    it('should return trending recommendations', async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([
          { entity_id: 'trending1', view_count: BigInt(100) },
        ])
        .mockResolvedValueOnce([
          { entity_id: 'trending2', interaction_count: BigInt(50) },
        ])

      mockPrisma.craftsmanProfile.findUnique.mockResolvedValue({
        id: 'trending1',
        bio: { name: { 'zh-HK': 'Trending Craftsman' } },
        user: { email: 'trending@example.com' },
        craftSpecialties: ['手雕麻將'],
      })

      mockPrisma.course.findUnique.mockResolvedValue({
        id: 'trending2',
        title: { 'zh-HK': 'Trending Course' },
        craftCategory: '手雕麻將',
        craftsman: { user: { email: 'teacher@example.com' } },
      })

      const section = await recommendationService.getTrendingRecommendations({
        maxRecommendations: 20,
        diversityFactor: 0.3,
        recencyWeight: 0.2,
        popularityWeight: 0.3,
        personalWeight: 0.5,
      })

      expect(section.type).toBe('trending')
      expect(section.title).toBe('熱門推薦')
      expect(section.items.length).toBeGreaterThan(0)
    })
  })

  describe('getCategoryRecommendations', () => {
    it('should return category-based recommendations', async () => {
      mockUserBehaviorService.getUserPreferences.mockResolvedValue({
        userId: 'user1',
        craftTypes: ['手雕麻將'],
        preferredLanguage: 'zh-HK',
        interests: ['手雕麻將'],
        viewHistory: [],
      })

      mockPrisma.course.findMany.mockResolvedValue([
        {
          id: 'course1',
          title: { 'zh-HK': 'Mahjong Course' },
          craftCategory: '手雕麻將',
          craftsman: { user: { email: 'teacher@example.com' } },
        },
      ])

      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'product1',
          name: { 'zh-HK': 'Mahjong Set' },
          craftCategory: '手雕麻將',
          price: 500,
          craftsman: { user: { email: 'maker@example.com' } },
        },
      ])

      const section = await recommendationService.getCategoryRecommendations(
        'user1',
        { maxRecommendations: 20, diversityFactor: 0.3, recencyWeight: 0.2, popularityWeight: 0.3, personalWeight: 0.5 }
      )

      expect(section.type).toBe('category')
      expect(section.title).toBe('相關推薦')
      expect(section.items.length).toBeGreaterThan(0)
    })
  })

  describe('getLocationRecommendations', () => {
    it('should return location-based recommendations', async () => {
      mockPrisma.craftsmanProfile.findMany.mockResolvedValue([
        {
          id: 'local1',
          bio: { name: { 'zh-HK': 'Local Craftsman' } },
          user: { email: 'local@example.com' },
          craftSpecialties: ['竹編'],
          workshopLocation: 'Central District',
        },
      ])

      const section = await recommendationService.getLocationRecommendations(
        'Central',
        { maxRecommendations: 20, diversityFactor: 0.3, recencyWeight: 0.2, popularityWeight: 0.3, personalWeight: 0.5 }
      )

      expect(section.type).toBe('location')
      expect(section.title).toBe('附近推薦')
      expect(section.items).toHaveLength(1)
      expect(section.items[0].reason).toBe('附近師傅')
    })
  })
})