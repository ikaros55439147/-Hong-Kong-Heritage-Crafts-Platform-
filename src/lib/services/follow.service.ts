import { prisma } from '@/lib/database'
import { Follow, User } from '@prisma/client'
import { PaginationParams, PaginationResult } from '@/types'
import { notificationService } from './notification.service'

export interface FollowData {
  followingId: string
}

export interface FollowWithUser extends Follow {
  following: User
  follower: User
}

export interface ActivityFeedItem {
  id: string
  type: 'new_course' | 'new_product' | 'profile_update' | 'new_follower'
  userId: string
  user: User
  title: string
  description?: string
  metadata?: Record<string, any>
  createdAt: Date
}

export class FollowService {
  /**
   * Follow a user (craftsman)
   */
  async followUser(followerId: string, followingId: string): Promise<Follow> {
    // Check if already following
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId
        }
      }
    })

    if (existingFollow) {
      throw new Error('Already following this user')
    }

    // Cannot follow yourself
    if (followerId === followingId) {
      throw new Error('Cannot follow yourself')
    }

    // Check if the user to follow exists
    const userToFollow = await prisma.user.findUnique({
      where: { id: followingId }
    })

    if (!userToFollow) {
      throw new Error('User not found')
    }

    const follow = await prisma.follow.create({
      data: {
        followerId,
        followingId
      }
    })

    // Send notification to the followed user
    try {
      await notificationService.notifyNewFollower(followingId, followerId)
    } catch (error) {
      console.warn('Failed to send follow notification:', error)
    }

    return follow
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId
        }
      }
    })

    if (!follow) {
      throw new Error('Not following this user')
    }

    await prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId,
          followingId
        }
      }
    })
  }

  /**
   * Get users that a user is following
   */
  async getFollowing(
    userId: string,
    pagination: PaginationParams = {}
  ): Promise<PaginationResult<User>> {
    const { page = 1, limit = 20 } = pagination
    const skip = (page - 1) * limit

    const [follows, total] = await Promise.all([
      prisma.follow.findMany({
        where: { followerId: userId },
        include: {
          following: true
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.follow.count({
        where: { followerId: userId }
      })
    ])

    return {
      data: follows.map(f => f.following),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  /**
   * Get followers of a user
   */
  async getFollowers(
    userId: string,
    pagination: PaginationParams = {}
  ): Promise<PaginationResult<User>> {
    const { page = 1, limit = 20 } = pagination
    const skip = (page - 1) * limit

    const [follows, total] = await Promise.all([
      prisma.follow.findMany({
        where: { followingId: userId },
        include: {
          follower: true
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.follow.count({
        where: { followingId: userId }
      })
    ])

    return {
      data: follows.map(f => f.follower),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  /**
   * Check if user A is following user B
   */
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId
        }
      }
    })

    return !!follow
  }

  /**
   * Get follow counts for a user
   */
  async getFollowCounts(userId: string): Promise<{
    followingCount: number
    followersCount: number
  }> {
    const [followingCount, followersCount] = await Promise.all([
      prisma.follow.count({
        where: { followerId: userId }
      }),
      prisma.follow.count({
        where: { followingId: userId }
      })
    ])

    return {
      followingCount,
      followersCount
    }
  }

  /**
   * Get activity feed for a user based on who they follow
   */
  async getActivityFeed(
    userId: string,
    pagination: PaginationParams = {}
  ): Promise<PaginationResult<ActivityFeedItem>> {
    const { page = 1, limit = 20 } = pagination
    const skip = (page - 1) * limit

    // Get users that this user follows
    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true }
    })

    const followingIds = following.map(f => f.followingId)

    if (followingIds.length === 0) {
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0
      }
    }

    // Get recent activities from followed users
    const activities: ActivityFeedItem[] = []

    // Get new courses from followed craftsmen
    const newCourses = await prisma.course.findMany({
      where: {
        craftsman: {
          userId: { in: followingIds }
        },
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      include: {
        craftsman: {
          include: {
            user: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    newCourses.forEach(course => {
      activities.push({
        id: `course_${course.id}`,
        type: 'new_course',
        userId: course.craftsman.userId,
        user: course.craftsman.user,
        title: `New course: ${typeof course.title === 'object' ? (course.title as any)['zh-HK'] || (course.title as any)['en'] : course.title}`,
        description: typeof course.description === 'object' ? (course.description as any)['zh-HK'] || (course.description as any)['en'] : course.description as string,
        metadata: {
          courseId: course.id,
          category: course.craftCategory
        },
        createdAt: course.createdAt
      })
    })

    // Get new products from followed craftsmen
    const newProducts = await prisma.product.findMany({
      where: {
        craftsman: {
          userId: { in: followingIds }
        },
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      include: {
        craftsman: {
          include: {
            user: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    newProducts.forEach(product => {
      activities.push({
        id: `product_${product.id}`,
        type: 'new_product',
        userId: product.craftsman.userId,
        user: product.craftsman.user,
        title: `New product: ${typeof product.name === 'object' ? (product.name as any)['zh-HK'] || (product.name as any)['en'] : product.name}`,
        description: typeof product.description === 'object' ? (product.description as any)['zh-HK'] || (product.description as any)['en'] : product.description as string,
        metadata: {
          productId: product.id,
          category: product.craftCategory,
          price: product.price
        },
        createdAt: product.createdAt
      })
    })

    // Get new followers for the user themselves
    const newFollowers = await prisma.follow.findMany({
      where: {
        followingId: userId,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      include: {
        follower: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    newFollowers.forEach(follow => {
      activities.push({
        id: `follower_${follow.id}`,
        type: 'new_follower',
        userId: follow.followerId,
        user: follow.follower,
        title: `${follow.follower.email} started following you`,
        metadata: {
          followId: follow.id
        },
        createdAt: follow.createdAt
      })
    })

    // Sort all activities by creation date
    activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    // Apply pagination
    const paginatedActivities = activities.slice(skip, skip + limit)

    return {
      data: paginatedActivities,
      total: activities.length,
      page,
      limit,
      totalPages: Math.ceil(activities.length / limit)
    }
  }

  /**
   * Get suggested users to follow based on craft categories and mutual follows
   */
  async getSuggestedFollows(
    userId: string,
    limit: number = 10
  ): Promise<User[]> {
    // Get users that the current user is already following
    const currentFollowing = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true }
    })

    const followingIds = currentFollowing.map(f => f.followingId)
    followingIds.push(userId) // Exclude self

    // Get craftsmen that the user is not following
    const suggestedCraftsmen = await prisma.user.findMany({
      where: {
        id: { notIn: followingIds },
        role: 'CRAFTSMAN',
        craftsmanProfile: {
          verificationStatus: 'VERIFIED'
        }
      },
      include: {
        craftsmanProfile: true,
        followers: {
          select: { followerId: true }
        }
      },
      take: limit * 2 // Get more to filter and sort
    })

    // Sort by number of followers (popularity)
    const sortedSuggestions = suggestedCraftsmen
      .sort((a, b) => b.followers.length - a.followers.length)
      .slice(0, limit)

    return sortedSuggestions
  }
}

export const followService = new FollowService()