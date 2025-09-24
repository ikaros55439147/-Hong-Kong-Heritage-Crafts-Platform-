import { prisma } from '../database'
import { Prisma } from '@prisma/client'
import { contentSearchService, SearchQuery, SearchResult, SearchResponse } from './content-search.service'
import { userBehaviorService, UserBehaviorEvent } from './user-behavior.service'

export interface EnhancedSearchQuery extends SearchQuery {
  userId?: string
  includeRecommendations?: boolean
  personalizeResults?: boolean
  trackSearch?: boolean
}

export interface SearchSuggestion {
  text: string
  type: 'query' | 'category' | 'craftType' | 'location'
  count?: number
  highlighted?: string
}

export interface AutoCompleteResult {
  suggestions: SearchSuggestion[]
  popularQueries: string[]
  recentSearches: string[]
}

export interface SearchAnalytics {
  totalSearches: number
  popularQueries: Array<{ query: string; count: number }>
  popularCategories: Array<{ category: string; count: number }>
  searchTrends: Array<{ date: string; count: number }>
  avgResultsPerSearch: number
  clickThroughRate: number
}

export class EnhancedSearchService {
  /**
   * Enhanced search with personalization and recommendations
   */
  async search(query: EnhancedSearchQuery): Promise<SearchResponse & {
    recommendations?: SearchResult[]
    personalizedResults?: boolean
  }> {
    const {
      userId,
      includeRecommendations = false,
      personalizeResults = true,
      trackSearch = true,
      ...baseQuery
    } = query

    // Track search behavior
    if (trackSearch && userId && baseQuery.query) {
      await userBehaviorService.trackEvent({
        userId,
        eventType: 'search',
        entityType: 'media', // Generic type for search
        entityId: 'search',
        metadata: {
          query: baseQuery.query,
          category: baseQuery.category,
          craftType: baseQuery.craftType
        }
      })
    }

    // Perform base search
    let searchResponse = await contentSearchService.search(baseQuery)

    // Apply personalization if user is logged in
    if (personalizeResults && userId) {
      searchResponse = await this.personalizeSearchResults(searchResponse, userId)
    }

    // Apply intelligent ranking
    searchResponse.results = await this.applyIntelligentRanking(
      searchResponse.results,
      baseQuery,
      userId
    )

    // Add recommendations if requested
    let recommendations: SearchResult[] = []
    if (includeRecommendations && userId) {
      const recs = await userBehaviorService.getRecommendations({
        userId,
        limit: 5,
        excludeViewed: true
      })
      
      recommendations = recs.map(rec => ({
        id: rec.id,
        type: rec.type,
        title: rec.title,
        description: rec.description,
        category: rec.type,
        craftType: rec.metadata?.craftType,
        imageUrl: rec.metadata?.imageUrl,
        url: rec.url,
        relevanceScore: rec.score,
        createdAt: new Date(),
        metadata: { ...rec.metadata, recommendationReason: rec.reason }
      }))
    }

    return {
      ...searchResponse,
      recommendations,
      personalizedResults: personalizeResults && !!userId
    }
  }

  /**
   * Get intelligent auto-complete suggestions
   */
  async getAutoComplete(
    query: string,
    userId?: string,
    limit: number = 10
  ): Promise<AutoCompleteResult> {
    const suggestions: SearchSuggestion[] = []
    
    try {
      // Get query-based suggestions
      const querySuggestions = await this.getQuerySuggestions(query, limit)
      suggestions.push(...querySuggestions)

      // Get category suggestions
      const categorySuggestions = await this.getCategorySuggestions(query, 3)
      suggestions.push(...categorySuggestions)

      // Get craft type suggestions
      const craftTypeSuggestions = await this.getCraftTypeSuggestions(query, 3)
      suggestions.push(...craftTypeSuggestions)

      // Get location suggestions
      const locationSuggestions = await this.getLocationSuggestions(query, 2)
      suggestions.push(...locationSuggestions)

      // Get popular queries
      const popularQueries = await this.getPopularQueries(5)

      // Get user's recent searches
      const recentSearches = userId 
        ? await this.getUserRecentSearches(userId, 5)
        : []

      return {
        suggestions: suggestions.slice(0, limit),
        popularQueries,
        recentSearches
      }
    } catch (error) {
      console.error('Auto-complete error:', error)
      return {
        suggestions: [],
        popularQueries: [],
        recentSearches: []
      }
    }
  }

  /**
   * Get search analytics
   */
  async getSearchAnalytics(
    startDate?: Date,
    endDate?: Date
  ): Promise<SearchAnalytics> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
    const end = endDate || new Date()

