import { PrismaClient } from '@prisma/client'
import { feedbackService } from './feedback.service'

const prisma = new PrismaClient()

export interface UXOptimization {
  id?: string
  category: 'navigation' | 'forms' | 'content' | 'performance' | 'accessibility' | 'mobile'
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'proposed' | 'approved' | 'in_progress' | 'completed' | 'rejected'
  impactScore: number // 1-10
  effortScore: number // 1-10
  userFeedbackIds: string[]
  implementationNotes?: string
  beforeMetrics?: Record<string, number>
  afterMetrics?: Record<string, number>
  createdAt?: Date
  updatedAt?: Date
}

export interface UXMetrics {
  pageLoadTime: number
  timeToInteractive: number
  bounceRate: number
  conversionRate: number
  userSatisfactionScore: number
  taskCompletionRate: number
  errorRate: number
  mobileUsabilityScore: number
}

export class UXOptimizationService {
  // 分析用戶反饋並生成UX優化建議
  async analyzeUserFeedbackForUXOptimizations(): Promise<UXOptimization[]> {
    try {
      const analytics = await feedbackService.getFeedbackAnalytics()
      const highPriorityFeedback = await feedbackService.getHighPriorityFeedback()
      
      const optimizations: UXOptimization[] = []

      // 分析易用性問題
      if (analytics.byCategory.usability > 0) {
        const usabilityFeedback = highPriorityFeedback.filter(f => f.category === 'usability')
        
        optimizations.push({
          category: 'navigation',
          title: '改善網站導航結構',
          description: '基於用戶反饋優化導航菜單和頁面結構',
          priority: this.calculatePriority(usabilityFeedback.length, analytics.totalFeedback),
          status: 'proposed',
          impactScore: 8,
          effortScore: 6,
          userFeedbackIds: usabilityFeedback.map(f => f.id!),
          implementationNotes: '重新設計主導航，增加搜索功能，優化頁面層級結構'
        })
      }

      // 分析性能問題
      if (analytics.byCategory.performance > 0) {
        const performanceFeedback = highPriorityFeedback.filter(f => f.category === 'performance')
        
        optimizations.push({
          category: 'performance',
          title: '優化頁面載入速度',
          description: '改善頁面載入時間和響應速度',
          priority: this.calculatePriority(performanceFeedback.length, analytics.totalFeedback),
          status: 'proposed',
          impactScore: 9,
          effortScore: 7,
          userFeedbackIds: performanceFeedback.map(f => f.id!),
          implementationNotes: '實施圖片懶加載、代碼分割、CDN優化'
        })
      }

      // 分析表單相關問題
      const formIssues = highPriorityFeedback.filter(f => 
        f.description.toLowerCase().includes('表單') || 
        f.description.toLowerCase().includes('form') ||
        f.page?.includes('register') ||
        f.page?.includes('checkout')
      )

      if (formIssues.length > 0) {
        optimizations.push({
          category: 'forms',
          title: '優化表單用戶體驗',
          description: '改善表單填寫流程和錯誤處理',
          priority: this.calculatePriority(formIssues.length, analytics.totalFeedback),
          status: 'proposed',
          impactScore: 7,
          effortScore: 4,
          userFeedbackIds: formIssues.map(f => f.id!),
          implementationNotes: '增加即時驗證、改善錯誤提示、簡化表單步驟'
        })
      }

      // 分析行動裝置問題
      const mobileIssues = highPriorityFeedback.filter(f => 
        f.userAgent?.toLowerCase().includes('mobile') ||
        f.description.toLowerCase().includes('手機') ||
        f.description.toLowerCase().includes('mobile')
      )

      if (mobileIssues.length > 0) {
        optimizations.push({
          category: 'mobile',
          title: '改善行動裝置體驗',
          description: '優化手機和平板的使用體驗',
          priority: this.calculatePriority(mobileIssues.length, analytics.totalFeedback),
          status: 'proposed',
          impactScore: 8,
          effortScore: 5,
          userFeedbackIds: mobileIssues.map(f => f.id!),
          implementationNotes: '優化觸控操作、改善響應式設計、增加手勢支持'
        })
      }

      return optimizations
    } catch (error) {
      console.error('Error analyzing feedback for UX optimizations:', error)
      throw new Error('Failed to analyze feedback for UX optimizations')
    }
  }

