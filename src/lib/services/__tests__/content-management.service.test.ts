import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

const mockPrisma = {
  contentVersion: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn()
  },
  contentSchedule: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
  },
  contentTag: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn()
  },
  contentTagAssociation: {
    deleteMany: vi.fn(),
    create: vi.fn()
  },
  contentQualityScore: {
    upsert: vi.fn()
  },
  contentAuditLog: {
    findMany: vi.fn(),
    create: vi.fn()
  },
  course: {
    findUnique: vi.fn(),
    findMany: vi.fn()
  },
  product: {
    findUnique: vi.fn(),
    findMany: vi.fn()
  },
  learningMaterial: {
    findUnique: vi.fn(),
    findMany: vi.fn()
  },
  like: {
    count: vi.fn()
  },
  comment: {
    count: vi.fn()
  }
}

// Mock Prisma
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma)
}))

// Mock the service
vi.mock('../content-management.service', async () => {
  const { ContentManagementService } = await vi.importActual('../content-management.service')
  const service = new ContentManagementService()
  // Replace the prisma instance
  ;(service as any).prisma = mockPrisma
  return {
    ContentManagementService,
    contentManagementService: service
  }
})

const { contentManagementService } = await import('../content-management.service')

describe('ContentManagementService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Version Control', () => {
    it('should create a new version', async () => {
      const mockVersion = {
        id: 'version-1',
        entityType: 'course',
        entityId: 'course-1',
        versionNumber: 1,
        contentData: { title: 'Test Course' },
        changeSummary: 'Initial version',
        createdBy: 'user-1',
        createdAt: new Date(),
        isPublished: false,
        creator: {
          id: 'user-1',
          email: 'test@example.com',
          role: 'CRAFTSMAN'
        }
      }

      mockPrisma.contentVersion.findFirst.mockResolvedValue(null)
      mockPrisma.contentVersion.create.mockResolvedValue(mockVersion)
      mockPrisma.contentAuditLog.create.mockResolvedValue({})

      const result = await contentManagementService.createVersion({
        entityType: 'course',
        entityId: 'course-1',
        contentData: { title: 'Test Course' },
        changeSummary: 'Initial version',
        createdBy: 'user-1'
      })

      expect(mockPrisma.contentVersion.create).toHaveBeenCalledWith({
        data: {
          entityType: 'course',
          entityId: 'course-1',
          contentData: { title: 'Test Course' },
          changeSummary: 'Initial version',
          createdBy: 'user-1',
          versionNumber: 1
        },
        include: {
          creator: {
            select: {
              id: true,
              email: true,
              role: true
            }
          }
        }
      })

      expect(result).toEqual(mockVersion)
    })

    it('should increment version number correctly', async () => {
      const lastVersion = {
        versionNumber: 3
      }

      mockPrisma.contentVersion.findFirst.mockResolvedValue(lastVersion)
      mockPrisma.contentVersion.create.mockResolvedValue({
        id: 'version-4',
        versionNumber: 4
      })
      mockPrisma.contentAuditLog.create.mockResolvedValue({})

      await contentManagementService.createVersion({
        entityType: 'course',
        entityId: 'course-1',
        contentData: { title: 'Test Course' },
        createdBy: 'user-1'
      })

      expect(mockPrisma.contentVersion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            versionNumber: 4
          })
        })
      )
    })

    it('should publish a version', async () => {
      const mockVersion = {
        id: 'version-1',
        entityType: 'course',
        entityId: 'course-1',
        versionNumber: 1
      }

      mockPrisma.contentVersion.findUnique.mockResolvedValue(mockVersion)
      mockPrisma.contentVersion.updateMany.mockResolvedValue({})
      mockPrisma.contentVersion.update.mockResolvedValue({
        ...mockVersion,
        isPublished: true,
        publishedAt: new Date()
      })
      mockPrisma.contentAuditLog.create.mockResolvedValue({})

      const result = await contentManagementService.publishVersion('version-1', 'user-1')

      expect(mockPrisma.contentVersion.updateMany).toHaveBeenCalledWith({
        where: {
          entityType: 'course',
          entityId: 'course-1',
          isPublished: true
        },
        data: {
          isPublished: false
        }
      })

      expect(mockPrisma.contentVersion.update).toHaveBeenCalledWith({
        where: { id: 'version-1' },
        data: {
          isPublished: true,
          publishedAt: expect.any(Date)
        }
      })
    })

    it('should get version history', async () => {
      const mockVersions = [
        { id: 'version-2', versionNumber: 2 },
        { id: 'version-1', versionNumber: 1 }
      ]

      mockPrisma.contentVersion.findMany.mockResolvedValue(mockVersions)

      const result = await contentManagementService.getVersionHistory('course', 'course-1')

      expect(mockPrisma.contentVersion.findMany).toHaveBeenCalledWith({
        where: {
          entityType: 'course',
          entityId: 'course-1'
        },
        orderBy: { versionNumber: 'desc' },
        include: {
          creator: {
            select: {
              id: true,
              email: true,
              role: true
            }
          }
        }
      })

      expect(result).toEqual(mockVersions)
    })
  })

  describe('Content Scheduling', () => {
    it('should create a content schedule', async () => {
      const mockSchedule = {
        id: 'schedule-1',
        entityType: 'course',
        entityId: 'course-1',
        actionType: 'publish',
        scheduledAt: new Date('2024-12-25T10:00:00Z'),
        createdBy: 'user-1',
        creator: {
          id: 'user-1',
          email: 'test@example.com',
          role: 'CRAFTSMAN'
        }
      }

      mockPrisma.contentSchedule.create.mockResolvedValue(mockSchedule)
      mockPrisma.contentAuditLog.create.mockResolvedValue({})

      const result = await contentManagementService.scheduleContent({
        entityType: 'course',
        entityId: 'course-1',
        actionType: 'publish',
        scheduledAt: new Date('2024-12-25T10:00:00Z'),
        createdBy: 'user-1'
      })

      expect(mockPrisma.contentSchedule.create).toHaveBeenCalledWith({
        data: {
          entityType: 'course',
          entityId: 'course-1',
          actionType: 'publish',
          scheduledAt: new Date('2024-12-25T10:00:00Z'),
          createdBy: 'user-1'
        },
        include: {
          creator: {
            select: {
              id: true,
              email: true,
              role: true
            }
          }
        }
      })

      expect(result).toEqual(mockSchedule)
    })

    it('should get pending schedules', async () => {
      const mockSchedules = [
        {
          id: 'schedule-1',
          status: 'pending',
          scheduledAt: new Date('2024-01-01T10:00:00Z')
        }
      ]

      mockPrisma.contentSchedule.findMany.mockResolvedValue(mockSchedules)

      const result = await contentManagementService.getPendingSchedules()

      expect(mockPrisma.contentSchedule.findMany).toHaveBeenCalledWith({
        where: {
          status: 'pending',
          scheduledAt: {
            lte: expect.any(Date)
          }
        },
        include: {
          creator: {
            select: {
              id: true,
              email: true,
              role: true
            }
          }
        }
      })

      expect(result).toEqual(mockSchedules)
    })

    it('should execute scheduled action', async () => {
      const mockSchedule = {
        id: 'schedule-1',
        entityType: 'course',
        entityId: 'course-1',
        actionType: 'publish',
        status: 'pending',
        createdBy: 'user-1'
      }

      mockPrisma.contentSchedule.findUnique.mockResolvedValue(mockSchedule)
      mockPrisma.contentSchedule.update.mockResolvedValue({
        ...mockSchedule,
        status: 'executed'
      })
      mockPrisma.contentAuditLog.create.mockResolvedValue({})

      const result = await contentManagementService.executeScheduledAction('schedule-1')

      expect(mockPrisma.contentSchedule.update).toHaveBeenCalledWith({
        where: { id: 'schedule-1' },
        data: {
          status: 'executed',
          executedAt: expect.any(Date)
        }
      })

      expect(result).toBeDefined()
    })
  })

  describe('Content Tagging', () => {
    it('should create a new tag', async () => {
      const mockTag = {
        id: 'tag-1',
        name: '初級',
        description: '適合初學者',
        color: '#4CAF50',
        category: 'difficulty',
        isSystemTag: false,
        createdAt: new Date()
      }

      mockPrisma.contentTag.create.mockResolvedValue(mockTag)

      const result = await contentManagementService.createTag({
        name: '初級',
        description: '適合初學者',
        color: '#4CAF50',
        category: 'difficulty'
      })

      expect(mockPrisma.contentTag.create).toHaveBeenCalledWith({
        data: {
          name: '初級',
          description: '適合初學者',
          color: '#4CAF50',
          category: 'difficulty'
        }
      })

      expect(result).toEqual(mockTag)
    })

    it('should tag content with existing tags', async () => {
      const mockAssociations = [
        {
          id: 'assoc-1',
          entityType: 'course',
          entityId: 'course-1',
          tagId: 'tag-1',
          tag: { id: 'tag-1', name: '初級' }
        }
      ]

      mockPrisma.contentTagAssociation.deleteMany.mockResolvedValue({})
      mockPrisma.contentTagAssociation.create.mockResolvedValue(mockAssociations[0])
      mockPrisma.contentAuditLog.create.mockResolvedValue({})

      const result = await contentManagementService.tagContent(
        'course',
        'course-1',
        ['tag-1'],
        'user-1'
      )

      expect(mockPrisma.contentTagAssociation.deleteMany).toHaveBeenCalledWith({
        where: {
          entityType: 'course',
          entityId: 'course-1'
        }
      })

      expect(mockPrisma.contentTagAssociation.create).toHaveBeenCalledWith({
        data: {
          entityType: 'course',
          entityId: 'course-1',
          tagId: 'tag-1',
          createdBy: 'user-1'
        },
        include: {
          tag: true
        }
      })
    })

    it('should auto-tag content based on content analysis', async () => {
      const contentData = {
        title: { 'zh-HK': '初學者手雕麻將課程' },
        description: { 'zh-HK': '適合初學者的傳統手雕麻將製作課程' }
      }

      // Mock finding existing tag
      mockPrisma.contentTag.findFirst.mockResolvedValue({
        id: 'tag-1',
        name: '初級',
        category: 'difficulty'
      })

      mockPrisma.contentTagAssociation.create.mockResolvedValue({
        id: 'assoc-1',
        entityType: 'course',
        entityId: 'course-1',
        tagId: 'tag-1',
        confidenceScore: 0.8,
        tag: { id: 'tag-1', name: '初級' }
      })

      mockPrisma.contentAuditLog.create.mockResolvedValue({})

      const result = await contentManagementService.autoTagContent(
        'course',
        'course-1',
        contentData
      )

      expect(result).toHaveLength(1)
      expect(result[0].confidenceScore).toBe(0.8)
    })
  })

  describe('Quality Scoring', () => {
    it('should calculate quality score for content', async () => {
      const mockContent = {
        id: 'course-1',
        title: { 'zh-HK': '測試課程', 'en': 'Test Course' },
        description: { 'zh-HK': '這是一個測試課程' },
        price: 100
      }

      const mockQualityScore = {
        id: 'score-1',
        entityType: 'course',
        entityId: 'course-1',
        overallScore: 0.75,
        completenessScore: 0.8,
        accuracyScore: 0.8,
        engagementScore: 0.6,
        multimediaScore: 0.4,
        languageQualityScore: 0.8,
        viewCount: 0,
        likeCount: 0,
        commentCount: 0,
        shareCount: 0,
        completionRate: 0,
        hasDescription: true,
        hasImages: false,
        hasVideos: false,
        hasMultilingualContent: true,
        lastCalculatedAt: new Date()
      }

      mockPrisma.course.findUnique.mockResolvedValue(mockContent)
      mockPrisma.like.count.mockResolvedValue(0)
      mockPrisma.comment.count.mockResolvedValue(0)
      mockPrisma.contentQualityScore.upsert.mockResolvedValue(mockQualityScore)
      mockPrisma.contentAuditLog.create.mockResolvedValue({})

      const result = await contentManagementService.calculateQualityScore('course', 'course-1')

      expect(mockPrisma.contentQualityScore.upsert).toHaveBeenCalledWith({
        where: {
          entityType_entityId: {
            entityType: 'course',
            entityId: 'course-1'
          }
        },
        update: expect.objectContaining({
          overallScore: expect.any(Number),
          completenessScore: expect.any(Number),
          accuracyScore: expect.any(Number),
          engagementScore: expect.any(Number),
          multimediaScore: expect.any(Number),
          languageQualityScore: expect.any(Number),
          lastCalculatedAt: expect.any(Date)
        }),
        create: expect.objectContaining({
          entityType: 'course',
          entityId: 'course-1'
        })
      })

      expect(result).toEqual(mockQualityScore)
    })

    it('should batch calculate quality scores', async () => {
      const mockCourses = [
        { id: 'course-1' },
        { id: 'course-2' }
      ]

      const mockProducts = [
        { id: 'product-1' }
      ]

      mockPrisma.course.findMany.mockResolvedValue(mockCourses)
      mockPrisma.product.findMany.mockResolvedValue(mockProducts)
      mockPrisma.learningMaterial.findMany.mockResolvedValue([])

      // Mock the calculateQualityScore method
      const originalMethod = contentManagementService.calculateQualityScore
      contentManagementService.calculateQualityScore = vi.fn().mockResolvedValue({
        id: 'score-1',
        overallScore: 0.8
      })

      const result = await contentManagementService.batchCalculateQualityScores()

      expect(result).toHaveLength(3) // 2 courses + 1 product

      // Restore original method
      contentManagementService.calculateQualityScore = originalMethod
    })
  })

  describe('Audit Logging', () => {
    it('should get audit log entries', async () => {
      const mockAuditLogs = [
        {
          id: 'log-1',
          entityType: 'course',
          entityId: 'course-1',
          action: 'version_created',
          createdAt: new Date(),
          user: {
            id: 'user-1',
            email: 'test@example.com',
            role: 'CRAFTSMAN'
          }
        }
      ]

      mockPrisma.contentAuditLog.findMany.mockResolvedValue(mockAuditLogs)

      const result = await contentManagementService.getAuditLog('course', 'course-1', 50)

      expect(mockPrisma.contentAuditLog.findMany).toHaveBeenCalledWith({
        where: {
          entityType: 'course',
          entityId: 'course-1'
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true
            }
          }
        }
      })

      expect(result).toEqual(mockAuditLogs)
    })
  })

  describe('Error Handling', () => {
    it('should handle version not found error', async () => {
      mockPrisma.contentVersion.findUnique.mockResolvedValue(null)

      await expect(
        contentManagementService.publishVersion('non-existent', 'user-1')
      ).rejects.toThrow('Version not found')
    })

    it('should handle schedule not found error', async () => {
      mockPrisma.contentSchedule.findUnique.mockResolvedValue(null)

      await expect(
        contentManagementService.executeScheduledAction('non-existent')
      ).rejects.toThrow('Schedule not found or already executed')
    })

    it('should handle content not found error', async () => {
      mockPrisma.course.findUnique.mockResolvedValue(null)
      mockPrisma.product.findUnique.mockResolvedValue(null)
      mockPrisma.learningMaterial.findUnique.mockResolvedValue(null)

      await expect(
        contentManagementService.calculateQualityScore('course', 'non-existent')
      ).rejects.toThrow('Content not found')
    })
  })
})