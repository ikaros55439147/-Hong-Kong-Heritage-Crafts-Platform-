import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

// Validation schemas
const ContentVersionSchema = z.object({
  entityType: z.string(),
  entityId: z.string().uuid(),
  contentData: z.record(z.any()),
  changeSummary: z.string().optional(),
  createdBy: z.string().uuid()
})

const ContentScheduleSchema = z.object({
  entityType: z.string(),
  entityId: z.string().uuid(),
  actionType: z.enum(['publish', 'unpublish', 'update']),
  scheduledAt: z.date(),
  contentData: z.record(z.any()).optional(),
  createdBy: z.string().uuid()
})

const ContentTagSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  category: z.string().optional()
})

export class ContentManagementService {
  // Version Control
  async createVersion(data: z.infer<typeof ContentVersionSchema>) {
    const validatedData = ContentVersionSchema.parse(data)
    
    // Get the next version number
    const lastVersion = await prisma.contentVersion.findFirst({
      where: {
        entityType: validatedData.entityType,
        entityId: validatedData.entityId
      },
      orderBy: { versionNumber: 'desc' }
    })
    
    const nextVersionNumber = (lastVersion?.versionNumber || 0) + 1
    
    const version = await prisma.contentVersion.create({
      data: {
        ...validatedData,
        versionNumber: nextVersionNumber
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
    
    // Log the version creation
    await this.logContentAction({
      entityType: validatedData.entityType,
      entityId: validatedData.entityId,
      action: 'version_created',
      newData: { versionNumber: nextVersionNumber },
      userId: validatedData.createdBy
    })
    
    return version
  }
  
  async getVersionHistory(entityType: string, entityId: string) {
    return prisma.contentVersion.findMany({
      where: {
        entityType,
        entityId
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
  }
  
  async publishVersion(versionId: string, userId: string) {
    const version = await prisma.contentVersion.findUnique({
      where: { id: versionId }
    })
    
    if (!version) {
      throw new Error('Version not found')
    }
    
    // Unpublish other versions of the same entity
    await prisma.contentVersion.updateMany({
      where: {
        entityType: version.entityType,
        entityId: version.entityId,
        isPublished: true
      },
      data: {
        isPublished: false
      }
    })
    
    // Publish this version
    const publishedVersion = await prisma.contentVersion.update({
      where: { id: versionId },
      data: {
        isPublished: true,
        publishedAt: new Date()
      }
    })
    
    await this.logContentAction({
      entityType: version.entityType,
      entityId: version.entityId,
      action: 'version_published',
      newData: { versionId, versionNumber: version.versionNumber },
      userId
    })
    
    return publishedVersion
  }
  
  async revertToVersion(versionId: string, userId: string) {
    const version = await prisma.contentVersion.findUnique({
      where: { id: versionId }
    })
    
    if (!version) {
      throw new Error('Version not found')
    }
    
    // Create a new version with the reverted content
    const revertedVersion = await this.createVersion({
      entityType: version.entityType,
      entityId: version.entityId,
      contentData: version.contentData as Record<string, any>,
      changeSummary: `Reverted to version ${version.versionNumber}`,
      createdBy: userId
    })
    
    await this.logContentAction({
      entityType: version.entityType,
      entityId: version.entityId,
      action: 'version_reverted',
      newData: { 
        revertedToVersion: version.versionNumber,
        newVersionId: revertedVersion.id 
      },
      userId
    })
    
    return revertedVersion
  }
  
  // Content Scheduling
  async scheduleContent(data: z.infer<typeof ContentScheduleSchema>) {
    const validatedData = ContentScheduleSchema.parse(data)
    
    const schedule = await prisma.contentSchedule.create({
      data: validatedData,
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
    
    await this.logContentAction({
      entityType: validatedData.entityType,
      entityId: validatedData.entityId,
      action: 'content_scheduled',
      newData: { 
        scheduleId: schedule.id,
        actionType: validatedData.actionType,
        scheduledAt: validatedData.scheduledAt
      },
      userId: validatedData.createdBy
    })
    
    return schedule
  }
  
  async getPendingSchedules() {
    return prisma.contentSchedule.findMany({
      where: {
        status: 'pending',
        scheduledAt: {
          lte: new Date()
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
  }
  
  async getSchedulesForEntity(entityType: string, entityId: string) {
    return prisma.contentSchedule.findMany({
      where: {
        entityType,
        entityId
      },
      orderBy: { scheduledAt: 'desc' },
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
  }
  
  async cancelSchedule(scheduleId: string, userId: string) {
    const schedule = await prisma.contentSchedule.findUnique({
      where: { id: scheduleId }
    })
    
    if (!schedule) {
      throw new Error('Schedule not found')
    }
    
    if (schedule.status !== 'pending') {
      throw new Error('Can only cancel pending schedules')
    }
    
    const cancelledSchedule = await prisma.contentSchedule.update({
      where: { id: scheduleId },
      data: {
        status: 'cancelled'
      }
    })
    
    await this.logContentAction({
      entityType: schedule.entityType,
      entityId: schedule.entityId,
      action: 'schedule_cancelled',
      newData: { scheduleId },
      userId
    })
    
    return cancelledSchedule
  }
  
  async executeScheduledAction(scheduleId: string) {
    const schedule = await prisma.contentSchedule.findUnique({
      where: { id: scheduleId }
    })
    
    if (!schedule || schedule.status !== 'pending') {
      throw new Error('Schedule not found or already executed')
    }
    
    try {
      // Execute the scheduled action based on actionType
      let result
      switch (schedule.actionType) {
        case 'publish':
          result = await this.executePublishAction(schedule)
          break
        case 'unpublish':
          result = await this.executeUnpublishAction(schedule)
          break
        case 'update':
          result = await this.executeUpdateAction(schedule)
          break
        default:
          throw new Error(`Unknown action type: ${schedule.actionType}`)
      }
      
      // Mark as executed
      await prisma.contentSchedule.update({
        where: { id: scheduleId },
        data: {
          status: 'executed',
          executedAt: new Date()
        }
      })
      
      await this.logContentAction({
        entityType: schedule.entityType,
        entityId: schedule.entityId,
        action: 'scheduled_action_executed',
        newData: { 
          scheduleId,
          actionType: schedule.actionType,
          result
        },
        userId: schedule.createdBy
      })
      
      return result
    } catch (error) {
      // Mark as failed
      await prisma.contentSchedule.update({
        where: { id: scheduleId },
        data: {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      })
      
      throw error
    }
  }
  
  private async executePublishAction(schedule: any) {
    // Implementation depends on entity type
    // This is a placeholder - actual implementation would handle different entity types
    return { action: 'publish', entityType: schedule.entityType, entityId: schedule.entityId }
  }
  
  private async executeUnpublishAction(schedule: any) {
    // Implementation depends on entity type
    return { action: 'unpublish', entityType: schedule.entityType, entityId: schedule.entityId }
  }
  
  private async executeUpdateAction(schedule: any) {
    // Implementation depends on entity type and contentData
    return { action: 'update', entityType: schedule.entityType, entityId: schedule.entityId }
  }
  
  // Content Tagging
  async createTag(data: z.infer<typeof ContentTagSchema>) {
    const validatedData = ContentTagSchema.parse(data)
    
    return prisma.contentTag.create({
      data: validatedData
    })
  }
  
  async getTags(category?: string) {
    return prisma.contentTag.findMany({
      where: category ? { category } : undefined,
      orderBy: { name: 'asc' },
      include: {
        associations: {
          select: {
            entityType: true,
            entityId: true
          }
        }
      }
    })
  }
  
  async tagContent(entityType: string, entityId: string, tagIds: string[], userId?: string) {
    // Remove existing tags for this entity
    await prisma.contentTagAssociation.deleteMany({
      where: {
        entityType,
        entityId
      }
    })
    
    // Add new tags
    const associations = await Promise.all(
      tagIds.map(tagId =>
        prisma.contentTagAssociation.create({
          data: {
            entityType,
            entityId,
            tagId,
            createdBy: userId
          },
          include: {
            tag: true
          }
        })
      )
    )
    
    await this.logContentAction({
      entityType,
      entityId,
      action: 'tags_updated',
      newData: { tagIds },
      userId
    })
    
    return associations
  }
  
  async getEntityTags(entityType: string, entityId: string) {
    return prisma.contentTagAssociation.findMany({
      where: {
        entityType,
        entityId
      },
      include: {
        tag: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
  }
  
  async removeTag(entityType: string, entityId: string, tagId: string, userId?: string) {
    await prisma.contentTagAssociation.deleteMany({
      where: {
        entityType,
        entityId,
        tagId
      }
    })
    
    await this.logContentAction({
      entityType,
      entityId,
      action: 'tag_removed',
      newData: { tagId },
      userId
    })
  }
  
  async autoTagContent(entityType: string, entityId: string, contentData: Record<string, any>) {
    const suggestions = await this.generateTagSuggestions(contentData)
    
    const autoTags = await Promise.all(
      suggestions.map(async (suggestion) => {
        // Find or create tag
        let tag = await prisma.contentTag.findFirst({
          where: {
            name: suggestion.name,
            category: suggestion.category
          }
        })
        
        if (!tag) {
          tag = await prisma.contentTag.create({
            data: {
              name: suggestion.name,
              category: suggestion.category,
              isSystemTag: true
            }
          })
        }
        
        // Create association with confidence score
        return prisma.contentTagAssociation.create({
          data: {
            entityType,
            entityId,
            tagId: tag.id,
            confidenceScore: suggestion.confidence
          },
          include: {
            tag: true
          }
        })
      })
    )
    
    await this.logContentAction({
      entityType,
      entityId,
      action: 'auto_tagged',
      newData: { 
        suggestedTags: suggestions.map(s => ({ name: s.name, confidence: s.confidence }))
      }
    })
    
    return autoTags
  }
  
  private async generateTagSuggestions(contentData: Record<string, any>) {
    const suggestions: Array<{ name: string; category: string; confidence: number }> = []
    
    // Analyze content for automatic tagging
    const text = JSON.stringify(contentData).toLowerCase()
    
    // Difficulty level detection
    if (text.includes('初學') || text.includes('基礎') || text.includes('入門')) {
      suggestions.push({ name: '初級', category: 'difficulty', confidence: 0.8 })
    } else if (text.includes('進階') || text.includes('高級') || text.includes('專業')) {
      suggestions.push({ name: '高級', category: 'difficulty', confidence: 0.8 })
    } else {
      suggestions.push({ name: '中級', category: 'difficulty', confidence: 0.6 })
    }
    
    // Craft type detection
    const craftKeywords = {
      '手雕麻將': 'traditional_craft',
      '吹糖': 'traditional_craft',
      '竹編': 'traditional_craft',
      '打鐵': 'traditional_craft',
      '陶藝': 'traditional_craft',
      '木工': 'traditional_craft'
    }
    
    for (const [keyword, category] of Object.entries(craftKeywords)) {
      if (text.includes(keyword)) {
        suggestions.push({ name: keyword, category: 'craft_type', confidence: 0.9 })
      }
    }
    
    // Theme detection
    if (text.includes('歷史') || text.includes('文化') || text.includes('傳統')) {
      suggestions.push({ name: '文化歷史', category: 'theme', confidence: 0.7 })
    }
    
    if (text.includes('實作') || text.includes('操作') || text.includes('製作')) {
      suggestions.push({ name: '實作教學', category: 'theme', confidence: 0.8 })
    }
    
    return suggestions
  }
  
  // Content Quality Scoring
  async calculateQualityScore(entityType: string, entityId: string) {
    // Get content data based on entity type
    const contentData = await this.getContentData(entityType, entityId)
    if (!contentData) {
      throw new Error('Content not found')
    }
    
    const scores = {
      completenessScore: this.calculateCompletenessScore(contentData),
      accuracyScore: this.calculateAccuracyScore(contentData),
      engagementScore: await this.calculateEngagementScore(entityType, entityId),
      multimediaScore: this.calculateMultimediaScore(contentData),
      languageQualityScore: this.calculateLanguageQualityScore(contentData)
    }
    
    const overallScore = (
      scores.completenessScore * 0.25 +
      scores.accuracyScore * 0.20 +
      scores.engagementScore * 0.25 +
      scores.multimediaScore * 0.15 +
      scores.languageQualityScore * 0.15
    )
    
    // Get engagement metrics
    const metrics = await this.getEngagementMetrics(entityType, entityId)
    
    // Quality flags
    const flags = {
      hasDescription: this.hasDescription(contentData),
      hasImages: this.hasImages(contentData),
      hasVideos: this.hasVideos(contentData),
      hasMultilingualContent: this.hasMultilingualContent(contentData)
    }
    
    const qualityScore = await prisma.contentQualityScore.upsert({
      where: {
        entityType_entityId: {
          entityType,
          entityId
        }
      },
      update: {
        overallScore,
        ...scores,
        ...metrics,
        ...flags,
        lastCalculatedAt: new Date()
      },
      create: {
        entityType,
        entityId,
        overallScore,
        ...scores,
        ...metrics,
        ...flags
      }
    })
    
    await this.logContentAction({
      entityType,
      entityId,
      action: 'quality_score_calculated',
      newData: { overallScore, ...scores }
    })
    
    return qualityScore
  }
  
  private async getContentData(entityType: string, entityId: string) {
    switch (entityType) {
      case 'course':
        return prisma.course.findUnique({ where: { id: entityId } })
      case 'product':
        return prisma.product.findUnique({ where: { id: entityId } })
      case 'learning_material':
        return prisma.learningMaterial.findUnique({ where: { id: entityId } })
      default:
        return null
    }
  }
  
  private calculateCompletenessScore(contentData: any): number {
    let score = 0
    const maxScore = 1.0
    
    // Check for required fields
    if (contentData.title || contentData.name) score += 0.3
    if (contentData.description) score += 0.3
    if (contentData.price !== undefined) score += 0.2
    if (contentData.craftCategory) score += 0.2
    
    return Math.min(score, maxScore)
  }
  
  private calculateAccuracyScore(contentData: any): number {
    // This would involve more sophisticated checks
    // For now, return a base score that can be manually adjusted
    return 0.8
  }
  
  private async calculateEngagementScore(entityType: string, entityId: string): Promise<number> {
    const metrics = await this.getEngagementMetrics(entityType, entityId)
    
    // Normalize engagement metrics to 0-1 scale
    const viewScore = Math.min(metrics.viewCount / 1000, 1) * 0.4
    const likeScore = Math.min(metrics.likeCount / 100, 1) * 0.3
    const commentScore = Math.min(metrics.commentCount / 50, 1) * 0.3
    
    return viewScore + likeScore + commentScore
  }
  
  private calculateMultimediaScore(contentData: any): number {
    let score = 0
    
    if (this.hasImages(contentData)) score += 0.4
    if (this.hasVideos(contentData)) score += 0.6
    
    return Math.min(score, 1.0)
  }
  
  private calculateLanguageQualityScore(contentData: any): number {
    // Check for multilingual content
    let score = 0.5 // Base score
    
    if (this.hasMultilingualContent(contentData)) score += 0.3
    if (this.hasDescription(contentData)) score += 0.2
    
    return Math.min(score, 1.0)
  }
  
  private async getEngagementMetrics(entityType: string, entityId: string) {
    // Get likes count
    const likeCount = await prisma.like.count({
      where: {
        entityType: entityType.toUpperCase() as any,
        entityId
      }
    })
    
    // Get comments count
    const commentCount = await prisma.comment.count({
      where: {
        entityType: entityType.toUpperCase() as any,
        entityId
      }
    })
    
    return {
      viewCount: 0, // Would be tracked separately
      likeCount,
      commentCount,
      shareCount: 0, // Would be tracked separately
      completionRate: 0 // Would be calculated based on learning progress
    }
  }
  
  private hasDescription(contentData: any): boolean {
    return !!(contentData.description || contentData.bio)
  }
  
  private hasImages(contentData: any): boolean {
    // Check if content has associated images
    return !!(contentData.mediaFiles?.some((file: any) => file.fileType.startsWith('image')))
  }
  
  private hasVideos(contentData: any): boolean {
    // Check if content has associated videos
    return !!(contentData.mediaFiles?.some((file: any) => file.fileType.startsWith('video')))
  }
  
  private hasMultilingualContent(contentData: any): boolean {
    // Check if content has multilingual fields
    const multilingualFields = ['title', 'description', 'name', 'bio']
    return multilingualFields.some(field => {
      const value = contentData[field]
      return value && typeof value === 'object' && Object.keys(value).length > 1
    })
  }
  
  async getQualityScores(entityType?: string, minScore?: number) {
    return prisma.contentQualityScore.findMany({
      where: {
        ...(entityType && { entityType }),
        ...(minScore && { overallScore: { gte: minScore } })
      },
      orderBy: { overallScore: 'desc' }
    })
  }
  
  // Audit Logging
  private async logContentAction(data: {
    entityType: string
    entityId: string
    action: string
    oldData?: Record<string, any>
    newData?: Record<string, any>
    userId?: string
    ipAddress?: string
    userAgent?: string
  }) {
    return prisma.contentAuditLog.create({
      data
    })
  }
  
  async getAuditLog(entityType?: string, entityId?: string, limit = 100) {
    return prisma.contentAuditLog.findMany({
      where: {
        ...(entityType && { entityType }),
        ...(entityId && { entityId })
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
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
  }
  
  // Batch Operations
  async batchCalculateQualityScores(entityType?: string) {
    const entities = await this.getEntitiesForQualityCalculation(entityType)
    
    const results = await Promise.all(
      entities.map(async (entity) => {
        try {
          return await this.calculateQualityScore(entity.type, entity.id)
        } catch (error) {
          console.error(`Failed to calculate quality score for ${entity.type}:${entity.id}`, error)
          return null
        }
      })
    )
    
    return results.filter(Boolean)
  }
  
  private async getEntitiesForQualityCalculation(entityType?: string) {
    const entities: Array<{ type: string; id: string }> = []
    
    if (!entityType || entityType === 'course') {
      const courses = await prisma.course.findMany({ select: { id: true } })
      entities.push(...courses.map(c => ({ type: 'course', id: c.id })))
    }
    
    if (!entityType || entityType === 'product') {
      const products = await prisma.product.findMany({ select: { id: true } })
      entities.push(...products.map(p => ({ type: 'product', id: p.id })))
    }
    
    if (!entityType || entityType === 'learning_material') {
      const materials = await prisma.learningMaterial.findMany({ select: { id: true } })
      entities.push(...materials.map(m => ({ type: 'learning_material', id: m.id })))
    }
    
    return entities
  }
}

export const contentManagementService = new ContentManagementService()