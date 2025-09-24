import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { systemMonitoringService, SystemMetrics, AlertRule } from '@/lib/services/system-monitoring.service'

// Mock external dependencies
vi.mock('@/lib/database', () => ({
  prisma: {
    $queryRaw: vi.fn()
  }
}))

vi.mock('@/lib/redis', () => ({
  redis: {
    ping: vi.fn(),
    info: vi.fn()
  }
}))

vi.mock('@/lib/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}))

describe('SystemMonitoringService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('collectMetrics', () => {
    it('should collect system metrics successfully', async () => {
      // Mock database query
      const mockPrisma = await import('@/lib/database')
      vi.mocked(mockPrisma.prisma.$queryRaw).mockResolvedValue([{ connections: '5' }])

      // Mock Redis info
      const mockRedis = await import('@/lib/redis')
      vi.mocked(mockRedis.redis.ping).mockResolvedValue('PONG')
      vi.mocked(mockRedis.redis.info).mockResolvedValue('used_memory:1000000\nmaxmemory:10000000')

      const metrics = await systemMonitoringService.collectMetrics()

      expect(metrics).toBeDefined()
      expect(metrics.timestamp).toBeInstanceOf(Date)
      expect(typeof metrics.cpu).toBe('number')
      expect(typeof metrics.memory).toBe('number')
      expect(typeof metrics.databaseConnections).toBe('number')
      expect(typeof metrics.redisMemoryUsage).toBe('number')
    })

    it('should handle database connection failure', async () => {
      // Mock database failure
      const mockPrisma = await import('@/lib/database')
      vi.mocked(mockPrisma.prisma.$queryRaw).mockRejectedValue(new Error('Database connection failed'))

      // Mock Redis success
      const mockRedis = await import('@/lib/redis')
      vi.mocked(mockRedis.redis.ping).mockResolvedValue('PONG')
      vi.mocked(mockRedis.redis.info).mockResolvedValue('used_memory:1000000\nmaxmemory:10000000')

      const metrics = await systemMonitoringService.collectMetrics()

      expect(metrics).toBeDefined()
      expect(metrics.databaseConnections).toBe(0)
    })

    it('should handle Redis connection failure', async () => {
      // Mock database success
      const mockPrisma = await import('@/lib/database')
      vi.mocked(mockPrisma.prisma.$queryRaw).mockResolvedValue([{ connections: '5' }])

      // Mock Redis failure
      const mockRedis = await import('@/lib/redis')
      vi.mocked(mockRedis.redis.ping).mockRejectedValue(new Error('Redis connection failed'))

      const metrics = await systemMonitoringService.collectMetrics()

      expect(metrics).toBeDefined()
      expect(metrics.redisMemoryUsage).toBe(0)
    })
  })

  describe('getMetrics', () => {
    it('should return recent metrics when no time range specified', async () => {
      // Collect some metrics first
      const mockPrisma = await import('@/lib/database')
      vi.mocked(mockPrisma.prisma.$queryRaw).mockResolvedValue([{ connections: '5' }])

      const mockRedis = await import('@/lib/redis')
      vi.mocked(mockRedis.redis.ping).mockResolvedValue('PONG')
      vi.mocked(mockRedis.redis.info).mockResolvedValue('used_memory:1000000\nmaxmemory:10000000')

      await systemMonitoringService.collectMetrics()
      await systemMonitoringService.collectMetrics()

      const metrics = await systemMonitoringService.getMetrics()

      expect(Array.isArray(metrics)).toBe(true)
      expect(metrics.length).toBeGreaterThan(0)
      expect(metrics.length).toBeLessThanOrEqual(100)
    })

    it('should filter metrics by time range', async () => {
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)

      const metrics = await systemMonitoringService.getMetrics({
        start: oneHourAgo,
        end: now
      })

      expect(Array.isArray(metrics)).toBe(true)
      // All metrics should be within the time range
      metrics.forEach(metric => {
        expect(metric.timestamp.getTime()).toBeGreaterThanOrEqual(oneHourAgo.getTime())
        expect(metric.timestamp.getTime()).toBeLessThanOrEqual(now.getTime())
      })
    })
  })

  describe('getCurrentMetrics', () => {
    it('should return the most recent metrics', async () => {
      // Collect some metrics first
      const mockPrisma = await import('@/lib/database')
      vi.mocked(mockPrisma.prisma.$queryRaw).mockResolvedValue([{ connections: '5' }])

      const mockRedis = await import('@/lib/redis')
      vi.mocked(mockRedis.redis.ping).mockResolvedValue('PONG')
      vi.mocked(mockRedis.redis.info).mockResolvedValue('used_memory:1000000\nmaxmemory:10000000')

      await systemMonitoringService.collectMetrics()
      
      const currentMetrics = await systemMonitoringService.getCurrentMetrics()

      expect(currentMetrics).toBeDefined()
      expect(currentMetrics?.timestamp).toBeInstanceOf(Date)
    })

    it('should return null when no metrics collected', async () => {
      // Create a new service instance
      const newService = new (systemMonitoringService.constructor as any)()
      const currentMetrics = await newService.getCurrentMetrics()

      expect(currentMetrics).toBeNull()
    })
  })

  describe('Alert Rules Management', () => {
    it('should add alert rule successfully', async () => {
      const rule: Omit<AlertRule, 'id'> = {
        name: 'Test CPU Alert',
        metric: 'cpu',
        operator: 'gt',
        threshold: 80,
        duration: 300,
        severity: 'warning',
        enabled: true
      }

      const addedRule = await systemMonitoringService.addAlertRule(rule)

      expect(addedRule).toBeDefined()
      expect(addedRule.id).toBeDefined()
      expect(addedRule.name).toBe(rule.name)
      expect(addedRule.metric).toBe(rule.metric)
      expect(addedRule.threshold).toBe(rule.threshold)
    })

    it('should update alert rule successfully', async () => {
      const rule: Omit<AlertRule, 'id'> = {
        name: 'Test Memory Alert',
        metric: 'memory',
        operator: 'gt',
        threshold: 85,
        duration: 300,
        severity: 'warning',
        enabled: true
      }

      const addedRule = await systemMonitoringService.addAlertRule(rule)
      
      const updates = {
        threshold: 90,
        severity: 'critical' as const
      }

      const updatedRule = await systemMonitoringService.updateAlertRule(addedRule.id, updates)

      expect(updatedRule).toBeDefined()
      expect(updatedRule?.threshold).toBe(90)
      expect(updatedRule?.severity).toBe('critical')
    })

    it('should return null when updating non-existent rule', async () => {
      const updatedRule = await systemMonitoringService.updateAlertRule('non-existent-id', {
        threshold: 90
      })

      expect(updatedRule).toBeNull()
    })

    it('should delete alert rule successfully', async () => {
      const rule: Omit<AlertRule, 'id'> = {
        name: 'Test Delete Alert',
        metric: 'disk',
        operator: 'gt',
        threshold: 90,
        duration: 300,
        severity: 'critical',
        enabled: true
      }

      const addedRule = await systemMonitoringService.addAlertRule(rule)
      const deleted = await systemMonitoringService.deleteAlertRule(addedRule.id)

      expect(deleted).toBe(true)

      // Verify rule is deleted
      const rules = await systemMonitoringService.getAlertRules()
      const deletedRule = rules.find(r => r.id === addedRule.id)
      expect(deletedRule).toBeUndefined()
    })

    it('should return false when deleting non-existent rule', async () => {
      const deleted = await systemMonitoringService.deleteAlertRule('non-existent-id')
      expect(deleted).toBe(false)
    })

    it('should get all alert rules', async () => {
      const rules = await systemMonitoringService.getAlertRules()

      expect(Array.isArray(rules)).toBe(true)
      // Should have default rules
      expect(rules.length).toBeGreaterThan(0)
      
      // Check for some default rules
      const cpuRule = rules.find(r => r.name.includes('CPU'))
      const memoryRule = rules.find(r => r.name.includes('記憶體'))
      
      expect(cpuRule).toBeDefined()
      expect(memoryRule).toBeDefined()
    })
  })

  describe('Alert Evaluation', () => {
    it('should trigger alert when threshold exceeded', async () => {
      // Add a test alert rule
      const rule: Omit<AlertRule, 'id'> = {
        name: 'Test High CPU',
        metric: 'cpu',
        operator: 'gt',
        threshold: 50, // Low threshold for testing
        duration: 1, // Short duration for testing
        severity: 'warning',
        enabled: true
      }

      await systemMonitoringService.addAlertRule(rule)

      // Mock high CPU usage
      const mockPrisma = await import('@/lib/database')
      vi.mocked(mockPrisma.prisma.$queryRaw).mockResolvedValue([{ connections: '5' }])

      const mockRedis = await import('@/lib/redis')
      vi.mocked(mockRedis.redis.ping).mockResolvedValue('PONG')
      vi.mocked(mockRedis.redis.info).mockResolvedValue('used_memory:1000000\nmaxmemory:10000000')

      // Mock process.cpuUsage to return high CPU
      const originalCpuUsage = process.cpuUsage
      process.cpuUsage = vi.fn().mockReturnValue({ user: 80000000, system: 20000000 })

      await systemMonitoringService.collectMetrics()

      // Restore original function
      process.cpuUsage = originalCpuUsage

      // Alert should be triggered (checked via logs)
      const mockLogger = await import('@/lib/utils/logger')
      expect(mockLogger.logger.warn).toHaveBeenCalled()
    })

    it('should not trigger disabled alert rules', async () => {
      // Add a disabled alert rule
      const rule: Omit<AlertRule, 'id'> = {
        name: 'Disabled Test Alert',
        metric: 'cpu',
        operator: 'gt',
        threshold: 0, // Very low threshold
        duration: 1,
        severity: 'critical',
        enabled: false // Disabled
      }

      await systemMonitoringService.addAlertRule(rule)

      const mockPrisma = await import('@/lib/database')
      vi.mocked(mockPrisma.prisma.$queryRaw).mockResolvedValue([{ connections: '5' }])

      const mockRedis = await import('@/lib/redis')
      vi.mocked(mockRedis.redis.ping).mockResolvedValue('PONG')
      vi.mocked(mockRedis.redis.info).mockResolvedValue('used_memory:1000000\nmaxmemory:10000000')

      await systemMonitoringService.collectMetrics()

      // Should not trigger alert for disabled rule
      const mockLogger = await import('@/lib/utils/logger')
      const warnCalls = vi.mocked(mockLogger.logger.warn).mock.calls
      const disabledAlertCall = warnCalls.find(call => 
        call[0] === '觸發告警' && call[1]?.rule === 'Disabled Test Alert'
      )
      expect(disabledAlertCall).toBeUndefined()
    })
  })

  describe('Metrics Storage', () => {
    it('should limit stored metrics to 1000 records', async () => {
      const mockPrisma = await import('@/lib/database')
      vi.mocked(mockPrisma.prisma.$queryRaw).mockResolvedValue([{ connections: '5' }])

      const mockRedis = await import('@/lib/redis')
      vi.mocked(mockRedis.redis.ping).mockResolvedValue('PONG')
      vi.mocked(mockRedis.redis.info).mockResolvedValue('used_memory:1000000\nmaxmemory:10000000')

      // Collect many metrics (simulate)
      for (let i = 0; i < 1005; i++) {
        await systemMonitoringService.collectMetrics()
      }

      const allMetrics = await systemMonitoringService.getMetrics()
      expect(allMetrics.length).toBeLessThanOrEqual(1000)
    })
  })
})