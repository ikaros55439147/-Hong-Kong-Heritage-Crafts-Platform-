import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PrismaClient, LearningMaterialType, BookingStatus, CourseStatus } from '@prisma/client'
import { LearningMaterialService } from '../learning-material.service'
import { LearningMaterialData, LearningProgressData, MultiLanguageContent } from '@/types'

// Mock Prisma
const mockPrisma = {
  course: {
    findFirst: vi.fn(),
  },
  learningMaterial: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
  learningProgress: {
    upsert: vi.fn(),
    findFirst: vi.fn(),
    aggregate: vi.fn(),
  },
  booking: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
} as unknown as PrismaClient

describe('LearningMaterialService', () => {
  let learningMaterialService: LearningMaterialService
  
  const mockCourseId = 'course-123'
  const mockCraftsmanId = 'craftsman-123'
  const mockUserId = 'user-123'
  const mockMaterialId = 'material-123'
  
  const mockMaterialData: LearningMaterialData = {
    title: {
      'zh-HK': '第一課：基礎技巧',
      'en': 'Lesson 1: Basic Techniques'
    } as MultiLanguageContent,
    description: {
      'zh-HK': '學習基本的手雕技巧',
      'en': 'Learn basic carving techniques'
    } as MultiLanguageContent,
    type: LearningMaterialType.VIDEO,
    content: {
      duration: 30,
      difficulty: 'beginner' as const,
      tags: ['基礎', '技巧']
    },
    mediaFileId: 'media-123',
    orderIndex: 1,
    isRequired: true
  }

  const mockCourse = {
    id: mockCourseId,
    craftsmanId: mockCraftsmanId,
    title: { 'zh-HK': '手雕麻將課程' },
    status: CourseStatus.ACTIVE
  }

  const mockMaterial = {
    id: mockMaterialId,
    courseId: mockCourseId,
    title: mockMaterialData.title,
    description: mockMaterialData.description,
    type: mockMaterialData.type,
    content: mockMaterialData.content,
    mediaFileId: mockMaterialData.mediaFileId,
    orderIndex: mockMaterialData.orderIndex,
    isRequired: mockMaterialData.isRequired,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const mockBooking = {
    id: 'booking-123',
    userId: mockUserId,
    courseId: mockCourseId,
    status: BookingStatus.CONFIRMED,
    createdAt: new Date()
  }

  beforeEach(() => {
    learningMaterialService = new LearningMaterialService(mockPrisma)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('createLearningMaterial', () => {
    it('should create a learning material successfully', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(mockCourse)
      mockPrisma.learningMaterial.findFirst.mockResolvedValue(null) // No existing materials
      mockPrisma.learningMaterial.create.mockResolvedValue(mockMaterial)

      const result = await learningMaterialService.createLearningMaterial(
        mockCourseId,
        mockCraftsmanId,
        mockMaterialData
      )

      expect(mockPrisma.course.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockCourseId,
          craftsmanId: mockCraftsmanId
        }
      })
      expect(mockPrisma.learningMaterial.create).toHaveBeenCalledWith({
        data: {
          courseId: mockCourseId,
          title: mockMaterialData.title,
          description: mockMaterialData.description,
          type: mockMaterialData.type,
          content: mockMaterialData.content,
          mediaFileId: mockMaterialData.mediaFileId,
          orderIndex: mockMaterialData.orderIndex,
          isRequired: mockMaterialData.isRequired
        }
      })
      expect(result).toEqual(mockMaterial)
    })

    it('should auto-assign order index when not provided', async () => {
      const dataWithoutOrder = { ...mockMaterialData }
      delete dataWithoutOrder.orderIndex

      const lastMaterial = { orderIndex: 5 }
      
      mockPrisma.course.findFirst.mockResolvedValue(mockCourse)
      mockPrisma.learningMaterial.findFirst.mockResolvedValue(lastMaterial)
      mockPrisma.learningMaterial.create.mockResolvedValue({ ...mockMaterial, orderIndex: 6 })

      await learningMaterialService.createLearningMaterial(
        mockCourseId,
        mockCraftsmanId,
        dataWithoutOrder
      )

      expect(mockPrisma.learningMaterial.findFirst).toHaveBeenCalledWith({
        where: { courseId: mockCourseId },
        orderBy: { orderIndex: 'desc' }
      })
      expect(mockPrisma.learningMaterial.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderIndex: 6
        })
      })
    })

    it('should throw error if course not found or access denied', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(null)

      await expect(
        learningMaterialService.createLearningMaterial(mockCourseId, mockCraftsmanId, mockMaterialData)
      ).rejects.toThrow('Course not found or access denied')
    })

    it('should throw error for invalid material data', async () => {
      const invalidData = { ...mockMaterialData, title: {} } // Empty title

      mockPrisma.course.findFirst.mockResolvedValue(mockCourse) // Course exists

      await expect(
        learningMaterialService.createLearningMaterial(mockCourseId, mockCraftsmanId, invalidData)
      ).rejects.toThrow('Title must have content in at least one language')
    })
  })

  describe('updateLearningMaterial', () => {
    it('should update learning material successfully', async () => {
      const updates = { 
        title: { 'zh-HK': '更新的標題' } as MultiLanguageContent,
        orderIndex: 2 
      }
      const updatedMaterial = { ...mockMaterial, ...updates }

      mockPrisma.learningMaterial.findFirst.mockResolvedValue(mockMaterial)
      mockPrisma.learningMaterial.update.mockResolvedValue(updatedMaterial)

      const result = await learningMaterialService.updateLearningMaterial(
        mockMaterialId,
        mockCraftsmanId,
        updates
      )

      expect(mockPrisma.learningMaterial.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockMaterialId,
          course: {
            craftsmanId: mockCraftsmanId
          }
        }
      })
      expect(mockPrisma.learningMaterial.update).toHaveBeenCalledWith({
        where: { id: mockMaterialId },
        data: {
          title: updates.title,
          orderIndex: updates.orderIndex
        }
      })
      expect(result).toEqual(updatedMaterial)
    })

    it('should throw error if material not found or access denied', async () => {
      mockPrisma.learningMaterial.findFirst.mockResolvedValue(null)

      await expect(
        learningMaterialService.updateLearningMaterial(mockMaterialId, mockCraftsmanId, {})
      ).rejects.toThrow('Learning material not found or access denied')
    })
  })

  describe('getLearningMaterialsByCourse', () => {
    it('should return materials ordered by index', async () => {
      const mockMaterials = [
        { ...mockMaterial, orderIndex: 1 },
        { ...mockMaterial, id: 'material-2', orderIndex: 2 }
      ]

      mockPrisma.learningMaterial.findMany.mockResolvedValue(mockMaterials)

      const result = await learningMaterialService.getLearningMaterialsByCourse(mockCourseId)

      expect(mockPrisma.learningMaterial.findMany).toHaveBeenCalledWith({
        where: { courseId: mockCourseId },
        include: {
          mediaFile: true
        },
        orderBy: { orderIndex: 'asc' }
      })
      expect(result).toEqual(mockMaterials)
    })
  })

  describe('deleteLearningMaterial', () => {
    it('should delete learning material successfully', async () => {
      mockPrisma.learningMaterial.findFirst.mockResolvedValue(mockMaterial)
      mockPrisma.learningMaterial.delete.mockResolvedValue(mockMaterial)

      await learningMaterialService.deleteLearningMaterial(mockMaterialId, mockCraftsmanId)

      expect(mockPrisma.learningMaterial.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockMaterialId,
          course: {
            craftsmanId: mockCraftsmanId
          }
        }
      })
      expect(mockPrisma.learningMaterial.delete).toHaveBeenCalledWith({
        where: { id: mockMaterialId }
      })
    })
  })

  describe('reorderLearningMaterials', () => {
    it('should reorder materials successfully', async () => {
      const materialIds = ['material-1', 'material-2', 'material-3']
      
      mockPrisma.course.findFirst.mockResolvedValue(mockCourse)
      mockPrisma.learningMaterial.update.mockResolvedValue(mockMaterial)

      await learningMaterialService.reorderLearningMaterials(
        mockCourseId,
        mockCraftsmanId,
        materialIds
      )

      expect(mockPrisma.course.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockCourseId,
          craftsmanId: mockCraftsmanId
        }
      })

      // Should update each material with new order index
      materialIds.forEach((materialId, index) => {
        expect(mockPrisma.learningMaterial.update).toHaveBeenCalledWith({
          where: { id: materialId },
          data: { orderIndex: index + 1 }
        })
      })
    })
  })

  describe('updateLearningProgress', () => {
    it('should update learning progress successfully', async () => {
      const progressData: LearningProgressData = {
        completed: true,
        notes: 'Completed successfully'
      }

      const materialWithCourse = {
        ...mockMaterial,
        course: {
          ...mockCourse,
          bookings: [mockBooking]
        }
      }

      const mockProgress = {
        id: 'progress-123',
        userId: mockUserId,
        learningMaterialId: mockMaterialId,
        completed: true,
        completedAt: new Date(),
        notes: progressData.notes,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPrisma.learningMaterial.findUnique.mockResolvedValue(materialWithCourse)
      mockPrisma.learningProgress.upsert.mockResolvedValue(mockProgress)

      const result = await learningMaterialService.updateLearningProgress(
        mockUserId,
        mockMaterialId,
        progressData
      )

      expect(mockPrisma.learningMaterial.findUnique).toHaveBeenCalledWith({
        where: { id: mockMaterialId },
        include: {
          course: {
            include: {
              bookings: {
                where: {
                  userId: mockUserId,
                  status: {
                    in: ['CONFIRMED', 'COMPLETED']
                  }
                }
              }
            }
          }
        }
      })

      expect(mockPrisma.learningProgress.upsert).toHaveBeenCalledWith({
        where: {
          userId_learningMaterialId: {
            userId: mockUserId,
            learningMaterialId: mockMaterialId
          }
        },
        update: {
          completed: progressData.completed,
          completedAt: expect.any(Date),
          notes: progressData.notes
        },
        create: {
          userId: mockUserId,
          learningMaterialId: mockMaterialId,
          completed: progressData.completed,
          completedAt: expect.any(Date),
          notes: progressData.notes
        }
      })

      expect(result).toEqual(mockProgress)
    })

    it('should throw error if user has no access to material', async () => {
      const materialWithoutBooking = {
        ...mockMaterial,
        course: {
          ...mockCourse,
          bookings: [] // No bookings
        }
      }

      mockPrisma.learningMaterial.findUnique.mockResolvedValue(materialWithoutBooking)

      await expect(
        learningMaterialService.updateLearningProgress(mockUserId, mockMaterialId, { completed: true })
      ).rejects.toThrow('Access denied: No confirmed booking for this course')
    })
  })

  describe('getCourseProgress', () => {
    it('should return course progress with statistics', async () => {
      const mockMaterials = [
        {
          ...mockMaterial,
          id: 'material-1',
          progress: [{ completed: true }]
        },
        {
          ...mockMaterial,
          id: 'material-2',
          progress: [{ completed: false }]
        },
        {
          ...mockMaterial,
          id: 'material-3',
          progress: []
        }
      ]

      mockPrisma.booking.findFirst.mockResolvedValue(mockBooking)
      mockPrisma.learningMaterial.findMany.mockResolvedValue(mockMaterials)
      mockPrisma.learningProgress.findFirst.mockResolvedValue({
        updatedAt: new Date()
      })

      const result = await learningMaterialService.getCourseProgress(mockUserId, mockCourseId)

      expect(result.courseId).toBe(mockCourseId)
      expect(result.totalMaterials).toBe(3)
      expect(result.completedMaterials).toBe(1)
      expect(result.progressPercentage).toBe(33) // 1/3 * 100 rounded
      expect(result.materials).toHaveLength(3)
    })

    it('should throw error if user has no access to course', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue(null)

      await expect(
        learningMaterialService.getCourseProgress(mockUserId, mockCourseId)
      ).rejects.toThrow('Access denied: No confirmed booking for this course')
    })
  })

  describe('getCourseMaterialStats', () => {
    it('should return material statistics', async () => {
      const mockStats = [
        { type: LearningMaterialType.VIDEO, _count: { type: 3 } },
        { type: LearningMaterialType.DOCUMENT, _count: { type: 2 } }
      ]

      mockPrisma.course.findFirst.mockResolvedValue(mockCourse)
      mockPrisma.learningMaterial.groupBy.mockResolvedValue(mockStats)
      mockPrisma.booking.count.mockResolvedValue(10) // 10 students
      mockPrisma.learningMaterial.count.mockResolvedValue(5) // 5 materials
      mockPrisma.learningProgress.aggregate.mockResolvedValue({
        _count: { completed: 30 } // 30 completions
      })

      const result = await learningMaterialService.getCourseMaterialStats(mockCourseId, mockCraftsmanId)

      expect(result.totalMaterials).toBe(5)
      expect(result.materialsByType).toEqual([
        { type: LearningMaterialType.VIDEO, count: 3 },
        { type: LearningMaterialType.DOCUMENT, count: 2 }
      ])
      expect(result.totalStudents).toBe(10)
      expect(result.averageCompletionRate).toBe(60) // 30/(5*10) * 100
    })
  })
})