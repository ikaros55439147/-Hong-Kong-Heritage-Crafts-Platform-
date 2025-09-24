import { prisma } from '@/lib/database'
import { Comment, Like, Report, EntityType, ReportStatus, User } from '@prisma/client'
import { PaginationParams, PaginationResult } from '@/types'

export interface CommentData {
  content: string
  parentId?: string
}

export interface CommentWithDetails extends Comment {
  user: User
  replies?: CommentWithDetails[]
  likesCount: number
  isLikedByUser?: boolean
  repliesCount: number
}

export interface ReportData {
  reason: string
  description?: string
}

export interface ReportWithDetails extends Report {
  reporter: User
  reviewer?: User
  comment?: Comment & { user: User }
}

export class CommentService {
  /**
   * Create a comment on an entity (course, product, craftsman profile)
   */
  async createComment(
    userId: string,
    entityType: EntityType,
    entityId: string,
    commentData: CommentData
  ): Promise<CommentWithDetails> {
    // Validate entity exists
    await this.validateEntity(entityType, entityId)

    // If it's a reply, validate parent comment exists
    if (commentData.parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: commentData.parentId }
      })

      if (!parentComment) {
        throw new Error('Parent comment not found')
      }

      if (parentComment.entityType !== entityType || parentComment.entityId !== entityId) {
        throw new Error('Parent comment does not belong to the same entity')
      }
    }

    const comment = await prisma.comment.create({
      data: {
        userId,
        entityType,
        entityId,
        parentId: commentData.parentId,
        content: commentData.content
      },
      include: {
        user: true,
        likes: true,
        replies: {
          include: {
            user: true,
            likes: true
          }
        }
      }
    })

    return this.formatCommentWithDetails(comment, userId)
  }

  /**
   * Get comments for an entity with pagination
   */
  async getComments(
    entityType: EntityType,
    entityId: string,
    pagination: PaginationParams = {},
    userId?: string
  ): Promise<PaginationResult<CommentWithDetails>> {
    const { page = 1, limit = 20 } = pagination
    const skip = (page - 1) * limit

    // Get top-level comments (no parent)
    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: {
          entityType,
          entityId,
          parentId: null,
          isApproved: true
        },
        include: {
          user: true,
          likes: true,
          replies: {
            where: { isApproved: true },
            include: {
              user: true,
              likes: true
            },
            orderBy: { createdAt: 'asc' },
            take: 5 // Limit initial replies shown
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.comment.count({
        where: {
          entityType,
          entityId,
          parentId: null,
          isApproved: true
        }
      })
    ])

    const formattedComments = comments.map(comment => 
      this.formatCommentWithDetails(comment, userId)
    )

    return {
      data: formattedComments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  /**
   * Get replies for a specific comment
   */
  async getReplies(
    commentId: string,
    pagination: PaginationParams = {},
    userId?: string
  ): Promise<PaginationResult<CommentWithDetails>> {
    const { page = 1, limit = 10 } = pagination
    const skip = (page - 1) * limit

    const [replies, total] = await Promise.all([
      prisma.comment.findMany({
        where: {
          parentId: commentId,
          isApproved: true
        },
        include: {
          user: true,
          likes: true
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' }
      }),
      prisma.comment.count({
        where: {
          parentId: commentId,
          isApproved: true
        }
      })
    ])

    const formattedReplies = replies.map(reply => 
      this.formatCommentWithDetails(reply, userId)
    )

    return {
      data: formattedReplies,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  /**
   * Update a comment (only by the author)
   */
  async updateComment(
    commentId: string,
    userId: string,
    content: string
  ): Promise<CommentWithDetails> {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: { user: true }
    })

    if (!comment) {
      throw new Error('Comment not found')
    }

    if (comment.userId !== userId) {
      throw new Error('Not authorized to update this comment')
    }

    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: { content },
      include: {
        user: true,
        likes: true,
        replies: {
          include: {
            user: true,
            likes: true
          }
        }
      }
    })

    return this.formatCommentWithDetails(updatedComment, userId)
  }

  /**
   * Delete a comment (only by the author or admin)
   */
  async deleteComment(commentId: string, userId: string, isAdmin: boolean = false): Promise<void> {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId }
    })

    if (!comment) {
      throw new Error('Comment not found')
    }

    if (!isAdmin && comment.userId !== userId) {
      throw new Error('Not authorized to delete this comment')
    }

    // Delete the comment and all its replies
    await prisma.comment.delete({
      where: { id: commentId }
    })
  }

  /**
   * Like or unlike a comment
   */
  async toggleLike(
    userId: string,
    entityType: EntityType,
    entityId: string
  ): Promise<{ isLiked: boolean; likesCount: number }> {
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_entityType_entityId: {
          userId,
          entityType,
          entityId
        }
      }
    })

    if (existingLike) {
      // Unlike
      await prisma.like.delete({
        where: { id: existingLike.id }
      })

      const likesCount = await prisma.like.count({
        where: { entityType, entityId }
      })

      return { isLiked: false, likesCount }
    } else {
      // Like
      await prisma.like.create({
        data: {
          userId,
          entityType,
          entityId
        }
      })

      const likesCount = await prisma.like.count({
        where: { entityType, entityId }
      })

      return { isLiked: true, likesCount }
    }
  }

  /**
   * Report a comment
   */
  async reportComment(
    reporterId: string,
    commentId: string,
    reportData: ReportData
  ): Promise<Report> {
    // Check if comment exists
    const comment = await prisma.comment.findUnique({
      where: { id: commentId }
    })

    if (!comment) {
      throw new Error('Comment not found')
    }

    // Check if user already reported this comment
    const existingReport = await prisma.report.findFirst({
      where: {
        reporterId,
        entityType: 'COMMENT',
        entityId: commentId
      }
    })

    if (existingReport) {
      throw new Error('You have already reported this comment')
    }

    return await prisma.report.create({
      data: {
        reporterId,
        entityType: 'COMMENT',
        entityId: commentId,
        reason: reportData.reason,
        description: reportData.description
      }
    })
  }

  /**
   * Get reported comments for moderation (admin only)
   */
  async getReportedComments(
    pagination: PaginationParams = {}
  ): Promise<PaginationResult<ReportWithDetails>> {
    const { page = 1, limit = 20 } = pagination
    const skip = (page - 1) * limit

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where: {
          entityType: 'COMMENT',
          status: 'PENDING'
        },
        include: {
          reporter: true,
          reviewer: true,
          comment: {
            include: {
              user: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.report.count({
        where: {
          entityType: 'COMMENT',
          status: 'PENDING'
        }
      })
    ])

    return {
      data: reports as ReportWithDetails[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  /**
   * Review a report (admin only)
   */
  async reviewReport(
    reportId: string,
    reviewerId: string,
    action: 'approve' | 'dismiss' | 'hide_comment'
  ): Promise<Report> {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: { comment: true }
    })

    if (!report) {
      throw new Error('Report not found')
    }

    let updateData: any = {
      status: action === 'dismiss' ? 'DISMISSED' : 'RESOLVED',
      reviewedBy: reviewerId,
      reviewedAt: new Date()
    }

    // If hiding comment, update the comment's approval status
    if (action === 'hide_comment' && report.comment) {
      await prisma.comment.update({
        where: { id: report.comment.id },
        data: { isApproved: false }
      })
    }

    return await prisma.report.update({
      where: { id: reportId },
      data: updateData
    })
  }

  /**
   * Get comment statistics for an entity
   */
  async getCommentStats(entityType: EntityType, entityId: string): Promise<{
    totalComments: number
    totalLikes: number
  }> {
    const [totalComments, totalLikes] = await Promise.all([
      prisma.comment.count({
        where: {
          entityType,
          entityId,
          isApproved: true
        }
      }),
      prisma.like.count({
        where: {
          entityType,
          entityId
        }
      })
    ])

    return { totalComments, totalLikes }
  }

  /**
   * Validate that an entity exists
   */
  private async validateEntity(entityType: EntityType, entityId: string): Promise<void> {
    let exists = false

    switch (entityType) {
      case 'COURSE':
        exists = !!(await prisma.course.findUnique({ where: { id: entityId } }))
        break
      case 'PRODUCT':
        exists = !!(await prisma.product.findUnique({ where: { id: entityId } }))
        break
      case 'CRAFTSMAN_PROFILE':
        exists = !!(await prisma.craftsmanProfile.findUnique({ where: { id: entityId } }))
        break
      default:
        throw new Error('Invalid entity type')
    }

    if (!exists) {
      throw new Error(`${entityType} not found`)
    }
  }

  /**
   * Format comment with additional details
   */
  private formatCommentWithDetails(
    comment: Comment & {
      user: User
      likes: Like[]
      replies?: (Comment & { user: User; likes: Like[] })[]
    },
    userId?: string
  ): CommentWithDetails {
    const likesCount = comment.likes.length
    const isLikedByUser = userId ? comment.likes.some(like => like.userId === userId) : false
    const repliesCount = comment.replies?.length || 0

    const formattedReplies = comment.replies?.map(reply => 
      this.formatCommentWithDetails(reply, userId)
    )

    return {
      ...comment,
      likesCount,
      isLikedByUser,
      repliesCount,
      replies: formattedReplies
    }
  }
}

export const commentService = new CommentService()