  // 實施UX優化
  async implementOptimization(optimizationId: string): Promise<void> {
    try {
      const optimization = await prisma.uxOptimization.findUnique({
        where: { id: optimizationId }
      })

      if (!optimization) {
        throw new Error('Optimization not found')
      }

      // 記錄實施前的指標
      const beforeMetrics = await this.collectCurrentMetrics()
      
      await prisma.uxOptimization.update({
        where: { id: optimizationId },
        data: {
          status: 'in_progress',
          beforeMetrics: beforeMetrics as any,
          updatedAt: new Date()
        }
      })

      // 根據優化類別執行相應的改進
      await this.executeOptimization(optimization as UXOptimization)

      // 標記為完成
      await prisma.uxOptimization.update({
        where: { id: optimizationId },
        data: {
          status: 'completed',
          updatedAt: new Date()
        }
      })

    } catch (error) {
      console.error('Error implementing optimization:', error)
      throw new Error('Failed to implement optimization')
    }
  }

  // 測量優化效果
  async measureOptimizationImpact(optimizationId: string): Promise<{
    beforeMetrics: UXMetrics
    afterMetrics: UXMetrics
    improvement: Record<string, number>
    impactScore: number
  }> {
    try {
      const optimization = await prisma.uxOptimization.findUnique({
        where: { id: optimizationId }
      })

      if (!optimization || !optimization.beforeMetrics) {
        throw new Error('Optimization or before metrics not found')
      }

      const beforeMetrics = optimization.beforeMetrics as UXMetrics
      const afterMetrics = await this.collectCurrentMetrics()

      // 計算改善程度
      const improvement: Record<string, number> = {}
      Object.keys(beforeMetrics).forEach(key => {
        const before = beforeMetrics[key as keyof UXMetrics]
        const after = afterMetrics[key as keyof UXMetrics]
        
        // 對於某些指標，數值降低是改善（如載入時間、錯誤率）
        const isLowerBetter = ['pageLoadTime', 'timeToInteractive', 'bounceRate', 'errorRate'].includes(key)
        
        if (isLowerBetter) {
          improvement[key] = ((before - after) / before) * 100
        } else {
          improvement[key] = ((after - before) / before) * 100
        }
      })

      // 計算總體影響分數
      const impactScore = this.calculateImpactScore(improvement)

      // 更新優化記錄
      await prisma.uxOptimization.update({
        where: { id: optimizationId },
        data: {
          afterMetrics: afterMetrics as any,
          updatedAt: new Date()
        }
      })

      return {
        beforeMetrics,
        afterMetrics,
        improvement,
        impactScore
      }
    } catch (error) {
      console.error('Error measuring optimization impact:', error)
      throw new Error('Failed to measure optimization impact')
    }
  }

  // 生成UX優化報告
  async generateUXOptimizationReport(): Promise<{
    summary: {
      totalOptimizations: number
      completedOptimizations: number
      averageImpactScore: number
      totalUserFeedbackAddressed: number
    }
    optimizations: UXOptimization[]
    recommendations: string[]
    nextSteps: Array<{
      priority: 'high' | 'medium' | 'low'
      action: string
      estimatedImpact: number
      estimatedEffort: number
    }>
  }> {
    try {
      const optimizations = await prisma.uxOptimization.findMany({
        orderBy: { createdAt: 'desc' }
      })

      const completedOptimizations = optimizations.filter(o => o.status === 'completed')
      const averageImpactScore = completedOptimizations.length > 0 
        ? completedOptimizations.reduce((sum, o) => sum + o.impactScore, 0) / completedOptimizations.length
        : 0

      const totalUserFeedbackAddressed = optimizations.reduce((sum, o) => 
        sum + (o.userFeedbackIds as string[]).length, 0
      )

      const recommendations = this.generateUXRecommendations(optimizations as UXOptimization[])
      const nextSteps = this.generateNextSteps(optimizations as UXOptimization[])

      return {
        summary: {
          totalOptimizations: optimizations.length,
          completedOptimizations: completedOptimizations.length,
          averageImpactScore,
          totalUserFeedbackAddressed
        },
        optimizations: optimizations as UXOptimization[],
        recommendations,
        nextSteps
      }
    } catch (error) {
      console.error('Error generating UX optimization report:', error)
      throw new Error('Failed to generate UX optimization report')
    }
  }

  // 私有方法
  private calculatePriority(issueCount: number, totalFeedback: number): 'low' | 'medium' | 'high' | 'critical' {
    const percentage = (issueCount / totalFeedback) * 100
    
    if (percentage >= 20) return 'critical'
    if (percentage >= 10) return 'high'
    if (percentage >= 5) return 'medium'
    return 'low'
  }

