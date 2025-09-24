import { prisma } from '../database'
import { Prisma } from '@prisma/client'

export interface UserBehaviorEvent {
  userId: string
  eventType: 'view' | 'search' | 'click' | 'purchase' | 'bookmark' | 'share'
  entityType: 'craftsman' | 'course' | 'product' | 'media'
  entityId: string
  metadata?: Record<string, any>
  sessionId?: string
  timestamp?: Date
}

export interface UserPreferences {
  userId: string
  craftTypes: string[]
  priceRange?: { min: number; max: number }
  preferredLanguage: string
  interests: string[]
  viewHistory: Array<{
    entityType: string
    entityId: string
    timestamp: Date
    duration?: number
  }>
}

export interface RecommendationRequest {
  userId?: string
  entityType?: 'craftsman' | 'course' | 'product' | 'media'
  entityId?: string
  limit?: number
  excludeViewed?: boolean
}

export interface RecommendationResult {
  id: string
  type: 'craftsman' | 'course' | 'product' | 'media'
  title: string
  description?: string
  imageUrl?: string
  url: string
  score: number
  reason: string
  metadata?: Record<string, any>
}

export class UserBehaviorService {
  /**
   * Track user behavior event
   */
  async trackEvent(event: UserBehaviorEvent): Promise<void> {
    try {
      // Store in user_behavior_events table (we'll need to create this)
      await prisma.$executeRaw`
        INSERT INTO user_behavior_events (
          user_id, event_type, entity_type, entity_id, 
          metadata, session_id, created_at
        ) VALUES (
          ${event.userId}, ${event.eventType}, ${event.entityType}, 
          ${event.entityId}, ${JSON.stringify(event.metadata || {})}, 
          ${event.sessionId || null}, ${event.timestamp || new Date()}
        )
        ON CONFLICT DO NOTHING
      `

      // Update user preferences based on the event
      await this.updateUserPreferences(event)
    } catch (error) {
      console.error('Failed to track user behavior:', error)
      // Don't throw error to avoid breaking user experience
    }
  }

