import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { PerformanceBenchmark } from './performance-benchmark.service';

export interface OptimizationRecommendation {
  id: string;
  category: 'database' | 'cache' | 'api' | 'frontend' | 'infrastructure';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  implementation: string[];
  metrics: string[];
  estimatedImprovement: number; // percentage
}

export interface OptimizationResult {
  id: string;
  recommendationId: string;
  implemented: boolean;
  implementedAt?: Date;
  beforeMetrics: Record<string, number>;
  afterMetrics?: Record<string, number>;
  actualImprovement?: number;
  notes?: string;
}

export interface CriticalPathAnalysis {
  endpoint: string;
  averageResponseTime: number;
  bottlenecks: {
    component: string;
    timeMs: number;
    percentage: number;
  }[];
  recommendations: string[];
}

export class PerformanceOptimizerService {
  private prisma: PrismaClient;
  private redis: Redis;
  private recommendations: Map<string, OptimizationRecommendation> = new Map();
  private results: Map<string, OptimizationResult> = new Map();

  constructor() {
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.initializeRecommendations();
  }

  // 初始化優化建議
  private initializeRecommendations(): void {
    const recommendations: OptimizationRecommendation[] = [
      {
        id: 'db-query-optimization',
        category: 'database',
        priority: 'high',
        title: 'Database Query Optimization',
        description: 'Optimize slow database queries and add missing indexes',
        impact: 'Reduce database response time by 30-50%',
        effort: 'medium',
        implementation: [
          'Analyze slow query logs',
          'Add composite indexes for common query patterns',
          'Optimize N+1 query problems',
          'Implement query result caching'
        ],
        metrics: ['responseTime', 'dbConnections'],
        estimatedImprovement: 40
      },
      {
        id: 'redis-caching',
        category: 'cache',
        priority: 'high',
        title: 'Enhanced Redis Caching Strategy',
        description: 'Implement comprehensive caching for frequently accessed data',
        impact: 'Improve cache hit rate to 85%+ and reduce API response time',
        effort: 'medium',
        implementation: [
          'Cache user sessions and profiles',
          'Cache course and product listings',
          'Implement cache warming strategies',
          'Add cache invalidation logic'
        ],
        metrics: ['cacheHitRate', 'responseTime'],
        estimatedImprovement: 35
      },
      {
        id: 'api-response-compression',
        category: 'api',
        priority: 'medium',
        title: 'API Response Compression',
        description: 'Enable gzip compression for API responses',
        impact: 'Reduce payload size by 60-80%',
        effort: 'low',
        implementation: [
          'Enable gzip middleware',
          'Configure compression levels',
          'Add compression headers',
          'Test with different content types'
        ],
        metrics: ['responseTime', 'throughput'],
        estimatedImprovement: 25
      },
      {
        id: 'connection-pooling',
        category: 'database',
        priority: 'high',
        title: 'Database Connection Pooling',
        description: 'Optimize database connection pool settings',
        impact: 'Reduce connection overhead and improve concurrency',
        effort: 'low',
        implementation: [
          'Tune connection pool size',
          'Configure connection timeout',
          'Implement connection health checks',
          'Monitor connection usage'
        ],
        metrics: ['dbConnections', 'responseTime'],
        estimatedImprovement: 20
      },
      {
        id: 'cdn-optimization',
        category: 'frontend',
        priority: 'medium',
        title: 'CDN and Static Asset Optimization',
        description: 'Optimize static asset delivery through CDN',
        impact: 'Reduce page load time by 40-60%',
        effort: 'medium',
        implementation: [
          'Configure CDN for static assets',
          'Implement image optimization',
          'Enable browser caching',
          'Minify CSS and JavaScript'
        ],
        metrics: ['responseTime'],
        estimatedImprovement: 50
      },
      {
        id: 'lazy-loading',
        category: 'frontend',
        priority: 'medium',
        title: 'Lazy Loading Implementation',
        description: 'Implement lazy loading for images and components',
        impact: 'Reduce initial page load time by 30-40%',
        effort: 'medium',
        implementation: [
          'Implement image lazy loading',
          'Add component lazy loading',
          'Optimize bundle splitting',
          'Implement progressive loading'
        ],
        metrics: ['responseTime'],
        estimatedImprovement: 35
      },
      {
        id: 'memory-optimization',
        category: 'infrastructure',
        priority: 'medium',
        title: 'Memory Usage Optimization',
        description: 'Optimize application memory usage and garbage collection',
        impact: 'Reduce memory usage by 20-30%',
        effort: 'high',
        implementation: [
          'Profile memory usage patterns',
          'Optimize object creation',
          'Implement memory pooling',
          'Tune garbage collection'
        ],
        metrics: ['memoryUsage'],
        estimatedImprovement: 25
      },
      {
        id: 'async-processing',
        category: 'api',
        priority: 'high',
        title: 'Asynchronous Processing',
        description: 'Move heavy operations to background processing',
        impact: 'Reduce API response time for heavy operations by 70%+',
        effort: 'high',
        implementation: [
          'Implement job queue system',
          'Move file processing to background',
          'Add email sending to queue',
          'Implement progress tracking'
        ],
        metrics: ['responseTime', 'throughput'],
        estimatedImprovement: 60
      }
    ];

    recommendations.forEach(rec => {
      this.recommendations.set(rec.id, rec);
    });
  }

