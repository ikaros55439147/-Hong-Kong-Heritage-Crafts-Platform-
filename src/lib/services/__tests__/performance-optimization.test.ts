import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { memoryCache, apiCache, imageCache, contentPreloader } from '../cache.service'
import { offlineService } from '../offline.service'
import { QueryOptimizerService } from '../query-optimizer.service'

// Mock PrismaClient
const mockPrisma = {
  findMany: vi.fn(),
  count: vi.fn(),
  createMany: vi.fn(),
  update: vi.fn(),
  aggregate: vi.fn()
}

describe('Performance Optimization Services', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    memoryCache.clear()
    apiCache.clear()
    imageCache.clear()
  })

  describe('Cache Service', () => {
    it('should store and retrieve data from memory cache', () => {
      const testData = { id: 1, name: 'Test' }
      memoryCache.set('test-key', testData)
      
      const retrieved = memoryCache.get('test-key')
      expect(retrieved).toEqual(testData)
    })

    it('should respect TTL and expire data', async () => {
      const testData = { id: 1, name: 'Test' }
      memoryCache.set('test-key', testData, 100) // 100ms TTL
      
      expect(memoryCache.get('test-key')).toEqual(testData)
      
      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 150))
      
      expect(memoryCache.get('test-key')).toBeNull()
    })

    it('should handle cache size limits', () => {
      const smallCache = new (memoryCache.constructor as any)({ maxSize: 2 })
      
      smallCache.set('key1', 'value1')
      smallCache.set('key2', 'value2')
      smallCache.set('key3', 'value3') // Should evict key1
      
      expect(smallCache.get('key1')).toBeNull()
      expect(smallCache.get('key2')).toBe('value2')
      expect(smallCache.get('key3')).toBe('value3')
    })

    it('should provide cache statistics', () => {
      memoryCache.set('key1', 'value1')
      memoryCache.set('key2', 'value2')
      
      const stats = memoryCache.getStats()
      expect(stats.size).toBe(2)
      expect(stats.keys).toContain('key1')
      expect(stats.keys).toContain('key2')
    })
  })

  describe('Content Preloader', () => {
    beforeEach(() => {
      global.fetch = vi.fn()
      global.Image = vi.fn(() => ({
        onload: null,
        onerror: null,
        src: ''
      })) as any
    })

    it('should preload critical content', async () => {
      const mockFetch = global.fetch as any
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'test' })
      })

      await contentPreloader.preloadCriticalContent()
      
      expect(mockFetch).toHaveBeenCalledWith('/api/courses?featured=true')
      expect(mockFetch).toHaveBeenCalledWith('/api/craftsmen?featured=true')
      expect(mockFetch).toHaveBeenCalledWith('/api/products?featured=true')
    })

    it('should queue resources for preloading', async () => {
      const mockFetch = global.fetch as any
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'test' })
      })

      contentPreloader.queuePreload('/api/test-resource')
      
      // Wait for the queue to process
      await new Promise(resolve => setTimeout(resolve, 300))
      
      expect(mockFetch).toHaveBeenCalledWith('/api/test-resource')
    })

    it('should preload images', async () => {
      const mockImage = {
        onload: null,
        onerror: null,
        src: ''
      }
      global.Image = vi.fn(() => mockImage) as any

      const preloadPromise = contentPreloader.preloadImage('/test-image.jpg')
      
      // Simulate image load
      setTimeout(() => {
        if (mockImage.onload) mockImage.onload()
      }, 10)
      
      await expect(preloadPromise).resolves.toBeUndefined()
      expect(imageCache.has('/test-image.jpg')).toBe(true)
    })
  })

  describe('Offline Service', () => {
    let offlineServiceInstance: any

    beforeEach(() => {
      // Mock localStorage
      global.localStorage = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      } as any

      // Mock navigator
      global.navigator = {
        onLine: true
      } as any

      // Mock window events
      global.window = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      } as any

      offlineServiceInstance = offlineService
    })

    it('should queue actions when offline', () => {
      const actionId = offlineServiceInstance.queueAction('CREATE_BOOKING', {
        courseId: '123',
        userId: '456'
      })
      
      expect(actionId).toBeDefined()
      expect(typeof actionId).toBe('string')
    })

    it('should store and retrieve offline data', () => {
      const testData = { id: 1, name: 'Test Course' }
      
      offlineServiceInstance.storeOfflineData('course-123', testData, 60)
      const retrieved = offlineServiceInstance.getOfflineData('course-123')
      
      expect(retrieved).toEqual(testData)
    })

    it('should handle expired offline data', () => {
      const testData = { id: 1, name: 'Test Course' }
      
      // Store with very short TTL
      offlineServiceInstance.storeOfflineData('course-123', testData, 0.001) // ~0.06 seconds
      
      setTimeout(() => {
        const retrieved = offlineServiceInstance.getOfflineData('course-123')
        expect(retrieved).toBeNull()
      }, 100)
    })

    it('should provide offline statistics', () => {
      // Clear any existing data first
      offlineServiceInstance.clearOfflineData()
      
      offlineServiceInstance.queueAction('TEST_ACTION', { data: 'test' })
      offlineServiceInstance.storeOfflineData('test-key', { data: 'test' })
      
      const stats = offlineServiceInstance.getOfflineStats()
      
      expect(stats.pendingActions).toBe(1)
      expect(stats.offlineDataCount).toBe(1)
      expect(stats.isOnline).toBeDefined()
    })
  })

  describe('Query Optimizer Service', () => {
    let queryOptimizer: QueryOptimizerService

    beforeEach(() => {
      queryOptimizer = new QueryOptimizerService(mockPrisma as any)
    })

    it('should implement cursor-based pagination', async () => {
      const mockResults = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
        { id: '3', name: 'Item 3' }
      ]
      
      mockPrisma.findMany.mockResolvedValue(mockResults)
      
      const result = await queryOptimizer.paginateWithCursor(mockPrisma, {
        limit: 2,
        sortBy: 'createdAt'
      })
      
      expect(result.data).toHaveLength(2)
      expect(result.nextCursor).toBe('2')
      expect(mockPrisma.findMany).toHaveBeenCalledWith({
        take: 3, // limit + 1
        orderBy: { createdAt: 'desc' }
      })
    })

    it('should implement offset-based pagination', async () => {
      const mockData = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' }
      ]
      
      mockPrisma.findMany.mockResolvedValue(mockData)
      mockPrisma.count.mockResolvedValue(10)
      
      const result = await queryOptimizer.paginateWithOffset(mockPrisma, {
        page: 2,
        limit: 2
      })
      
      expect(result.data).toEqual(mockData)
      expect(result.pagination.page).toBe(2)
      expect(result.pagination.total).toBe(10)
      expect(result.pagination.totalPages).toBe(5)
      expect(result.pagination.hasNext).toBe(true)
      expect(result.pagination.hasPrev).toBe(true)
    })

    it('should handle batch operations', async () => {
      const testData = [
        { name: 'Item 1' },
        { name: 'Item 2' }
      ]
      
      mockPrisma.createMany.mockResolvedValue({ count: 2 })
      
      const result = await queryOptimizer.batchCreate(mockPrisma, testData)
      
      expect(result.count).toBe(2)
      expect(mockPrisma.createMany).toHaveBeenCalledWith({
        data: testData,
        skipDuplicates: true
      })
    })

    it('should implement full-text search', async () => {
      const mockResults = [
        { id: '1', title: 'Test Course', description: 'Learn testing' }
      ]
      
      mockPrisma.findMany.mockResolvedValue(mockResults)
      
      const results = await queryOptimizer.searchWithFullText(
        mockPrisma,
        'test',
        ['title', 'description'],
        { limit: 10 }
      )
      
      expect(results).toEqual(mockResults)
      expect(mockPrisma.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { title: { contains: 'test', mode: 'insensitive' } },
            { description: { contains: 'test', mode: 'insensitive' } }
          ]
        },
        take: 10,
        orderBy: {
          _relevance: {
            fields: ['title', 'description'],
            search: 'test',
            sort: 'desc'
          }
        }
      })
    })

    it('should measure query performance', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      mockPrisma.findMany.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([]), 1100)) // Slow query
      )
      
      await queryOptimizer.executeWithTiming('slow-query', () => 
        mockPrisma.findMany()
      )
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow query detected: slow-query took')
      )
      
      consoleSpy.mockRestore()
    })
  })

  describe('Integration Tests', () => {
    it('should work together for optimized data loading', async () => {
      // Mock successful API response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'cached-data' })
      })

      // Preload content
      await contentPreloader.preloadCriticalContent()
      
      // Check if data is cached
      expect(apiCache.has('/api/courses?featured=true')).toBe(true)
      
      // Retrieve cached data
      const cachedData = apiCache.get('/api/courses?featured=true')
      expect(cachedData).toEqual({ data: 'cached-data' })
    })

    it('should handle offline scenarios gracefully', () => {
      const offlineServiceInstance = offlineService
      
      // Queue an action
      const actionId = offlineServiceInstance.queueAction('CREATE_BOOKING', {
        courseId: '123'
      })
      
      // Store offline data
      offlineServiceInstance.storeOfflineData('booking-123', {
        status: 'pending'
      })
      
      // Verify offline capabilities
      expect(actionId).toBeDefined()
      expect(offlineServiceInstance.getOfflineData('booking-123')).toEqual({
        status: 'pending'
      })
    })
  })
})