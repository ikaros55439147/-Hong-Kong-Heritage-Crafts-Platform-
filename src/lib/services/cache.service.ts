interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number
}

interface CacheOptions {
  ttl?: number // Time to live in milliseconds
  maxSize?: number
}

class CacheService {
  private cache = new Map<string, CacheItem<any>>()
  private defaultTTL = 5 * 60 * 1000 // 5 minutes
  private maxSize = 100

  constructor(options?: CacheOptions) {
    if (options?.ttl) this.defaultTTL = options.ttl
    if (options?.maxSize) this.maxSize = options.maxSize
  }

  set<T>(key: string, data: T, ttl?: number): void {
    // Remove oldest items if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    })
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    
    if (!item) return null

    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }

    return item.data
  }

  has(key: string): boolean {
    const item = this.cache.get(key)
    
    if (!item) return false

    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys())
    }
  }

  // Clean expired items
  cleanup(): void {
    const now = Date.now()
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key)
      }
    }
  }
}

// Create singleton instances for different cache types
export const memoryCache = new CacheService({ ttl: 5 * 60 * 1000, maxSize: 100 })
export const apiCache = new CacheService({ ttl: 2 * 60 * 1000, maxSize: 50 })
export const imageCache = new CacheService({ ttl: 30 * 60 * 1000, maxSize: 200 })

// Content preloading service
export class ContentPreloader {
  private preloadQueue: string[] = []
  private isPreloading = false

  // Preload critical resources
  async preloadCriticalContent(): Promise<void> {
    const criticalResources = [
      '/api/courses?featured=true',
      '/api/craftsmen?featured=true',
      '/api/products?featured=true'
    ]

    await Promise.all(
      criticalResources.map(url => this.preloadResource(url))
    )
  }

  // Preload resource and cache it
  private async preloadResource(url: string): Promise<void> {
    try {
      if (apiCache.has(url)) return

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        apiCache.set(url, data)
      }
    } catch (error) {
      console.warn(`Failed to preload resource: ${url}`, error)
    }
  }

  // Add resource to preload queue
  queuePreload(url: string): void {
    if (!this.preloadQueue.includes(url)) {
      this.preloadQueue.push(url)
      this.processQueue()
    }
  }

  // Process preload queue
  private async processQueue(): Promise<void> {
    if (this.isPreloading || this.preloadQueue.length === 0) return

    this.isPreloading = true

    while (this.preloadQueue.length > 0) {
      const url = this.preloadQueue.shift()!
      await this.preloadResource(url)
      
      // Add small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    this.isPreloading = false
  }

  // Preload images
  preloadImage(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (imageCache.has(src)) {
        resolve()
        return
      }

      const img = new Image()
      img.onload = () => {
        imageCache.set(src, true)
        resolve()
      }
      img.onerror = reject
      img.src = src
    })
  }

  // Preload multiple images
  async preloadImages(sources: string[]): Promise<void> {
    await Promise.all(sources.map(src => this.preloadImage(src)))
  }
}

export const contentPreloader = new ContentPreloader()

// Auto cleanup expired cache items every 5 minutes
setInterval(() => {
  memoryCache.cleanup()
  apiCache.cleanup()
  imageCache.cleanup()
}, 5 * 60 * 1000)