    try {
      // Get total searches
      const totalSearches = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count
        FROM user_behavior_events
        WHERE event_type = 'search'
        AND created_at BETWEEN ${start} AND ${end}
      `

      // Get popular queries
      const popularQueries = await prisma.$queryRaw<Array<{
        query: string
        count: bigint
      }>>`
        SELECT 
          metadata->>'query' as query,
          COUNT(*) as count
        FROM user_behavior_events
        WHERE event_type = 'search'
        AND created_at BETWEEN ${start} AND ${end}
        AND metadata->>'query' IS NOT NULL
        GROUP BY metadata->>'query'
        ORDER BY count DESC
        LIMIT 10
      `

      // Get popular categories
      const popularCategories = await prisma.$queryRaw<Array<{
        category: string
        count: bigint
      }>>`
        SELECT 
          metadata->>'category' as category,
          COUNT(*) as count
        FROM user_behavior_events
        WHERE event_type = 'search'
        AND created_at BETWEEN ${start} AND ${end}
        AND metadata->>'category' IS NOT NULL
        GROUP BY metadata->>'category'
        ORDER BY count DESC
        LIMIT 10
      `

      // Get search trends (daily)
      const searchTrends = await prisma.$queryRaw<Array<{
        date: string
        count: bigint
      }>>`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count
        FROM user_behavior_events
        WHERE event_type = 'search'
        AND created_at BETWEEN ${start} AND ${end}
        GROUP BY DATE(created_at)
        ORDER BY date
      `

      // Calculate click-through rate
      const searchClicks = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count
        FROM user_behavior_events
        WHERE event_type = 'click'
        AND created_at BETWEEN ${start} AND ${end}
        AND metadata->>'source' = 'search'
      `

      const totalSearchCount = Number(totalSearches[0]?.count || 0)
      const totalClickCount = Number(searchClicks[0]?.count || 0)
      const clickThroughRate = totalSearchCount > 0 ? totalClickCount / totalSearchCount : 0

      return {
        totalSearches: totalSearchCount,
        popularQueries: popularQueries.map(pq => ({
          query: pq.query,
          count: Number(pq.count)
        })),
        popularCategories: popularCategories.map(pc => ({
          category: pc.category,
          count: Number(pc.count)
        })),
        searchTrends: searchTrends.map(st => ({
          date: st.date,
          count: Number(st.count)
        })),
        avgResultsPerSearch: 0, // Would need to track this separately
        clickThroughRate
      }
    } catch (error) {
      console.error('Search analytics error:', error)
      return {
        totalSearches: 0,
        popularQueries: [],
        popularCategories: [],
        searchTrends: [],
        avgResultsPerSearch: 0,
        clickThroughRate: 0
      }
    }
  }

  /**
   * Track search result click
   */
  async trackResultClick(
    userId: string,
    resultId: string,
    resultType: 'craftsman' | 'course' | 'product' | 'media',
    searchQuery?: string,
    position?: number
  ): Promise<void> {
    await userBehaviorService.trackEvent({
      userId,
      eventType: 'click',
      entityType: resultType,
      entityId: resultId,
      metadata: {
        source: 'search',
        searchQuery,
        position,
        timestamp: new Date()
      }
    })
  }

  /**
   * Personalize search results based on user preferences
   */
  private async personalizeSearchResults(
    searchResponse: SearchResponse,
    userId: string
  ): Promise<SearchResponse> {
    try {
      const preferences = await userBehaviorService.getUserPreferences(userId)
      
      // Boost results matching user's craft type preferences
      const personalizedResults = searchResponse.results.map(result => {
        let boost = 0
        
        // Boost based on craft type preference
        if (result.craftType && preferences.craftTypes.includes(result.craftType)) {
          const preferenceIndex = preferences.craftTypes.indexOf(result.craftType)
          boost += (preferences.craftTypes.length - preferenceIndex) * 0.1
        }

        // Boost based on price preference for products/courses
        if (result.metadata?.price && preferences.priceRange) {
          const price = result.metadata.price
          if (price >= preferences.priceRange.min && price <= preferences.priceRange.max) {
            boost += 0.2
          }
        }

        // Apply language preference boost
        if (result.metadata?.language === preferences.preferredLanguage) {
          boost += 0.1
        }

        return {
          ...result,
          relevanceScore: (result.relevanceScore || 0) + boost,
          metadata: {
            ...result.metadata,
            personalizedBoost: boost
          }
        }
      })

      // Re-sort by updated relevance score
      personalizedResults.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))

      return {
        ...searchResponse,
        results: personalizedResults
      }
    } catch (error) {
      console.error('Personalization error:', error)
      return searchResponse
    }
  }

  /**
   * Apply intelligent ranking algorithm
   */
  private async applyIntelligentRanking(
    results: SearchResult[],
    query: SearchQuery,
    userId?: string
  ): Promise<SearchResult[]> {
    try {
      // Get popularity scores for each result
      const popularityScores = await this.getPopularityScores(results)
      
      // Get recency scores
      const recencyScores = this.getRecencyScores(results)
      
      // Get quality scores
      const qualityScores = await this.getQualityScores(results)

      // Apply combined ranking
      const rankedResults = results.map((result, index) => {
        const popularity = popularityScores.get(`${result.type}-${result.id}`) || 0
        const recency = recencyScores.get(`${result.type}-${result.id}`) || 0
        const quality = qualityScores.get(`${result.type}-${result.id}`) || 0
        const relevance = result.relevanceScore || 0

        // Weighted combination of factors
        const combinedScore = 
          relevance * 0.4 +      // Text relevance
          popularity * 0.3 +     // Popularity
          quality * 0.2 +        // Quality
          recency * 0.1          // Recency

        return {
          ...result,
          relevanceScore: combinedScore,
          metadata: {
            ...result.metadata,
            rankingFactors: {
              relevance,
              popularity,
              quality,
              recency,
              combined: combinedScore
            }
          }
        }
      })

      // Sort by combined score
      return rankedResults.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
    } catch (error) {
      console.error('Ranking error:', error)
      return results
    }
  }

  /**
   * Get popularity scores based on user interactions
   */
  private async getPopularityScores(results: SearchResult[]): Promise<Map<string, number>> {
    const scores = new Map<string, number>()
    
    try {
      for (const result of results) {
        const interactions = await prisma.$queryRaw<[{ count: bigint }]>`
          SELECT COUNT(*) as count
          FROM user_behavior_events
          WHERE entity_type = ${result.type}
          AND entity_id = ${result.id}
          AND event_type IN ('view', 'click', 'purchase', 'bookmark')
          AND created_at > NOW() - INTERVAL '30 days'
        `
        
        const count = Number(interactions[0]?.count || 0)
        const normalizedScore = Math.min(count / 100, 1) // Normalize to 0-1
        scores.set(`${result.type}-${result.id}`, normalizedScore)
      }
    } catch (error) {
      console.error('Popularity scoring error:', error)
    }
    
    return scores
  }

  /**
   * Get recency scores
   */
  private getRecencyScores(results: SearchResult[]): Map<string, number> {
    const scores = new Map<string, number>()
    const now = Date.now()
    const maxAge = 365 * 24 * 60 * 60 * 1000 // 1 year in milliseconds
    
    for (const result of results) {
      const age = now - result.createdAt.getTime()
      const normalizedAge = Math.min(age / maxAge, 1)
      const recencyScore = 1 - normalizedAge // Newer items get higher scores
      scores.set(`${result.type}-${result.id}`, recencyScore)
    }
    
    return scores
  }

  /**
   * Get quality scores based on content completeness and verification
   */
  private async getQualityScores(results: SearchResult[]): Promise<Map<string, number>> {
    const scores = new Map<string, number>()
    
    try {
      for (const result of results) {
        let qualityScore = 0.5 // Base score
        
        // Check content completeness
        if (result.description && result.description.length > 50) {
          qualityScore += 0.2
        }
        
        if (result.imageUrl) {
          qualityScore += 0.1
        }
        
        // Type-specific quality factors
        switch (result.type) {
          case 'craftsman':
            // Check verification status
            const craftsman = await prisma.craftsmanProfile.findUnique({
              where: { id: result.id },
              select: { verificationStatus: true, experienceYears: true }
            })
            
            if (craftsman?.verificationStatus === 'VERIFIED') {
              qualityScore += 0.2
            }
            
            if (craftsman?.experienceYears && craftsman.experienceYears > 5) {
              qualityScore += 0.1
            }
            break
            
          case 'course':
            // Check if course has materials and reasonable price
            const course = await prisma.course.findUnique({
              where: { id: result.id },
              select: { price: true, durationHours: true }
            })
            
            if (course?.price && Number(course.price) > 0) {
              qualityScore += 0.1
            }
            
            if (course?.durationHours && Number(course.durationHours) > 0) {
              qualityScore += 0.1
            }
            break
            
          case 'product':
            // Check inventory and pricing
            const product = await prisma.product.findUnique({
              where: { id: result.id },
              select: { inventoryQuantity: true, price: true }
            })
            
            if (product?.inventoryQuantity && product.inventoryQuantity > 0) {
              qualityScore += 0.1
            }
            
            if (product?.price && Number(product.price) > 0) {
              qualityScore += 0.1
            }
            break
        }
        
        scores.set(`${result.type}-${result.id}`, Math.min(qualityScore, 1))
      }
    } catch (error) {
      console.error('Quality scoring error:', error)
    }
    
    return scores
  }

  /**
   * Get query-based suggestions
   */
  private async getQuerySuggestions(query: string, limit: number): Promise<SearchSuggestion[]> {
    if (!query.trim()) return []
    
    try {
      const suggestions = await prisma.$queryRaw<Array<{
        query: string
        count: bigint
      }>>`
        SELECT 
          metadata->>'query' as query,
          COUNT(*) as count
        FROM user_behavior_events
        WHERE event_type = 'search'
        AND metadata->>'query' ILIKE ${`%${query}%`}
        AND created_at > NOW() - INTERVAL '90 days'
        GROUP BY metadata->>'query'
        ORDER BY count DESC
        LIMIT ${limit}
      `
      
      return suggestions.map(s => ({
        text: s.query,
        type: 'query' as const,
        count: Number(s.count),
        highlighted: this.highlightMatch(s.query, query)
      }))
    } catch (error) {
      console.error('Query suggestions error:', error)
      return []
    }
  }

  /**
   * Get category suggestions
   */
  private async getCategorySuggestions(query: string, limit: number): Promise<SearchSuggestion[]> {
    const categories = ['craftsman', 'course', 'product', 'media']
    const categoryNames = {
      craftsman: '師傅',
      course: '課程', 
      product: '產品',
      media: '媒體'
    }
    
    return categories
      .filter(cat => 
        categoryNames[cat as keyof typeof categoryNames]
          .toLowerCase()
          .includes(query.toLowerCase()) ||
        cat.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, limit)
      .map(cat => ({
        text: categoryNames[cat as keyof typeof categoryNames],
        type: 'category' as const,
        highlighted: this.highlightMatch(categoryNames[cat as keyof typeof categoryNames], query)
      }))
  }

  /**
   * Get craft type suggestions
   */
  private async getCraftTypeSuggestions(query: string, limit: number): Promise<SearchSuggestion[]> {
    const craftTypes = ['手雕麻將', '吹糖', '竹編', '打鐵', '製香', '紮作']
    
    return craftTypes
      .filter(type => type.toLowerCase().includes(query.toLowerCase()))
      .slice(0, limit)
      .map(type => ({
        text: type,
        type: 'craftType' as const,
        highlighted: this.highlightMatch(type, query)
      }))
  }

  /**
   * Get location suggestions
   */
  private async getLocationSuggestions(query: string, limit: number): Promise<SearchSuggestion[]> {
    try {
      const locations = await prisma.craftsmanProfile.findMany({
        where: {
          workshopLocation: {
            contains: query,
            mode: 'insensitive'
          }
        },
        select: { workshopLocation: true },
        distinct: ['workshopLocation'],
        take: limit
      })
      
      return locations
        .filter(l => l.workshopLocation)
        .map(l => ({
          text: l.workshopLocation!,
          type: 'location' as const,
          highlighted: this.highlightMatch(l.workshopLocation!, query)
        }))
    } catch (error) {
      return []
    }
  }

  /**
   * Get popular queries
   */
  private async getPopularQueries(limit: number): Promise<string[]> {
    try {
      const popular = await prisma.$queryRaw<Array<{
        query: string
        count: bigint
      }>>`
        SELECT 
          metadata->>'query' as query,
          COUNT(*) as count
        FROM user_behavior_events
        WHERE event_type = 'search'
        AND created_at > NOW() - INTERVAL '7 days'
        AND metadata->>'query' IS NOT NULL
        GROUP BY metadata->>'query'
        ORDER BY count DESC
        LIMIT ${limit}
      `
      
      return popular.map(p => p.query)
    } catch (error) {
      return ['手雕麻將', '吹糖', '竹編', '打鐵', '製香']
    }
  }

  /**
   * Get user's recent searches
   */
  private async getUserRecentSearches(userId: string, limit: number): Promise<string[]> {
    try {
      const recent = await prisma.$queryRaw<Array<{
        query: string
      }>>`
        SELECT DISTINCT metadata->>'query' as query
        FROM user_behavior_events
        WHERE event_type = 'search'
        AND user_id = ${userId}
        AND metadata->>'query' IS NOT NULL
        ORDER BY created_at DESC
        LIMIT ${limit}
      `
      
      return recent.map(r => r.query)
    } catch (error) {
      return []
    }
  }

  /**
   * Highlight matching text in suggestions
   */
  private highlightMatch(text: string, query: string): string {
    if (!query.trim()) return text
    
    const regex = new RegExp(`(${query})`, 'gi')
    return text.replace(regex, '<mark>$1</mark>')
  }
}

export const enhancedSearchService = new EnhancedSearchService()