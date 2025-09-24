import { logger } from '@/lib/utils/logger'
import { prisma } from '@/lib/database'
import { redis } from '@/lib/redis'

export interface SystemMetrics {
  timestamp: Date
  cpu: number
  memory: number
  disk: number
  network: number
  activeUsers: number
  requestsPerMinute: number
  errorRate: number
  avgResponseTime: number
  databaseConnections: number
  redisMemoryUsage: number
}

export interface AlertRule {
  id: string
  name: string
  metric: keyof SystemMetrics
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte'
  threshold: number
  duration: number // 持續時間（秒）
  severity: 'info' | 'warning' | 'critical'
  enabled: boolean
  lastTriggered?: Date
}

export class SystemMonitoringService {
  private metrics: SystemMetrics[] = []
  private alertRules: AlertRule[] = []
  private activeAlerts: Map<string, Date> = new Map()

  constructor() {
    this.initializeDefaultAlertRules()
    this.startMetricsCollection()
  }

  async collectMetrics(): Promise<SystemMetrics> {
    const timestamp = new Date()
    
    try {
      // 收集系統指標
      const systemMetrics = await this.collectSystemMetrics()
      
      // 收集應用程式指標
      const appMetrics = await this.collectApplicationMetrics()
      
      // 收集數據庫指標
      const dbMetrics = await this.collectDatabaseMetrics()
      
      // 收集Redis指標
      const redisMetrics = await this.collectRedisMetrics()

      const metrics: SystemMetrics = {
        timestamp,
        ...systemMetrics,
        ...appMetrics,
        ...dbMetrics,
        ...redisMetrics
      }

      // 存儲指標
      this.metrics.push(metrics)
      
      // 保持最近1000個指標記錄
      if (this.metrics.length > 1000) {
        this.metrics = this.metrics.slice(-1000)
      }

      // 檢查告警規則
      await this.checkAlertRules(metrics)

      return metrics

    } catch (error) {
      logger.error('收集系統指標失敗', error)
      throw error
    }
  }

  async getMetrics(timeRange?: { start: Date; end: Date }): Promise<SystemMetrics[]> {
    if (!timeRange) {
      return this.metrics.slice(-100) // 返回最近100個指標
    }

    return this.metrics.filter(metric => 
      metric.timestamp >= timeRange.start && metric.timestamp <= timeRange.end
    )
  }

  async getCurrentMetrics(): Promise<SystemMetrics | null> {
    return this.metrics[this.metrics.length - 1] || null
  }

  async addAlertRule(rule: Omit<AlertRule, 'id'>): Promise<AlertRule> {
    const alertRule: AlertRule = {
      ...rule,
      id: this.generateAlertRuleId()
    }

    this.alertRules.push(alertRule)
    logger.info('添加告警規則', { rule: alertRule })

    return alertRule
  }

  async updateAlertRule(id: string, updates: Partial<AlertRule>): Promise<AlertRule | null> {
    const index = this.alertRules.findIndex(rule => rule.id === id)
    if (index === -1) return null

    this.alertRules[index] = { ...this.alertRules[index], ...updates }
    logger.info('更新告警規則', { id, updates })

    return this.alertRules[index]
  }

  async deleteAlertRule(id: string): Promise<boolean> {
    const index = this.alertRules.findIndex(rule => rule.id === id)
    if (index === -1) return false

    this.alertRules.splice(index, 1)
    logger.info('刪除告警規則', { id })

    return true
  }

  async getAlertRules(): Promise<AlertRule[]> {
    return this.alertRules
  }

  private async collectSystemMetrics(): Promise<Partial<SystemMetrics>> {
    const memoryUsage = process.memoryUsage()
    const cpuUsage = process.cpuUsage()

    return {
      cpu: this.calculateCpuUsage(cpuUsage),
      memory: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
      disk: await this.getDiskUsage(),
      network: 0 // 需要實現網路使用率監控
    }
  }

  private async collectApplicationMetrics(): Promise<Partial<SystemMetrics>> {
    // 這些指標應該從應用程式的指標收集器獲取
    // 暫時返回模擬數據
    return {
      activeUsers: await this.getActiveUsersCount(),
      requestsPerMinute: await this.getRequestsPerMinute(),
      errorRate: await this.getErrorRate(),
      avgResponseTime: await this.getAverageResponseTime()
    }
  }

  private async collectDatabaseMetrics(): Promise<Partial<SystemMetrics>> {
    try {
      const result = await prisma.$queryRaw`
        SELECT count(*) as connections
        FROM pg_stat_activity 
        WHERE datname = current_database()
      ` as any[]

      return {
        databaseConnections: parseInt(result[0]?.connections || '0')
      }
    } catch (error) {
      logger.error('收集數據庫指標失敗', error)
      return { databaseConnections: 0 }
    }
  }

  private async collectRedisMetrics(): Promise<Partial<SystemMetrics>> {
    try {
      const info = await redis.info('memory')
      const memoryInfo = this.parseRedisInfo(info)
      
      const usedMemory = parseInt(memoryInfo.used_memory || '0')
      const maxMemory = parseInt(memoryInfo.maxmemory || '0')
      
      return {
        redisMemoryUsage: maxMemory > 0 ? Math.round((usedMemory / maxMemory) * 100) : 0
      }
    } catch (error) {
      logger.error('收集Redis指標失敗', error)
      return { redisMemoryUsage: 0 }
    }
  }

