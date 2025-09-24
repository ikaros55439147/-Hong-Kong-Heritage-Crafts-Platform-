import { prisma } from '../database'
import { userBehaviorService, RecommendationResult } from './user-behavior.service'

export interface RecommendationConfig {
  maxRecommendations: number
  diversityFactor: number // 0-1, higher means more diverse recommendations
  recencyWeight: number // 0-1, weight for recent items
  popularityWeight: number // 0-1, weight for popular items
  personalWeight: number // 0-1, weight for personal preferences
}

export interface RecommendationContext {
  userId?: string
  currentPage?: 'home' | 'craftsman' | 'course' | 'product' | 'search'
  currentEntityId?: string
  currentEntityType?: 'craftsman' | 'course' | 'product' | 'media'
  userLocation?: string
  sessionData?: Record<string, any>
}

export interface RecommendationSection {
  title: string
  subtitle?: string
  type: 'personal' | 'trending' | 'similar' | 'category' | 'location'
  items: RecommendationResult[]
  reason: string
}

export class RecommendationService {
  private defaultConfig: RecommendationConfig = {
    maxRecommendations: 20,
    diversityFactor: 0.3,
    recencyWeight: 0.2,
    popularityWeight: 0.3,
    personalWeight: 0.5
  }

  /**
   * Get comprehensive recommendations for a user context
   */
  async getRecommendations(
    context: RecommendationContext,
    config: Partial<RecommendationConfig> = {}
  ): Promise<RecommendationSection[]> {
    const finalConfig = { ...this.defaultConfig, ...config }
    const sections: RecommendationSection[] = []

    try {
      // Personal recommendations (if user is logged in)
      if (context.userId) {
        const personalSection = await this.getPersonalRecommendations(
          context.userId,
          finalConfig
        )
        if (personalSection.items.length > 0) {
          sections.push(personalSection)
        }
      }

      // Context-based recommendations
      if (context.currentEntityId && context.currentEntityType) {
        const similarSection = await this.getSimilarItemRecommendations(
          context.currentEntityType,
          context.currentEntityId,
          finalConfig
        )
        if (similarSection.items.length > 0) {
          sections.push(similarSection)
        }
      }

      // Trending recommendations
      const trendingSection = await this.getTrendingRecommendations(finalConfig)
      if (trendingSection.items.length > 0) {
        sections.push(trendingSection)
      }

      // Category-based recommendations
      if (context.userId) {
        const categorySection = await this.getCategoryRecommendations(
          context.userId,
          finalConfig
        )
        if (categorySection.items.length > 0) {
          sections.push(categorySection)
        }
      }

      // Location-based recommendations
      if (context.userLocation) {
        const locationSection = await this.getLocationRecommendations(
          context.userLocation,
          finalConfig
        )
        if (locationSection.items.length > 0) {
          sections.push(locationSection)
        }
      }

      // Fallback: Popular items
      if (sections.length === 0) {
        const popularSection = await this.getPopularRecommendations(finalConfig)
        sections.push(popularSection)
      }

      return sections
    } catch (error) {
      console.error('Recommendation error:', error)
      return []
    }
  }

  /**
   * Get personalized recommendations based on user behavior
   */
  async getPersonalRecommendations(
    userId: string,
    config: RecommendationConfig
  ): Promise<RecommendationSection> {
    const recommendations = await userBehaviorService.getRecommendations({
      userId,
      limit: Math.ceil(config.maxRecommendations * 0.4),
      excludeViewed: true
    })

    return {
      title: '為您推薦',
      subtitle: '基於您的興趣和瀏覽記錄',
      type: 'personal',
      items: recommendations,
      reason: '個人化推薦'
    }
  }

  /**
   * Get similar item recommendations
   */
  async getSimilarItemRecommendations(
    entityType: 'craftsman' | 'course' | 'product' | 'media',
    entityId: string,
    config: RecommendationConfig
  ): Promise<RecommendationSection> {
    const recommendations = await userBehaviorService.getSimilarContent(
      entityType,
      entityId,
      Math.ceil(config.maxRecommendations * 0.3)
    )

    const typeNames = {
      craftsman: '師傅',
      course: '課程',
      product: '產品',
      media: '媒體'
    }

    return {
      title: `相似${typeNames[entityType]}`,
      subtitle: '您可能也會喜歡',
      type: 'similar',
      items: recommendations,
      reason: '相似內容推薦'
    }
  }

