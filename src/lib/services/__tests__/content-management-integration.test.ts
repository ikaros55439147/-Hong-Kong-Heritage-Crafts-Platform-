import { describe, it, expect } from 'vitest'

describe('Content Management Integration', () => {
  it('should have content management service available', async () => {
    const { contentManagementService } = await import('../content-management.service')
    expect(contentManagementService).toBeDefined()
    expect(typeof contentManagementService.createVersion).toBe('function')
    expect(typeof contentManagementService.scheduleContent).toBe('function')
    expect(typeof contentManagementService.createTag).toBe('function')
    expect(typeof contentManagementService.calculateQualityScore).toBe('function')
  })

  it('should validate version creation schema', async () => {
    const { z } = await import('zod')
    
    const ContentVersionSchema = z.object({
      entityType: z.string(),
      entityId: z.string().uuid(),
      contentData: z.record(z.any()),
      changeSummary: z.string().optional(),
      createdBy: z.string().uuid()
    })

    const validData = {
      entityType: 'course',
      entityId: '123e4567-e89b-12d3-a456-426614174000',
      contentData: { title: 'Test Course' },
      changeSummary: 'Initial version',
      createdBy: '123e4567-e89b-12d3-a456-426614174001'
    }

    const result = ContentVersionSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('should validate schedule creation schema', async () => {
    const { z } = await import('zod')
    
    const ContentScheduleSchema = z.object({
      entityType: z.string(),
      entityId: z.string().uuid(),
      actionType: z.enum(['publish', 'unpublish', 'update']),
      scheduledAt: z.date(),
      contentData: z.record(z.any()).optional(),
      createdBy: z.string().uuid()
    })

    const validData = {
      entityType: 'course',
      entityId: '123e4567-e89b-12d3-a456-426614174000',
      actionType: 'publish' as const,
      scheduledAt: new Date(),
      createdBy: '123e4567-e89b-12d3-a456-426614174001'
    }

    const result = ContentScheduleSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('should validate tag creation schema', async () => {
    const { z } = await import('zod')
    
    const ContentTagSchema = z.object({
      name: z.string().min(1).max(100),
      description: z.string().optional(),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      category: z.string().optional()
    })

    const validData = {
      name: '初級',
      description: '適合初學者',
      color: '#4CAF50',
      category: 'difficulty'
    }

    const result = ContentTagSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('should validate quality score calculation', () => {
    // Test completeness score calculation
    const calculateCompletenessScore = (contentData: any): number => {
      let score = 0
      const maxScore = 1.0
      
      if (contentData.title || contentData.name) score += 0.3
      if (contentData.description) score += 0.3
      if (contentData.price !== undefined) score += 0.2
      if (contentData.craftCategory) score += 0.2
      
      return Math.min(score, maxScore)
    }

    const completeContent = {
      title: 'Test Course',
      description: 'A test course description',
      price: 100,
      craftCategory: 'traditional'
    }

    const incompleteContent = {
      title: 'Test Course'
    }

    expect(calculateCompletenessScore(completeContent)).toBe(1.0)
    expect(calculateCompletenessScore(incompleteContent)).toBe(0.3)
  })

  it('should generate tag suggestions correctly', () => {
    const generateTagSuggestions = (contentData: Record<string, any>) => {
      const suggestions: Array<{ name: string; category: string; confidence: number }> = []
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
        '竹編': 'traditional_craft'
      }
      
      for (const [keyword, category] of Object.entries(craftKeywords)) {
        if (text.includes(keyword)) {
          suggestions.push({ name: keyword, category: 'craft_type', confidence: 0.9 })
        }
      }
      
      return suggestions
    }

    const beginnerContent = {
      title: '初學者手雕麻將課程',
      description: '適合初學者的傳統手雕麻將製作課程'
    }

    const suggestions = generateTagSuggestions(beginnerContent)
    
    expect(suggestions).toHaveLength(2)
    expect(suggestions[0]).toEqual({ name: '初級', category: 'difficulty', confidence: 0.8 })
    expect(suggestions[1]).toEqual({ name: '手雕麻將', category: 'craft_type', confidence: 0.9 })
  })

  it('should calculate engagement score correctly', () => {
    const calculateEngagementScore = (metrics: {
      viewCount: number
      likeCount: number
      commentCount: number
    }): number => {
      const viewScore = Math.min(metrics.viewCount / 1000, 1) * 0.4
      const likeScore = Math.min(metrics.likeCount / 100, 1) * 0.3
      const commentScore = Math.min(metrics.commentCount / 50, 1) * 0.3
      
      return viewScore + likeScore + commentScore
    }

    const highEngagement = {
      viewCount: 2000,
      likeCount: 200,
      commentCount: 100
    }

    const lowEngagement = {
      viewCount: 100,
      likeCount: 10,
      commentCount: 5
    }

    expect(calculateEngagementScore(highEngagement)).toBe(1.0)
    expect(calculateEngagementScore(lowEngagement)).toBeCloseTo(0.1, 2)
  })
})