import { prisma } from '../database'
import { Prisma } from '@prisma/client'

export interface SearchQuery {
  query?: string
  category?: string
  craftType?: string
  language?: string
  fileType?: string
  userId?: string
  limit?: number
  offset?: number
  sortBy?: 'relevance' | 'date' | 'popularity'
  sortOrder?: 'asc' | 'desc'
}

export interface SearchResult {
  id: string
  type: 'craftsman' | 'course' | 'product' | 'media'
  title: string
  description?: string
  category: string
  craftType?: string
  imageUrl?: string
  url: string
  relevanceScore?: number
  createdAt: Date
  metadata?: Record<string, any>
}

export interface SearchResponse {
  results: SearchResult[]
  total: number
  facets: {
    categories: Array<{ name: string; count: number }>
    craftTypes: Array<{ name: string; count: number }>
    fileTypes: Array<{ name: string; count: number }>
  }
  query: SearchQuery
}

export interface ContentCategory {
  id: string
  name: Record<string, string> // Multi-language names
  description?: Record<string, string>
  parentId?: string
  level: number
  craftTypes: string[]
  metadata?: Record<string, any>
}

export class ContentSearchService {
  /**
   * Search across all content types
   */
  async search(query: SearchQuery): Promise<SearchResponse> {
    const {
      query: searchQuery,
      category,
      craftType,
      language = 'zh-HK',
      fileType,
      userId,
      limit = 20,
      offset = 0,
      sortBy = 'relevance',
      sortOrder = 'desc',
    } = query

    // Build search results from different content types
    const [
      craftsmanResults,
      courseResults,
      productResults,
      mediaResults,
      facets,
    ] = await Promise.all([
      this.searchCraftsmen(query),
      this.searchCourses(query),
      this.searchProducts(query),
      this.searchMedia(query),
      this.getFacets(query),
    ])

    // Combine and sort results
    let allResults = [
      ...craftsmanResults,
      ...courseResults,
      ...productResults,
      ...mediaResults,
    ]

    // Apply sorting
    allResults = this.sortResults(allResults, sortBy, sortOrder)

    // Apply pagination
    const paginatedResults = allResults.slice(offset, offset + limit)

    return {
      results: paginatedResults,
      total: allResults.length,
      facets,
      query,
    }
  }

  /**
   * Search craftsmen profiles
   */
  private async searchCraftsmen(query: SearchQuery): Promise<SearchResult[]> {
    const {
      query: searchQuery,
      category,
      craftType,
      language = 'zh-HK',
    } = query

    const whereClause: Prisma.CraftsmanProfileWhereInput = {
      verificationStatus: 'VERIFIED',
      ...(craftType && {
        craftSpecialties: {
          has: craftType,
        },
      }),
    }

    // Add text search if query provided
    if (searchQuery) {
      whereClause.OR = [
        {
          user: {
            email: {
              contains: searchQuery,
              mode: 'insensitive',
            },
          },
        },
        {
          craftSpecialties: {
            hasSome: [searchQuery],
          },
        },
        {
          workshopLocation: {
            contains: searchQuery,
            mode: 'insensitive',
          },
        },
      ]
    }

    const craftsmen = await prisma.craftsmanProfile.findMany({
      where: whereClause,
      include: {
        user: true,
      },
      take: 50, // Limit per content type
    })

    return craftsmen.map(craftsman => ({
      id: craftsman.id,
      type: 'craftsman' as const,
      title: this.extractMultiLanguageText(craftsman.bio, language, 'name') || craftsman.user.email,
      description: this.extractMultiLanguageText(craftsman.bio, language, 'description'),
      category: 'craftsman',
      craftType: craftsman.craftSpecialties[0],
      url: `/craftsmen/${craftsman.id}`,
      createdAt: craftsman.createdAt,
      metadata: {
        experienceYears: craftsman.experienceYears,
        location: craftsman.workshopLocation,
        specialties: craftsman.craftSpecialties,
      },
    }))
  }

  /**
   * Search courses
   */
  private async searchCourses(query: SearchQuery): Promise<SearchResult[]> {
    const {
      query: searchQuery,
      category,
      craftType,
      language = 'zh-HK',
    } = query

    const whereClause: Prisma.CourseWhereInput = {
      status: 'ACTIVE',
      ...(craftType && {
        craftCategory: craftType,
      }),
    }

    // Add text search if query provided
    if (searchQuery) {
      whereClause.OR = [
        {
          craftCategory: {
            contains: searchQuery,
            mode: 'insensitive',
          },
        },
      ]
    }

    const courses = await prisma.course.findMany({
      where: whereClause,
      include: {
        craftsman: {
          include: {
            user: true,
          },
        },
      },
      take: 50,
    })

    return courses.map(course => ({
      id: course.id,
      type: 'course' as const,
      title: this.extractMultiLanguageText(course.title, language) || course.craftCategory,
      description: this.extractMultiLanguageText(course.description, language),
      category: 'course',
      craftType: course.craftCategory,
      url: `/courses/${course.id}`,
      createdAt: course.createdAt,
      metadata: {
        price: course.price ? Number(course.price) : null,
        duration: course.durationHours ? Number(course.durationHours) : null,
        maxParticipants: course.maxParticipants,
        craftsmanName: course.craftsman.user.email,
      },
    }))
  }