  /**
   * Get trending recommendations
   */
  async getTrendingRecommendations(
    config: RecommendationConfig
  ): Promise<RecommendationSection> {
    try {
      const trendingItems: RecommendationResult[] = []

      // Get trending craftsmen (most viewed in last 7 days)
      const trendingCraftsmen = await prisma.$queryRaw<Array<{
        entity_id: string
        view_count: bigint
      }>>`
        SELECT 
          entity_id,
          COUNT(*) as view_count
        FROM user_behavior_events
        WHERE entity_type = 'craftsman'
        AND event_type IN ('view', 'click')
        AND created_at > NOW() - INTERVAL '7 days'
        GROUP BY entity_id
        ORDER BY view_count DESC
        LIMIT 3
      `

      for (const item of trendingCraftsmen) {
        const craftsman = await prisma.craftsmanProfile.findUnique({
          where: { id: item.entity_id },
          include: { user: true }
        })

        if (craftsman) {
          trendingItems.push({
            id: craftsman.id,
            type: 'craftsman',
            title: this.extractMultiLanguageText(craftsman.bio, 'zh-HK', 'name') || craftsman.user.email,
            description: this.extractMultiLanguageText(craftsman.bio, 'zh-HK', 'description'),
            url: `/craftsmen/${craftsman.id}`,
            score: 0.9,
            reason: '熱門師傅',
            metadata: {
              craftType: craftsman.craftSpecialties[0],
              viewCount: Number(item.view_count)
            }
          })
        }
      }

      // Get trending courses
      const trendingCourses = await prisma.$queryRaw<Array<{
        entity_id: string
        interaction_count: bigint
      }>>`
        SELECT 
          entity_id,
          COUNT(*) as interaction_count
        FROM user_behavior_events
        WHERE entity_type = 'course'
        AND event_type IN ('view', 'click', 'bookmark')
        AND created_at > NOW() - INTERVAL '7 days'
        GROUP BY entity_id
        ORDER BY interaction_count DESC
        LIMIT 3
      `

      for (const item of trendingCourses) {
        const course = await prisma.course.findUnique({
          where: { id: item.entity_id },
          include: { craftsman: { include: { user: true } } }
        })

        if (course) {
          trendingItems.push({
            id: course.id,
            type: 'course',
            title: this.extractMultiLanguageText(course.title, 'zh-HK') || course.craftCategory,
            description: this.extractMultiLanguageText(course.description, 'zh-HK'),
            url: `/courses/${course.id}`,
            score: 0.8,
            reason: '熱門課程',
            metadata: {
              craftType: course.craftCategory,
              price: course.price,
              interactionCount: Number(item.interaction_count)
            }
          })
        }
      }

      return {
        title: '熱門推薦',
        subtitle: '最近最受歡迎的內容',
        type: 'trending',
        items: trendingItems,
        reason: '趨勢推薦'
      }
    } catch (error) {
      console.error('Trending recommendations error:', error)
      return {
        title: '熱門推薦',
        subtitle: '最近最受歡迎的內容',
        type: 'trending',
        items: [],
        reason: '趨勢推薦'
      }
    }
  }

  /**
   * Get category-based recommendations
   */
  async getCategoryRecommendations(
    userId: string,
    config: RecommendationConfig
  ): Promise<RecommendationSection> {
    try {
      const preferences = await userBehaviorService.getUserPreferences(userId)
      const recommendations: RecommendationResult[] = []

      // Get recommendations from user's top craft type
      if (preferences.craftTypes.length > 0) {
        const topCraftType = preferences.craftTypes[0]

        // Get courses in this craft type
        const courses = await prisma.course.findMany({
          where: {
            craftCategory: topCraftType,
            status: 'ACTIVE'
          },
          include: { craftsman: { include: { user: true } } },
          take: 3
        })

        for (const course of courses) {
          recommendations.push({
            id: course.id,
            type: 'course',
            title: this.extractMultiLanguageText(course.title, preferences.preferredLanguage) || course.craftCategory,
            description: this.extractMultiLanguageText(course.description, preferences.preferredLanguage),
            url: `/courses/${course.id}`,
            score: 0.7,
            reason: `${topCraftType}相關課程`,
            metadata: {
              craftType: course.craftCategory,
              price: course.price
            }
          })
        }

        // Get products in this craft type
        const products = await prisma.product.findMany({
          where: {
            craftCategory: topCraftType,
            status: 'ACTIVE',
            inventoryQuantity: { gt: 0 }
          },
          include: { craftsman: { include: { user: true } } },
          take: 2
        })

        for (const product of products) {
          recommendations.push({
            id: product.id,
            type: 'product',
            title: this.extractMultiLanguageText(product.name, preferences.preferredLanguage) || 'Product',
            description: this.extractMultiLanguageText(product.description, preferences.preferredLanguage),
            url: `/products/${product.id}`,
            score: 0.6,
            reason: `${topCraftType}相關產品`,
            metadata: {
              craftType: product.craftCategory,
              price: product.price
            }
          })
        }
      }

      return {
        title: '相關推薦',
        subtitle: preferences.craftTypes.length > 0 ? `更多${preferences.craftTypes[0]}內容` : '探索更多',
        type: 'category',
        items: recommendations,
        reason: '分類推薦'
      }
    } catch (error) {
      console.error('Category recommendations error:', error)
      return {
        title: '相關推薦',
        subtitle: '探索更多',
        type: 'category',
        items: [],
        reason: '分類推薦'
      }
    }
  }

