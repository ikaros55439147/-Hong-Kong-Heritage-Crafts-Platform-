import { describe, it, expect, beforeEach, vi, Mock } from 'vitest'
import { enhancedSearchService } from '../enhanced-search.service'
import { contentSearchService } from '../content-search.service'
import { userBehaviorService } from '../user-behavior.service'
import { prisma } from '../../database'

// Mock dependencies
vi.mock('../content-search.service')
vi.mock('../user-behavior.service')
vi.mock('../../database', () => ({
  prisma: {
    $queryRaw: vi.fn(),
    craftsmanProfile: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    course: {
      findUnique: vi.fn(),
    },
    product: {
      findUnique: vi.fn(),
    },
  },
}))

const mockContentSearchService = contentSearchService as any
const mockUserBehaviorService = userBehaviorService as any
const mockPrisma = prisma as any

describe('EnhancedSearchService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('search', () => {
    it('should perform basic search without personalization', async () => {
      const mockSearchResponse = {
        results: [
          {
            id: '1',
            type: 'craftsman' as const,
            title: 'Test Craftsman',
            description: 'Test Description',
            category: 'craftsman',
            url: '/craftsmen/1',
            createdAt: new Date(),
          },
        ],
        total: 1,
        facets: {
          categories: [],
          craftTypes: [],
          fileTypes: [],
        },
        query: { query: 'test' },
      }

      mockContentSearchService.search.mockResolvedValue(mockSearchResponse)

      const result = await enhancedSearchService.search({
        query: 'test',
        personalizeResults: false,
        trackSearch: false,
      })

      expect(result).toEqual({
        ...mockSearchResponse,
        personalizedResults: false,
      })
      expect(mockContentSearchService.search).toHaveBeenCalledWith({
        query: 'test',
      })
    })

    it('should track search behavior when enabled', async () => {
      const mockSearchResponse = {
        results: [],
        total: 0,
        facets: { categories: [], craftTypes: [], fileTypes: [] },
        query: { query: 'test' },
      }

      mockContentSearchService.search.mockResolvedValue(mockSearchResponse)
      mockUserBehaviorService.trackEvent.mockResolvedValue(undefined)

      await enhancedSearchService.search({
        query: 'test',
        userId: 'user1',
        trackSearch: true,
      })

      expect(mockUserBehaviorService.trackEvent).toHaveBeenCalledWith({
        userId: 'user1',
        eventType: 'search',
        entityType: 'media',
        entityId: 'search',
        metadata: {
          query: 'test',
          category: undefined,
          craftType: undefined,
        },
      })
    })

    it('should include recommendations when requested', async () => {
      const mockSearchResponse = {
        results: [],
        total: 0,
        facets: { categories: [], craftTypes: [], fileTypes: [] },
        query: { query: 'test' },
      }

      const mockRecommendations = [
        {
          id: '1',
          type: 'course' as const,
          title: 'Recommended Course',
          url: '/courses/1',
          score: 0.8,
          reason: 'Based on your interests',
          metadata: {},
        },
      ]

      mockContentSearchService.search.mockResolvedValue(mockSearchResponse)
      mockUserBehaviorService.getRecommendations.mockResolvedValue(mockRecommendations)

      const result = await enhancedSearchService.search({
        query: 'test',
        userId: 'user1',
        includeRecommendations: true,
      })

      expect(result.recommendations).toHaveLength(1)
      expect(result.recommendations![0].title).toBe('Recommended Course')
    })
  })

  describe('getAutoComplete', () => {
    it('should return autocomplete suggestions', async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([
          { query: 'test query', count: BigInt(5) },
        ])
        .mockResolvedValueOnce([
          { query: 'popular query', count: BigInt(10) },
        ])
        .mockResolvedValueOnce([
          { query: 'recent search' },
        ])

      mockPrisma.craftsmanProfile.findMany.mockResolvedValue([
        { workshopLocation: 'Test Location' },
      ])

      const result = await enhancedSearchService.getAutoComplete('test', 'user1')

      expect(result.suggestions).toBeDefined()
      expect(result.popularQueries).toBeDefined()
      expect(result.recentSearches).toBeDefined()
    })

    it('should handle empty query gracefully', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([])
      mockPrisma.craftsmanProfile.findMany.mockResolvedValue([])

      const result = await enhancedSearchService.getAutoComplete('', 'user1')

      expect(result.suggestions).toEqual([])
    })
  })

  describe('getSearchAnalytics', () => {
    it('should return search analytics', async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ count: BigInt(100) }]) // total searches
        .mockResolvedValueOnce([
          { query: 'popular', count: BigInt(20) },
        ]) // popular queries
        .mockResolvedValueOnce([
          { category: 'craftsman', count: BigInt(15) },
        ]) // popular categories
        .mockResolvedValueOnce([
          { date: '2024-01-01', count: BigInt(10) },
        ]) // search trends
        .mockResolvedValueOnce([{ count: BigInt(50) }]) // search clicks

      const result = await enhancedSearchService.getSearchAnalytics()

      expect(result.totalSearches).toBe(100)
      expect(result.popularQueries).toHaveLength(1)
      expect(result.popularCategories).toHaveLength(1)
      expect(result.searchTrends).toHaveLength(1)
      expect(result.clickThroughRate).toBe(0.5)
    })
  })

  describe('trackResultClick', () => {
    it('should track result click', async () => {
      mockUserBehaviorService.trackEvent.mockResolvedValue(undefined)

      await enhancedSearchService.trackResultClick(
        'user1',
        'result1',
        'craftsman',
        'test query',
        0
      )

      expect(mockUserBehaviorService.trackEvent).toHaveBeenCalledWith({
        userId: 'user1',
        eventType: 'click',
        entityType: 'craftsman',
        entityId: 'result1',
        metadata: {
          source: 'search',
          searchQuery: 'test query',
          position: 0,
          timestamp: expect.any(Date),
        },
      })
    })
  })
})