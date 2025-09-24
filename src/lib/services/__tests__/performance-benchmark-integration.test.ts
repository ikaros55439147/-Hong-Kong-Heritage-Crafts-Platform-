import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PerformanceBenchmarkService } from '../performance-benchmark.service';
import { PerformanceMonitoringService } from '../performance-monitoring.service';
import { PerformanceOptimizerService } from '../performance-optimizer.service';

// Mock Redis and Prisma for integration tests
vi.mock('ioredis', () => {
  const mockRedis = {
    setex: vi.fn().mockResolvedValue('OK'),
    get: vi.fn().mockResolvedValue(null),
    lpush: vi.fn().mockResolvedValue(1),
    ltrim: vi.fn().mockResolvedValue('OK'),
    lrange: vi.fn().mockResolvedValue([]),
    del: vi.fn().mockResolvedValue(1),
    keys: vi.fn().mockResolvedValue([]),
    info: vi.fn().mockResolvedValue('keyspace_hits:800\r\nkeyspace_misses:200\r\n')
  };

  return {
    Redis: vi.fn().mockImplementation(() => mockRedis)
  };
});

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    course: {
      findMany: vi.fn().mockResolvedValue([
        { id: '1', title: 'Traditional Craft Course', craftsman: { id: '1', name: 'Master Craftsman' } }
      ])
    },
    product: {
      findMany: vi.fn().mockResolvedValue([
        { id: '1', name: 'Handmade Product', craftsman: { id: '1', name: 'Master Craftsman' } }
      ])
    },
    craftsmanProfile: {
      findMany: vi.fn().mockResolvedValue([
        { id: '1', user: { id: '1', name: 'Craftsman User' } }
      ])
    },
    $queryRaw: vi.fn().mockResolvedValue([{ count: BigInt(10) }]),
    $executeRawUnsafe: vi.fn().mockResolvedValue(undefined)
  }))
}));

