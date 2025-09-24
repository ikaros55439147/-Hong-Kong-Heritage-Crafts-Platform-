import { NextRequest, NextResponse } from 'next/server';
import { PerformanceBenchmarkService, LoadTestConfig } from '@/lib/services/performance-benchmark.service';
import { PerformanceMonitoringService } from '@/lib/services/performance-monitoring.service';

const benchmarkService = new PerformanceBenchmarkService();
const monitoringService = new PerformanceMonitoringService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, config } = body;

    switch (action) {
      case 'establish-baseline':
        const baselines = await benchmarkService.establishBaseline();
        return NextResponse.json({
          success: true,
          data: baselines,
          message: `Established ${baselines.length} performance baselines`
        });

      case 'load-test':
        if (!config) {
          return NextResponse.json(
            { success: false, error: 'Load test configuration required' },
            { status: 400 }
          );
        }

        const loadTestConfig: LoadTestConfig = {
          endpoint: config.endpoint || '/api/courses',
          concurrentUsers: config.concurrentUsers || 100,
          duration: config.duration || 60,
          rampUpTime: config.rampUpTime || 10,
          testType: config.testType || 'api'
        };

        console.log(`Starting load test with ${loadTestConfig.concurrentUsers} concurrent users...`);
        const benchmark = await benchmarkService.runLoadTest(loadTestConfig);
        
        // Check for alerts
        const alerts = await monitoringService.checkMetrics(benchmark);
        
        return NextResponse.json({
          success: true,
          data: {
            benchmark,
            alerts
          },
          message: `Load test completed. ${alerts.length} alerts triggered.`
        });

      case 'stress-test':
        // Run multiple load tests with increasing load
        const stressResults = [];
        const userCounts = [100, 500, 1000, 1500, 2000];
        
        for (const users of userCounts) {
          console.log(`Running stress test with ${users} users...`);
          
          const stressConfig: LoadTestConfig = {
            endpoint: config?.endpoint || '/api/courses',
            concurrentUsers: users,
            duration: 30, // Shorter duration for stress test
            rampUpTime: 5,
            testType: 'api'
          };

          try {
            const result = await benchmarkService.runLoadTest(stressConfig);
            stressResults.push(result);
            
            // Stop if error rate is too high
            if (result.metrics.errorRate > 50) {
              console.log(`Stopping stress test at ${users} users due to high error rate`);
              break;
            }
          } catch (error) {
            console.log(`Stress test failed at ${users} users:`, error);
            break;
          }
        }

        return NextResponse.json({
          success: true,
          data: stressResults,
          message: `Stress test completed with ${stressResults.length} test phases`
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Performance benchmark error:', error);
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
    const testName = searchParams.get('testName');

    switch (action) {
      case 'baseline':
        const baseline = await benchmarkService.getBaseline(testName || undefined);
        return NextResponse.json({
          success: true,
          data: baseline
        });

      case 'all-benchmarks':
        const benchmarks = await benchmarkService.getAllBenchmarks();
        return NextResponse.json({
          success: true,
          data: benchmarks
        });

      case 'compare':
        if (!testName) {
          return NextResponse.json(
            { success: false, error: 'Test name required for comparison' },
            { status: 400 }
          );
        }

        const allBenchmarks = await benchmarkService.getAllBenchmarks();
        const testBenchmarks = allBenchmarks.filter(b => b.testName === testName);
        
        if (testBenchmarks.length === 0) {
          return NextResponse.json(
            { success: false, error: 'No benchmarks found for test' },
            { status: 404 }
          );
        }

        const latest = testBenchmarks[0];
        const comparison = await benchmarkService.compareWithBaseline(latest);

        return NextResponse.json({
          success: true,
          data: {
            current: latest,
            comparison
          }
        });

      default:
        // Return summary of all benchmarks
        const allResults = await benchmarkService.getAllBenchmarks();
        const summary = {
          totalBenchmarks: allResults.length,
          latestBenchmark: allResults[0] || null,
          averageMetrics: allResults.length > 0 ? {
            responseTime: allResults.reduce((sum, b) => sum + b.metrics.responseTime, 0) / allResults.length,
            throughput: allResults.reduce((sum, b) => sum + b.metrics.throughput, 0) / allResults.length,
            errorRate: allResults.reduce((sum, b) => sum + b.metrics.errorRate, 0) / allResults.length
          } : null
        };

        return NextResponse.json({
          success: true,
          data: summary
        });
    }
  } catch (error) {
    console.error('Performance benchmark GET error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}