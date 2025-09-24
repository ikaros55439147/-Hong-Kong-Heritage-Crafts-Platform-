import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PerformanceOptimizerService, OptimizationRecommendation } from '../performance-optimizer.service';
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
      del: vi.fn().mockResolvedValue(1)
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
    $executeRawUnsafe: vi.fn().mockResolvedValue(undefined)
  }))
}));

describe('PerformanceOptimizerService', () => {
  let service: PerformanceOptimizerService;

  beforeEach(() => {
    service = new PerformanceOptimizerService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('optimizeCriticalPaths', () => {
    it('should analyze critical paths from benchmarks', async () => {
      const benchmarks: PerformanceBenchmark[] = [
        {
          id: 'bench-1',
          testName: 'API Test',
          timestamp: new Date(),
          endpoint: '/api/courses',
          metrics: {
            responseTime: 2500,
            throughput: 20,
            errorRate: 3,
            cpuUsage: 70,
            memoryUsage: 60,
            dbConnections: 25,
            cacheHitRate: 75
          }
        },
        {
          id: 'bench-2',
          testName: 'Product Test',
          timestamp: new Date(),
          endpoint: '/api/products',
          metrics: {
            responseTime: 1800,
            throughput: 35,
            errorRate: 1,
            cpuUsage: 50,
            memoryUsage: 45,
            dbConnections: 15,
            cacheHitRate: 85
          }
        }
      ];

      const analyses = await service.optimizeCriticalPaths(benchmarks);

      expect(analyses).toBeDefined();
      expect(Array.isArray(analyses)).toBe(true);
      expect(analyses.length).toBe(2);

      // Should be sorted by response time (worst first)
      expect(analyses[0].averageResponseTime).toBeGreaterThanOrEqual(analyses[1].averageResponseTime);

      // Each analysis should have bottlenecks and recommendations
      analyses.forEach(analysis => {
        expect(analysis).toHaveProperty('endpoint');
        expect(analysis).toHaveProperty('averageResponseTime');
        expect(analysis).toHaveProperty('bottlenecks');
        expect(analysis).toHaveProperty('recommendations');
        expect(Array.isArray(analysis.bottlenecks)).toBe(true);
        expect(Array.isArray(analysis.recommendations)).toBe(true);
      });
    });

    it('should identify bottlenecks correctly', async () => {
      const benchmarks: PerformanceBenchmark[] = [
        {
          id: 'bench-upload',
          testName: 'Upload Test',
          timestamp: new Date(),
          endpoint: '/api/upload',
          metrics: {
            responseTime: 5000, // High response time for upload
            throughput: 5,
            errorRate: 2,
            cpuUsage: 80,
            memoryUsage: 70,
            dbConnections: 10,
            cacheHitRate: 60
          }
        }
      ];

      const analyses = await service.optimizeCriticalPaths(benchmarks);
      const uploadAnalysis = analyses[0];

      expect(uploadAnalysis.endpoint).toBe('/api/upload');
      expect(uploadAnalysis.bottlenecks.length).toBeGreaterThan(0);

      // Upload endpoint should identify File I/O as major bottleneck
      const fileIOBottleneck = uploadAnalysis.bottlenecks.find(b => b.component === 'File I/O');
      expect(fileIOBottleneck).toBeDefined();
      expect(fileIOBottleneck!.percentage).toBeGreaterThan(50);
    });
  });

  describe('getOptimizationRecommendations', () => {
    it('should generate recommendations based on performance metrics', async () => {
      const benchmark: PerformanceBenchmark = {
        id: 'slow-bench',
        testName: 'Slow Performance',
        timestamp: new Date(),
        metrics: {
          responseTime: 3000, // High response time
          throughput: 15, // Low throughput
          errorRate: 2,
          cpuUsage: 85, // High CPU
          memoryUsage: 90, // High memory
          dbConnections: 60, // High DB connections
          cacheHitRate: 60 // Low cache hit rate
        }
      };

      const recommendations = await service.getOptimizationRecommendations(benchmark);

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);

      // Should recommend database optimization for high response time
      const dbOptimization = recommendations.find(r => r.id === 'db-query-optimization');
      expect(dbOptimization).toBeDefined();

      // Should recommend caching for low cache hit rate
      const cacheOptimization = recommendations.find(r => r.id === 'redis-caching');
      expect(cacheOptimization).toBeDefined();

      // Should recommend memory optimization for high memory usage
      const memoryOptimization = recommendations.find(r => r.id === 'memory-optimization');
      expect(memoryOptimization).toBeDefined();

      // Should be sorted by priority
      const priorities = recommendations.map(r => r.priority);
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      for (let i = 1; i < priorities.length; i++) {
        expect(priorityOrder[priorities[i-1]]).toBeGreaterThanOrEqual(priorityOrder[priorities[i]]);
      }
    });

    it('should not recommend optimizations for good performance', async () => {
      const benchmark: PerformanceBenchmark = {
        id: 'good-bench',
        testName: 'Good Performance',
        timestamp: new Date(),
        metrics: {
          responseTime: 500, // Good response time
          throughput: 100, // Good throughput
          errorRate: 0.5,
          cpuUsage: 40, // Low CPU
          memoryUsage: 50, // Normal memory
          dbConnections: 20, // Normal DB connections
          cacheHitRate: 90 // High cache hit rate
        }
      };

      const recommendations = await service.getOptimizationRecommendations(benchmark);

      expect(recommendations.length).toBeLessThanOrEqual(2); // Minimal recommendations
    });
  });

  describe('implementOptimization', () => {
    it('should implement database query optimization', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const beforeMetrics = {
        responseTime: 2000,
        throughput: 25,
        errorRate: 3
      };

      const result = await service.implementOptimization('db-query-optimization', beforeMetrics);

      expect(result).toBeDefined();
      expect(result.recommendationId).toBe('db-query-optimization');
      expect(result.implemented).toBe(true);
      expect(result.beforeMetrics).toEqual(beforeMetrics);
      expect(result.implementedAt).toBeDefined();

      // Should have logged optimization steps
      expect(consoleSpy).toHaveBeenCalledWith('Optimizing database queries...');
      expect(consoleSpy).toHaveBeenCalledWith('✅ Implemented optimization: Database Query Optimization');

      consoleSpy.mockRestore();
    });

    it('should implement Redis caching optimization', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const beforeMetrics = {
        cacheHitRate: 60,
        responseTime: 1500
      };

      const result = await service.implementOptimization('redis-caching', beforeMetrics);

      expect(result.implemented).toBe(true);
      expect(result.recommendationId).toBe('redis-caching');

      // Should have logged cache warming
      expect(consoleSpy).toHaveBeenCalledWith('Enhancing Redis caching...');
      expect(consoleSpy).toHaveBeenCalledWith('✅ Cache warming completed');

      consoleSpy.mockRestore();
    });

    it('should handle unknown optimization gracefully', async () => {
      const beforeMetrics = { responseTime: 1000 };

      const result = await service.implementOptimization('unknown-optimization', beforeMetrics);

      expect(result.implemented).toBe(true); // Still marks as implemented
      expect(result.recommendationId).toBe('unknown-optimization');
    });

    it('should handle implementation errors', async () => {
      const mockPrisma = (service as any).prisma;
      mockPrisma.$executeRawUnsafe.mockRejectedValueOnce(new Error('Database error'));

      const beforeMetrics = { responseTime: 2000 };

      const result = await service.implementOptimization('db-query-optimization', beforeMetrics);

      expect(result.implemented).toBe(false);
      expect(result.notes).toContain('Database error');
    });
  });

  describe('measureOptimizationImpact', () => {
    it('should measure optimization impact correctly', async () => {
      const beforeMetrics = {
        responseTime: 2000,
        throughput: 20,
        errorRate: 5
      };

      const result = await service.implementOptimization('api-response-compression', beforeMetrics);
      
      const afterMetrics = {
        responseTime: 1500, // 25% improvement
        throughput: 30, // 50% improvement
        errorRate: 2 // 60% improvement
      };

      const impactResult = await service.measureOptimizationImpact(result.id, afterMetrics);

      expect(impactResult.afterMetrics).toEqual(afterMetrics);
      expect(impactResult.actualImprovement).toBeDefined();
      expect(impactResult.actualImprovement).toBeGreaterThan(0); // Should show improvement
    });

    it('should handle negative impact (performance degradation)', async () => {
      const beforeMetrics = {
        responseTime: 1000,
        throughput: 50
      };

      const result = await service.implementOptimization('memory-optimization', beforeMetrics);
      
      const afterMetrics = {
        responseTime: 1200, // Worse performance
        throughput: 45
      };

      const impactResult = await service.measureOptimizationImpact(result.id, afterMetrics);

      expect(impactResult.actualImprovement).toBeLessThan(0); // Negative improvement
    });
  });

  describe('getAllRecommendations', () => {
    it('should return all available optimization recommendations', () => {
      const recommendations = service.getAllRecommendations();

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);

      // Should include key optimization categories
      const categories = recommendations.map(r => r.category);
      expect(categories).toContain('database');
      expect(categories).toContain('cache');
      expect(categories).toContain('api');
      expect(categories).toContain('frontend');

      // Each recommendation should have required properties
      recommendations.forEach(rec => {
        expect(rec).toHaveProperty('id');
        expect(rec).toHaveProperty('category');
        expect(rec).toHaveProperty('priority');
        expect(rec).toHaveProperty('title');
        expect(rec).toHaveProperty('description');
        expect(rec).toHaveProperty('implementation');
        expect(Array.isArray(rec.implementation)).toBe(true);
      });
    });
  });

  describe('generateOptimizationReport', () => {
    it('should generate comprehensive optimization report', async () => {
      const mockRedis = (service as any).redis;
      
      // Mock some optimization results
      const mockResults = [
        JSON.stringify({
          id: 'result-1',
          recommendationId: 'db-query-optimization',
          implemented: true,
          actualImprovement: 30
        }),
        JSON.stringify({
          id: 'result-2',
          recommendationId: 'redis-caching',
          implemented: true,
          actualImprovement: 25
        })
      ];

      mockRedis.lrange.mockResolvedValueOnce(mockResults);

      const report = await service.generateOptimizationReport();

      expect(report).toBeDefined();
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('results');

      expect(report.summary.totalRecommendations).toBeGreaterThan(0);
      expect(report.summary.implementedOptimizations).toBe(2);
      expect(report.summary.averageImprovement).toBe(27.5); // (30 + 25) / 2
      expect(Array.isArray(report.summary.topBottlenecks)).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle Redis errors gracefully', async () => {
      const mockRedis = (service as any).redis;
      mockRedis.lpush.mockRejectedValueOnce(new Error('Redis connection failed'));

      const beforeMetrics = { responseTime: 1000 };

      // Should not throw error
      await expect(
        service.implementOptimization('api-response-compression', beforeMetrics)
      ).resolves.toBeDefined();
    });

    it('should handle missing optimization result', async () => {
      const afterMetrics = { responseTime: 800 };

      await expect(
        service.measureOptimizationImpact('nonexistent-result', afterMetrics)
      ).rejects.toThrow('Optimization result nonexistent-result not found');
    });
  });

  describe('optimization categories', () => {
    it('should have recommendations for all major categories', () => {
      const recommendations = service.getAllRecommendations();
      const categories = [...new Set(recommendations.map(r => r.category))];

      expect(categories).toContain('database');
      expect(categories).toContain('cache');
      expect(categories).toContain('api');
      expect(categories).toContain('frontend');
      expect(categories).toContain('infrastructure');
    });

    it('should prioritize high-impact optimizations', () => {
      const recommendations = service.getAllRecommendations();
      const highPriorityRecs = recommendations.filter(r => r.priority === 'high');

      expect(highPriorityRecs.length).toBeGreaterThan(0);
      
      // High priority recommendations should have significant estimated improvement
      highPriorityRecs.forEach(rec => {
        expect(rec.estimatedImprovement).toBeGreaterThan(20);
      });
    });
  });
});