  /**
   * Get location-based recommendations
   */
  async getLocationRecommendations(
    userLocation: string,
    config: RecommendationConfig
  ): Promise<RecommendationSection> {
    try {
      const recommendations: RecommendationResult[] = []

      // Find craftsmen in the same area
      const nearbyCraftsmen = await prisma.craftsmanProfile.findMany({
        where: {
          workshopLocation: {
            contains: userLocation,
            mode: 'insensitive'
          },
          verificationStatus: 'VERIFIED'
        },
        include: { user: true },
        take: 5
      })

      for (const craftsman of nearbyCraftsmen) {
        recommendations.push({
          id: craftsman.id,
          type: 'craftsman',
          title: this.extractMultiLanguageText(craftsman.bio, 'zh-HK', 'name') || craftsman.user.email,
          description: this.extractMultiLanguageText(craftsman.bio, 'zh-HK', 'description'),
          url: `/craftsmen/${craftsman.id}`,
          score: 0.8,
          reason: '附近師傅',
          metadata: {
            craftType: craftsman.craftSpecialties[0],
            location: craftsman.workshopLocation
          }
        })
      }

      return {
        title: '附近推薦',
        subtitle: `${userLocation}地區的師傅`,
        type: 'location',
        items: recommendations,
        reason: '地理位置推薦'
      }
    } catch (error) {
      console.error('Location recommendations error:', error)
      return {
        title: '附近推薦',
        subtitle: '地區師傅',
        type: 'location',
        items: [],
        reason: '地理位置推薦'
      }
    }
  }

  /**
   * Get popular recommendations as fallback
   */
  async getPopularRecommendations(
    config: RecommendationConfig
  ): Promise<RecommendationSection> {
    const recommendations = await userBehaviorService.getRecommendations({
      limit: config.maxRecommendations
    })

    return {
      title: '熱門內容',
      subtitle: '大家都在看的內容',
      type: 'trending',
      items: recommendations,
      reason: '熱門推薦'
    }
  }

  /**
   * Apply diversity to recommendations
   */
  private applyDiversity(
    recommendations: RecommendationResult[],
    diversityFactor: number
  ): RecommendationResult[] {
    if (diversityFactor === 0) return recommendations

    const diversified: RecommendationResult[] = []
    const typeCount = new Map<string, number>()
    const craftTypeCount = new Map<string, number>()

    for (const rec of recommendations) {
      const currentTypeCount = typeCount.get(rec.type) || 0
      const currentCraftTypeCount = craftTypeCount.get(rec.metadata?.craftType || '') || 0

      // Calculate diversity penalty
      const typePenalty = currentTypeCount * diversityFactor * 0.1
      const craftTypePenalty = currentCraftTypeCount * diversityFactor * 0.05

      const adjustedScore = rec.score - typePenalty - craftTypePenalty

      if (adjustedScore > 0.3) { // Minimum threshold
        diversified.push({
          ...rec,
          score: adjustedScore
        })

        typeCount.set(rec.type, currentTypeCount + 1)
        craftTypeCount.set(rec.metadata?.craftType || '', currentCraftTypeCount + 1)
      }
    }

    return diversified.sort((a, b) => b.score - a.score)
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

export const recommendationService = new RecommendationService()