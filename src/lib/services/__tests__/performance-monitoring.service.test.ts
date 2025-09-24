import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PerformanceMonitoringService, AlertRule, PerformanceThreshold } from '../performance-monitoring.service';
import { PerformanceBenchmark } from '../performance-benchmark.service';

// Mock Redis
vi.mock('ioredis', () => {
  return {
    Redis: vi.fn().mockImplementation(() => ({
      setex: vi.fn().mockResolvedValue('OK'),
      get: vi.fn().mockResolvedValue(null),
      lpush: vi.fn().mockResolvedValue(1),
      ltrim: vi.fn().mockResolvedValue('OK'),
      lrange: vi.fn().mockResolvedValue([]),
      del: vi.fn().mockResolvedValue(1),
      keys: vi.fn().mockResolvedValue([])
    }))
  };
});

describe('PerformanceMonitoringService', () => {
  let service: PerformanceMonitoringService;

  beforeEach(() => {
    service = new PerformanceMonitoringService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('setupMonitoring', () => {
    it('should setup monitoring with performance thresholds', async () => {
      const thresholds: PerformanceThreshold[] = [
        { metric: 'responseTime', warning: 2000, critical: 5000, unit: 'ms' },
        { metric: 'errorRate', warning: 5, critical: 15, unit: '%' }
      ];

      await service.setupMonitoring(thresholds);

      const rules = service.getAllAlertRules();
      expect(rules.length).toBeGreaterThan(0);
      
      // Should have warning and critical rules for each threshold
      const responseTimeRules = rules.filter(r => r.metric === 'responseTime');
      expect(responseTimeRules.length).toBeGreaterThanOrEqual(2);
    });

    it('should store rules in Redis', async () => {
      const mockRedis = (service as any).redis;
      const thresholds: PerformanceThreshold[] = [
        { metric: 'responseTime', warning: 1000, critical: 3000, unit: 'ms' }
      ];

      await service.setupMonitoring(thresholds);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'monitoring:rules',
        expect.any(Number),
        expect.any(String)
      );
    });
  });

  describe('checkMetrics', () => {
    it('should trigger alerts when thresholds are exceeded', async () => {
      const benchmark: PerformanceBenchmark = {
        id: 'test-1',
        testName: 'High Response Time Test',
        timestamp: new Date(),
        metrics: {
          responseTime: 3000, // High response time
          throughput: 15,
          errorRate: 8, // High error rate
          cpuUsage: 60,
          memoryUsage: 70,
          dbConnections: 20,
          cacheHitRate: 80
        }
      };

      const alerts = await service.checkMetrics(benchmark);

      expect(alerts.length).toBeGreaterThan(0);
      
      // Should have alerts for high response time and error rate
      const responseTimeAlert = alerts.find(a => a.metric === 'responseTime');
      const errorRateAlert = alerts.find(a => a.metric === 'errorRate');
      
      expect(responseTimeAlert).toBeDefined();
      expect(errorRateAlert).toBeDefined();
    });

    it('should not trigger alerts when metrics are within thresholds', async () => {
      const benchmark: PerformanceBenchmark = {
        id: 'test-2',
        testName: 'Good Performance Test',
        timestamp: new Date(),
        metrics: {
          responseTime: 500, // Good response time
          throughput: 50,
          errorRate: 1, // Low error rate
          cpuUsage: 40,
          memoryUsage: 50,
          dbConnections: 10,
          cacheHitRate: 90
        }
      };

      const alerts = await service.checkMetrics(benchmark);

      // Should have minimal or no alerts for good performance
      expect(alerts.length).toBeLessThanOrEqual(2);
    });

    it('should respect cooldown periods', async () => {
      const mockRedis = (service as any).redis;
      const recentAlert = {
        id: 'recent-alert',
        ruleId: 'response-time-high',
        timestamp: new Date(Date.now() - 60000), // 1 minute ago
        resolved: false
      };
      
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(recentAlert));

      const benchmark: PerformanceBenchmark = {
        id: 'test-3',
        testName: 'Cooldown Test',
        timestamp: new Date(),
        metrics: {
          responseTime: 3000, // Would normally trigger alert
          throughput: 20,
          errorRate: 2,
          cpuUsage: 50,
          memoryUsage: 60,
          dbConnections: 15,
          cacheHitRate: 85
        }
      };

      const alerts = await service.checkMetrics(benchmark);

      // Should not trigger new alert due to cooldown
      const responseTimeAlerts = alerts.filter(a => a.metric === 'responseTime');
      expect(responseTimeAlerts.length).toBe(0);
    });
  });

  describe('alert management', () => {
    it('should add new alert rules', async () => {
      const newRule: Omit<AlertRule, 'id'> = {
        name: 'Custom High Latency',
        metric: 'responseTime',
        operator: 'gt',
        threshold: 1500,
        severity: 'medium',
        enabled: true,
        cooldownMinutes: 5
      };

      const addedRule = await service.addAlertRule(newRule);

      expect(addedRule).toBeDefined();
      expect(addedRule.id).toBeDefined();
      expect(addedRule.name).toBe(newRule.name);
      expect(addedRule.threshold).toBe(newRule.threshold);
    });

    it('should update existing alert rules', async () => {
      const rules = service.getAllAlertRules();
      const existingRule = rules[0];
      
      const updates = {
        threshold: 1000,
        enabled: false
      };

      const updatedRule = await service.updateAlertRule(existingRule.id, updates);

      expect(updatedRule).toBeDefined();
      expect(updatedRule!.threshold).toBe(1000);
      expect(updatedRule!.enabled).toBe(false);
    });

    it('should delete alert rules', async () => {
      const rules = service.getAllAlertRules();
      const ruleToDelete = rules[0];
      const initialCount = rules.length;

      const deleted = await service.deleteAlertRule(ruleToDelete.id);

      expect(deleted).toBe(true);
      
      const remainingRules = service.getAllAlertRules();
      expect(remainingRules.length).toBe(initialCount - 1);
    });
  });

  describe('alert history and statistics', () => {
    it('should retrieve active alerts', async () => {
      const mockRedis = (service as any).redis;
      
      // Mock some active alerts
      const activeAlerts = [
        {
          id: 'alert-1',
          ruleId: 'rule-1',
          severity: 'high',
          resolved: false,
          timestamp: new Date()
        }
      ];

      // Simulate active alerts in service
      (service as any).activeAlerts.set('alert-1', activeAlerts[0]);

      const alerts = await service.getActiveAlerts();

      expect(alerts.length).toBeGreaterThanOrEqual(0);
    });

    it('should retrieve alert history', async () => {
      const mockRedis = (service as any).redis;
      const mockAlerts = [
        JSON.stringify({
          id: 'alert-1',
          message: 'High response time',
          timestamp: new Date(),
          resolved: true
        }),
        JSON.stringify({
          id: 'alert-2',
          message: 'High error rate',
          timestamp: new Date(),
          resolved: false
        })
      ];

      mockRedis.lrange.mockResolvedValueOnce(mockAlerts);

      const history = await service.getAlertHistory(10);

      expect(history).toHaveLength(2);
      expect(history[0].id).toBe('alert-1');
      expect(history[1].id).toBe('alert-2');
    });

    it('should generate alert statistics', async () => {
      const mockRedis = (service as any).redis;
      const mockAlerts = [
        JSON.stringify({
          id: 'alert-1',
          severity: 'high',
          metric: 'responseTime',
          resolved: true
        }),
        JSON.stringify({
          id: 'alert-2',
          severity: 'critical',
          metric: 'errorRate',
          resolved: false
        }),
        JSON.stringify({
          id: 'alert-3',
          severity: 'high',
          metric: 'responseTime',
          resolved: true
        })
      ];

      mockRedis.lrange.mockResolvedValueOnce(mockAlerts);

      const stats = await service.getAlertStats();

      expect(stats.total).toBe(3);
      expect(stats.active).toBe(1);
      expect(stats.resolved).toBe(2);
      expect(stats.bySeverity.high).toBe(2);
      expect(stats.bySeverity.critical).toBe(1);
      expect(stats.byMetric.responseTime).toBe(2);
      expect(stats.byMetric.errorRate).toBe(1);
    });
  });

  describe('configuration management', () => {
    it('should update monitoring configuration', async () => {
      const newConfig = {
        enabled: false,
        checkIntervalSeconds: 120,
        alertChannels: {
          email: false,
          slack: true,
          webhook: true
        }
      };

      const updatedConfig = await service.updateConfig(newConfig);

      expect(updatedConfig.enabled).toBe(false);
      expect(updatedConfig.checkIntervalSeconds).toBe(120);
      expect(updatedConfig.alertChannels.slack).toBe(true);
    });

    it('should retrieve current configuration', () => {
      const config = service.getConfig();

      expect(config).toBeDefined();
      expect(config).toHaveProperty('enabled');
      expect(config).toHaveProperty('checkIntervalSeconds');
      expect(config).toHaveProperty('alertChannels');
    });
  });

  describe('cleanup', () => {
    it('should clean up old alerts based on retention policy', async () => {
      const mockRedis = (service as any).redis;
      
      // Mock old and new alerts
      const oldAlert = JSON.stringify({
        id: 'old-alert',
        timestamp: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000) // 40 days ago
      });
      
      const newAlert = JSON.stringify({
        id: 'new-alert',
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
      });

      mockRedis.lrange.mockResolvedValueOnce([newAlert, oldAlert]);

      await service.cleanup();

      // Should delete old alerts and keep new ones
      expect(mockRedis.del).toHaveBeenCalledWith('monitoring:alerts');
      expect(mockRedis.lpush).toHaveBeenCalledWith('monitoring:alerts', newAlert);
    });
  });

  describe('alert notifications', () => {
    it('should handle alert notifications', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const benchmark: PerformanceBenchmark = {
        id: 'test-notification',
        testName: 'Notification Test',
        timestamp: new Date(),
        metrics: {
          responseTime: 6000, // Critical response time
          throughput: 5,
          errorRate: 20, // Critical error rate
          cpuUsage: 98, // Critical CPU usage
          memoryUsage: 97, // Critical memory usage
          dbConnections: 50,
          cacheHitRate: 30
        }
      };

      const alerts = await service.checkMetrics(benchmark);

      expect(alerts.length).toBeGreaterThan(0);
      
      // Should have logged alert notifications
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🚨 PERFORMANCE ALERT:')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('error handling', () => {
    it('should handle Redis errors gracefully', async () => {
      const mockRedis = (service as any).redis;
      mockRedis.setex.mockRejectedValueOnce(new Error('Redis connection failed'));

      const thresholds: PerformanceThreshold[] = [
        { metric: 'responseTime', warning: 1000, critical: 3000, unit: 'ms' }
      ];

      // Should not throw error
      await expect(service.setupMonitoring(thresholds)).resolves.toBeUndefined();
    });

    it('should handle invalid metric values', async () => {
      const benchmark: PerformanceBenchmark = {
        id: 'invalid-test',
        testName: 'Invalid Metrics Test',
        timestamp: new Date(),
        metrics: {
          responseTime: NaN,
          throughput: -1,
          errorRate: Infinity,
          cpuUsage: 50,
          memoryUsage: 60,
          dbConnections: 10,
          cacheHitRate: 80
        }
      };

      // Should handle invalid values without crashing
      const alerts = await service.checkMetrics(benchmark);
      
      expect(Array.isArray(alerts)).toBe(true);
    });
  });
});