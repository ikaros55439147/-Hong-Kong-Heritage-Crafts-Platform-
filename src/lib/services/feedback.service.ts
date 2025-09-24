import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface UserFeedback {
  id?: string
  userId: string
  category: 'bug' | 'feature_request' | 'usability' | 'performance' | 'content' | 'other'
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  page?: string
  userAgent?: string
  screenshots?: string[]
  reproductionSteps?: string[]
  expectedBehavior?: string
  actualBehavior?: string
  priority?: number
  assignedTo?: string
  resolution?: string
  createdAt?: Date
  updatedAt?: Date
}

export interface FeedbackAnalytics {
  totalFeedback: number
  byCategory: Record<string, number>
  bySeverity: Record<string, number>
  byStatus: Record<string, number>
  averageResolutionTime: number
  userSatisfactionScore: number
  commonIssues: Array<{
    issue: string
    count: number
    category: string
  }>
}

export class FeedbackService {
  // 收集用戶反饋
  async collectFeedback(feedback: Omit<UserFeedback, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserFeedback> {
    try {
      const newFeedback = await prisma.feedback.create({
        data: {
          userId: feedback.userId,
          category: feedback.category,
          title: feedback.title,
          description: feedback.description,
          severity: feedback.severity,
          status: feedback.status || 'open',
          page: feedback.page,
          userAgent: feedback.userAgent,
          screenshots: feedback.screenshots || [],
          reproductionSteps: feedback.reproductionSteps || [],
          expectedBehavior: feedback.expectedBehavior,
          actualBehavior: feedback.actualBehavior,
          priority: this.calculatePriority(feedback.severity, feedback.category)
        }
      })

      // 自動分配給相關團隊成員
      await this.autoAssignFeedback(newFeedback.id)

      // 發送通知給相關人員
      await this.notifyRelevantTeam(newFeedback)

      return newFeedback as UserFeedback
    } catch (error) {
      console.error('Error collecting feedback:', error)
      throw new Error('Failed to collect feedback')
    }
  }

  // 批量收集反饋（用於UAT階段）
  async collectBatchFeedback(feedbackList: Array<Omit<UserFeedback, 'id' | 'createdAt' | 'updatedAt'>>): Promise<UserFeedback[]> {
    try {
      const results = await Promise.all(
        feedbackList.map(feedback => this.collectFeedback(feedback))
      )
      return results
    } catch (error) {
      console.error('Error collecting batch feedback:', error)
      throw new Error('Failed to collect batch feedback')
    }
  }

  // 更新反饋狀態
  async updateFeedbackStatus(
    feedbackId: string, 
    status: UserFeedback['status'], 
    resolution?: string,
    assignedTo?: string
  ): Promise<UserFeedback> {
    try {
      const updatedFeedback = await prisma.feedback.update({
        where: { id: feedbackId },
        data: {
          status,
          resolution,
          assignedTo,
          updatedAt: new Date()
        }
      })

      // 通知用戶狀態更新
      await this.notifyUserOfStatusUpdate(updatedFeedback)

      return updatedFeedback as UserFeedback
    } catch (error) {
      console.error('Error updating feedback status:', error)
      throw new Error('Failed to update feedback status')
    }
  }

  // 獲取反饋分析數據
  async getFeedbackAnalytics(dateRange?: { start: Date; end: Date }): Promise<FeedbackAnalytics> {
    try {
      const whereClause = dateRange ? {
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end
        }
      } : {}

      const [
        totalFeedback,
        categoryStats,
        severityStats,
        statusStats,
        resolutionTimes,
        commonIssues
      ] = await Promise.all([
        prisma.feedback.count({ where: whereClause }),
        prisma.feedback.groupBy({
          by: ['category'],
          where: whereClause,
          _count: { category: true }
        }),
        prisma.feedback.groupBy({
          by: ['severity'],
          where: whereClause,
          _count: { severity: true }
        }),
        prisma.feedback.groupBy({
          by: ['status'],
          where: whereClause,
          _count: { status: true }
        }),
        this.calculateAverageResolutionTime(whereClause),
        this.getCommonIssues(whereClause)
      ])

      const byCategory = categoryStats.reduce((acc, stat) => {
        acc[stat.category] = stat._count.category
        return acc
      }, {} as Record<string, number>)

      const bySeverity = severityStats.reduce((acc, stat) => {
        acc[stat.severity] = stat._count.severity
        return acc
      }, {} as Record<string, number>)

      const byStatus = statusStats.reduce((acc, stat) => {
        acc[stat.status] = stat._count.status
        return acc
      }, {} as Record<string, number>)

      return {
        totalFeedback,
        byCategory,
        bySeverity,
        byStatus,
        averageResolutionTime: resolutionTimes,
        userSatisfactionScore: await this.calculateUserSatisfactionScore(),
        commonIssues
      }
    } catch (error) {
      console.error('Error getting feedback analytics:', error)
      throw new Error('Failed to get feedback analytics')
    }
  }