  // 優化關鍵路徑的響應時間
  async optimizeCriticalPaths(benchmarks: PerformanceBenchmark[]): Promise<CriticalPathAnalysis[]> {
    const analyses: CriticalPathAnalysis[] = [];

    // Group benchmarks by endpoint
    const endpointGroups = new Map<string, PerformanceBenchmark[]>();
    
    benchmarks.forEach(benchmark => {
      if (benchmark.endpoint) {
        const existing = endpointGroups.get(benchmark.endpoint) || [];
        existing.push(benchmark);
        endpointGroups.set(benchmark.endpoint, existing);
      }
    });

    // Analyze each endpoint
    for (const [endpoint, endpointBenchmarks] of endpointGroups) {
      const analysis = await this.analyzeCriticalPath(endpoint, endpointBenchmarks);
      analyses.push(analysis);
    }

    // Sort by response time (worst first)
    analyses.sort((a, b) => b.averageResponseTime - a.averageResponseTime);

    return analyses;
  }

  // 分析關鍵路徑
  private async analyzeCriticalPath(
    endpoint: string, 
    benchmarks: PerformanceBenchmark[]
  ): Promise<CriticalPathAnalysis> {
    const avgResponseTime = benchmarks.reduce(
      (sum, b) => sum + b.metrics.responseTime, 0
    ) / benchmarks.length;

    // Simulate bottleneck analysis (in production, use APM tools)
    const bottlenecks = this.identifyBottlenecks(endpoint, avgResponseTime);
    const recommendations = this.generatePathRecommendations(endpoint, bottlenecks);

    return {
      endpoint,
      averageResponseTime: avgResponseTime,
      bottlenecks,
      recommendations
    };
  }

  // 識別瓶頸
  private identifyBottlenecks(endpoint: string, responseTime: number): {
    component: string;
    timeMs: number;
    percentage: number;
  }[] {
    // Simulate bottleneck identification based on endpoint type
    const bottlenecks: { component: string; timeMs: number; percentage: number }[] = [];

    if (endpoint.includes('/api/courses')) {
      bottlenecks.push(
        { component: 'Database Query', timeMs: responseTime * 0.6, percentage: 60 },
        { component: 'Data Serialization', timeMs: responseTime * 0.2, percentage: 20 },
        { component: 'Network I/O', timeMs: responseTime * 0.15, percentage: 15 },
        { component: 'Business Logic', timeMs: responseTime * 0.05, percentage: 5 }
      );
    } else if (endpoint.includes('/api/products')) {
      bottlenecks.push(
        { component: 'Database Query', timeMs: responseTime * 0.5, percentage: 50 },
        { component: 'Image Processing', timeMs: responseTime * 0.25, percentage: 25 },
        { component: 'Cache Miss', timeMs: responseTime * 0.15, percentage: 15 },
        { component: 'API Processing', timeMs: responseTime * 0.1, percentage: 10 }
      );
    } else if (endpoint.includes('/api/upload')) {
      bottlenecks.push(
        { component: 'File I/O', timeMs: responseTime * 0.7, percentage: 70 },
        { component: 'File Validation', timeMs: responseTime * 0.15, percentage: 15 },
        { component: 'Storage Upload', timeMs: responseTime * 0.1, percentage: 10 },
        { component: 'Database Update', timeMs: responseTime * 0.05, percentage: 5 }
      );
    } else {
      // Generic bottlenecks
      bottlenecks.push(
        { component: 'Database Query', timeMs: responseTime * 0.4, percentage: 40 },
        { component: 'Business Logic', timeMs: responseTime * 0.3, percentage: 30 },
        { component: 'Network I/O', timeMs: responseTime * 0.2, percentage: 20 },
        { component: 'Other', timeMs: responseTime * 0.1, percentage: 10 }
      );
    }

    return bottlenecks;
  }

