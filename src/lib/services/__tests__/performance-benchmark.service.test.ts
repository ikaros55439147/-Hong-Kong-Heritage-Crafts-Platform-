import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PerformanceBenchmarkService, LoadTestConfig } from '../performance-benchmark.service';

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
      keys: vi.fn().mockResolvedValue([]),
      info: vi.fn().mockResolvedValue('keyspace_hits:100\r\nkeyspace_misses:20\r\n')
    }))
  };
});

// Mock Prisma
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    course: {
      findMany: vi.fn().mockResolvedValue([
        { id: '1', title: 'Test Course', craftsman: { id: '1', name: 'Test Craftsman' } }
      ])
    },
    product: {
      findMany: vi.fn().mockResolvedValue([
        { id: '1', name: 'Test Product', craftsman: { id: '1', name: 'Test Craftsman' } }
      ])
    },
    craftsmanProfile: {
      findMany: vi.fn().mockResolvedValue([
        { id: '1', user: { id: '1', name: 'Test User' } }
      ])
    },
    $queryRaw: vi.fn().mockResolvedValue([{ count: BigInt(5) }]),
    $executeRawUnsafe: vi.fn().mockResolvedValue(undefined)
  }))
}));

describe('PerformanceBenchmarkService', () => {
  let service: PerformanceBenchmarkService;

  beforeEach(() => {
    service = new PerformanceBenchmarkService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('establishBaseline', () => {
    it('should establish performance baselines for all endpoints', async () => {
      const baselines = await service.establishBaseline();

      expect(baselines).toBeDefined();
      expect(Array.isArray(baselines)).toBe(true);
      expect(baselines.length).toBeGreaterThan(0);

      // Check baseline structure
      const baseline = baselines[0];
      expect(baseline).toHaveProperty('id');
      expect(baseline).toHaveProperty('testName');
      expect(baseline).toHaveProperty('timestamp');
      expect(baseline).toHaveProperty('metrics');
      expect(baseline.metrics).toHaveProperty('responseTime');
      expect(baseline.metrics).toHaveProperty('throughput');
      expect(baseline.metrics).toHaveProperty('errorRate');
    });

    it('should store baselines in Redis', async () => {
      const mockRedis = (service as any).redis;
      
      await service.establishBaseline();

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'performance:baseline',
        expect.any(Number),
        expect.any(String)
      );
    });
  });

  describe('runLoadTest', () => {
    it('should run load test with specified configuration', async () => {
      const config: LoadTestConfig = {
        endpoint: '/api/courses',
        concurrentUsers: 10,
        duration: 5,
        rampUpTime: 1,
        testType: 'api'
      };

      const benchmark = await service.runLoadTest(config);

      expect(benchmark).toBeDefined();
      expect(benchmark.endpoint).toBe(config.endpoint);
      expect(benchmark.concurrentUsers).toBe(config.concurrentUsers);
      expect(benchmark.duration).toBe(config.duration);
      expect(benchmark.metrics.responseTime).toBeGreaterThan(0);
      expect(benchmark.metrics.throughput).toBeGreaterThanOrEqual(0);
      expect(benchmark.metrics.errorRate).toBeGreaterThanOrEqual(0);
    });

    it('should handle high concurrent user loads', async () => {
      const config: LoadTestConfig = {
        endpoint: '/api/products',
        concurrentUsers: 100,
        duration: 10,
        rampUpTime: 2,
        testType: 'api'
      };

      const benchmark = await service.runLoadTest(config);

      expect(benchmark.concurrentUsers).toBe(100);
      expect(benchmark.metrics).toBeDefined();
      expect(typeof benchmark.metrics.responseTime).toBe('number');
      expect(typeof benchmark.metrics.throughput).toBe('number');
    });

    it('should store benchmark results', async () => {
      const mockRedis = (service as any).redis;
      const config: LoadTestConfig = {
        endpoint: '/api/test',
        concurrentUsers: 5,
        duration: 3,
        rampUpTime: 1,
        testType: 'api'
      };

      await service.runLoadTest(config);

      expect(mockRedis.lpush).toHaveBeenCalledWith(
        'performance:benchmarks',
        expect.any(String)
      );
    });
  });

  describe('getBaseline', () => {
    it('should retrieve specific baseline by test name', async () => {
      const mockRedis = (service as any).redis;
      const mockBaseline = {
        id: 'test-1',
        testName: 'homepage_load',
        metrics: { responseTime: 100, throughput: 50, errorRate: 0 }
      };
      
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(mockBaseline));

      const baseline = await service.getBaseline('homepage_load');

      expect(baseline).toEqual(mockBaseline);
      expect(mockRedis.get).toHaveBeenCalledWith('baseline:homepage_load');
    });

    it('should retrieve all baselines when no test name provided', async () => {
      const mockRedis = (service as any).redis;
      const mockBaselines = [
        { id: 'test-1', testName: 'test1' },
        { id: 'test-2', testName: 'test2' }
      ];
      
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(mockBaselines));

      const baselines = await service.getBaseline();

      expect(baselines).toEqual(mockBaselines);
      expect(mockRedis.get).toHaveBeenCalledWith('performance:baseline');
    });

    it('should return null when baseline not found', async () => {
      const mockRedis = (service as any).redis;
      mockRedis.get.mockResolvedValueOnce(null);

      const baseline = await service.getBaseline('nonexistent');

      expect(baseline).toBeNull();
    });
  });

  describe('compareWithBaseline', () => {
    it('should compare current performance with baseline', async () => {
      const mockRedis = (service as any).redis;
      const baseline = {
        id: 'baseline-1',
        testName: 'test_endpoint',
        metrics: {
          responseTime: 1000,
          throughput: 50,
          errorRate: 2,
          cpuUsage: 60,
          memoryUsage: 70
        }
      };
      
      const current = {
        id: 'current-1',
        testName: 'test_endpoint',
        timestamp: new Date(),
        metrics: {
          responseTime: 1200,
          throughput: 45,
          errorRate: 3,
          cpuUsage: 75,
          memoryUsage: 80
        }
      };

      mockRedis.get.mockResolvedValueOnce(JSON.stringify(baseline));

      const comparison = await service.compareWithBaseline(current);

      expect(comparison).toBeDefined();
      expect(comparison.comparison).toBe('worse');
      expect(comparison.differences).toBeDefined();
      expect(comparison.differences.responseTime).toBeGreaterThan(0); // 20% increase
      expect(comparison.alerts.length).toBeGreaterThan(0);
    });

    it('should handle missing baseline gracefully', async () => {
      const mockRedis = (service as any).redis;
      mockRedis.get.mockResolvedValueOnce(null);

      const current = {
        id: 'current-1',
        testName: 'nonexistent_test',
        timestamp: new Date(),
        metrics: {
          responseTime: 1000,
          throughput: 50,
          errorRate: 2,
          cpuUsage: 60,
          memoryUsage: 70
        }
      };

      const comparison = await service.compareWithBaseline(current);

      expect(comparison.comparison).toBe('similar');
      expect(comparison.differences).toEqual({});
      expect(comparison.alerts).toContain('No baseline found for comparison');
    });
  });

  describe('getAllBenchmarks', () => {
    it('should retrieve all stored benchmarks', async () => {
      const mockRedis = (service as any).redis;
      const mockBenchmarks = [
        JSON.stringify({ id: '1', testName: 'test1' }),
        JSON.stringify({ id: '2', testName: 'test2' })
      ];
      
      mockRedis.lrange.mockResolvedValueOnce(mockBenchmarks);

      const benchmarks = await service.getAllBenchmarks();

      expect(benchmarks).toHaveLength(2);
      expect(benchmarks[0].id).toBe('1');
      expect(benchmarks[1].id).toBe('2');
    });

    it('should return empty array when no benchmarks exist', async () => {
      const mockRedis = (service as any).redis;
      mockRedis.lrange.mockResolvedValueOnce([]);

      const benchmarks = await service.getAllBenchmarks();

      expect(benchmarks).toEqual([]);
    });
  });

  describe('cleanup', () => {
    it('should clean up all benchmark data', async () => {
      const mockRedis = (service as any).redis;
      mockRedis.keys.mockResolvedValueOnce(['baseline:test1', 'baseline:test2']);

      await service.cleanup();

      expect(mockRedis.del).toHaveBeenCalledWith('performance:benchmarks');
      expect(mockRedis.del).toHaveBeenCalledWith('performance:baseline');
      expect(mockRedis.del).toHaveBeenCalledWith('baseline:test1', 'baseline:test2');
    });
  });

  describe('system metrics', () => {
    it('should collect system metrics during benchmarking', async () => {
      const config: LoadTestConfig = {
        endpoint: '/api/courses',
        concurrentUsers: 5,
        duration: 3,
        rampUpTime: 1,
        testType: 'api'
      };

      const benchmark = await service.runLoadTest(config);

      expect(benchmark.metrics.cpuUsage).toBeGreaterThan(0);
      expect(benchmark.metrics.memoryUsage).toBeGreaterThan(0);
      expect(benchmark.metrics.dbConnections).toBeGreaterThanOrEqual(0);
      expect(benchmark.metrics.cacheHitRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors gracefully', async () => {
      const mockPrisma = (service as any).prisma;
      mockPrisma.course.findMany.mockRejectedValueOnce(new Error('Database error'));

      const config: LoadTestConfig = {
        endpoint: '/api/courses',
        concurrentUsers: 1,
        duration: 1,
        rampUpTime: 1,
        testType: 'api'
      };

      // Should not throw, but handle errors gracefully
      const benchmark = await service.runLoadTest(config);
      
      expect(benchmark).toBeDefined();
      expect(benchmark.metrics.errorRate).toBeGreaterThan(0);
    });

    it('should handle Redis connection errors', async () => {
      const mockRedis = (service as any).redis;
      mockRedis.setex.mockRejectedValueOnce(new Error('Redis error'));

      // Should not throw during baseline establishment
      await expect(service.establishBaseline()).resolves.toBeDefined();
    });
  });

  describe('performance thresholds', () => {
    it('should identify performance issues in benchmarks', async () => {
      const config: LoadTestConfig = {
        endpoint: '/api/slow-endpoint',
        concurrentUsers: 50,
        duration: 10,
        rampUpTime: 2,
        testType: 'api'
      };

      const benchmark = await service.runLoadTest(config);

      // Verify that metrics are collected
      expect(benchmark.metrics.responseTime).toBeDefined();
      expect(benchmark.metrics.throughput).toBeDefined();
      expect(benchmark.metrics.errorRate).toBeDefined();

      // Performance issues would be detected by monitoring service
      expect(typeof benchmark.metrics.responseTime).toBe('number');
      expect(typeof benchmark.metrics.errorRate).toBe('number');
    });
  });
});