  private async collectCurrentMetrics(): Promise<UXMetrics> {
    // 這裡應該整合真實的分析工具（如Google Analytics、Web Vitals等）
    // 目前返回模擬數據
    return {
      pageLoadTime: Math.random() * 3000 + 1000, // 1-4秒
      timeToInteractive: Math.random() * 2000 + 2000, // 2-4秒
      bounceRate: Math.random() * 30 + 20, // 20-50%
      conversionRate: Math.random() * 5 + 2, // 2-7%
      userSatisfactionScore: Math.random() * 20 + 70, // 70-90
      taskCompletionRate: Math.random() * 20 + 75, // 75-95%
      errorRate: Math.random() * 2 + 0.5, // 0.5-2.5%
      mobileUsabilityScore: Math.random() * 20 + 75 // 75-95
    }
  }

  private async executeOptimization(optimization: UXOptimization): Promise<void> {
    // 根據優化類別執行相應的改進措施
    switch (optimization.category) {
      case 'navigation':
        await this.optimizeNavigation()
        break
      case 'forms':
        await this.optimizeForms()
        break
      case 'performance':
        await this.optimizePerformance()
        break
      case 'mobile':
        await this.optimizeMobile()
        break
      case 'accessibility':
        await this.optimizeAccessibility()
        break
      case 'content':
        await this.optimizeContent()
        break
    }
  }

  private async optimizeNavigation(): Promise<void> {
    console.log('Implementing navigation optimizations...')
    // 實際的導航優化邏輯
  }

  private async optimizeForms(): Promise<void> {
    console.log('Implementing form optimizations...')
    // 實際的表單優化邏輯
  }

  private async optimizePerformance(): Promise<void> {
    console.log('Implementing performance optimizations...')
    // 實際的性能優化邏輯
  }

  private async optimizeMobile(): Promise<void> {
    console.log('Implementing mobile optimizations...')
    // 實際的行動裝置優化邏輯
  }

  private async optimizeAccessibility(): Promise<void> {
    console.log('Implementing accessibility optimizations...')
    // 實際的無障礙優化邏輯
  }

  private async optimizeContent(): Promise<void> {
    console.log('Implementing content optimizations...')
    // 實際的內容優化邏輯
  }

  private calculateImpactScore(improvement: Record<string, number>): number {
    const weights = {
      pageLoadTime: 0.2,
      timeToInteractive: 0.15,
      bounceRate: 0.15,
      conversionRate: 0.25,
      userSatisfactionScore: 0.15,
      taskCompletionRate: 0.1
    }

    let totalScore = 0
    let totalWeight = 0

    Object.entries(improvement).forEach(([key, value]) => {
      const weight = weights[key as keyof typeof weights] || 0
      if (weight > 0) {
        totalScore += value * weight
        totalWeight += weight
      }
    })

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0
  }

  private generateUXRecommendations(optimizations: UXOptimization[]): string[] {
    const recommendations: string[] = []
    
    const pendingOptimizations = optimizations.filter(o => o.status === 'proposed')
    const highPriorityOptimizations = optimizations.filter(o => o.priority === 'high' || o.priority === 'critical')

    if (highPriorityOptimizations.length > 0) {
      recommendations.push(`優先實施 ${highPriorityOptimizations.length} 個高優先級UX優化`)
    }

    if (pendingOptimizations.length > 5) {
      recommendations.push('建立UX優化實施計劃，分階段執行改進措施')
    }

    const categoryCount = optimizations.reduce((acc, o) => {
      acc[o.category] = (acc[o.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const topCategory = Object.entries(categoryCount).sort(([,a], [,b]) => b - a)[0]
    if (topCategory) {
      recommendations.push(`重點關注${topCategory[0]}相關的用戶體驗問題`)
    }

    return recommendations
  }

  private generateNextSteps(optimizations: UXOptimization[]): Array<{
    priority: 'high' | 'medium' | 'low'
    action: string
    estimatedImpact: number
    estimatedEffort: number
  }> {
    const nextSteps: Array<{
      priority: 'high' | 'medium' | 'low'
      action: string
      estimatedImpact: number
      estimatedEffort: number
    }> = []

    const proposedOptimizations = optimizations.filter(o => o.status === 'proposed')
    
    // 按影響分數和優先級排序
    const sortedOptimizations = proposedOptimizations.sort((a, b) => {
      const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 }
      const aScore = priorityWeight[a.priority] * a.impactScore / a.effortScore
      const bScore = priorityWeight[b.priority] * b.impactScore / b.effortScore
      return bScore - aScore
    })

    // 生成前5個建議的下一步行動
    sortedOptimizations.slice(0, 5).forEach(optimization => {
      nextSteps.push({
        priority: optimization.priority === 'critical' ? 'high' : optimization.priority,
        action: `實施「${optimization.title}」優化`,
        estimatedImpact: optimization.impactScore,
        estimatedEffort: optimization.effortScore
      })
    })

    return nextSteps
  }
}

export const uxOptimizationService = new UXOptimizationService()