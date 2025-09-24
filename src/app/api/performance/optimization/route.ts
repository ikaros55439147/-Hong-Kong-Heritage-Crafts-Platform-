import { NextRequest, NextResponse } from 'next/server';
import { PerformanceOptimizerService } from '@/lib/services/performance-optimizer.service';
import { PerformanceBenchmarkService } from '@/lib/services/performance-benchmark.service';

const optimizerService = new PerformanceOptimizerService();
const benchmarkService = new PerformanceBenchmarkService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'analyze-critical-paths':
        const benchmarks = await benchmarkService.getAllBenchmarks();
        if (benchmarks.length === 0) {
          return NextResponse.json(
            { success: false, error: 'No benchmark data available for analysis' },
            { status: 400 }
          );
        }

        const analyses = await optimizerService.optimizeCriticalPaths(benchmarks);
        
        return NextResponse.json({
          success: true,
          data: analyses,
          message: `Analyzed ${analyses.length} critical paths`
        });

      case 'get-recommendations':
        const { benchmarkId } = body;
        if (!benchmarkId) {
          return NextResponse.json(
            { success: false, error: 'Benchmark ID required' },
            { status: 400 }
          );
        }

        const allBenchmarks = await benchmarkService.getAllBenchmarks();
        const targetBenchmark = allBenchmarks.find(b => b.id === benchmarkId);
        
        if (!targetBenchmark) {
          return NextResponse.json(
            { success: false, error: 'Benchmark not found' },
            { status: 404 }
          );
        }

        const recommendations = await optimizerService.getOptimizationRecommendations(targetBenchmark);
        
        return NextResponse.json({
          success: true,
          data: recommendations,
          message: `Generated ${recommendations.length} optimization recommendations`
        });

      case 'implement-optimization':
        const { recommendationId, beforeMetrics } = body;
        if (!recommendationId || !beforeMetrics) {
          return NextResponse.json(
            { success: false, error: 'Recommendation ID and before metrics required' },
            { status: 400 }
          );
        }

        const result = await optimizerService.implementOptimization(recommendationId, beforeMetrics);
        
        return NextResponse.json({
          success: true,
          data: result,
          message: result.implemented 
            ? 'Optimization implemented successfully' 
            : 'Optimization implementation failed'
        });

      case 'measure-impact':
        const { resultId, afterMetrics } = body;
        if (!resultId || !afterMetrics) {
          return NextResponse.json(
            { success: false, error: 'Result ID and after metrics required' },
            { status: 400 }
          );
        }

        const impactResult = await optimizerService.measureOptimizationImpact(resultId, afterMetrics);
        
        return NextResponse.json({
          success: true,
          data: impactResult,
          message: `Measured optimization impact: ${impactResult.actualImprovement?.toFixed(1)}% improvement`
        });

      case 'auto-optimize':
        // Automatic optimization based on latest benchmarks
        const latestBenchmarks = await benchmarkService.getAllBenchmarks();
        if (latestBenchmarks.length === 0) {
          return NextResponse.json(
            { success: false, error: 'No benchmark data available' },
            { status: 400 }
          );
        }

        const latestBenchmark = latestBenchmarks[0];
        const autoRecommendations = await optimizerService.getOptimizationRecommendations(latestBenchmark);
        
        // Implement high-priority, low-effort optimizations automatically
        const autoImplementResults = [];
        for (const rec of autoRecommendations) {
          if (rec.priority === 'high' && rec.effort === 'low') {
            try {
              const implResult = await optimizerService.implementOptimization(
                rec.id, 
                latestBenchmark.metrics
              );
              autoImplementResults.push(implResult);
            } catch (error) {
              console.error(`Failed to auto-implement ${rec.id}:`, error);
            }
          }
        }

        return NextResponse.json({
          success: true,
          data: {
            recommendations: autoRecommendations,
            autoImplemented: autoImplementResults
          },
          message: `Auto-optimization completed. ${autoImplementResults.length} optimizations implemented.`
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Performance optimization error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'recommendations':
        const allRecommendations = optimizerService.getAllRecommendations();
        return NextResponse.json({
          success: true,
          data: allRecommendations
        });

      case 'results':
        const results = await optimizerService.getOptimizationResults();
        return NextResponse.json({
          success: true,
          data: results
        });

      case 'report':
        const report = await optimizerService.generateOptimizationReport();
        return NextResponse.json({
          success: true,
          data: report
        });

      case 'dashboard':
        // Comprehensive optimization dashboard
        const [recommendations, optimizationResults, dashboardReport] = await Promise.all([
          Promise.resolve(optimizerService.getAllRecommendations()),
          optimizerService.getOptimizationResults(),
          optimizerService.generateOptimizationReport()
        ]);

        // Get latest benchmarks for context
        const recentBenchmarks = await benchmarkService.getAllBenchmarks();
        const latestBenchmark = recentBenchmarks[0] || null;

        return NextResponse.json({
          success: true,
          data: {
            summary: dashboardReport.summary,
            latestBenchmark,
            recommendations: recommendations.slice(0, 10), // Top 10 recommendations
            recentResults: optimizationResults.slice(0, 5), // Last 5 results
            performanceTrend: recentBenchmarks.slice(0, 10).map(b => ({
              timestamp: b.timestamp,
              responseTime: b.metrics.responseTime,
              throughput: b.metrics.throughput,
              errorRate: b.metrics.errorRate
            }))
          }
        });

      default:
        // Return basic optimization status
        const basicReport = await optimizerService.generateOptimizationReport();
        
        return NextResponse.json({
          success: true,
          data: {
            totalRecommendations: basicReport.summary.totalRecommendations,
            implementedOptimizations: basicReport.summary.implementedOptimizations,
            averageImprovement: basicReport.summary.averageImprovement,
            topBottlenecks: basicReport.summary.topBottlenecks
          }
        });
    }
  } catch (error) {
    console.error('Performance optimization GET error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}