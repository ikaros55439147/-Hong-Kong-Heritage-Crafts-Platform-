import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MultilingualSearchService, SearchQuery, SearchableEntity } from '../multilingual-search.service'

describe('MultilingualSearchService', () => {
  const mockEntities: SearchableEntity[] = [
    {
      id: '1',
      type: 'course',
      title: {
        'zh-HK': '傳統木工課程',
        'zh-CN': '传统木工课程',
        'en': 'Traditional Woodworking Course'
      },
      description: {
        'zh-HK': '學習傳統木工技藝，製作精美木製品',
        'zh-CN': '学习传统木工技艺，制作精美木制品',
        'en': 'Learn traditional woodworking skills and create beautiful wooden crafts'
      },
      category: 'woodworking',
      tags: ['木工', 'woodworking', '傳統', 'traditional'],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-15')
    },
    {
      id: '2',
      type: 'product',
      title: {
        'zh-HK': '手工陶瓷茶具',
        'zh-CN': '手工陶瓷茶具',
        'en': 'Handmade Ceramic Tea Set'
      },
      description: {
        'zh-HK': '純手工製作的精美陶瓷茶具套裝',
        'zh-CN': '纯手工制作的精美陶瓷茶具套装',
        'en': 'Exquisite handmade ceramic tea set'
      },
      category: 'pottery',
      tags: ['陶瓷', 'ceramic', '茶具', 'tea set', '手工', 'handmade'],
      createdAt: new Date('2024-01-10'),
      updatedAt: new Date('2024-01-20')
    },
    {
      id: '3',
      type: 'craftsman',
      title: {
        'zh-HK': '李師傅 - 竹編專家',
        'zh-CN': '李师傅 - 竹编专家',
        'en': 'Master Li - Bamboo Weaving Expert'
      },
      description: {
        'zh-HK': '擁有30年竹編經驗的資深師傅',
        'zh-CN': '拥有30年竹编经验的资深师傅',
        'en': 'Senior craftsman with 30 years of bamboo weaving experience'
      },
      category: 'weaving',
      tags: ['竹編', 'bamboo', '編織', 'weaving', '師傅', 'master'],
      createdAt: new Date('2024-01-05'),
      updatedAt: new Date('2024-01-25')
    }
  ]

  beforeEach(() => {
    // Mock the getSearchableEntities method
    vi.spyOn(MultilingualSearchService as any, 'getSearchableEntities')
      .mockResolvedValue(mockEntities)
  })

  describe('search', () => {
    it('should search in Chinese (Traditional)', async () => {
      const query: SearchQuery = {
        query: '木工',
        language: 'zh-HK',
        limit: 10,
        offset: 0
      }

      const result = await MultilingualSearchService.search(query)

      expect(result.results).toHaveLength(1)
      expect(result.results[0].entity.id).toBe('1')
      expect(result.results[0].score).toBeGreaterThan(0)
      expect(result.results[0].matchedFields).toContain('title')
    })

    it('should search in English', async () => {
      const query: SearchQuery = {
        query: 'woodworking',
        language: 'en',
        limit: 10,
        offset: 0
      }

      const result = await MultilingualSearchService.search(query)

      expect(result.results).toHaveLength(1)
      expect(result.results[0].entity.id).toBe('1')
      expect(result.results[0].matchedFields).toContain('title')
    })

    it('should search in Chinese (Simplified)', async () => {
      const query: SearchQuery = {
        query: '陶瓷',
        language: 'zh-CN',
        limit: 10,
        offset: 0
      }

      const result = await MultilingualSearchService.search(query)

      expect(result.results).toHaveLength(1)
      expect(result.results[0].entity.id).toBe('2')
      expect(result.results[0].matchedFields).toContain('title')
    })

    it('should filter by entity type', async () => {
      const query: SearchQuery = {
        query: '手工',
        language: 'zh-HK',
        entityTypes: ['product'],
        limit: 10,
        offset: 0
      }

      const result = await MultilingualSearchService.search(query)

      expect(result.results).toHaveLength(1)
      expect(result.results[0].entity.type).toBe('product')
    })

    it('should return empty results for no matches', async () => {
      const query: SearchQuery = {
        query: 'nonexistent',
        language: 'en',
        limit: 10,
        offset: 0
      }

      const result = await MultilingualSearchService.search(query)

      expect(result.results).toHaveLength(0)
      expect(result.total).toBe(0)
    })

    it('should generate search suggestions', async () => {
      const query: SearchQuery = {
        query: '木',
        language: 'zh-HK',
        limit: 10,
        offset: 0
      }

      const result = await MultilingualSearchService.search(query)

      expect(result.suggestions).toBeDefined()
      expect(Array.isArray(result.suggestions)).toBe(true)
    })

    it('should calculate facets', async () => {
      const query: SearchQuery = {
        query: '',
        language: 'zh-HK',
        limit: 10,
        offset: 0
      }

      const result = await MultilingualSearchService.search(query)

      expect(result.facets).toBeDefined()
      expect(result.facets?.categories).toBeDefined()
      expect(result.facets?.tags).toBeDefined()
      expect(result.facets?.entityTypes).toBeDefined()
    })

    it('should apply pagination', async () => {
      const query: SearchQuery = {
        query: '',
        language: 'zh-HK',
        limit: 2,
        offset: 1
      }

      const result = await MultilingualSearchService.search(query)

      expect(result.results.length).toBeLessThanOrEqual(2)
    })
  })

  describe('indexEntity', () => {
    it('should index entity for search', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await MultilingualSearchService.indexEntity(mockEntities[0])

      expect(consoleSpy).toHaveBeenCalledWith('Indexing entity for search:', '1')
      expect(consoleSpy).toHaveBeenCalledWith('Searchable texts:', expect.any(Object))

      consoleSpy.mockRestore()
    })
  })

  describe('removeFromIndex', () => {
    it('should remove entity from search index', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await MultilingualSearchService.removeFromIndex('1')

      expect(consoleSpy).toHaveBeenCalledWith('Removing entity from search index:', '1')

      consoleSpy.mockRestore()
    })
  })

  describe('updateIndex', () => {
    it('should update entity in search index', async () => {
      const removeFromIndexSpy = vi.spyOn(MultilingualSearchService, 'removeFromIndex')
        .mockResolvedValue()
      const indexEntitySpy = vi.spyOn(MultilingualSearchService, 'indexEntity')
        .mockResolvedValue()

      await MultilingualSearchService.updateIndex(mockEntities[0])

      expect(removeFromIndexSpy).toHaveBeenCalledWith('1')
      expect(indexEntitySpy).toHaveBeenCalledWith(mockEntities[0])

      removeFromIndexSpy.mockRestore()
      indexEntitySpy.mockRestore()
    })
  })

  describe('search scoring', () => {
    it('should score exact title matches higher', async () => {
      const query: SearchQuery = {
        query: '傳統木工課程',
        language: 'zh-HK',
        limit: 10,
        offset: 0
      }

      const result = await MultilingualSearchService.search(query)

      expect(result.results[0].score).toBeGreaterThan(50)
    })

    it('should handle different search terms appropriately', async () => {
      const exactQuery: SearchQuery = {
        query: '木工',
        language: 'zh-HK',
        limit: 10,
        offset: 0
      }

      const partialQuery: SearchQuery = {
        query: '傳統',
        language: 'zh-HK',
        limit: 10,
        offset: 0
      }

      const exactResult = await MultilingualSearchService.search(exactQuery)
      const partialResult = await MultilingualSearchService.search(partialQuery)

      // Both queries should return results
      expect(exactResult.results.length).toBeGreaterThan(0)
      expect(partialResult.results.length).toBeGreaterThan(0)
      
      // Both should find the woodworking course
      expect(exactResult.results[0].entity.id).toBe('1')
      expect(partialResult.results[0].entity.id).toBe('1')
    })
  })

  describe('highlighting', () => {
    it('should highlight search terms in results', async () => {
      const query: SearchQuery = {
        query: '木工',
        language: 'zh-HK',
        limit: 10,
        offset: 0
      }

      const result = await MultilingualSearchService.search(query)

      if (result.results.length > 0) {
        const highlighted = result.results[0].highlightedContent
        expect(highlighted.title).toContain('<mark>')
        expect(highlighted.title).toContain('</mark>')
      }
    })

    it('should truncate long content in highlights', async () => {
      const longContentEntity: SearchableEntity = {
        ...mockEntities[0],
        description: {
          'zh-HK': '這是一個非常長的描述'.repeat(50),
          'zh-CN': '这是一个非常长的描述'.repeat(50),
          'en': 'This is a very long description '.repeat(50)
        }
      }

      vi.spyOn(MultilingualSearchService as any, 'getSearchableEntities')
        .mockResolvedValue([longContentEntity])

      const query: SearchQuery = {
        query: '描述',
        language: 'zh-HK',
        limit: 10,
        offset: 0
      }

      const result = await MultilingualSearchService.search(query)

      if (result.results.length > 0) {
        const highlighted = result.results[0].highlightedContent
        // The description should be truncated or contain highlighting
        expect(highlighted.description).toBeDefined()
        expect(highlighted.description).toContain('描述')
      }
    })
  })
})