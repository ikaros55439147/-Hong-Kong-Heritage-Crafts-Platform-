import { PrismaClient, LearningMaterial, LearningProgress, LearningMaterialType, Prisma } from '@prisma/client'
import { 
  LearningMaterialData, 
  LearningMaterialWithMedia,
  LearningProgressData,
  LearningProgressWithMaterial,
  CourseProgress,
  PaginationParams, 
  PaginationResult,
  MultiLanguageContent 
} from '@/types'

export class LearningMaterialService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * Create a new learning material for a course
   */
  async createLearningMaterial(
    courseId: string, 
    craftsmanId: string, 
    materialData: LearningMaterialData
  ): Promise<LearningMaterial> {
    // Verify course exists and belongs to craftsman
    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        craftsmanId: craftsmanId
      }
    })

    if (!course) {
      throw new Error('Course not found or access denied')
    }

    // Validate material data
    this.validateLearningMaterialData(materialData)

    // Get next order index if not provided
    let orderIndex = materialData.orderIndex
    if (orderIndex === undefined) {
      const lastMaterial = await this.prisma.learningMaterial.findFirst({
        where: { courseId },
        orderBy: { orderIndex: 'desc' }
      })
      orderIndex = (lastMaterial?.orderIndex || 0) + 1
    }

    // Create learning material
    const material = await this.prisma.learningMaterial.create({
      data: {
        courseId,
        title: materialData.title as Prisma.JsonObject,
        description: materialData.description as Prisma.JsonObject,
        type: materialData.type,
        content: materialData.content as Prisma.JsonObject,
        mediaFileId: materialData.mediaFileId,
        orderIndex,
        isRequired: materialData.isRequired ?? true
      }
    })

    return material
  }

  /**
   * Update a learning material
   */
  async updateLearningMaterial(
    materialId: string,
    craftsmanId: string,
    updates: Partial<LearningMaterialData>
  ): Promise<LearningMaterial> {
    // Verify material exists and course belongs to craftsman
    const existingMaterial = await this.prisma.learningMaterial.findFirst({
      where: {
        id: materialId,
        course: {
          craftsmanId: craftsmanId
        }
      }
    })

    if (!existingMaterial) {
      throw new Error('Learning material not found or access denied')
    }

    // Validate updates
    if (Object.keys(updates).length > 0) {
      this.validateLearningMaterialData(updates as LearningMaterialData, true)
    }

    // Update material
    const updatedMaterial = await this.prisma.learningMaterial.update({
      where: { id: materialId },
      data: {
        ...(updates.title && { title: updates.title as Prisma.JsonObject }),
        ...(updates.description && { description: updates.description as Prisma.JsonObject }),
        ...(updates.type && { type: updates.type }),
        ...(updates.content && { content: updates.content as Prisma.JsonObject }),
        ...(updates.mediaFileId !== undefined && { mediaFileId: updates.mediaFileId }),
        ...(updates.orderIndex !== undefined && { orderIndex: updates.orderIndex }),
        ...(updates.isRequired !== undefined && { isRequired: updates.isRequired })
      }
    })

    return updatedMaterial
  }

  /**
   * Get learning materials for a course
   */
  async getLearningMaterialsByCourse(courseId: string): Promise<LearningMaterialWithMedia[]> {
    const materials = await this.prisma.learningMaterial.findMany({
      where: { courseId },
      include: {
        mediaFile: true
      },
      orderBy: { orderIndex: 'asc' }
    })

    return materials
  }

  /**
   * Get learning material by ID
   */
  async getLearningMaterialById(materialId: string): Promise<LearningMaterialWithMedia | null> {
    const material = await this.prisma.learningMaterial.findUnique({
      where: { id: materialId },
      include: {
        mediaFile: true,
        course: true
      }
    })

    return material
  }

  /**
   * Delete a learning material
   */
  async deleteLearningMaterial(materialId: string, craftsmanId: string): Promise<void> {
    // Verify material exists and course belongs to craftsman
    const existingMaterial = await this.prisma.learningMaterial.findFirst({
      where: {
        id: materialId,
        course: {
          craftsmanId: craftsmanId
        }
      }
    })

    if (!existingMaterial) {
      throw new Error('Learning material not found or access denied')
    }

    // Delete the material (this will cascade delete progress records)
    await this.prisma.learningMaterial.delete({
      where: { id: materialId }
    })
  }

  /**
   * Reorder learning materials
   */
  async reorderLearningMaterials(
    courseId: string,
    craftsmanId: string,
    materialIds: string[]
  ): Promise<void> {
    // Verify course belongs to craftsman
    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        craftsmanId: craftsmanId
      }
    })

    if (!course) {
      throw new Error('Course not found or access denied')
    }

    // Update order indices
    const updatePromises = materialIds.map((materialId, index) =>
      this.prisma.learningMaterial.update({
        where: { id: materialId },
        data: { orderIndex: index + 1 }
      })
    )

    await Promise.all(updatePromises)
  }

  /**
   * Record learning progress
   */
  async updateLearningProgress(
    userId: string,
    materialId: string,
    progressData: LearningProgressData
  ): Promise<LearningProgress> {
    // Verify user has access to the material (through course booking)
    const material = await this.prisma.learningMaterial.findUnique({
      where: { id: materialId },
      include: {
        course: {
          include: {
            bookings: {
              where: {
                userId: userId,
                status: {
                  in: ['CONFIRMED', 'COMPLETED']
                }
              }
            }
          }
        }
      }
    })

    if (!material) {
      throw new Error('Learning material not found')
    }

    if (material.course.bookings.length === 0) {
      throw new Error('Access denied: No confirmed booking for this course')
    }

    // Upsert progress record
    const progress = await this.prisma.learningProgress.upsert({
      where: {
        userId_learningMaterialId: {
          userId,
          learningMaterialId: materialId
        }
      },
      update: {
        completed: progressData.completed,
        completedAt: progressData.completed ? new Date() : null,
        notes: progressData.notes
      },
      create: {
        userId,
        learningMaterialId: materialId,
        completed: progressData.completed,
        completedAt: progressData.completed ? new Date() : null,
        notes: progressData.notes
      }
    })

    return progress
  }

  /**
   * Get learning progress for a user and course
   */
  async getCourseProgress(userId: string, courseId: string): Promise<CourseProgress> {
    // Verify user has access to the course
    const booking = await this.prisma.booking.findFirst({
      where: {
        userId: userId,
        courseId: courseId,
        status: {
          in: ['CONFIRMED', 'COMPLETED']
        }
      }
    })

    if (!booking) {
      throw new Error('Access denied: No confirmed booking for this course')
    }

    // Get all materials and progress
    const materials = await this.prisma.learningMaterial.findMany({
      where: { courseId },
      include: {
        mediaFile: true,
        progress: {
          where: { userId }
        }
      },
      orderBy: { orderIndex: 'asc' }
    })

    const totalMaterials = materials.length
    const completedMaterials = materials.filter(m => 
      m.progress.length > 0 && m.progress[0].completed
    ).length

    const progressPercentage = totalMaterials > 0 ? 
      Math.round((completedMaterials / totalMaterials) * 100) : 0

    // Get last accessed time
    const lastProgress = await this.prisma.learningProgress.findFirst({
      where: {
        userId,
        learningMaterial: {
          courseId
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    const materialsWithProgress: LearningProgressWithMaterial[] = materials.map(material => {
      const progress = material.progress[0] || {
        id: '',
        userId,
        learningMaterialId: material.id,
        completed: false,
        completedAt: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      return {
        ...progress,
        learningMaterial: {
          ...material,
          progress: undefined // Remove nested progress to avoid circular reference
        } as LearningMaterialWithMedia
      }
    })

    return {
      courseId,
      totalMaterials,
      completedMaterials,
      progressPercentage,
      lastAccessedAt: lastProgress?.updatedAt,
      materials: materialsWithProgress
    }
  }

  /**
   * Get learning progress for all courses of a user
   */
  async getUserLearningProgress(
    userId: string,
    pagination?: PaginationParams
  ): Promise<PaginationResult<CourseProgress>> {
    const page = pagination?.page || 1
    const limit = pagination?.limit || 10
    const skip = (page - 1) * limit

    // Get user's confirmed bookings
    const bookings = await this.prisma.booking.findMany({
      where: {
        userId,
        status: {
          in: ['CONFIRMED', 'COMPLETED']
        }
      },
      include: {
        course: true
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    })

    const total = await this.prisma.booking.count({
      where: {
        userId,
        status: {
          in: ['CONFIRMED', 'COMPLETED']
        }
      }
    })

    // Get progress for each course
    const courseProgressPromises = bookings.map(booking =>
      this.getCourseProgress(userId, booking.courseId)
    )

    const courseProgresses = await Promise.all(courseProgressPromises)

    return {
      data: courseProgresses,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  /**
   * Get learning material statistics for a course
   */
  async getCourseMaterialStats(courseId: string, craftsmanId: string): Promise<{
    totalMaterials: number
    materialsByType: { type: LearningMaterialType; count: number }[]
    averageCompletionRate: number
    totalStudents: number
  }> {
    // Verify course belongs to craftsman
    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        craftsmanId: craftsmanId
      }
    })

    if (!course) {
      throw new Error('Course not found or access denied')
    }

    // Get material statistics
    const [materialStats, totalStudents, completionStats] = await Promise.all([
      this.prisma.learningMaterial.groupBy({
        by: ['type'],
        where: { courseId },
        _count: { type: true }
      }),
      this.prisma.booking.count({
        where: {
          courseId,
          status: {
            in: ['CONFIRMED', 'COMPLETED']
          }
        }
      }),
      this.prisma.learningProgress.aggregate({
        where: {
          learningMaterial: {
            courseId
          },
          completed: true
        },
        _count: { completed: true }
      })
    ])

    const totalMaterials = await this.prisma.learningMaterial.count({
      where: { courseId }
    })

    const materialsByType = materialStats.map(stat => ({
      type: stat.type,
      count: stat._count.type
    }))

    const totalPossibleCompletions = totalMaterials * totalStudents
    const averageCompletionRate = totalPossibleCompletions > 0 ? 
      Math.round((completionStats._count.completed / totalPossibleCompletions) * 100) : 0

    return {
      totalMaterials,
      materialsByType,
      averageCompletionRate,
      totalStudents
    }
  }

  /**
   * Validate learning material data
   */
  private validateLearningMaterialData(data: Partial<LearningMaterialData>, isPartial: boolean = false): void {
    if (!isPartial) {
      if (!data.title) {
        throw new Error('Title is required')
      }
      if (!data.type) {
        throw new Error('Material type is required')
      }
    }

    // Validate title has at least one language
    if (data.title) {
      const titleValues = Object.values(data.title as MultiLanguageContent)
      if (!titleValues.some(value => value && value.trim().length > 0)) {
        throw new Error('Title must have content in at least one language')
      }
    }

    // Validate type-specific content
    if (data.type && data.content) {
      switch (data.type) {
        case LearningMaterialType.STEP_BY_STEP:
          if (!data.content.steps || !Array.isArray(data.content.steps)) {
            throw new Error('Step-by-step materials must have steps array')
          }
          break
        case LearningMaterialType.QUIZ:
          if (!data.content.questions || !Array.isArray(data.content.questions)) {
            throw new Error('Quiz materials must have questions array')
          }
          break
        case LearningMaterialType.VIDEO:
        case LearningMaterialType.IMAGE:
          if (!data.mediaFileId) {
            throw new Error(`${data.type} materials must have a media file`)
          }
          break
      }
    }

    // Validate order index
    if (data.orderIndex !== undefined && data.orderIndex < 0) {
      throw new Error('Order index must be non-negative')
    }
  }
}