import { PrismaClient, RecommendationType, InteractionType } from '@prisma/client'
import { 
  ProductRecommendationData, 
  ProductRecommendationWithDetails, 
  ProductWithCraftsman,
  PaginationParams, 
  PaginationResult
} from '@/types'

const prisma = new PrismaClient()

export class ProductRecommendationService {
  /**
   * Track user product interaction
   */
  async trackInteraction(
    userId: string,
    productId: string,
    interactionType: InteractionType,
    interactionData?: any
  ): Promise<void> {
    await prisma.userProductInteraction.create({
      data: {
        userId,
        productId,
        interactionType,
        interactionData
      }
    })

    // Trigger recommendation updates for this user
    await this.updatePersonalizedRecommendations(userId)
  }

  /**
   * Get personalized recommendations for user
   */
  async getPersonalizedRecommendations(
    userId: string,
    limit: number = 10
  ): Promise<ProductWithCraftsman[]> {
    // Get user's interaction history
    const interactions = await prisma.userProductInteraction.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            craftsman: {
              include: {
                user: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50 // Consider last 50 interactions
    })

    if (interactions.length === 0) {
      // Return trending products for new users
      return this.getTrendingProducts(limit)
    }

    // Analyze user preferences
    const categoryPreferences = this.analyzeCategoryPreferences(interactions)
    const craftsmanPreferences = this.analyzeCraftsmanPreferences(interactions)

    // Get recommendations based on preferences
    const recommendations = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        id: {
          notIn: interactions.map(i => i.productId) // Exclude already interacted products
        },
        OR: [
          {
            craftCategory: {
              in: categoryPreferences.slice(0, 3) // Top 3 preferred categories
            }
          },
          {
            craftsmanId: {
              in: craftsmanPreferences.slice(0, 3) // Top 3 preferred craftsmen
            }
          }
        ]
      },
      include: {
        craftsman: {
          include: {
            user: true
          }
        }
      },
      orderBy: [
        { averageRating: 'desc' },
        { reviewCount: 'desc' },
        { createdAt: 'desc' }
      ],
      take: limit
    })

    return recommendations
  }

  /**
   * Get similar products based on a product
   */
  async getSimilarProducts(
    productId: string,
    limit: number = 5
  ): Promise<ProductWithCraftsman[]> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        craftsman: true
      }
    })

    if (!product) {
      throw new Error('Product not found')
    }

    // Find products in the same category, excluding the current product
    const similarProducts = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        craftCategory: product.craftCategory,
        id: { not: productId }
      },
      include: {
        craftsman: {
          include: {
            user: true
          }
        }
      },
      orderBy: [
        { averageRating: 'desc' },
        { reviewCount: 'desc' }
      ],
      take: limit
    })

    return similarProducts
  }

  /**
   * Get frequently bought together products
   */
  async getFrequentlyBoughtTogether(
    productId: string,
    limit: number = 5
  ): Promise<ProductWithCraftsman[]> {
    // Find orders that contain the given product
    const ordersWithProduct = await prisma.order.findMany({
      where: {
        orderItems: {
          some: {
            productId
          }
        }
      },
      include: {
        orderItems: {
          include: {
            product: true
          }
        }
      }
    })

    // Count frequency of other products in these orders
    const productFrequency: { [key: string]: number } = {}

    ordersWithProduct.forEach(order => {
      order.orderItems.forEach(item => {
        if (item.productId !== productId) {
          productFrequency[item.productId] = (productFrequency[item.productId] || 0) + 1
        }
      })
    })

    // Sort by frequency and get top products
    const sortedProducts = Object.entries(productFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([productId]) => productId)

    if (sortedProducts.length === 0) {
      return []
    }

    // Get product details
    const products = await prisma.product.findMany({
      where: {
        id: { in: sortedProducts },
        status: 'ACTIVE'
      },
      include: {
        craftsman: {
          include: {
            user: true
          }
        }
      }
    })

    // Sort by original frequency order
    return sortedProducts
      .map(id => products.find(p => p.id === id))
      .filter(Boolean) as ProductWithCraftsman[]
  }

  /**
   * Get trending products
   */
  async getTrendingProducts(limit: number = 10): Promise<ProductWithCraftsman[]> {
    // Get products with high interaction in the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const trendingProducts = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        userInteractions: {
          some: {
            createdAt: {
              gte: thirtyDaysAgo
            }
          }
        }
      },
      include: {
        craftsman: {
          include: {
            user: true
          }
        },
        _count: {
          select: {
            userInteractions: {
              where: {
                createdAt: {
                  gte: thirtyDaysAgo
                }
              }
            }
          }
        }
      },
      orderBy: [
        { averageRating: 'desc' },
        { reviewCount: 'desc' }
      ],
      take: limit
    })

    return trendingProducts
  }

  /**
   * Update personalized recommendations for a user
   */
  async updatePersonalizedRecommendations(userId: string): Promise<void> {
    // Get user's recent interactions
    const interactions = await prisma.userProductInteraction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    if (interactions.length === 0) return

    // Clear existing personalized recommendations
    await prisma.productRecommendation.deleteMany({
      where: {
        userId,
        recommendationType: RecommendationType.PERSONALIZED
      }
    })

    // Generate new recommendations based on interactions
    const categoryPreferences = this.analyzeCategoryPreferences(interactions)
    
    for (const interaction of interactions.slice(0, 5)) { // Top 5 recent interactions
      const similarProducts = await this.getSimilarProducts(interaction.productId, 3)
      
      for (const [index, product] of similarProducts.entries()) {
        const score = 1.0 - (index * 0.2) // Decreasing score based on position
        
        await prisma.productRecommendation.upsert({
          where: {
            userId_productId_recommendedProductId_recommendationType: {
              userId,
              productId: interaction.productId,
              recommendedProductId: product.id,
              recommendationType: RecommendationType.PERSONALIZED
            }
          },
          update: {
            score
          },
          create: {
            userId,
            productId: interaction.productId,
            recommendedProductId: product.id,
            recommendationType: RecommendationType.PERSONALIZED,
            score
          }
        })
      }
    }
  }

  /**
   * Get cross-sell recommendations for cart
   */
  async getCrossSellRecommendations(
    productIds: string[],
    limit: number = 5
  ): Promise<ProductWithCraftsman[]> {
    if (productIds.length === 0) return []

    const recommendations = new Map<string, number>()

    // For each product in cart, get frequently bought together products
    for (const productId of productIds) {
      const frequentlyBought = await this.getFrequentlyBoughtTogether(productId, 10)
      
      frequentlyBought.forEach((product, index) => {
        if (!productIds.includes(product.id)) {
          const score = 1.0 - (index * 0.1)
          recommendations.set(product.id, (recommendations.get(product.id) || 0) + score)
        }
      })
    }

    // Sort by combined score and get top recommendations
    const sortedRecommendations = Array.from(recommendations.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([productId]) => productId)

    if (sortedRecommendations.length === 0) return []

    const products = await prisma.product.findMany({
      where: {
        id: { in: sortedRecommendations },
        status: 'ACTIVE'
      },
      include: {
        craftsman: {
          include: {
            user: true
          }
        }
      }
    })

    return sortedRecommendations
      .map(id => products.find(p => p.id === id))
      .filter(Boolean) as ProductWithCraftsman[]
  }

  /**
   * Get recommendations for product page
   */
  async getProductPageRecommendations(
    productId: string,
    userId?: string
  ): Promise<{
    similarProducts: ProductWithCraftsman[]
    frequentlyBoughtTogether: ProductWithCraftsman[]
    fromSameCraftsman: ProductWithCraftsman[]
  }> {
    const [similarProducts, frequentlyBoughtTogether, fromSameCraftsman] = await Promise.all([
      this.getSimilarProducts(productId, 4),
      this.getFrequentlyBoughtTogether(productId, 4),
      this.getProductsFromSameCraftsman(productId, 4)
    ])

    // Track view interaction if user is provided
    if (userId) {
      await this.trackInteraction(userId, productId, InteractionType.VIEW)
    }

    return {
      similarProducts,
      frequentlyBoughtTogether,
      fromSameCraftsman
    }
  }

  /**
   * Get products from same craftsman
   */
  private async getProductsFromSameCraftsman(
    productId: string,
    limit: number = 4
  ): Promise<ProductWithCraftsman[]> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { craftsmanId: true }
    })

    if (!product) return []

    const products = await prisma.product.findMany({
      where: {
        craftsmanId: product.craftsmanId,
        status: 'ACTIVE',
        id: { not: productId }
      },
      include: {
        craftsman: {
          include: {
            user: true
          }
        }
      },
      orderBy: [
        { averageRating: 'desc' },
        { createdAt: 'desc' }
      ],
      take: limit
    })

    return products
  }

  /**
   * Analyze category preferences from interactions
   */
  private analyzeCategoryPreferences(interactions: any[]): string[] {
    const categoryCount: { [key: string]: number } = {}

    interactions.forEach(interaction => {
      const category = interaction.product?.craftCategory
      if (category) {
        categoryCount[category] = (categoryCount[category] || 0) + 1
      }
    })

    return Object.entries(categoryCount)
      .sort(([, a], [, b]) => b - a)
      .map(([category]) => category)
  }

  /**
   * Analyze craftsman preferences from interactions
   */
  private analyzeCraftsmanPreferences(interactions: any[]): string[] {
    const craftsmanCount: { [key: string]: number } = {}

    interactions.forEach(interaction => {
      const craftsmanId = interaction.product?.craftsmanId
      if (craftsmanId) {
        craftsmanCount[craftsmanId] = (craftsmanCount[craftsmanId] || 0) + 1
      }
    })

    return Object.entries(craftsmanCount)
      .sort(([, a], [, b]) => b - a)
      .map(([craftsmanId]) => craftsmanId)
  }

  /**
   * Get recommendation statistics
   */
  async getRecommendationStatistics(): Promise<{
    totalRecommendations: number
    recommendationsByType: { type: RecommendationType; count: number }[]
    topRecommendedProducts: { productId: string; productName: any; count: number }[]
  }> {
    const [
      totalRecommendations,
      recommendationsByType,
      topRecommendedProducts
    ] = await Promise.all([
      // Total recommendations
      prisma.productRecommendation.count(),
      // Recommendations by type
      prisma.productRecommendation.groupBy({
        by: ['recommendationType'],
        _count: { id: true }
      }),
      // Top recommended products
      prisma.productRecommendation.groupBy({
        by: ['recommendedProductId'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10
      })
    ])

    // Get product names for top recommended products
    const productIds = topRecommendedProducts.map(item => item.recommendedProductId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true }
    })

    const topRecommendedWithNames = topRecommendedProducts.map(item => ({
      productId: item.recommendedProductId,
      productName: products.find(p => p.id === item.recommendedProductId)?.name || 'Unknown',
      count: item._count.id
    }))

    return {
      totalRecommendations,
      recommendationsByType: recommendationsByType.map(item => ({
        type: item.recommendationType,
        count: item._count.id
      })),
      topRecommendedProducts: topRecommendedWithNames
    }
  }
}

export const productRecommendationService = new ProductRecommendationService()