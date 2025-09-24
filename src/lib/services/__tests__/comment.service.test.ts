import { describe, it, expect, beforeEach, vi } from 'vitest'
import { commentService } from '../comment.service'
import { prisma } from '@/lib/database'

// Mock Prisma
vi.mock('@/lib/database', () => ({
  prisma: {
    comment: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn()
    },
    like: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      count: vi.fn()
    },
    report: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn()
    },
    course: {
      findUnique: vi.fn()
    },
    product: {
      findUnique: vi.fn()
    },
    craftsmanProfile: {
      findUnique: vi.fn()
    }
  }
}))

describe('CommentService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createComment', () => {
    it('should create a comment successfully', async () => {
      const userId = 'user1'
      const entityType = 'COURSE'
      const entityId = 'course1'
      const commentData = { content: 'Great course!' }

      // Mock entity validation
      vi.mocked(prisma.course.findUnique).mockResolvedValue({
        id: entityId,
        craftsmanId: 'craftsman1',
        title: { 'zh-HK': '手雕麻將課程' },
        description: null,
        craftCategory: 'mahjong',
        maxParticipants: 10,
        durationHours: 2,
        price: 500,
        status: 'ACTIVE',
        createdAt: new Date()
      })

      // Mock comment creation
      const mockComment = {
        id: 'comment1',
        userId,
        entityType,
        entityId,
        parentId: null,
        content: commentData.content,
        isReported: false,
        isApproved: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: userId,
          email: 'user@example.com',
          passwordHash: 'hash',
          role: 'LEARNER' as const,
          preferredLanguage: 'zh-HK',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        likes: [],
        replies: []
      }

      vi.mocked(prisma.comment.create).mockResolvedValue(mockComment)

      const result = await commentService.createComment(userId, entityType as any, entityId, commentData)

      expect(result).toMatchObject({
        id: 'comment1',
        content: commentData.content,
        likesCount: 0,
        isLikedByUser: false,
        repliesCount: 0
      })

      expect(prisma.comment.create).toHaveBeenCalledWith({
        data: {
          userId,
          entityType,
          entityId,
          parentId: undefined,
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
    })

    it('should create a reply to a comment', async () => {
      const userId = 'user1'
      const entityType = 'COURSE'
      const entityId = 'course1'
      const parentId = 'comment1'
      const commentData = { content: 'Thanks for sharing!', parentId }

      // Mock entity validation
      vi.mocked(prisma.course.findUnique).mockResolvedValue({
        id: entityId,
        craftsmanId: 'craftsman1',
        title: { 'zh-HK': '手雕麻將課程' },
        description: null,
        craftCategory: 'mahjong',
        maxParticipants: 10,
        durationHours: 2,
        price: 500,
        status: 'ACTIVE',
        createdAt: new Date()
      })

      // Mock parent comment validation
      vi.mocked(prisma.comment.findUnique).mockResolvedValue({
        id: parentId,
        userId: 'user2',
        entityType,
        entityId,
        parentId: null,
        content: 'Great course!',
        isReported: false,
        isApproved: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })

      // Mock reply creation
      const mockReply = {
        id: 'reply1',
        userId,
        entityType,
        entityId,
        parentId,
        content: commentData.content,
        isReported: false,
        isApproved: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: userId,
          email: 'user@example.com',
          passwordHash: 'hash',
          role: 'LEARNER' as const,
          preferredLanguage: 'zh-HK',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        likes: [],
        replies: []
      }

      vi.mocked(prisma.comment.create).mockResolvedValue(mockReply)

      const result = await commentService.createComment(userId, entityType as any, entityId, commentData)

      expect(result.parentId).toBe(parentId)
      expect(result.content).toBe(commentData.content)
    })

    it('should throw error if entity does not exist', async () => {
      const userId = 'user1'
      const entityType = 'COURSE'
      const entityId = 'nonexistent'
      const commentData = { content: 'Great course!' }

      vi.mocked(prisma.course.findUnique).mockResolvedValue(null)

      await expect(commentService.createComment(userId, entityType as any, entityId, commentData))
        .rejects.toThrow('COURSE not found')
    })

    it('should throw error if parent comment does not exist', async () => {
      const userId = 'user1'
      const entityType = 'COURSE'
      const entityId = 'course1'
      const commentData = { content: 'Reply', parentId: 'nonexistent' }

      // Mock entity validation
      vi.mocked(prisma.course.findUnique).mockResolvedValue({
        id: entityId,
        craftsmanId: 'craftsman1',
        title: { 'zh-HK': '手雕麻將課程' },
        description: null,
        craftCategory: 'mahjong',
        maxParticipants: 10,
        durationHours: 2,
        price: 500,
        status: 'ACTIVE',
        createdAt: new Date()
      })

      vi.mocked(prisma.comment.findUnique).mockResolvedValue(null)

      await expect(commentService.createComment(userId, entityType as any, entityId, commentData))
        .rejects.toThrow('Parent comment not found')
    })
  })

  describe('getComments', () => {
    it('should return paginated comments', async () => {
      const entityType = 'COURSE'
      const entityId = 'course1'
      const userId = 'user1'

      const mockComments = [
        {
          id: 'comment1',
          userId: 'user2',
          entityType,
          entityId,
          parentId: null,
          content: 'Great course!',
          isReported: false,
          isApproved: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: {
            id: 'user2',
            email: 'user2@example.com',
            passwordHash: 'hash',
            role: 'LEARNER' as const,
            preferredLanguage: 'zh-HK',
            createdAt: new Date(),
            updatedAt: new Date()
          },
          likes: [],
          replies: []
        }
      ]

      vi.mocked(prisma.comment.findMany).mockResolvedValue(mockComments)
      vi.mocked(prisma.comment.count).mockResolvedValue(1)

      const result = await commentService.getComments(entityType as any, entityId, { page: 1, limit: 20 }, userId)

      expect(result).toEqual({
        data: expect.arrayContaining([
          expect.objectContaining({
            id: 'comment1',
            content: 'Great course!',
            likesCount: 0,
            isLikedByUser: false,
            repliesCount: 0
          })
        ]),
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1
      })
    })
  })

  describe('toggleLike', () => {
    it('should like a comment when not already liked', async () => {
      const userId = 'user1'
      const entityType = 'COMMENT'
      const entityId = 'comment1'

      // Mock no existing like
      vi.mocked(prisma.like.findUnique).mockResolvedValue(null)

      // Mock like creation
      vi.mocked(prisma.like.create).mockResolvedValue({
        id: 'like1',
        userId,
        entityType,
        entityId,
        createdAt: new Date()
      })

      // Mock likes count
      vi.mocked(prisma.like.count).mockResolvedValue(1)

      const result = await commentService.toggleLike(userId, entityType as any, entityId)

      expect(result).toEqual({
        isLiked: true,
        likesCount: 1
      })

      expect(prisma.like.create).toHaveBeenCalledWith({
        data: { userId, entityType, entityId }
      })
    })

    it('should unlike a comment when already liked', async () => {
      const userId = 'user1'
      const entityType = 'COMMENT'
      const entityId = 'comment1'

      // Mock existing like
      const existingLike = {
        id: 'like1',
        userId,
        entityType,
        entityId,
        createdAt: new Date()
      }
      vi.mocked(prisma.like.findUnique).mockResolvedValue(existingLike)

      // Mock like deletion
      vi.mocked(prisma.like.delete).mockResolvedValue(existingLike)

      // Mock likes count
      vi.mocked(prisma.like.count).mockResolvedValue(0)

      const result = await commentService.toggleLike(userId, entityType as any, entityId)

      expect(result).toEqual({
        isLiked: false,
        likesCount: 0
      })

      expect(prisma.like.delete).toHaveBeenCalledWith({
        where: { id: existingLike.id }
      })
    })
  })

  describe('reportComment', () => {
    it('should report a comment successfully', async () => {
      const reporterId = 'user1'
      const commentId = 'comment1'
      const reportData = { reason: 'Inappropriate content', description: 'Contains offensive language' }

      // Mock comment exists
      vi.mocked(prisma.comment.findUnique).mockResolvedValue({
        id: commentId,
        userId: 'user2',
        entityType: 'COURSE',
        entityId: 'course1',
        parentId: null,
        content: 'Bad comment',
        isReported: false,
        isApproved: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })

      // Mock no existing report
      vi.mocked(prisma.report.findFirst).mockResolvedValue(null)

      // Mock report creation
      const mockReport = {
        id: 'report1',
        reporterId,
        entityType: 'COMMENT' as const,
        entityId: commentId,
        reason: reportData.reason,
        description: reportData.description,
        status: 'PENDING' as const,
        reviewedBy: null,
        reviewedAt: null,
        createdAt: new Date()
      }
      vi.mocked(prisma.report.create).mockResolvedValue(mockReport)

      const result = await commentService.reportComment(reporterId, commentId, reportData)

      expect(result).toEqual(mockReport)
      expect(prisma.report.create).toHaveBeenCalledWith({
        data: {
          reporterId,
          entityType: 'COMMENT',
          entityId: commentId,
          reason: reportData.reason,
          description: reportData.description
        }
      })
    })

    it('should throw error if comment not found', async () => {
      const reporterId = 'user1'
      const commentId = 'nonexistent'
      const reportData = { reason: 'Inappropriate content' }

      vi.mocked(prisma.comment.findUnique).mockResolvedValue(null)

      await expect(commentService.reportComment(reporterId, commentId, reportData))
        .rejects.toThrow('Comment not found')
    })

    it('should throw error if already reported', async () => {
      const reporterId = 'user1'
      const commentId = 'comment1'
      const reportData = { reason: 'Inappropriate content' }

      // Mock comment exists
      vi.mocked(prisma.comment.findUnique).mockResolvedValue({
        id: commentId,
        userId: 'user2',
        entityType: 'COURSE',
        entityId: 'course1',
        parentId: null,
        content: 'Bad comment',
        isReported: false,
        isApproved: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })

      // Mock existing report
      vi.mocked(prisma.report.findFirst).mockResolvedValue({
        id: 'report1',
        reporterId,
        entityType: 'COMMENT',
        entityId: commentId,
        reason: 'Spam',
        description: null,
        status: 'PENDING',
        reviewedBy: null,
        reviewedAt: null,
        createdAt: new Date()
      })

      await expect(commentService.reportComment(reporterId, commentId, reportData))
        .rejects.toThrow('You have already reported this comment')
    })
  })

  describe('updateComment', () => {
    it('should update comment successfully', async () => {
      const commentId = 'comment1'
      const userId = 'user1'
      const newContent = 'Updated content'

      // Mock comment exists and belongs to user
      vi.mocked(prisma.comment.findUnique).mockResolvedValue({
        id: commentId,
        userId,
        entityType: 'COURSE',
        entityId: 'course1',
        parentId: null,
        content: 'Original content',
        isReported: false,
        isApproved: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: userId,
          email: 'user@example.com',
          passwordHash: 'hash',
          role: 'LEARNER' as const,
          preferredLanguage: 'zh-HK',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      // Mock comment update
      const updatedComment = {
        id: commentId,
        userId,
        entityType: 'COURSE' as const,
        entityId: 'course1',
        parentId: null,
        content: newContent,
        isReported: false,
        isApproved: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: userId,
          email: 'user@example.com',
          passwordHash: 'hash',
          role: 'LEARNER' as const,
          preferredLanguage: 'zh-HK',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        likes: [],
        replies: []
      }
      vi.mocked(prisma.comment.update).mockResolvedValue(updatedComment)

      const result = await commentService.updateComment(commentId, userId, newContent)

      expect(result.content).toBe(newContent)
      expect(prisma.comment.update).toHaveBeenCalledWith({
        where: { id: commentId },
        data: { content: newContent },
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
    })

    it('should throw error if comment not found', async () => {
      const commentId = 'nonexistent'
      const userId = 'user1'
      const newContent = 'Updated content'

      vi.mocked(prisma.comment.findUnique).mockResolvedValue(null)

      await expect(commentService.updateComment(commentId, userId, newContent))
        .rejects.toThrow('Comment not found')
    })

    it('should throw error if user not authorized', async () => {
      const commentId = 'comment1'
      const userId = 'user1'
      const newContent = 'Updated content'

      // Mock comment belongs to different user
      vi.mocked(prisma.comment.findUnique).mockResolvedValue({
        id: commentId,
        userId: 'user2', // Different user
        entityType: 'COURSE',
        entityId: 'course1',
        parentId: null,
        content: 'Original content',
        isReported: false,
        isApproved: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: 'user2',
          email: 'user2@example.com',
          passwordHash: 'hash',
          role: 'LEARNER' as const,
          preferredLanguage: 'zh-HK',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      await expect(commentService.updateComment(commentId, userId, newContent))
        .rejects.toThrow('Not authorized to update this comment')
    })
  })

  describe('getCommentStats', () => {
    it('should return comment statistics', async () => {
      const entityType = 'COURSE'
      const entityId = 'course1'

      vi.mocked(prisma.comment.count).mockResolvedValue(5)
      vi.mocked(prisma.like.count).mockResolvedValue(12)

      const result = await commentService.getCommentStats(entityType as any, entityId)

      expect(result).toEqual({
        totalComments: 5,
        totalLikes: 12
      })
    })
  })
})