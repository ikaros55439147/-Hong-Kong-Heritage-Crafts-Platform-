import { performance } from 'perf_hooks';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';

export interface PerformanceBenchmark {
  id: string;
  testName: string;
  timestamp: Date;
  metrics: {
    responseTime: number;
    throughput: number;
    errorRate: number;
    cpuUsage: number;
    memoryUsage: number;
    dbConnections: number;
    cacheHitRate: number;
  };
  endpoint?: string;
  concurrentUsers?: number;
  duration?: number;
}

export interface LoadTestConfig {
  endpoint: string;
  concurrentUsers: number;
  duration: number; // in seconds
  rampUpTime: number; // in seconds
  testType: 'api' | 'database' | 'full-system';
}

export interface PerformanceThreshold {
  metric: string;
  warning: number;
  critical: number;
  unit: string;
}

export class PerformanceBenchmarkService {
  private prisma: PrismaClient;
  private redis: Redis;
  private benchmarks: Map<string, PerformanceBenchmark[]> = new Map();

  constructor() {
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  // 建立生產環境性能基準線
  async establishBaseline(): Promise<PerformanceBenchmark[]> {
    const baselineTests = [
      { name: 'homepage_load', endpoint: '/', users: 10 },
      { name: 'course_search', endpoint: '/api/courses', users: 50 },
      { name: 'product_listing', endpoint: '/api/products', users: 30 },
      { name: 'user_authentication', endpoint: '/api/auth/login', users: 20 },
      { name: 'craftsman_profile', endpoint: '/api/craftsmen', users: 25 },
      { name: 'booking_creation', endpoint: '/api/bookings', users: 15 },
      { name: 'order_processing', endpoint: '/api/orders', users: 20 },
      { name: 'media_upload', endpoint: '/api/upload', users: 10 }
    ];

    const baselines: PerformanceBenchmark[] = [];

    for (const test of baselineTests) {
      console.log(`Establishing baseline for ${test.name}...`);
      
      const benchmark = await this.runSingleBenchmark({
        endpoint: test.endpoint,
        concurrentUsers: test.users,
        duration: 60,
        rampUpTime: 10,
        testType: 'api'
      });

      benchmark.testName = test.name;
      baselines.push(benchmark);

      // Store baseline in Redis for quick access
      await this.redis.setex(
        `baseline:${test.name}`,
        86400, // 24 hours
        JSON.stringify(benchmark)
      );
    }

    // Store complete baseline set
    await this.redis.setex(
      'performance:baseline',
      86400 * 7, // 1 week
      JSON.stringify(baselines)
    );

    return baselines;
  }

  // 進行大規模負載測試（1000+併發用戶）
  async runLoadTest(config: LoadTestConfig): Promise<PerformanceBenchmark> {
    console.log(`Starting load test: ${config.endpoint} with ${config.concurrentUsers} users`);
    
    const startTime = performance.now();
    const results: any[] = [];
    const errors: any[] = [];

    // Simulate concurrent users
    const userBatches = Math.ceil(config.concurrentUsers / 100); // Process in batches of 100
    const promises: Promise<any>[] = [];

    for (let batch = 0; batch < userBatches; batch++) {
      const batchSize = Math.min(100, config.concurrentUsers - (batch * 100));
      
      promises.push(
        this.runUserBatch(config.endpoint, batchSize, config.duration)
      );

      // Ramp up gradually
      if (batch < userBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, (config.rampUpTime * 1000) / userBatches));
      }
    }

    const batchResults = await Promise.allSettled(promises);
    