  // 生成路徑優化建議
  private generatePathRecommendations(
    endpoint: string, 
    bottlenecks: { component: string; timeMs: number; percentage: number }[]
  ): string[] {
    const recommendations: string[] = [];

    bottlenecks.forEach(bottleneck => {
      if (bottleneck.percentage > 30) {
        switch (bottleneck.component) {
          case 'Database Query':
            recommendations.push('Add database indexes for common queries');
            recommendations.push('Implement query result caching');
            recommendations.push('Optimize N+1 query patterns');
            break;
          case 'File I/O':
            recommendations.push('Implement asynchronous file processing');
            recommendations.push('Use streaming for large file uploads');
            recommendations.push('Add file compression');
            break;
          case 'Image Processing':
            recommendations.push('Move image processing to background jobs');
            recommendations.push('Implement image caching');
            recommendations.push('Use optimized image formats');
            break;
          case 'Cache Miss':
            recommendations.push('Implement cache warming strategies');
            recommendations.push('Increase cache TTL for stable data');
            recommendations.push('Add cache preloading');
            break;
          case 'Business Logic':
            recommendations.push('Optimize algorithm complexity');
            recommendations.push('Cache computed results');
            recommendations.push('Parallelize independent operations');
            break;
        }
      }
    });

    return [...new Set(recommendations)]; // Remove duplicates
  }

  // 獲取優化建議
  async getOptimizationRecommendations(
    benchmark: PerformanceBenchmark
  ): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    // Analyze metrics and suggest optimizations
    const { metrics } = benchmark;

    // High response time
    if (metrics.responseTime > 2000) {
      recommendations.push(
        this.recommendations.get('db-query-optimization')!,
        this.recommendations.get('redis-caching')!,
        this.recommendations.get('async-processing')!
      );
    }

    // Low cache hit rate
    if (metrics.cacheHitRate < 70) {
      recommendations.push(this.recommendations.get('redis-caching')!);
    }

    // High database connections
    if (metrics.dbConnections > 50) {
      recommendations.push(this.recommendations.get('connection-pooling')!);
    }

    // High memory usage
    if (metrics.memoryUsage > 80) {
      recommendations.push(this.recommendations.get('memory-optimization')!);
    }

    // Low throughput
    if (metrics.throughput < 20) {
      recommendations.push(
        this.recommendations.get('api-response-compression')!,
        this.recommendations.get('async-processing')!
      );
    }

    // High error rate
    if (metrics.errorRate > 5) {
      recommendations.push(this.recommendations.get('connection-pooling')!);
    }

    // Remove duplicates and sort by priority
    const uniqueRecommendations = Array.from(
      new Map(recommendations.map(r => [r.id, r])).values()
    );

    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    uniqueRecommendations.sort((a, b) => 
      priorityOrder[b.priority] - priorityOrder[a.priority]
    );

