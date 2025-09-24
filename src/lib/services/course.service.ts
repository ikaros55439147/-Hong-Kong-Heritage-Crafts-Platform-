import { PrismaClient, Course, CourseStatus, Prisma } from '@prisma/client'
import { 
  CourseData, 
  CourseCreateInput,
  CourseUpdateInput,
  CourseWithCraftsmanInclude, 
  SearchParams, 
  PaginationParams, 
  PaginationResult,
  MultiLanguageContent 
} from '@/types'
import { validateCourseData } from '@/lib/validations'

export class CourseService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * Create a new course
   */
  async createCourse(craftsmanId: string, courseData: CourseData): Promise<Course> {
    // Validate course data
    const validation = validateCourseData(courseData)
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`)
    }

    // Verify craftsman exists
    const craftsman = await this.prisma.craftsmanProfile.findUnique({
      where: { id: craftsmanId }
    })

    if (!craftsman) {
      throw new Error('Craftsman profile not found')
    }

    // Convert to Prisma input format
    const createInput: CourseCreateInput = {
      title: courseData.title as any,
      description: courseData.description as any,
      craftCategory: courseData.craftCategory,
      maxParticipants: courseData.maxParticipants,
      durationHours: courseData.durationHours,
      price: courseData.price,
      status: courseData.status || CourseStatus.DRAFT
    }

    // Create course
    const course = await this.prisma.course.create({
      data: {
        craftsmanId,
        ...createInput
      }
    })

    return course
  }

  /**
   * Update an existing course
   */
  async updateCourse(courseId: string, craftsmanId: string, updates: Partial<CourseData>): Promise<Course> {
    // Verify course exists and belongs to craftsman
    const existingCourse = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        craftsmanId: craftsmanId
      }
    })

    if (!existingCourse) {
      throw new Error('Course not found or access denied')
    }

    // Validate updates
    if (Object.keys(updates).length > 0) {
      const validation = validateCourseData(updates as CourseData, true)
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`)
      }
    }

    // Convert to Prisma input format
    const updateInput: Partial<CourseUpdateInput> = {}
    if (updates.title) updateInput.title = updates.title as any
    if (updates.description !== undefined) updateInput.description = updates.description as any
    if (updates.craftCategory) updateInput.craftCategory = updates.craftCategory
    if (updates.maxParticipants !== undefined) updateInput.maxParticipants = updates.maxParticipants
    if (updates.durationHours !== undefined) updateInput.durationHours = updates.durationHours
    if (updates.price !== undefined) updateInput.price = updates.price
    if (updates.status) updateInput.status = updates.status

    // Update course
    const updatedCourse = await this.prisma.course.update({
      where: { id: courseId },
      data: updateInput
    })

    return updatedCourse
  }

  /**
   * Get course by ID with craftsman details
   */
  async getCourseById(courseId: string): Promise<CourseWithCraftsmanInclude | null> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        craftsman: {
          include: {
            user: true
          }
        }
      }
    })

    return course
  }

  /**
   * Get courses by craftsman
   */
  async getCoursesByCraftsman(
    craftsmanId: string, 
    pagination?: PaginationParams
  ): Promise<PaginationResult<Course>> {
    const page = pagination?.page || 1
    const limit = pagination?.limit || 10
    const skip = (page - 1) * limit

    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where: { craftsmanId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.course.count({
        where: { craftsmanId }
      })
    ])

    return {
      data: courses,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  /**
   * Search and filter courses
   */
  async searchCourses(params: SearchParams & PaginationParams): Promise<PaginationResult<CourseWithCraftsmanInclude>> {
    const page = params.page || 1
    const limit = params.limit || 10
    const skip = (page - 1) * limit

    // Build where clause
    const where: Prisma.CourseWhereInput = {
      status: CourseStatus.ACTIVE, // Only show active courses in search
      ...(params.category && { craftCategory: params.category }),
      ...(params.query && {
        OR: [
          {
            title: {
              path: ['zh-HK'],
              string_contains: params.query
            }
          },
          {
            title: {
              path: ['zh-CN'],
              string_contains: params.query
            }
          },
          {
            title: {
              path: ['en'],
              string_contains: params.query
            }
          },
          {
            description: {
              path: ['zh-HK'],
              string_contains: params.query
            }
          },
          {
            description: {
              path: ['zh-CN'],
              string_contains: params.query
            }
          },
          {
            description: {
              path: ['en'],
              string_contains: params.query
            }
          },
          {
            craftCategory: {
              contains: params.query,
              mode: 'insensitive'
            }
          }
        ]
      })
    }

    // Build order by clause
    const orderBy: Prisma.CourseOrderByWithRelationInput = {}
    if (params.sortBy) {
      switch (params.sortBy) {
        case 'price':
          orderBy.price = params.sortOrder || 'asc'
          break
        case 'duration':
          orderBy.durationHours = params.sortOrder || 'asc'
          break
        case 'created':
          orderBy.createdAt = params.sortOrder || 'desc'
          break
        default:
          orderBy.createdAt = 'desc'
      }
    } else {
      orderBy.createdAt = 'desc'
    }

    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        include: {
          craftsman: {
            include: {
              user: true
            }
          }
        },
        skip,
        take: limit,
        orderBy
      }),
      this.prisma.course.count({ where })
    ])

    return {
      data: courses,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  /**
   * Get course categories with counts
   */
  async getCourseCategories(): Promise<{ category: string; count: number }[]> {
    const categories = await this.prisma.course.groupBy({
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

    return categories.map(cat => ({
      category: cat.craftCategory,
      count: cat._count.craftCategory
    }))
  }

  /**
   * Update course status
   */
  async updateCourseStatus(courseId: string, craftsmanId: string, status: CourseStatus): Promise<Course> {
    // Verify course exists and belongs to craftsman
    const existingCourse = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        craftsmanId: craftsmanId
      }
    })

    if (!existingCourse) {
      throw new Error('Course not found or access denied')
    }

    const updatedCourse = await this.prisma.course.update({
      where: { id: courseId },
      data: { status }
    })

    return updatedCourse
  }

  /**
   * Delete a course (soft delete by setting status to INACTIVE)
   */
  async deleteCourse(courseId: string, craftsmanId: string): Promise<void> {
    // Check if course has any bookings
    const bookingCount = await this.prisma.booking.count({
      where: {
        courseId,
        status: {
          in: ['PENDING', 'CONFIRMED']
        }
      }
    })

    if (bookingCount > 0) {
      throw new Error('Cannot delete course with active bookings')
    }

    // Verify course exists and belongs to craftsman
    const existingCourse = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        craftsmanId: craftsmanId
      }
    })

    if (!existingCourse) {
      throw new Error('Course not found or access denied')
    }

    // Soft delete by setting status to INACTIVE
    await this.prisma.course.update({
      where: { id: courseId },
      data: { status: CourseStatus.INACTIVE }
    })
  }

  /**
   * Get popular courses (by booking count)
   */
  async getPopularCourses(limit: number = 10): Promise<CourseWithCraftsmanInclude[]> {
    const courses = await this.prisma.course.findMany({
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
      take: limit
    })

    return courses
  }

  /**
   * Get course tags/categories for filtering
   */
  async getCourseTags(): Promise<string[]> {
    const courses = await this.prisma.course.findMany({
      where: {
        status: CourseStatus.ACTIVE
      },
      select: {
        craftCategory: true
      },
      distinct: ['craftCategory']
    })

    return courses.map(course => course.craftCategory).sort()
  }
}