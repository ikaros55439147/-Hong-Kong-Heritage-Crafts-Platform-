import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ContentSearchService } from '../content-search.service'
import { prisma } from '../../database'

// Mock dependencies
vi.mock('../../database', () => ({
  prisma: {
    craftsmanProfile: {
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
    course: {
      findMany: vi.fn(),
    },
    product: {
      findMany: vi.fn(),
    },
    mediaFile: {
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}))

describe('ContentSearchService', () => {
  let contentSearchService: ContentSearchService
  
  beforeEach(() => {
    contentSearchService = new ContentSearchService()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('search', () => {
    it('should search across all content types', async () => {
      // Mock data
      const mockCraftsmen = [
        {
          id: 'craftsman-1',
          craftSpecialties: ['手雕麻將'],
          bio: { 'zh-HK': { name: '師傅甲', description: '專業手雕麻將師傅' } },
          workshopLocation: '香港',
          experienceYears: 20,
          verificationStatus: 'VERIFIED',
          createdAt: new Date('2023-01-01'),
          user: { email: 'craftsman1@example.com' },
        },
      ]

      const mockCourses = [
        {
          id: 'course-1',
          title: { 'zh-HK': '手雕麻將入門課程' },
          description: { 'zh-HK': '學習傳統手雕麻將技藝' },
          craftCategory: '手雕麻將',
          price: 500,
          durationHours: 4,
          maxParticipants: 8,
          status: 'ACTIVE',
          createdAt: new Date('2023-01-02'),
          craftsman: {
            user: { email: 'craftsman1@example.com' },
          },
        },
      ]

      const mockProducts = [
        {
          id: 'product-1',
          name: { 'zh-HK': '手工麻將套裝' },
          description: { 'zh-HK': '純手工雕刻麻將' },
          craftCategory: '手雕麻將',
          price: 2000,
          inventoryQuantity: 5,
          isCustomizable: true,
          status: 'ACTIVE',
          createdAt: new Date('2023-01-03'),
          craftsman: {
            user: { email: 'craftsman1@example.com' },
          },
        },
      ]

      const mockMediaFiles = [
        {
          id: 'media-1',
          fileType: 'IMAGE',
          fileUrl: '/uploads/image1.jpg',
          fileSize: BigInt(1024000),
          metadata: {
            originalName: 'mahjong-carving.jpg',
            description: '手雕麻將過程',
          },
          createdAt: new Date('2023-01-04'),
          uploader: { email: 'user@example.com' },
        },
      ]

      // Mock Prisma calls
      vi.mocked(prisma.craftsmanProfile.findMany).mockResolvedValue(mockCraftsmen as any)
      vi.mocked(prisma.course.findMany).mockResolvedValue(mockCourses as any)
      vi.mocked(prisma.product.findMany).mockResolvedValue(mockProducts as any)
      vi.mocked(prisma.mediaFile.findMany).mockResolvedValue(mockMediaFiles as any)
      
      // Mock facets
      vi.mocked(prisma.craftsmanProfile.groupBy).mockResolvedValue([
        { craftSpecialties: ['手雕麻將'], _count: 1 },
      ] as any)
      vi.mocked(prisma.mediaFile.groupBy).mockResolvedValue([
        { fileType: 'IMAGE', _count: 1 },
      ] as any)

      const result = await contentSearchService.search({
        query: '手雕麻將',
        language: 'zh-HK',
        limit: 20,
        offset: 0,
      })

      expect(result.results).toHaveLength(4)
      expect(result.results[0].type).toBe('craftsman')
      expect(result.results[1].type).toBe('course')
      expect(result.results[2].type).toBe('product')
      expect(result.results[3].type).toBe('media')
      expect(result.total).toBe(4)
      expect(result.facets).toBeDefined()
    })

    it('should filter by craft type', async () => {
      vi.mocked(prisma.craftsmanProfile.findMany).mockResolvedValue([])
      vi.mocked(prisma.course.findMany).mockResolvedValue([])
      vi.mocked(prisma.product.findMany).mockResolvedValue([])
      vi.mocked(prisma.mediaFile.findMany).mockResolvedValue([])
      vi.mocked(prisma.craftsmanProfile.groupBy).mockResolvedValue([])
      vi.mocked(prisma.mediaFile.groupBy).mockResolvedValue([])

      await contentSearchService.search({
        craftType: '手雕麻將',
      })

      expect(prisma.craftsmanProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            craftSpecialties: { has: '手雕麻將' },
          }),
        })
      )

      expect(prisma.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            craftCategory: '手雕麻將',
          }),
        })
      )
    })

    it('should handle empty results', async () => {
      vi.mocked(prisma.craftsmanProfile.findMany).mockResolvedValue([])
      vi.mocked(prisma.course.findMany).mockResolvedValue([])
      vi.mocked(prisma.product.findMany).mockResolvedValue([])
      vi.mocked(prisma.mediaFile.findMany).mockResolvedValue([])
      vi.mocked(prisma.craftsmanProfile.groupBy).mockResolvedValue([])
      vi.mocked(prisma.mediaFile.groupBy).mockResolvedValue([])

      const result = await contentSearchService.search({
        query: 'nonexistent',
      })

      expect(result.results).toHaveLength(0)
      expect(result.total).toBe(0)
    })
  })

  describe('getCategories', () => {
    it('should return predefined categories', async () => {
      const categories = await contentSearchService.getCategories()

      expect(categories).toHaveLength(7)
      expect(categories[0].id).toBe('traditional-crafts')
      expect(categories[0].name['zh-HK']).toBe('傳統工藝')
      expect(categories[0].level).toBe(0)
      
      // Check subcategories
      const subcategories = categories.filter(cat => cat.level === 1)
      expect(subcategories).toHaveLength(6)
      expect(subcategories.every(cat => cat.parentId === 'traditional-crafts')).toBe(true)
    })
  })

  describe('getCategoryById', () => {
    it('should return category by ID', async () => {
      const category = await contentSearchService.getCategoryById('mahjong-carving')

      expect(category).not.toBeNull()
      expect(category?.id).toBe('mahjong-carving')
      expect(category?.name['zh-HK']).toBe('手雕麻將')
    })

    it('should return null for non-existent category', async () => {
      const category = await contentSearchService.getCategoryById('non-existent')

      expect(category).toBeNull()
    })
  })

  describe('getCategoriesByCraftType', () => {
    it('should return categories containing specific craft type', async () => {
      const categories = await contentSearchService.getCategoriesByCraftType('手雕麻將')

      expect(categories).toHaveLength(2) // traditional-crafts and mahjong-carving
      expect(categories.every(cat => cat.craftTypes.includes('手雕麻將'))).toBe(true)
    })

    it('should return empty array for non-existent craft type', async () => {
      const categories = await contentSearchService.getCategoriesByCraftType('non-existent')

      expect(categories).toHaveLength(0)
    })
  })

  describe('getPopularSearchTerms', () => {
    it('should return popular search terms', async () => {
      const terms = await contentSearchService.getPopularSearchTerms(5)

      expect(terms).toHaveLength(5)
      expect(terms).toContain('手雕麻將')
      expect(terms).toContain('吹糖')
    })

    it('should respect limit parameter', async () => {
      const terms = await contentSearchService.getPopularSearchTerms(3)

      expect(terms).toHaveLength(3)
    })
  })

  describe('getSearchSuggestions', () => {
    it('should return suggestions for query', async () => {
      const suggestions = await contentSearchService.getSearchSuggestions('手雕', 3)

      expect(suggestions).toHaveLength(1)
      expect(suggestions[0]).toBe('手雕麻將')
    })

    it('should return popular terms for empty query', async () => {
      const suggestions = await contentSearchService.getSearchSuggestions('', 3)

      expect(suggestions).toHaveLength(3)
    })

    it('should handle case insensitive matching', async () => {
      const suggestions = await contentSearchService.getSearchSuggestions('麻將', 5)

      expect(suggestions).toContain('手雕麻將')
    })
  })

  describe('extractMultiLanguageText', () => {
    it('should extract text for specified language', () => {
      const jsonField = {
        name: {
          'zh-HK': '香港名稱',
          'zh-CN': '中国名称',
          'en': 'English Name',
        },
      }

      const result = contentSearchService['extractMultiLanguageText'](
        jsonField,
        'zh-HK',
        'name'
      )

      expect(result).toBe('香港名稱')
    })

    it('should fallback to similar language', () => {
      const jsonField = {
        name: {
          'zh-CN': '中国名称',
          'en': 'English Name',
        },
      }

      const result = contentSearchService['extractMultiLanguageText'](
        jsonField,
        'zh-HK',
        'name'
      )

      expect(result).toBe('中国名称')
    })

    it('should fallback to first available language', () => {
      const jsonField = {
        name: {
          'en': 'English Name',
          'fr': 'Nom Français',
        },
      }

      const result = contentSearchService['extractMultiLanguageText'](
        jsonField,
        'zh-HK',
        'name'
      )

      expect(result).toBe('English Name')
    })

    it('should return undefined for invalid input', () => {
      const result = contentSearchService['extractMultiLanguageText'](
        null,
        'zh-HK',
        'name'
      )

      expect(result).toBeUndefined()
    })
  })
})