  // 獲取高優先級反饋
  async getHighPriorityFeedback(): Promise<UserFeedback[]> {
    try {
      const feedback = await prisma.feedback.findMany({
        where: {
          OR: [
            { severity: 'critical' },
            { severity: 'high' },
            { priority: { gte: 8 } }
          ],
          status: { in: ['open', 'in_progress'] }
        },
        orderBy: [
          { severity: 'desc' },
          { priority: 'desc' },
          { createdAt: 'asc' }
        ],
        include: {
          user: {
            select: {
              email: true,
              role: true
            }
          }
        }
      })

      return feedback as UserFeedback[]
    } catch (error) {
      console.error('Error getting high priority feedback:', error)
      throw new Error('Failed to get high priority feedback')
    }
  }

  // 生成反饋報告
  async generateFeedbackReport(dateRange: { start: Date; end: Date }): Promise<{
    summary: FeedbackAnalytics
    detailedIssues: UserFeedback[]
    recommendations: string[]
    actionItems: Array<{
      priority: 'high' | 'medium' | 'low'
      description: string
      category: string
      estimatedEffort: string
    }>
  }> {
    try {
      const [summary, detailedIssues] = await Promise.all([
        this.getFeedbackAnalytics(dateRange),
        this.getDetailedIssues(dateRange)
      ])

      const recommendations = this.generateRecommendations(summary, detailedIssues)
      const actionItems = this.generateActionItems(detailedIssues)

      return {
        summary,
        detailedIssues,
        recommendations,
        actionItems
      }
    } catch (error) {
      console.error('Error generating feedback report:', error)
      throw new Error('Failed to generate feedback report')
    }
  }

  // 私有方法
  private calculatePriority(severity: string, category: string): number {
    const severityWeight = {
      'critical': 10,
      'high': 8,
      'medium': 5,
      'low': 2
    }

    const categoryWeight = {
      'bug': 1.5,
      'performance': 1.3,
      'usability': 1.2,
      'feature_request': 1.0,
      'content': 0.8,
      'other': 0.5
    }

    return Math.round(
      (severityWeight[severity as keyof typeof severityWeight] || 5) *
      (categoryWeight[category as keyof typeof categoryWeight] || 1.0)
    )
  }

  private async autoAssignFeedback(feedbackId: string): Promise<void> {
    // 根據類別自動分配給相關團隊成員
    const feedback = await prisma.feedback.findUnique({
      where: { id: feedbackId }
    })

    if (!feedback) return

    const assignmentRules = {
      'bug': 'dev-team@company.com',
      'performance': 'performance-team@company.com',
      'usability': 'ux-team@company.com',
      'feature_request': 'product-team@company.com',
      'content': 'content-team@company.com',
      'other': 'support-team@company.com'
    }

    const assignedTo = assignmentRules[feedback.category as keyof typeof assignmentRules]

    await prisma.feedback.update({
      where: { id: feedbackId },
      data: { assignedTo }
    })
  }

  private async notifyRelevantTeam(feedback: UserFeedback): Promise<void> {
    // 發送通知邏輯（郵件、Slack等）
    console.log(`New ${feedback.severity} feedback received: ${feedback.title}`)
  }

  private async notifyUserOfStatusUpdate(feedback: UserFeedback): Promise<void> {
    // 通知用戶反饋狀態更新
    console.log(`Feedback ${feedback.id} status updated to ${feedback.status}`)
  }