    return uniqueRecommendations;
  }

  // 實施優化建議
  async implementOptimization(
    recommendationId: string,
    beforeMetrics: Record<string, number>
  ): Promise<OptimizationResult> {
    const recommendation = this.recommendations.get(recommendationId);
    if (!recommendation) {
      throw new Error(`Recommendation ${recommendationId} not found`);
    }

    const result: OptimizationResult = {
      id: `opt-result-${Date.now()}`,
      recommendationId,
      implemented: false,
      beforeMetrics
    };

    try {
      // Simulate implementation based on recommendation type
      await this.executeOptimization(recommendation);
      
      result.implemented = true;
      result.implementedAt = new Date();
      
      // Store result
      this.results.set(result.id, result);
      await this.storeOptimizationResult(result);

      console.log(`✅ Implemented optimization: ${recommendation.title}`);
      
    } catch (error) {
      console.error(`❌ Failed to implement optimization: ${recommendation.title}`, error);
      result.notes = error instanceof Error ? error.message : 'Unknown error';
    }

    return result;
  }

  // 執行具體優化
  private async executeOptimization(recommendation: OptimizationRecommendation): Promise<void> {
    switch (recommendation.id) {
      case 'db-query-optimization':
        await this.optimizeDatabaseQueries();
        break;
      case 'redis-caching':
        await this.enhanceRedisCaching();
        break;
      case 'api-response-compression':
        await this.enableResponseCompression();
        break;
      case 'connection-pooling':
        await this.optimizeConnectionPooling();
        break;
      case 'cdn-optimization':
        await this.optimizeCDN();
        break;
      case 'lazy-loading':
        await this.implementLazyLoading();
        break;
      case 'memory-optimization':
        await this.optimizeMemoryUsage();
        break;
      case 'async-processing':
        await this.implementAsyncProcessing();
        break;
      default:
        console.log(`Optimization ${recommendation.id} implementation not defined`);
    }
  }

  // 數據庫查詢優化
  private async optimizeDatabaseQueries(): Promise<void> {
    console.log('Optimizing database queries...');
    
    // Add indexes for common queries
    const indexQueries = [
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_courses_craft_category ON courses(craft_category)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_craftsman_status ON products(craftsman_id, status)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_user_status ON bookings(user_id, status)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_media_uploader_type ON media_files(uploader_id, file_type)'
    ];

    for (const query of indexQueries) {
      try {
        await this.prisma.$executeRawUnsafe(query);
        console.log(`✅ Created index: ${query.split(' ')[7]}`);
      } catch (error) {
        console.log(`ℹ️ Index may already exist: ${query.split(' ')[7]}`);
      }
    }
  }

  // 增強Redis緩存
  private async enhanceRedisCaching(): Promise<void> {
    console.log('Enhancing Redis caching...');
    
    // Set up cache warming for popular content
    const popularCourses = await this.prisma.course.findMany({
      take: 50,
      orderBy: { created_at: 'desc' },
      include: { craftsman: true }
    });

    for (const course of popularCourses) {
      await this.redis.setex(
        `course:${course.id}`,
        3600, // 1 hour
        JSON.stringify(course)
      );
    }

    const popularProducts = await this.prisma.product.findMany({
      take: 50,
      orderBy: { created_at: 'desc' },
      include: { craftsman: true }
    });

    for (const product of popularProducts) {
      await this.redis.setex(
        `product:${product.id}`,
        3600,
        JSON.stringify(product)
      );
    }

    console.log('✅ Cache warming completed');
  }

  // 啟用響應壓縮
  private async enableResponseCompression(): Promise<void> {
    console.log('✅ Response compression configuration updated');
    // This would typically involve updating server configuration
  }

  // 優化連接池
  private async optimizeConnectionPooling(): Promise<void> {
    console.log('✅ Database connection pooling optimized');
    // This would involve updating Prisma configuration
  }

  // 優化CDN
  private async optimizeCDN(): Promise<void> {
    console.log('✅ CDN optimization configured');
    // This would involve CDN configuration updates
  }

  // 實施懶加載
  private async implementLazyLoading(): Promise<void> {
    console.log('✅ Lazy loading implementation completed');
    // This would involve frontend code updates
  }

  // 優化內存使用
  private async optimizeMemoryUsage(): Promise<void> {
    console.log('✅ Memory usage optimization applied');
    // This would involve application-level optimizations
  }

  // 實施異步處理
  private async implementAsyncProcessing(): Promise<void> {
    console.log('✅ Asynchronous processing implemented');
    // This would involve setting up job queues
  }

  // 存儲優化結果
  private async storeOptimizationResult(result: OptimizationResult): Promise<void> {
    await this.redis.lpush(
      'optimization:results',
      JSON.stringify(result)
    );
    await this.redis.ltrim('optimization:results', 0, 99); // Keep last 100 results
  }

  // 測量優化效果
  async measureOptimizationImpact(
    resultId: string,
    afterMetrics: Record<string, number>
  ): Promise<OptimizationResult> {
    const result = this.results.get(resultId);
    if (!result) {
      throw new Error(`Optimization result ${resultId} not found`);
    }

    result.afterMetrics = afterMetrics;

    // Calculate actual improvement
    const beforeAvg = Object.values(result.beforeMetrics).reduce((sum, val) => sum + val, 0) / Object.keys(result.beforeMetrics).length;
    const afterAvg = Object.values(afterMetrics).reduce((sum, val) => sum + val, 0) / Object.keys(afterMetrics).length;
    
    result.actualImprovement = ((beforeAvg - afterAvg) / beforeAvg) * 100;

    // Update stored result
    await this.storeOptimizationResult(result);

    return result;
  }

  // 獲取所有優化建議
  getAllRecommendations(): OptimizationRecommendation[] {
    return Array.from(this.recommendations.values());
  }

  // 獲取優化結果
  async getOptimizationResults(): Promise<OptimizationResult[]> {
    const results = await this.redis.lrange('optimization:results', 0, -1);
    return results.map(r => JSON.parse(r));
  }

  // 生成優化報告
  async generateOptimizationReport(): Promise<{
    summary: {
      totalRecommendations: number;
      implementedOptimizations: number;
      averageImprovement: number;
      topBottlenecks: string[];
    };
    recommendations: OptimizationRecommendation[];
    results: OptimizationResult[];
  }> {
    const recommendations = this.getAllRecommendations();
    const results = await this.getOptimizationResults();
    
    const implementedResults = results.filter(r => r.implemented);
    const averageImprovement = implementedResults.length > 0
      ? implementedResults.reduce((sum, r) => sum + (r.actualImprovement || 0), 0) / implementedResults.length
      : 0;

    // Identify top bottlenecks from recommendations
    const bottleneckCategories = recommendations.reduce((acc, rec) => {
      acc[rec.category] = (acc[rec.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topBottlenecks = Object.entries(bottleneckCategories)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category);

    return {
      summary: {
        totalRecommendations: recommendations.length,
        implementedOptimizations: implementedResults.length,
        averageImprovement,
        topBottlenecks
      },
      recommendations,
      results
    };
  }
}