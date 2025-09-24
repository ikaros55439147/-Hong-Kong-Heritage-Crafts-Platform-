import { PrismaClient } from '@prisma/client'
import { 
  ProductReviewData, 
  ProductReviewWithDetails, 
  PaginationParams, 
  PaginationResult,
  ValidationResult
} from '@/types'
import { validateProductReviewData } from '@/lib/validations'

const prisma = new PrismaClient()

export class ProductReviewService {
  /**
   * Create a product review
   */
  async createReview(
    userId: string, 
    reviewData: ProductReviewData
  ): Promise<ProductReviewWithDetails> {
    // Validate review data
    const validation = validateProductReviewData(reviewData)
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`)
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: reviewData.productId }
    })

    if (!product) {
      throw new Error('Product not found')
    }

    // Check if user has already reviewed this product for this order
    if (reviewData.orderId) {
      const existingReview = await prisma.productReview.findUnique({
        where: {
          productId_userId_orderId: {
            productId: reviewData.productId,
            userId,
            orderId: reviewData.orderId
          }
        }
      })

      if (existingReview) {
        throw new Error('You have already reviewed this product for this order')
      }

      // Verify the order exists and belongs to the user
      const order = await prisma.order.findFirst({
        where: {
          id: reviewData.orderId,
          userId,
          orderItems: {
            some: {
              productId: reviewData.productId
            }
          }
        }
      })

      if (!order) {
        throw new Error('Order not found or does not contain this product')
      }
    }

    const review = await prisma.productReview.create({
      data: {
        productId: reviewData.productId,
        userId,
        orderId: reviewData.orderId,
        rating: reviewData.rating,
        title: reviewData.title,
        comment: reviewData.comment,
        images: reviewData.images || [],
        isVerifiedPurchase: !!reviewData.orderId
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true
          }
        },
        product: {
          include: {
            craftsman: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true
                  }
                }
              }
            }
          }
        },
        order: true,
        helpfulnessVotes: true
      }
    })

    return review
  }

  /**
   * Get reviews for a product
   */
  async getProductReviews(
    productId: string,
    pagination: PaginationParams = {},
    filters: {
      rating?: number
      verifiedOnly?: boolean
      sortBy?: 'newest' | 'oldest' | 'rating_high' | 'rating_low' | 'helpful'
    } = {}
  ): Promise<PaginationResult<ProductReviewWithDetails>> {
    const { page = 1, limit = 10 } = pagination
    const skip = (page - 1) * limit

    const where: any = { productId }

    if (filters.rating) {
      where.rating = filters.rating
    }

    if (filters.verifiedOnly) {
      where.isVerifiedPurchase = true
    }

    // Determine sort order
    let orderBy: any = { createdAt: 'desc' } // default: newest
    
    switch (filters.sortBy) {
      case 'oldest':
        orderBy = { createdAt: 'asc' }
        break
      case 'rating_high':
        orderBy = { rating: 'desc' }
        break
      case 'rating_low':
        orderBy = { rating: 'asc' }
        break
      case 'helpful':
        orderBy = { helpfulCount: 'desc' }
        break
    }

    const [reviews, total] = await Promise.all([
      prisma.productReview.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true
            }
          },
          product: {
            include: {
              craftsman: {
                include: {
                  user: {
                    select: {
                      id: true,
                      email: true
                    }
                  }
                }
              }
            }
          },
          order: true,
          helpfulnessVotes: true
        },
        orderBy,
        skip,
        take: limit
      }),
      prisma.productReview.count({ where })
    ])

    return {
      data: reviews,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  /**
   * Get review by ID
   */
  async getReviewById(reviewId: string): Promise<ProductReviewWithDetails | null> {
    const review = await prisma.productReview.findUnique({
      where: { id: reviewId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true
          }
        },
        product: {
          include: {
            craftsman: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true
                  }
                }
              }
            }
          }
        },
        order: true,
        helpfulnessVotes: true
      }
    })

    return review
  }

  /**
   * Update review
   */
  async updateReview(
    reviewId: string,
    userId: string,
    updates: Partial<ProductReviewData>
  ): Promise<ProductReviewWithDetails> {
    // Verify review exists and belongs to user
    const existingReview = await prisma.productReview.findFirst({
      where: {
        id: reviewId,
        userId
      }
    })

    if (!existingReview) {
      throw new Error('Review not found or access denied')
    }

    // Validate updates
    if (Object.keys(updates).length > 0) {
      const validation = validateProductReviewData(updates, true) // partial validation
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`)
      }
    }

    const review = await prisma.productReview.update({
      where: { id: reviewId },
      data: updates,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true
          }
        },
        product: {
          include: {
            craftsman: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true
                  }
                }
              }
            }
          }
        },
        order: true,
        helpfulnessVotes: true
      }
    })

    return review
  }

  /**
   * Delete review
   */
  async deleteReview(reviewId: string, userId: string): Promise<void> {
    // Verify review exists and belongs to user
    const existingReview = await prisma.productReview.findFirst({
      where: {
        id: reviewId,
        userId
      }
    })

    if (!existingReview) {
      throw new Error('Review not found or access denied')
    }

    await prisma.productReview.delete({
      where: { id: reviewId }
    })
  }

  /**
   * Mark review as helpful/unhelpful
   */
  async markReviewHelpful(
    reviewId: string,
    userId: string,
    isHelpful: boolean
  ): Promise<void> {
    // Check if user has already voted on this review
    const existingVote = await prisma.reviewHelpfulness.findUnique({
      where: {
        reviewId_userId: {
          reviewId,
          userId
        }
      }
    })

    if (existingVote) {
      // Update existing vote
      await prisma.reviewHelpfulness.update({
        where: {
          reviewId_userId: {
            reviewId,
            userId
          }
        },
        data: { isHelpful }
      })
    } else {
      // Create new vote
      await prisma.reviewHelpfulness.create({
        data: {
          reviewId,
          userId,
          isHelpful
        }
      })
    }

    // Update helpful count on the review
    const helpfulCount = await prisma.reviewHelpfulness.count({
      where: {
        reviewId,
        isHelpful: true
      }
    })

    await prisma.productReview.update({
      where: { id: reviewId },
      data: { helpfulCount }
    })
  }

  /**
   * Get user's reviews
   */
  async getUserReviews(
    userId: string,
    pagination: PaginationParams = {}
  ): Promise<PaginationResult<ProductReviewWithDetails>> {
    const { page = 1, limit = 10 } = pagination
    const skip = (page - 1) * limit

    const [reviews, total] = await Promise.all([
      prisma.productReview.findMany({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true
            }
          },
          product: {
            include: {
              craftsman: {
                include: {
                  user: {
                    select: {
                      id: true,
                      email: true
                    }
                  }
                }
              }
            }
          },
          order: true,
          helpfulnessVotes: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.productReview.count({
        where: { userId }
      })
    ])

    return {
      data: reviews,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  /**
   * Get review statistics for a product
   */
  async getProductReviewStatistics(productId: string): Promise<{
    totalReviews: number
    averageRating: number
    ratingDistribution: { rating: number; count: number }[]
    verifiedPurchaseCount: number
  }> {
    const [
      totalReviews,
      averageRating,
      ratingDistribution,
      verifiedPurchaseCount
    ] = await Promise.all([
      // Total reviews
      prisma.productReview.count({
        where: { productId }
      }),
      // Average rating
      prisma.productReview.aggregate({
        where: { productId },
        _avg: { rating: true }
      }),
      // Rating distribution
      prisma.productReview.groupBy({
        by: ['rating'],
        where: { productId },
        _count: { rating: true },
        orderBy: { rating: 'desc' }
      }),
      // Verified purchase count
      prisma.productReview.count({
        where: {
          productId,
          isVerifiedPurchase: true
        }
      })
    ])

    return {
      totalReviews,
      averageRating: Number(averageRating._avg.rating || 0),
      ratingDistribution: ratingDistribution.map(item => ({
        rating: item.rating,
        count: item._count.rating
      })),
      verifiedPurchaseCount
    }
  }

  /**
   * Get reviews that need response from craftsman
   */
  async getReviewsForCraftsman(
    craftsmanId: string,
    pagination: PaginationParams = {}
  ): Promise<PaginationResult<ProductReviewWithDetails>> {
    const { page = 1, limit = 10 } = pagination
    const skip = (page - 1) * limit

    const [reviews, total] = await Promise.all([
      prisma.productReview.findMany({
        where: {
          product: {
            craftsmanId
          }
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true
            }
          },
          product: {
            include: {
              craftsman: {
                include: {
                  user: {
                    select: {
                      id: true,
                      email: true
                    }
                  }
                }
              }
            }
          },
          order: true,
          helpfulnessVotes: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.productReview.count({
        where: {
          product: {
            craftsmanId
          }
        }
      })
    ])

    return {
      data: reviews,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }
}

export const productReviewService = new ProductReviewService()