  private async checkAlertRules(metrics: SystemMetrics): Promise<void> {
    for (const rule of this.alertRules) {
      if (!rule.enabled) continue

      const metricValue = metrics[rule.metric] as number
      const shouldTrigger = this.evaluateAlertCondition(metricValue, rule)

      if (shouldTrigger) {
        const alertKey = `${rule.id}_${rule.metric}`
        const lastTriggered = this.activeAlerts.get(alertKey)
        
        // 檢查是否已經在持續時間內觸發過
        if (!lastTriggered || (Date.now() - lastTriggered.getTime()) > rule.duration * 1000) {
          await this.triggerAlert(rule, metricValue, metrics)
          this.activeAlerts.set(alertKey, new Date())
        }
      }
    }
  }

  private evaluateAlertCondition(value: number, rule: AlertRule): boolean {
    switch (rule.operator) {
      case 'gt': return value > rule.threshold
      case 'gte': return value >= rule.threshold
      case 'lt': return value < rule.threshold
      case 'lte': return value <= rule.threshold
      case 'eq': return value === rule.threshold
      default: return false
    }
  }

  private async triggerAlert(rule: AlertRule, value: number, metrics: SystemMetrics): Promise<void> {
    logger.warn('觸發告警', {
      rule: rule.name,
      metric: rule.metric,
      value,
      threshold: rule.threshold,
      severity: rule.severity
    })

    // 發送告警通知
    await this.sendAlertNotification(rule, value, metrics)
    
    // 更新最後觸發時間
    rule.lastTriggered = new Date()
  }

  private async sendAlertNotification(rule: AlertRule, value: number, metrics: SystemMetrics): Promise<void> {
    // 這裡應該發送告警通知到AlertManager或其他通知系統
    // 暫時只記錄日誌
    logger.info('發送告警通知', {
      rule: rule.name,
      severity: rule.severity,
      message: `${rule.metric} 值 ${value} ${rule.operator} ${rule.threshold}`
    })
  }

  private calculateCpuUsage(cpuUsage: NodeJS.CpuUsage): number {
    // 簡化的CPU使用率計算
    const totalUsage = cpuUsage.user + cpuUsage.system
    return Math.round((totalUsage / 1000000) * 100) // 轉換為百分比
  }

  private async getDiskUsage(): Promise<number> {
    // 需要實現磁碟使用率監控
    // 暫時返回模擬數據
    return Math.floor(Math.random() * 100)
  }

  private async getActiveUsersCount(): Promise<number> {
    // 從Redis或數據庫獲取活躍用戶數
    // 暫時返回模擬數據
    return Math.floor(Math.random() * 1000)
  }

  private async getRequestsPerMinute(): Promise<number> {
    // 從指標收集器獲取每分鐘請求數
    // 暫時返回模擬數據
    return Math.floor(Math.random() * 10000)
  }

  private async getErrorRate(): Promise<number> {
    // 從指標收集器獲取錯誤率
    // 暫時返回模擬數據
    return Math.random() * 5
  }

  private async getAverageResponseTime(): Promise<number> {
    // 從指標收集器獲取平均響應時間
    // 暫時返回模擬數據
    return Math.floor(Math.random() * 1000)
  }

  private parseRedisInfo(info: string): Record<string, string> {
    const lines = info.split('\r\n')
    const result: Record<string, string> = {}
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':')
        result[key] = value
      }
    }
    
    return result
  }

  private initializeDefaultAlertRules(): void {
    const defaultRules: Omit<AlertRule, 'id'>[] = [
      {
        name: 'CPU使用率過高',
        metric: 'cpu',
        operator: 'gt',
        threshold: 80,
        duration: 300, // 5分鐘
        severity: 'warning',
        enabled: true
      },
      {
        name: 'CPU使用率嚴重過高',
        metric: 'cpu',
        operator: 'gt',
        threshold: 95,
        duration: 60, // 1分鐘
        severity: 'critical',
        enabled: true
      },
      {
        name: '記憶體使用率過高',
        metric: 'memory',
        operator: 'gt',
        threshold: 85,
        duration: 300, // 5分鐘
        severity: 'warning',
        enabled: true
      },
      {
        name: '錯誤率過高',
        metric: 'errorRate',
        operator: 'gt',
        threshold: 5,
        duration: 300, // 5分鐘
        severity: 'warning',
        enabled: true
      },
      {
        name: '響應時間過長',
        metric: 'avgResponseTime',
        operator: 'gt',
        threshold: 2000, // 2秒
        duration: 300, // 5分鐘
        severity: 'warning',
        enabled: true
      }
    ]

    for (const rule of defaultRules) {
      this.alertRules.push({
        ...rule,
        id: this.generateAlertRuleId()
      })
    }
  }

  private startMetricsCollection(): void {
    // 每30秒收集一次指標
    setInterval(async () => {
      try {
        await this.collectMetrics()
      } catch (error) {
        logger.error('定期指標收集失敗', error)
      }
    }, 30000)

    logger.info('系統監控服務已啟動')
  }

  private generateAlertRuleId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

export const systemMonitoringService = new SystemMonitoringService()