  /**
   * Search products
   */
  private async searchProducts(query: SearchQuery): Promise<SearchResult[]> {
    const {
      query: searchQuery,
      category,
      craftType,
      language = 'zh-HK',
    } = query

    const whereClause: Prisma.ProductWhereInput = {
      status: 'ACTIVE',
      inventoryQuantity: {
        gt: 0,
      },
      ...(craftType && {
        craftCategory: craftType,
      }),
    }

    // Add text search if query provided
    if (searchQuery) {
      whereClause.OR = [
        {
          craftCategory: {
            contains: searchQuery,
            mode: 'insensitive',
          },
        },
      ]
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        craftsman: {
          include: {
            user: true,
          },
        },
      },
      take: 50,
    })

    return products.map(product => ({
      id: product.id,
      type: 'product' as const,
      title: this.extractMultiLanguageText(product.name, language) || 'Product',
      description: this.extractMultiLanguageText(product.description, language),
      category: 'product',
      craftType: product.craftCategory,
      url: `/products/${product.id}`,
      createdAt: product.createdAt,
      metadata: {
        price: Number(product.price),
        inventory: product.inventoryQuantity,
        isCustomizable: product.isCustomizable,
        craftsmanName: product.craftsman.user.email,
      },
    }))
  }

  /**
   * Search media files
   */
  private async searchMedia(query: SearchQuery): Promise<SearchResult[]> {
    const {
      query: searchQuery,
      fileType,
      userId,
    } = query

    const whereClause: Prisma.MediaFileWhereInput = {
      ...(fileType && {
        fileType: fileType.toUpperCase(),
      }),
      ...(userId && {
        uploaderId: userId,
      }),
    }

    const mediaFiles = await prisma.mediaFile.findMany({
      where: whereClause,
      include: {
        uploader: true,
      },
      take: 50,
    })

    return mediaFiles.map(media => ({
      id: media.id,
      type: 'media' as const,
      title: (media.metadata as any)?.originalName || 'Media File',
      description: (media.metadata as any)?.description,
      category: 'media',
      imageUrl: media.fileType === 'IMAGE' ? media.fileUrl : (media.metadata as any)?.thumbnailUrl,
      url: media.fileUrl,
      createdAt: media.createdAt,
      metadata: {
        fileType: media.fileType,
        fileSize: Number(media.fileSize),
        uploader: media.uploader.email,
        ...media.metadata as Record<string, any>,
      },
    }))
  }

  /**
   * Get search facets for filtering
   */
  private async getFacets(query: SearchQuery): Promise<SearchResponse['facets']> {
    const [categories, craftTypes, fileTypes] = await Promise.all([
      // Categories (content types)
      Promise.resolve([
        { name: 'craftsman', count: 0 },
        { name: 'course', count: 0 },
        { name: 'product', count: 0 },
        { name: 'media', count: 0 },
      ]),
      
      // Craft types from craftsman specialties
      prisma.craftsmanProfile.groupBy({
        by: ['craftSpecialties'],
        _count: true,
        where: { verificationStatus: 'VERIFIED' },
      }).then(results => {
        const craftTypeCounts: Record<string, number> = {}
        results.forEach(result => {
          result.craftSpecialties.forEach(specialty => {
            craftTypeCounts[specialty] = (craftTypeCounts[specialty] || 0) + result._count
          })
        })
        return Object.entries(craftTypeCounts).map(([name, count]) => ({ name, count }))
      }),
      
      // File types from media files
      prisma.mediaFile.groupBy({
        by: ['fileType'],
        _count: true,
      }).then(results => 
        results.map(result => ({
          name: result.fileType.toLowerCase(),
          count: result._count,
        }))
      ),
    ])

    return {
      categories,
      craftTypes,
      fileTypes,
    }
  }

  /**
   * Sort search results
   */
  private sortResults(
    results: SearchResult[],
    sortBy: SearchQuery['sortBy'],
    sortOrder: SearchQuery['sortOrder']
  ): SearchResult[] {
    return results.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'date':
          comparison = a.createdAt.getTime() - b.createdAt.getTime()
          break
        case 'relevance':
          comparison = (b.relevanceScore || 0) - (a.relevanceScore || 0)
          break
        case 'popularity':
          // For now, use creation date as proxy for popularity
          comparison = a.createdAt.getTime() - b.createdAt.getTime()
          break
        default:
          comparison = 0
      }

      return sortOrder === 'desc' ? -comparison : comparison
    })
  }

  /**
   * Extract text from multi-language JSON field
   */
  private extractMultiLanguageText(
    jsonField: any,
    language: string,
    key?: string
  ): string | undefined {
    if (!jsonField || typeof jsonField !== 'object') {
      return undefined
    }

    const data = key ? jsonField[key] : jsonField
    if (!data || typeof data !== 'object') {
      return undefined
    }

    // Try exact language match first
    if (data[language]) {
      return data[language]
    }

    // Fallback to similar language (e.g., zh-CN for zh-HK)
    const languagePrefix = language.split('-')[0]
    const fallbackKey = Object.keys(data).find(key => key.startsWith(languagePrefix))
    if (fallbackKey && data[fallbackKey]) {
      return data[fallbackKey]
    }

    // Fallback to first available language
    const firstKey = Object.keys(data)[0]
    return firstKey ? data[firstKey] : undefined
  }

  /**
   * Get content categories
   */
  async getCategories(): Promise<ContentCategory[]> {
    // For now, return predefined categories
    // In a real implementation, these might be stored in the database
    return [
      {
        id: 'traditional-crafts',
        name: {
          'zh-HK': '傳統工藝',
          'zh-CN': '传统工艺',
          'en': 'Traditional Crafts',
        },
        description: {
          'zh-HK': '香港傳統手工藝',
          'zh-CN': '香港传统手工艺',
          'en': 'Hong Kong Traditional Handicrafts',
        },
        level: 0,
        craftTypes: ['手雕麻將', '吹糖', '竹編', '打鐵', '製香', '紮作'],
      },
      {
        id: 'mahjong-carving',
        name: {
          'zh-HK': '手雕麻將',
          'zh-CN': '手雕麻将',
          'en': 'Hand-carved Mahjong',
        },
        parentId: 'traditional-crafts',
        level: 1,
        craftTypes: ['手雕麻將'],
      },
      {
        id: 'sugar-blowing',
        name: {
          'zh-HK': '吹糖',
          'zh-CN': '吹糖',
          'en': 'Sugar Blowing',
        },
        parentId: 'traditional-crafts',
        level: 1,
        craftTypes: ['吹糖'],
      },
      {
        id: 'bamboo-weaving',
        name: {
          'zh-HK': '竹編',
          'zh-CN': '竹编',
          'en': 'Bamboo Weaving',
        },
        parentId: 'traditional-crafts',
        level: 1,
        craftTypes: ['竹編'],
      },
      {
        id: 'blacksmithing',
        name: {
          'zh-HK': '打鐵',
          'zh-CN': '打铁',
          'en': 'Blacksmithing',
        },
        parentId: 'traditional-crafts',
        level: 1,
        craftTypes: ['打鐵'],
      },
      {
        id: 'incense-making',
        name: {
          'zh-HK': '製香',
          'zh-CN': '制香',
          'en': 'Incense Making',
        },
        parentId: 'traditional-crafts',
        level: 1,
        craftTypes: ['製香'],
      },
      {
        id: 'paper-crafts',
        name: {
          'zh-HK': '紮作',
          'zh-CN': '扎作',
          'en': 'Paper Crafts',
        },
        parentId: 'traditional-crafts',
        level: 1,
        craftTypes: ['紮作'],
      },
    ]
  }

  /**
   * Get category by ID
   */
  async getCategoryById(id: string): Promise<ContentCategory | null> {
    const categories = await this.getCategories()
    return categories.find(cat => cat.id === id) || null
  }

  /**
   * Get categories by craft type
   */
  async getCategoriesByCraftType(craftType: string): Promise<ContentCategory[]> {
    const categories = await this.getCategories()
    return categories.filter(cat => cat.craftTypes.includes(craftType))
  }

  /**
   * Get popular search terms
   */
  async getPopularSearchTerms(limit: number = 10): Promise<string[]> {
    // In a real implementation, this would track search queries
    // For now, return common craft types
    const allTerms = [
      '手雕麻將',
      '吹糖',
      '竹編',
      '打鐵',
      '製香',
      '紮作',
      '傳統工藝',
      '手工藝',
      '課程',
      '產品',
    ]
    
    return allTerms.slice(0, limit)
  }

  /**
   * Get search suggestions
   */
  async getSearchSuggestions(query: string, limit: number = 5): Promise<string[]> {
    const popularTerms = await this.getPopularSearchTerms(20)
    
    if (!query.trim()) {
      return popularTerms.slice(0, limit)
    }

    // Simple fuzzy matching
    const suggestions = popularTerms.filter(term =>
      term.toLowerCase().includes(query.toLowerCase()) ||
      query.toLowerCase().includes(term.toLowerCase())
    )

    return suggestions.slice(0, limit)
  }
}

export const contentSearchService = new ContentSearchService()