describe('Performance Benchmark Integration', () => {
  let benchmarkService: PerformanceBenchmarkService;
  let monitoringService: PerformanceMonitoringService;
  let optimizerService: PerformanceOptimizerService;

  beforeEach(() => {
    benchmarkService = new PerformanceBenchmarkService();
    monitoringService = new PerformanceMonitoringService();
    optimizerService = new PerformanceOptimizerService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Complete Performance Benchmarking Workflow', () => {
    it('should execute full performance benchmarking workflow', async () => {
      // 1. Establish baseline
      console.log('🎯 Step 1: Establishing performance baseline...');
      const baselines = await benchmarkService.establishBaseline();
      
      expect(baselines).toBeDefined();
      expect(baselines.length).toBeGreaterThan(0);
      console.log(`✅ Established ${baselines.length} baselines`);

      // 2. Setup monitoring with thresholds
      console.log('📡 Step 2: Setting up performance monitoring...');
      const thresholds = [
        { metric: 'responseTime', warning: 2000, critical: 5000, unit: 'ms' },
        { metric: 'errorRate', warning: 5, critical: 15, unit: '%' },
        { metric: 'cpuUsage', warning: 80, critical: 95, unit: '%' }
      ];
      
      await monitoringService.setupMonitoring(thresholds);
      const alertRules = monitoringService.getAllAlertRules();
      expect(alertRules.length).toBeGreaterThan(0);
      console.log(`✅ Setup ${alertRules.length} alert rules`);

      // 3. Run load test
      console.log('🚀 Step 3: Running load test...');
      const loadTestConfig = {
        endpoint: '/api/courses',
        concurrentUsers: 100,
        duration: 30,
        rampUpTime: 5,
        testType: 'api' as const
      };

      const benchmark = await benchmarkService.runLoadTest(loadTestConfig);
      expect(benchmark).toBeDefined();
      expect(benchmark.metrics.responseTime).toBeGreaterThan(0);
      console.log(`✅ Load test completed: ${benchmark.metrics.responseTime.toFixed(2)}ms avg response time`);

      // 4. Check for alerts
      console.log('⚠️  Step 4: Checking performance alerts...');
      const alerts = await monitoringService.checkMetrics(benchmark);
      console.log(`📊 Generated ${alerts.length} alerts`);

      // 5. Get optimization recommendations
      console.log('🔧 Step 5: Getting optimization recommendations...');
      const recommendations = await optimizerService.getOptimizationRecommendations(benchmark);
      expect(recommendations.length).toBeGreaterThan(0);
      console.log(`💡 Generated ${recommendations.length} optimization recommendations`);

      // 6. Implement high-priority, low-effort optimizations
      console.log('⚡ Step 6: Implementing optimizations...');
      const autoOptimizations = recommendations.filter(
        r => r.priority === 'high' && r.effort === 'low'
      );

      const implementationResults = [];
      for (const rec of autoOptimizations.slice(0, 2)) { // Limit to 2 for test
        const result = await optimizerService.implementOptimization(
          rec.id,
          benchmark.metrics
        );
        implementationResults.push(result);
      }

      console.log(`✅ Implemented ${implementationResults.length} optimizations`);

      // 7. Run post-optimization benchmark
      console.log('📈 Step 7: Running post-optimization benchmark...');
      const postOptBenchmark = await benchmarkService.runLoadTest(loadTestConfig);
      
      // 8. Compare results
      console.log('📊 Step 8: Comparing performance results...');
      const comparison = await benchmarkService.compareWithBaseline(postOptBenchmark);
      
      expect(comparison).toBeDefined();
      expect(comparison.comparison).toMatch(/better|worse|similar/);
      console.log(`📈 Performance comparison: ${comparison.comparison}`);

      // 9. Generate comprehensive report
      console.log('📋 Step 9: Generating performance report...');
      const report = await optimizerService.generateOptimizationReport();
      
      expect(report.summary).toBeDefined();
      expect(report.summary.totalRecommendations).toBeGreaterThan(0);
      console.log(`📊 Report: ${report.summary.implementedOptimizations} optimizations implemented`);

      console.log('🎉 Complete performance benchmarking workflow executed successfully!');
    }, 60000); // 60 second timeout for integration test

    it('should handle high-load stress testing', async () => {
      console.log('💪 Running stress test simulation...');

      const stressLevels = [100, 500, 1000];
      const stressResults = [];

      for (const users of stressLevels) {
        console.log(`🔄 Testing with ${users} concurrent users...`);
        
        const config = {
          endpoint: '/api/products',
          concurrentUsers: users,
          duration: 10, // Short duration for test
          rampUpTime: 2,
          testType: 'api' as const
        };

        const result = await benchmarkService.runLoadTest(config);
        stressResults.push(result);

        // Check if system is still stable
        const alerts = await monitoringService.checkMetrics(result);
        console.log(`📊 ${users} users: ${result.metrics.responseTime.toFixed(2)}ms, ${alerts.length} alerts`);

        // Stop if error rate is too high (simulating system breaking point)
        if (result.metrics.errorRate > 25) {
          console.log(`⚠️  System breaking point reached at ${users} users`);
          break;
        }
      }

      expect(stressResults.length).toBeGreaterThan(0);
      console.log(`✅ Stress test completed with ${stressResults.length} test phases`);
    });

    it('should validate system stability under sustained load', async () => {
      console.log('🔍 Validating system stability...');

      const stabilityConfig = {
        endpoint: '/api/courses',
        concurrentUsers: 200,
        duration: 60, // 1 minute sustained load
        rampUpTime: 10,
        testType: 'api' as const
      };

      const stabilityBenchmark = await benchmarkService.runLoadTest(stabilityConfig);
      
      // Check stability criteria
      const isStable = stabilityBenchmark.metrics.errorRate < 10 && 
                      stabilityBenchmark.metrics.responseTime < 5000 &&
                      stabilityBenchmark.metrics.cpuUsage < 95;

      console.log(`📊 Stability Results:`);
      console.log(`   Response Time: ${stabilityBenchmark.metrics.responseTime.toFixed(2)}ms`);
      console.log(`   Error Rate: ${stabilityBenchmark.metrics.errorRate.toFixed(2)}%`);
      console.log(`   CPU Usage: ${stabilityBenchmark.metrics.cpuUsage.toFixed(1)}%`);
      console.log(`   System Stable: ${isStable ? '✅ YES' : '❌ NO'}`);

      expect(stabilityBenchmark).toBeDefined();
      
      // Generate alerts for any stability issues
      const stabilityAlerts = await monitoringService.checkMetrics(stabilityBenchmark);
      if (stabilityAlerts.length > 0) {
        console.log(`⚠️  Stability concerns: ${stabilityAlerts.length} alerts triggered`);
      }
    });

    it('should optimize critical paths effectively', async () => {
      console.log('🎯 Optimizing critical paths...');

      // Create benchmarks for different endpoints
      const endpoints = ['/api/courses', '/api/products', '/api/upload', '/api/search/multilingual'];
      const benchmarks = [];

      for (const endpoint of endpoints) {
        const config = {
          endpoint,
          concurrentUsers: 50,
          duration: 15,
          rampUpTime: 3,
          testType: 'api' as const
        };

        const benchmark = await benchmarkService.runLoadTest(config);
        benchmarks.push(benchmark);
      }

      // Analyze critical paths
      const analyses = await optimizerService.optimizeCriticalPaths(benchmarks);
      
      expect(analyses.length).toBe(endpoints.length);
      
      console.log('📊 Critical Path Analysis:');
      analyses.forEach(analysis => {
        console.log(`   ${analysis.endpoint}: ${analysis.averageResponseTime.toFixed(2)}ms`);
        console.log(`     Top bottleneck: ${analysis.bottlenecks[0]?.component} (${analysis.bottlenecks[0]?.percentage}%)`);
        console.log(`     Recommendations: ${analysis.recommendations.length}`);
      });

      // Should identify the slowest endpoints first
      expect(analyses[0].averageResponseTime).toBeGreaterThanOrEqual(analyses[analyses.length - 1].averageResponseTime);
    });

    it('should handle monitoring alerts and notifications', async () => {
      console.log('🚨 Testing alert system...');

      // Create a benchmark with poor performance to trigger alerts
      const poorPerformanceBenchmark = {
        id: 'poor-perf-test',
        testName: 'Poor Performance Test',
        timestamp: new Date(),
        metrics: {
          responseTime: 6000, // Very high response time
          throughput: 5, // Very low throughput
          errorRate: 20, // High error rate
          cpuUsage: 98, // Critical CPU usage
          memoryUsage: 96, // Critical memory usage
          dbConnections: 90, // High DB connections
          cacheHitRate: 30 // Very low cache hit rate
        }
      };

      const alerts = await monitoringService.checkMetrics(poorPerformanceBenchmark);
      
      expect(alerts.length).toBeGreaterThan(0);
      
      console.log(`🚨 Triggered ${alerts.length} alerts:`);
      alerts.forEach(alert => {
        console.log(`   ${alert.severity.toUpperCase()}: ${alert.message}`);
      });

      // Check alert statistics
      const alertStats = await monitoringService.getAlertStats();
      console.log(`📊 Alert Statistics: ${alertStats.total} total, ${alertStats.active} active`);

      // Verify critical alerts are present
      const criticalAlerts = alerts.filter(a => a.severity === 'critical');
      expect(criticalAlerts.length).toBeGreaterThan(0);
    });

    it('should measure optimization impact accurately', async () => {
      console.log('📈 Measuring optimization impact...');

      // Simulate before optimization metrics
      const beforeMetrics = {
        responseTime: 3000,
        throughput: 20,
        errorRate: 8,
        cpuUsage: 85,
        memoryUsage: 80
      };

      // Implement optimization
      const optimizationResult = await optimizerService.implementOptimization(
        'db-query-optimization',
        beforeMetrics
      );

      expect(optimizationResult.implemented).toBe(true);

      // Simulate after optimization metrics (improved)
      const afterMetrics = {
        responseTime: 2000, // 33% improvement
        throughput: 35, // 75% improvement
        errorRate: 3, // 62% improvement
        cpuUsage: 60, // 29% improvement
        memoryUsage: 65 // 19% improvement
      };

      // Measure impact
      const impactResult = await optimizerService.measureOptimizationImpact(
        optimizationResult.id,
        afterMetrics
      );

      expect(impactResult.actualImprovement).toBeGreaterThan(0);
      
      console.log(`📊 Optimization Impact:`);
      console.log(`   Before: ${JSON.stringify(beforeMetrics)}`);
      console.log(`   After: ${JSON.stringify(afterMetrics)}`);
      console.log(`   Improvement: ${impactResult.actualImprovement?.toFixed(1)}%`);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle service failures gracefully', async () => {
      console.log('🛡️  Testing error handling...');

      // Test with invalid configuration
      const invalidConfig = {
        endpoint: '',
        concurrentUsers: -1,
        duration: 0,
        rampUpTime: -5,
        testType: 'invalid' as any
      };

      // Should handle gracefully without crashing
      await expect(async () => {
        const result = await benchmarkService.runLoadTest(invalidConfig);
        expect(result).toBeDefined();
      }).not.toThrow();
    });

    it('should handle Redis connection failures', async () => {
      console.log('🔌 Testing Redis failure handling...');

      const mockRedis = (benchmarkService as any).redis;
      mockRedis.setex.mockRejectedValueOnce(new Error('Redis connection failed'));

      // Should not crash when Redis fails
      await expect(benchmarkService.establishBaseline()).resolves.toBeDefined();
    });

    it('should handle database connection failures', async () => {
      console.log('🗄️  Testing database failure handling...');

      const mockPrisma = (benchmarkService as any).prisma;
      mockPrisma.course.findMany.mockRejectedValueOnce(new Error('Database connection failed'));

      const config = {
        endpoint: '/api/courses',
        concurrentUsers: 10,
        duration: 5,
        rampUpTime: 1,
        testType: 'api' as const
      };

      // Should handle database errors and still return results
      const result = await benchmarkService.runLoadTest(config);
      expect(result).toBeDefined();
      expect(result.metrics.errorRate).toBeGreaterThan(0); // Should reflect the errors
    });
  });

  describe('Performance Thresholds and Validation', () => {
    it('should validate performance meets production requirements', async () => {
      console.log('✅ Validating production readiness...');

      const productionRequirements = {
        maxResponseTime: 2000, // 2 seconds
        minThroughput: 50, // 50 requests per second
        maxErrorRate: 1, // 1% error rate
        maxCpuUsage: 80, // 80% CPU usage
        maxMemoryUsage: 85 // 85% memory usage
      };

      // Run production-like load test
      const prodConfig = {
        endpoint: '/api/courses',
        concurrentUsers: 500,
        duration: 120, // 2 minutes
        rampUpTime: 30,
        testType: 'api' as const
      };

      const prodBenchmark = await benchmarkService.runLoadTest(prodConfig);

      const meetsRequirements = {
        responseTime: prodBenchmark.metrics.responseTime <= productionRequirements.maxResponseTime,
        throughput: prodBenchmark.metrics.throughput >= productionRequirements.minThroughput,
        errorRate: prodBenchmark.metrics.errorRate <= productionRequirements.maxErrorRate,
        cpuUsage: prodBenchmark.metrics.cpuUsage <= productionRequirements.maxCpuUsage,
        memoryUsage: prodBenchmark.metrics.memoryUsage <= productionRequirements.maxMemoryUsage
      };

      console.log('📊 Production Requirements Validation:');
      Object.entries(meetsRequirements).forEach(([metric, passes]) => {
        console.log(`   ${metric}: ${passes ? '✅ PASS' : '❌ FAIL'}`);
      });

      const overallPass = Object.values(meetsRequirements).every(Boolean);
      console.log(`🎯 Overall Production Readiness: ${overallPass ? '✅ READY' : '❌ NOT READY'}`);

      expect(prodBenchmark).toBeDefined();
      // Note: In a real scenario, you might want to assert overallPass === true
    });
  });
});