  /**
   * Get user preferences based on behavior history
   */
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    try {
      // Get user's basic info
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { preferredLanguage: true }
      })

      if (!user) {
        throw new Error('User not found')
      }

      // Get behavior events for analysis
      const events = await prisma.$queryRaw<Array<{
        event_type: string
        entity_type: string
        entity_id: string
        metadata: any
        created_at: Date
      }>>`
        SELECT event_type, entity_type, entity_id, metadata, created_at
        FROM user_behavior_events 
        WHERE user_id = ${userId}
        AND created_at > NOW() - INTERVAL '30 days'
        ORDER BY created_at DESC
        LIMIT 1000
      `

      // Analyze craft type preferences
      const craftTypeInteractions = new Map<string, number>()
      const viewHistory: UserPreferences['viewHistory'] = []

      for (const event of events) {
        // Track view history
        if (event.event_type === 'view') {
          viewHistory.push({
            entityType: event.entity_type,
            entityId: event.entity_id,
            timestamp: event.created_at,
            duration: event.metadata?.duration
          })
        }

        // Extract craft types from metadata or entity data
        const craftType = await this.getCraftTypeForEntity(
          event.entity_type as any,
          event.entity_id
        )

        if (craftType) {
          const weight = this.getEventWeight(event.event_type as any)
          craftTypeInteractions.set(
            craftType,
            (craftTypeInteractions.get(craftType) || 0) + weight
          )
        }
      }

      // Get top craft types
      const sortedCraftTypes = Array.from(craftTypeInteractions.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([craftType]) => craftType)

      // Analyze price preferences from purchase/view behavior
      const priceRange = await this.analyzePricePreferences(userId, events)

      return {
        userId,
        craftTypes: sortedCraftTypes,
        priceRange,
        preferredLanguage: user.preferredLanguage || 'zh-HK',
        interests: sortedCraftTypes, // For now, same as craft types
        viewHistory: viewHistory.slice(0, 100) // Keep recent 100 items
      }
    } catch (error) {
      console.error('Failed to get user preferences:', error)
      
      // Return default preferences
      return {
        userId,
        craftTypes: [],
        preferredLanguage: 'zh-HK',
        interests: [],
        viewHistory: []
      }
    }
  }

  /**
   * Get personalized recommendations
   */
  async getRecommendations(request: RecommendationRequest): Promise<RecommendationResult[]> {
    const {
      userId,
      entityType,
      entityId,
      limit = 10,
      excludeViewed = true
    } = request

    try {
      let recommendations: RecommendationResult[] = []

      if (userId) {
        // Get user-based recommendations
        const userRecs = await this.getUserBasedRecommendations(userId, limit, excludeViewed)
        recommendations.push(...userRecs)
      }

      if (entityId && entityType) {
        // Get item-based recommendations
        const itemRecs = await this.getItemBasedRecommendations(entityType, entityId, limit)
        recommendations.push(...itemRecs)
      }

      if (recommendations.length === 0) {
        // Fallback to popular items
        recommendations = await this.getPopularRecommendations(entityType, limit)
      }

      // Remove duplicates and sort by score
      const uniqueRecs = this.deduplicateRecommendations(recommendations)
      return uniqueRecs.slice(0, limit)

    } catch (error) {
      console.error('Failed to get recommendations:', error)
      return []
    }
  }

  /**
   * Get content-based recommendations for similar items
   */
  async getSimilarContent(
    entityType: 'craftsman' | 'course' | 'product' | 'media',
    entityId: string,
    limit: number = 5
  ): Promise<RecommendationResult[]> {
    try {
      switch (entityType) {
        case 'craftsman':
          return await this.getSimilarCraftsmen(entityId, limit)
        case 'course':
          return await this.getSimilarCourses(entityId, limit)
        case 'product':
          return await this.getSimilarProducts(entityId, limit)
        case 'media':
          return await this.getSimilarMedia(entityId, limit)
        default:
          return []
      }
    } catch (error) {
      console.error('Failed to get similar content:', error)
      return []
    }
  }

  /**
   * Update user preferences based on behavior event
   */
  private async updateUserPreferences(event: UserBehaviorEvent): Promise<void> {
    // This could update a user_preferences table or cache
    // For now, we'll rely on real-time analysis of behavior events
  }

  /**
   * Get craft type for an entity
   */
  private async getCraftTypeForEntity(
    entityType: 'craftsman' | 'course' | 'product' | 'media',
    entityId: string
  ): Promise<string | null> {
    try {
      switch (entityType) {
        case 'craftsman':
          const craftsman = await prisma.craftsmanProfile.findUnique({
            where: { id: entityId },
            select: { craftSpecialties: true }
          })
          return craftsman?.craftSpecialties[0] || null

        case 'course':
          const course = await prisma.course.findUnique({
            where: { id: entityId },
            select: { craftCategory: true }
          })
          return course?.craftCategory || null

        case 'product':
          const product = await prisma.product.findUnique({
            where: { id: entityId },
            select: { craftCategory: true }
          })
          return product?.craftCategory || null

        default:
          return null
      }
    } catch (error) {
      return null
    }
  }

  /**
   * Get weight for different event types
   */
  private getEventWeight(eventType: UserBehaviorEvent['eventType']): number {
    const weights = {
      view: 1,
      click: 2,
      search: 1,
      bookmark: 3,
      share: 4,
      purchase: 5
    }
    return weights[eventType] || 1
  }

  /**
   * Analyze price preferences from user behavior
   */
  private async analyzePricePreferences(
    userId: string,
    events: Array<{ event_type: string; entity_type: string; entity_id: string; metadata: any }>
  ): Promise<{ min: number; max: number } | undefined> {
    const priceInteractions: number[] = []

    for (const event of events) {
      if (event.entity_type === 'product' || event.entity_type === 'course') {
        try {
          let price: number | null = null

          if (event.entity_type === 'product') {
            const product = await prisma.product.findUnique({
              where: { id: event.entity_id },
              select: { price: true }
            })
            price = product?.price ? Number(product.price) : null
          } else if (event.entity_type === 'course') {
            const course = await prisma.course.findUnique({
              where: { id: event.entity_id },
              select: { price: true }
            })
            price = course?.price ? Number(course.price) : null
          }

          if (price && price > 0) {
            const weight = this.getEventWeight(event.event_type as any)
            for (let i = 0; i < weight; i++) {
              priceInteractions.push(price)
            }
          }
        } catch (error) {
          // Skip this interaction
        }
      }
    }

    if (priceInteractions.length < 3) {
      return undefined
    }

    priceInteractions.sort((a, b) => a - b)
    const q1 = priceInteractions[Math.floor(priceInteractions.length * 0.25)]
    const q3 = priceInteractions[Math.floor(priceInteractions.length * 0.75)]

    return {
      min: Math.max(0, q1 * 0.5),
      max: q3 * 1.5
    }
  }

  /**
   * Get user-based recommendations
   */
  private async getUserBasedRecommendations(
    userId: string,
    limit: number,
    excludeViewed: boolean
  ): Promise<RecommendationResult[]> {
    const preferences = await this.getUserPreferences(userId)
    const recommendations: RecommendationResult[] = []

    // Get viewed entity IDs for exclusion
    const viewedIds = excludeViewed 
      ? new Set(preferences.viewHistory.map(h => h.entityId))
      : new Set()

    // Recommend based on craft type preferences
    for (const craftType of preferences.craftTypes.slice(0, 3)) {
      // Get craftsmen
      const craftsmen = await prisma.craftsmanProfile.findMany({
        where: {
          craftSpecialties: { has: craftType },
          verificationStatus: 'VERIFIED',
          ...(excludeViewed && { NOT: { id: { in: Array.from(viewedIds) } } })
        },
        include: { user: true },
        take: 3
      })

      for (const craftsman of craftsmen) {
        recommendations.push({
          id: craftsman.id,
          type: 'craftsman',
          title: this.extractMultiLanguageText(craftsman.bio, preferences.preferredLanguage, 'name') || craftsman.user.email,
          description: this.extractMultiLanguageText(craftsman.bio, preferences.preferredLanguage, 'description'),
          url: `/craftsmen/${craftsman.id}`,
          score: 0.8,
          reason: `基於您對${craftType}的興趣`,
          metadata: { craftType, experienceYears: craftsman.experienceYears }
        })
      }

      // Get courses
      const courses = await prisma.course.findMany({
        where: {
          craftCategory: craftType,
          status: 'ACTIVE',
          ...(excludeViewed && { NOT: { id: { in: Array.from(viewedIds) } } })
        },
        include: { craftsman: { include: { user: true } } },
        take: 2
      })

      for (const course of courses) {
        const price = course.price ? Number(course.price) : 0
        const inPriceRange = !preferences.priceRange || 
          (price >= preferences.priceRange.min && price <= preferences.priceRange.max)

        recommendations.push({
          id: course.id,
          type: 'course',
          title: this.extractMultiLanguageText(course.title, preferences.preferredLanguage) || course.craftCategory,
          description: this.extractMultiLanguageText(course.description, preferences.preferredLanguage),
          url: `/courses/${course.id}`,
          score: inPriceRange ? 0.9 : 0.7,
          reason: `推薦${craftType}課程`,
          metadata: { craftType, price, duration: course.durationHours }
        })
      }
    }

    return recommendations
  }

  /**
   * Get item-based recommendations
   */
  private async getItemBasedRecommendations(
    entityType: 'craftsman' | 'course' | 'product' | 'media',
    entityId: string,
    limit: number
  ): Promise<RecommendationResult[]> {
    return await this.getSimilarContent(entityType, entityId, limit)
  }

  /**
   * Get popular recommendations as fallback
   */
  private async getPopularRecommendations(
    entityType?: 'craftsman' | 'course' | 'product' | 'media',
    limit: number = 10
  ): Promise<RecommendationResult[]> {
    const recommendations: RecommendationResult[] = []

    try {
      // Get popular craftsmen (verified ones)
      if (!entityType || entityType === 'craftsman') {
        const craftsmen = await prisma.craftsmanProfile.findMany({
          where: { verificationStatus: 'VERIFIED' },
          include: { user: true },
          orderBy: { createdAt: 'desc' },
          take: Math.ceil(limit / 2)
        })

        for (const craftsman of craftsmen) {
          recommendations.push({
            id: craftsman.id,
            type: 'craftsman',
            title: this.extractMultiLanguageText(craftsman.bio, 'zh-HK', 'name') || craftsman.user.email,
            description: this.extractMultiLanguageText(craftsman.bio, 'zh-HK', 'description'),
            url: `/craftsmen/${craftsman.id}`,
            score: 0.6,
            reason: '熱門師傅',
            metadata: { craftType: craftsman.craftSpecialties[0] }
          })
        }
      }

      // Get popular courses
      if (!entityType || entityType === 'course') {
        const courses = await prisma.course.findMany({
          where: { status: 'ACTIVE' },
          include: { craftsman: { include: { user: true } } },
          orderBy: { createdAt: 'desc' },
          take: Math.ceil(limit / 2)
        })

        for (const course of courses) {
          recommendations.push({
            id: course.id,
            type: 'course',
            title: this.extractMultiLanguageText(course.title, 'zh-HK') || course.craftCategory,
            description: this.extractMultiLanguageText(course.description, 'zh-HK'),
            url: `/courses/${course.id}`,
            score: 0.5,
            reason: '熱門課程',
            metadata: { craftType: course.craftCategory, price: course.price }
          })
        }
      }
    } catch (error) {
      console.error('Failed to get popular recommendations:', error)
    }

    return recommendations
  }

  /**
   * Get similar craftsmen
   */
  private async getSimilarCraftsmen(craftsmanId: string, limit: number): Promise<RecommendationResult[]> {
    try {
      const craftsman = await prisma.craftsmanProfile.findUnique({
        where: { id: craftsmanId },
        select: { craftSpecialties: true, workshopLocation: true }
      })

      if (!craftsman) return []

      const similar = await prisma.craftsmanProfile.findMany({
        where: {
          id: { not: craftsmanId },
          verificationStatus: 'VERIFIED',
          OR: [
            { craftSpecialties: { hasSome: craftsman.craftSpecialties } },
            ...(craftsman.workshopLocation ? [{ workshopLocation: craftsman.workshopLocation }] : [])
          ]
        },
        include: { user: true },
        take: limit
      })

      return similar.map(c => ({
        id: c.id,
        type: 'craftsman' as const,
        title: this.extractMultiLanguageText(c.bio, 'zh-HK', 'name') || c.user.email,
        description: this.extractMultiLanguageText(c.bio, 'zh-HK', 'description'),
        url: `/craftsmen/${c.id}`,
        score: 0.7,
        reason: '相似師傅',
        metadata: { craftType: c.craftSpecialties[0] }
      }))
    } catch (error) {
      return []
    }
  }

  /**
   * Get similar courses
   */
  private async getSimilarCourses(courseId: string, limit: number): Promise<RecommendationResult[]> {
    try {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { craftCategory: true, price: true, durationHours: true }
      })

      if (!course) return []

      const similar = await prisma.course.findMany({
        where: {
          id: { not: courseId },
          status: 'ACTIVE',
          craftCategory: course.craftCategory
        },
        include: { craftsman: { include: { user: true } } },
        take: limit
      })

      return similar.map(c => ({
        id: c.id,
        type: 'course' as const,
        title: this.extractMultiLanguageText(c.title, 'zh-HK') || c.craftCategory,
        description: this.extractMultiLanguageText(c.description, 'zh-HK'),
        url: `/courses/${c.id}`,
        score: 0.8,
        reason: '相似課程',
        metadata: { craftType: c.craftCategory, price: c.price }
      }))
    } catch (error) {
      return []
    }
  }

  /**
   * Get similar products
   */
  private async getSimilarProducts(productId: string, limit: number): Promise<RecommendationResult[]> {
    try {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { craftCategory: true, price: true }
      })

      if (!product) return []

      const similar = await prisma.product.findMany({
        where: {
          id: { not: productId },
          status: 'ACTIVE',
          craftCategory: product.craftCategory,
          inventoryQuantity: { gt: 0 }
        },
        include: { craftsman: { include: { user: true } } },
        take: limit
      })

      return similar.map(p => ({
        id: p.id,
        type: 'product' as const,
        title: this.extractMultiLanguageText(p.name, 'zh-HK') || 'Product',
        description: this.extractMultiLanguageText(p.description, 'zh-HK'),
        url: `/products/${p.id}`,
        score: 0.8,
        reason: '相似產品',
        metadata: { craftType: p.craftCategory, price: p.price }
      }))
    } catch (error) {
      return []
    }
  }

  /**
   * Get similar media
   */
  private async getSimilarMedia(mediaId: string, limit: number): Promise<RecommendationResult[]> {
    try {
      const media = await prisma.mediaFile.findUnique({
        where: { id: mediaId },
        select: { fileType: true, metadata: true }
      })

      if (!media) return []

      const similar = await prisma.mediaFile.findMany({
        where: {
          id: { not: mediaId },
          fileType: media.fileType
        },
        include: { uploader: true },
        take: limit
      })

      return similar.map(m => ({
        id: m.id,
        type: 'media' as const,
        title: (m.metadata as any)?.originalName || 'Media File',
        description: (m.metadata as any)?.description,
        url: m.fileUrl,
        score: 0.6,
        reason: '相似媒體',
        metadata: { fileType: m.fileType }
      }))
    } catch (error) {
      return []
    }
  }

  /**
   * Remove duplicate recommendations
   */
  private deduplicateRecommendations(recommendations: RecommendationResult[]): RecommendationResult[] {
    const seen = new Set<string>()
    const unique: RecommendationResult[] = []

    for (const rec of recommendations) {
      const key = `${rec.type}-${rec.id}`
      if (!seen.has(key)) {
        seen.add(key)
        unique.push(rec)
      }
    }

    return unique.sort((a, b) => b.score - a.score)
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
}

export const userBehaviorService = new UserBehaviorService()