    // Collect results
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(...result.value.successes);
        errors.push(...result.value.errors);
      } else {
        console.error(`Batch ${index} failed:`, result.reason);
        errors.push({ batch: index, error: result.reason });
      }
    });

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    // Calculate metrics
    const totalRequests = results.length + errors.length;
    const successfulRequests = results.length;
    const errorRate = (errors.length / totalRequests) * 100;
    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
    const throughput = (successfulRequests / (totalTime / 1000)); // requests per second

    // Get system metrics
    const systemMetrics = await this.getSystemMetrics();

    const benchmark: PerformanceBenchmark = {
      id: `load-test-${Date.now()}`,
      testName: `Load Test - ${config.endpoint}`,
      timestamp: new Date(),
      endpoint: config.endpoint,
      concurrentUsers: config.concurrentUsers,
      duration: config.duration,
      metrics: {
        responseTime: avgResponseTime,
        throughput,
        errorRate,
        cpuUsage: systemMetrics.cpuUsage,
        memoryUsage: systemMetrics.memoryUsage,
        dbConnections: systemMetrics.dbConnections,
        cacheHitRate: systemMetrics.cacheHitRate
      }
    };

    // Store results
    await this.storeBenchmark(benchmark);
    
    return benchmark;
  }

  // 運行用戶批次測試
  private async runUserBatch(endpoint: string, batchSize: number, duration: number): Promise<{successes: any[], errors: any[]}> {
    const successes: any[] = [];
    const errors: any[] = [];
    const endTime = Date.now() + (duration * 1000);

    const userPromises: Promise<void>[] = [];

    for (let i = 0; i < batchSize; i++) {
      userPromises.push(
        this.simulateUser(endpoint, endTime, successes, errors)
      );
    }

    await Promise.allSettled(userPromises);
    
    return { successes, errors };
  }

  // 模擬單個用戶行為
  private async simulateUser(
    endpoint: string, 
    endTime: number, 
    successes: any[], 
    errors: any[]
  ): Promise<void> {
    while (Date.now() < endTime) {
      try {
        const startTime = performance.now();
        
        // Simulate API call based on endpoint
        const response = await this.makeTestRequest(endpoint);
        
        const responseTime = performance.now() - startTime;
        
        successes.push({
          endpoint,
          responseTime,
          statusCode: response.status,
          timestamp: new Date()
        });

        // Random delay between requests (0.5-2 seconds)
        await new Promise(resolve => 
          setTimeout(resolve, Math.random() * 1500 + 500)
        );
        
      } catch (error) {
        errors.push({
          endpoint,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        });
      }
    }
  }

  // 執行測試請求
  private async makeTestRequest(endpoint: string): Promise<{status: number, data?: any}> {
    // Simulate different types of requests based on endpoint
    switch (endpoint) {
      case '/':
        return { status: 200 };
      
      case '/api/courses':
        // Simulate database query
        const courses = await this.prisma.course.findMany({
          take: 20,
          include: { craftsman: true }
        });
        return { status: 200, data: courses };
      
      case '/api/products':
        const products = await this.prisma.product.findMany({
          take: 20,
          include: { craftsman: true }
        });
        return { status: 200, data: products };
      
      case '/api/auth/login':
        // Simulate authentication
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate auth delay
        return { status: 200 };
      
      case '/api/craftsmen':
        const craftsmen = await this.prisma.craftsmanProfile.findMany({
          take: 20,
          include: { user: true }
        });
        return { status: 200, data: craftsmen };
      
      case '/api/bookings':
        // Simulate booking creation
        await new Promise(resolve => setTimeout(resolve, 200)); // Simulate processing
        return { status: 201 };
      
      case '/api/orders':
        // Simulate order processing
        await new Promise(resolve => setTimeout(resolve, 300)); // Simulate processing
        return { status: 201 };
      
      case '/api/upload':
        // Simulate file upload
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate upload
        return { status: 200 };
      
      default:
        return { status: 200 };
    }
  }

  // 獲取系統指標
  private async getSystemMetrics(): Promise<{
    cpuUsage: number;
    memoryUsage: number;
    dbConnections: number;
    cacheHitRate: number;
  }> {
    // Get database connection count
    const dbConnections = await this.getDatabaseConnections();
    
    // Get cache hit rate from Redis
    const cacheStats = await this.redis.info('stats');
    const cacheHitRate = this.parseCacheHitRate(cacheStats);
    
    // Simulate CPU and memory usage (in production, use actual system monitoring)
    const cpuUsage = Math.random() * 80 + 10; // 10-90%
    const memoryUsage = Math.random() * 70 + 20; // 20-90%

    return {
      cpuUsage,
      memoryUsage,
      dbConnections,
      cacheHitRate
    };
  }

  // 獲取數據庫連接數
  private async getDatabaseConnections(): Promise<number> {
    try {
      const result = await this.prisma.$queryRaw<[{count: bigint}]>`
        SELECT count(*) as count FROM pg_stat_activity WHERE state = 'active'
      `;
      return Number(result[0].count);
    } catch (error) {
      console.error('Error getting DB connections:', error);
      return 0;
    }
  }

  // 解析緩存命中率
  private parseCacheHitRate(stats: string): number {
    const lines = stats.split('\r\n');
    let hits = 0;
    let misses = 0;

    for (const line of lines) {
      if (line.startsWith('keyspace_hits:')) {
        hits = parseInt(line.split(':')[1]);
      } else if (line.startsWith('keyspace_misses:')) {
        misses = parseInt(line.split(':')[1]);
      }
    }

    const total = hits + misses;
    return total > 0 ? (hits / total) * 100 : 0;
  }

  // 運行單個基準測試
  private async runSingleBenchmark(config: LoadTestConfig): Promise<PerformanceBenchmark> {
    const startTime = performance.now();
    const results: any[] = [];
    const errors: any[] = [];

    // Run test for specified duration with specified concurrent users
    const promises: Promise<void>[] = [];
    
    for (let i = 0; i < config.concurrentUsers; i++) {
      promises.push(
        this.simulateUser(
          config.endpoint, 
          Date.now() + (config.duration * 1000),
          results,
          errors
        )
      );
    }

    await Promise.allSettled(promises);

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    // Calculate metrics
    const totalRequests = results.length + errors.length;
    const errorRate = totalRequests > 0 ? (errors.length / totalRequests) * 100 : 0;
    const avgResponseTime = results.length > 0 
      ? results.reduce((sum, r) => sum + r.responseTime, 0) / results.length 
      : 0;
    const throughput = results.length / (totalTime / 1000);

    const systemMetrics = await this.getSystemMetrics();

    return {
      id: `benchmark-${Date.now()}`,
      testName: `Benchmark - ${config.endpoint}`,
      timestamp: new Date(),
      endpoint: config.endpoint,
      concurrentUsers: config.concurrentUsers,
      duration: config.duration,
      metrics: {
        responseTime: avgResponseTime,
        throughput,
        errorRate,
        cpuUsage: systemMetrics.cpuUsage,
        memoryUsage: systemMetrics.memoryUsage,
        dbConnections: systemMetrics.dbConnections,
        cacheHitRate: systemMetrics.cacheHitRate
      }
    };
  }

  // 存儲基準測試結果
  private async storeBenchmark(benchmark: PerformanceBenchmark): Promise<void> {
    // Store in Redis for quick access
    await this.redis.lpush(
      'performance:benchmarks',
      JSON.stringify(benchmark)
    );

    // Keep only last 100 benchmarks
    await this.redis.ltrim('performance:benchmarks', 0, 99);

    // Store in memory cache
    const testBenchmarks = this.benchmarks.get(benchmark.testName) || [];
    testBenchmarks.push(benchmark);
    this.benchmarks.set(benchmark.testName, testBenchmarks);
  }

  // 獲取性能基準線
  async getBaseline(testName?: string): Promise<PerformanceBenchmark | PerformanceBenchmark[] | null> {
    if (testName) {
      const baseline = await this.redis.get(`baseline:${testName}`);
      return baseline ? JSON.parse(baseline) : null;
    }

    const baselines = await this.redis.get('performance:baseline');
    return baselines ? JSON.parse(baselines) : null;
  }

  // 比較當前性能與基準線
  async compareWithBaseline(current: PerformanceBenchmark): Promise<{
    comparison: 'better' | 'worse' | 'similar';
    differences: Record<string, number>;
    alerts: string[];
  }> {
    const baseline = await this.getBaseline(current.testName) as PerformanceBenchmark;
    
    if (!baseline) {
      return {
        comparison: 'similar',
        differences: {},
        alerts: ['No baseline found for comparison']
      };
    }

    const differences: Record<string, number> = {};
    const alerts: string[] = [];

    // Compare key metrics
    const metrics = ['responseTime', 'throughput', 'errorRate', 'cpuUsage', 'memoryUsage'];
    
    for (const metric of metrics) {
      const currentValue = current.metrics[metric as keyof typeof current.metrics];
      const baselineValue = baseline.metrics[metric as keyof typeof baseline.metrics];
      
      const percentChange = ((currentValue - baselineValue) / baselineValue) * 100;
      differences[metric] = percentChange;

      // Generate alerts for significant changes
      if (Math.abs(percentChange) > 20) {
        const direction = percentChange > 0 ? 'increased' : 'decreased';
        alerts.push(`${metric} ${direction} by ${Math.abs(percentChange).toFixed(1)}%`);
      }
    }

    // Determine overall comparison
    const avgChange = Object.values(differences).reduce((sum, val) => sum + val, 0) / metrics.length;
    const comparison = avgChange > 10 ? 'worse' : avgChange < -10 ? 'better' : 'similar';

    return { comparison, differences, alerts };
  }

  // 獲取所有基準測試結果
  async getAllBenchmarks(): Promise<PerformanceBenchmark[]> {
    const benchmarks = await this.redis.lrange('performance:benchmarks', 0, -1);
    return benchmarks.map(b => JSON.parse(b));
  }

  // 清理舊的基準測試數據
  async cleanup(): Promise<void> {
    await this.redis.del('performance:benchmarks');
    await this.redis.del('performance:baseline');
    
    // Clear baseline keys
    const keys = await this.redis.keys('baseline:*');
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
    
    this.benchmarks.clear();
  }
}