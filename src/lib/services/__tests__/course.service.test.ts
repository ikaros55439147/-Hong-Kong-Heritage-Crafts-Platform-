import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PrismaClient, CourseStatus, UserRole, VerificationStatus } from '@prisma/client'
import { CourseService } from '../course.service'
import { CourseData, MultiLanguageContent } from '@/types'

// Mock Prisma
const mockPrisma = {
  course: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
  craftsmanProfile: {
    findUnique: vi.fn(),
  },
  booking: {
    count: vi.fn(),
  },
} as unknown as PrismaClient

describe('CourseService', () => {
  let courseService: CourseService
  
  const mockCraftsmanId = 'craftsman-123'
  const mockCourseId = 'course-123'
  
  const mockCourseData: CourseData = {
    title: {
      'zh-HK': '手雕麻將課程',
      'en': 'Hand-carved Mahjong Course'
    } as MultiLanguageContent,
    description: {
      'zh-HK': '學習傳統手雕麻將技藝',
      'en': 'Learn traditional hand-carved mahjong craftsmanship'
    } as MultiLanguageContent,
    craftCategory: '手雕麻將',
    maxParticipants: 8,
    durationHours: 4,
    price: 500,
    status: CourseStatus.ACTIVE
  }

  const mockCraftsman = {
    id: mockCraftsmanId,
    userId: 'user-123',
    craftSpecialties: ['手雕麻將'],
    bio: null,
    experienceYears: 20,
    workshopLocation: '香港',
    contactInfo: null,
    verificationStatus: VerificationStatus.VERIFIED,
    createdAt: new Date()
  }

  const mockCourse = {
    id: mockCourseId,
    craftsmanId: mockCraftsmanId,
    title: mockCourseData.title,
    description: mockCourseData.description,
    craftCategory: mockCourseData.craftCategory,
    maxParticipants: mockCourseData.maxParticipants,
    durationHours: mockCourseData.durationHours,
    price: mockCourseData.price,
    status: mockCourseData.status,
    createdAt: new Date()
  }

  beforeEach(() => {
    courseService = new CourseService(mockPrisma)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('createCourse', () => {
    it('should create a course successfully', async () => {
      mockPrisma.craftsmanProfile.findUnique.mockResolvedValue(mockCraftsman)
      mockPrisma.course.create.mockResolvedValue(mockCourse)

      const result = await courseService.createCourse(mockCraftsmanId, mockCourseData)

      expect(mockPrisma.craftsmanProfile.findUnique).toHaveBeenCalledWith({
        where: { id: mockCraftsmanId }
      })
      expect(mockPrisma.course.create).toHaveBeenCalledWith({
        data: {
          craftsmanId: mockCraftsmanId,
          title: mockCourseData.title,
          description: mockCourseData.description,
          craftCategory: mockCourseData.craftCategory,
          maxParticipants: mockCourseData.maxParticipants,
          durationHours: mockCourseData.durationHours,
          price: mockCourseData.price,
          status: mockCourseData.status
        }
      })
      expect(result).toEqual(mockCourse)
    })

    it('should throw error if craftsman not found', async () => {
      mockPrisma.craftsmanProfile.findUnique.mockResolvedValue(null)

      await expect(
        courseService.createCourse(mockCraftsmanId, mockCourseData)
      ).rejects.toThrow('Craftsman profile not found')
    })

    it('should throw error for invalid course data', async () => {
      const invalidData = { ...mockCourseData, title: {} } // Empty title

      await expect(
        courseService.createCourse(mockCraftsmanId, invalidData)
      ).rejects.toThrow('Validation failed')
    })
  })

  describe('updateCourse', () => {
    it('should update course successfully', async () => {
      const updates = { price: 600, maxParticipants: 10 }
      const updatedCourse = { ...mockCourse, ...updates }

      mockPrisma.course.findFirst.mockResolvedValue(mockCourse)
      mockPrisma.course.update.mockResolvedValue(updatedCourse)

      const result = await courseService.updateCourse(mockCourseId, mockCraftsmanId, updates)

      expect(mockPrisma.course.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockCourseId,
          craftsmanId: mockCraftsmanId
        }
      })
      expect(mockPrisma.course.update).toHaveBeenCalledWith({
        where: { id: mockCourseId },
        data: {
          price: updates.price,
          maxParticipants: updates.maxParticipants
        }
      })
      expect(result).toEqual(updatedCourse)
    })

    it('should throw error if course not found or access denied', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(null)

      await expect(
        courseService.updateCourse(mockCourseId, mockCraftsmanId, { price: 600 })
      ).rejects.toThrow('Course not found or access denied')
    })
  })

  describe('getCourseById', () => {
    it('should return course with craftsman details', async () => {
      const courseWithCraftsman = {
        ...mockCourse,
        craftsman: {
          ...mockCraftsman,
          user: {
            id: 'user-123',
            email: 'craftsman@example.com',
            role: UserRole.CRAFTSMAN
          }
        }
      }

      mockPrisma.course.findUnique.mockResolvedValue(courseWithCraftsman)

      const result = await courseService.getCourseById(mockCourseId)

      expect(mockPrisma.course.findUnique).toHaveBeenCalledWith({
        where: { id: mockCourseId },
        include: {
          craftsman: {
            include: {
              user: true
            }
          }
        }
      })
      expect(result).toEqual(courseWithCraftsman)
    })

    it('should return null if course not found', async () => {
      mockPrisma.course.findUnique.mockResolvedValue(null)

      const result = await courseService.getCourseById(mockCourseId)

      expect(result).toBeNull()
    })
  })

  describe('searchCourses', () => {
    it('should search courses with query and filters', async () => {
      const searchParams = {
        query: '麻將',
        category: '手雕麻將',
        page: 1,
        limit: 10,
        sortBy: 'price',
        sortOrder: 'asc' as const
      }

      const mockCourses = [mockCourse]
      const mockTotal = 1

      mockPrisma.course.findMany.mockResolvedValue(mockCourses)
      mockPrisma.course.count.mockResolvedValue(mockTotal)

      const result = await courseService.searchCourses(searchParams)

      expect(mockPrisma.course.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          status: CourseStatus.ACTIVE,
          craftCategory: searchParams.category,
          OR: expect.any(Array)
        }),
        include: {
          craftsman: {
            include: {
              user: true
            }
          }
        },
        skip: 0,
        take: 10,
        orderBy: { price: 'asc' }
      })

      expect(result).toEqual({
        data: mockCourses,
        total: mockTotal,
        page: 1,
        limit: 10,
        totalPages: 1
      })
    })

    it('should handle empty search results', async () => {
      mockPrisma.course.findMany.mockResolvedValue([])
      mockPrisma.course.count.mockResolvedValue(0)

      const result = await courseService.searchCourses({ query: 'nonexistent' })

      expect(result.data).toEqual([])
      expect(result.total).toBe(0)
    })
  })

  describe('getCourseCategories', () => {
    it('should return categories with counts', async () => {
      const mockCategories = [
        { craftCategory: '手雕麻將', _count: { craftCategory: 5 } },
        { craftCategory: '竹編', _count: { craftCategory: 3 } }
      ]

      mockPrisma.course.groupBy.mockResolvedValue(mockCategories)

      const result = await courseService.getCourseCategories()

      expect(mockPrisma.course.groupBy).toHaveBeenCalledWith({
        by: ['craftCategory'],
        where: {
          status: CourseStatus.ACTIVE
        },
        _count: {
          craftCategory: true
        },
        orderBy: {
          _count: {
            craftCategory: 'desc'
          }
        }
      })

      expect(result).toEqual([
        { category: '手雕麻將', count: 5 },
        { category: '竹編', count: 3 }
      ])
    })
  })

  describe('updateCourseStatus', () => {
    it('should update course status successfully', async () => {
      const newStatus = CourseStatus.INACTIVE
      const updatedCourse = { ...mockCourse, status: newStatus }

      mockPrisma.course.findFirst.mockResolvedValue(mockCourse)
      mockPrisma.course.update.mockResolvedValue(updatedCourse)

      const result = await courseService.updateCourseStatus(mockCourseId, mockCraftsmanId, newStatus)

      expect(mockPrisma.course.update).toHaveBeenCalledWith({
        where: { id: mockCourseId },
        data: { status: newStatus }
      })
      expect(result).toEqual(updatedCourse)
    })
  })

  describe('deleteCourse', () => {
    it('should delete course when no active bookings', async () => {
      mockPrisma.booking.count.mockResolvedValue(0)
      mockPrisma.course.findFirst.mockResolvedValue(mockCourse)
      mockPrisma.course.update.mockResolvedValue({ ...mockCourse, status: CourseStatus.INACTIVE })

      await courseService.deleteCourse(mockCourseId, mockCraftsmanId)

      expect(mockPrisma.booking.count).toHaveBeenCalledWith({
        where: {
          courseId: mockCourseId,
          status: {
            in: ['PENDING', 'CONFIRMED']
          }
        }
      })
      expect(mockPrisma.course.update).toHaveBeenCalledWith({
        where: { id: mockCourseId },
        data: { status: CourseStatus.INACTIVE }
      })
    })

    it('should throw error when course has active bookings', async () => {
      mockPrisma.booking.count.mockResolvedValue(2)

      await expect(
        courseService.deleteCourse(mockCourseId, mockCraftsmanId)
      ).rejects.toThrow('Cannot delete course with active bookings')
    })
  })

  describe('getPopularCourses', () => {
    it('should return popular courses ordered by booking count', async () => {
      const mockPopularCourses = [
        {
          ...mockCourse,
          craftsman: mockCraftsman,
          _count: { bookings: 10 }
        }
      ]

      mockPrisma.course.findMany.mockResolvedValue(mockPopularCourses)

      const result = await courseService.getPopularCourses(5)

      expect(mockPrisma.course.findMany).toHaveBeenCalledWith({
        where: {
          status: CourseStatus.ACTIVE
        },
        include: {
          craftsman: {
            include: {
              user: true
            }
          },
          _count: {
            select: {
              bookings: true
            }
          }
        },
        orderBy: {
          bookings: {
            _count: 'desc'
          }
        },
        take: 5
      })

      expect(result).toEqual(mockPopularCourses)
    })
  })

  describe('getCourseTags', () => {
    it('should return unique course categories', async () => {
      const mockTags = [
        { craftCategory: '手雕麻將' },
        { craftCategory: '竹編' },
        { craftCategory: '打鐵' }
      ]

      mockPrisma.course.findMany.mockResolvedValue(mockTags)

      const result = await courseService.getCourseTags()

      expect(mockPrisma.course.findMany).toHaveBeenCalledWith({
        where: {
          status: CourseStatus.ACTIVE
        },
        select: {
          craftCategory: true
        },
        distinct: ['craftCategory']
      })

      expect(result).toEqual(['手雕麻將', '打鐵', '竹編'])
    })
  })
})