  private async calculateAverageResolutionTime(whereClause: any): Promise<number> {
    const resolvedFeedback = await prisma.feedback.findMany({
      where: {
        ...whereClause,
        status: 'resolved'
      },
      select: {
        createdAt: true,
        updatedAt: true
      }
    })

    if (resolvedFeedback.length === 0) return 0

    const totalTime = resolvedFeedback.reduce((sum, feedback) => {
      const resolutionTime = feedback.updatedAt.getTime() - feedback.createdAt.getTime()
      return sum + resolutionTime
    }, 0)

    return Math.round(totalTime / resolvedFeedback.length / (1000 * 60 * 60 * 24)) // 天數
  }

  private async getCommonIssues(whereClause: any): Promise<Array<{ issue: string; count: number; category: string }>> {
    const issues = await prisma.feedback.groupBy({
      by: ['title', 'category'],
      where: whereClause,
      _count: { title: true },
      having: {
        title: {
          _count: {
            gt: 1
          }
        }
      },
      orderBy: {
        _count: {
          title: 'desc'
        }
      },
      take: 10
    })

    return issues.map(issue => ({
      issue: issue.title,
      count: issue._count.title,
      category: issue.category
    }))
  }

  private async calculateUserSatisfactionScore(): Promise<number> {
    // 基於解決的反饋和用戶評分計算滿意度
    const resolvedFeedback = await prisma.feedback.count({
      where: { status: 'resolved' }
    })

    const totalFeedback = await prisma.feedback.count()

    if (totalFeedback === 0) return 0

    // 簡化的滿意度計算（實際應該基於用戶評分）
    return Math.round((resolvedFeedback / totalFeedback) * 100)
  }

  private async getDetailedIssues(dateRange: { start: Date; end: Date }): Promise<UserFeedback[]> {
    return await prisma.feedback.findMany({
      where: {
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end
        }
      },
      orderBy: [
        { severity: 'desc' },
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    }) as UserFeedback[]
  }

  private generateRecommendations(summary: FeedbackAnalytics, issues: UserFeedback[]): string[] {
    const recommendations: string[] = []

    // 基於反饋數據生成建議
    if (summary.bySeverity.critical > 0) {
      recommendations.push('立即處理所有嚴重問題，這些問題可能影響用戶體驗')
    }

    if (summary.byCategory.usability > summary.totalFeedback * 0.3) {
      recommendations.push('考慮進行用戶體驗設計審查，改善界面易用性')
    }

    if (summary.byCategory.performance > summary.totalFeedback * 0.2) {
      recommendations.push('優化系統性能，特別是頁面載入速度和響應時間')
    }

    if (summary.averageResolutionTime > 7) {
      recommendations.push('改善反饋處理流程，縮短問題解決時間')
    }

    if (summary.userSatisfactionScore < 80) {
      recommendations.push('加強用戶溝通，提高問題解決質量')
    }

    return recommendations
  }

  private generateActionItems(issues: UserFeedback[]): Array<{
    priority: 'high' | 'medium' | 'low'
    description: string
    category: string
    estimatedEffort: string
  }> {
    const actionItems: Array<{
      priority: 'high' | 'medium' | 'low'
      description: string
      category: string
      estimatedEffort: string
    }> = []

    // 分析問題並生成行動項目
    const criticalIssues = issues.filter(issue => issue.severity === 'critical')
    const highIssues = issues.filter(issue => issue.severity === 'high')
    const usabilityIssues = issues.filter(issue => issue.category === 'usability')

    if (criticalIssues.length > 0) {
      actionItems.push({
        priority: 'high',
        description: `修復 ${criticalIssues.length} 個嚴重問題`,
        category: 'bug_fix',
        estimatedEffort: '1-2 週'
      })
    }

    if (highIssues.length > 0) {
      actionItems.push({
        priority: 'high',
        description: `處理 ${highIssues.length} 個高優先級問題`,
        category: 'improvement',
        estimatedEffort: '2-3 週'
      })
    }

    if (usabilityIssues.length > 0) {
      actionItems.push({
        priority: 'medium',
        description: `改善用戶體驗設計，解決 ${usabilityIssues.length} 個易用性問題`,
        category: 'ux_improvement',
        estimatedEffort: '3-4 週'
      })
    }

    return actionItems
  }
}

export const feedbackService = new FeedbackService()