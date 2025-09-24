#!/usr/bin/env node

const { performance } = require('perf_hooks');
const fetch = require('node-fetch');

class PerformanceBenchmarkRunner {
  constructor() {
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    this.results = [];
  }

  // 建立生產環境性能基準線
  async establishBaseline() {
    console.log('🎯 Establishing performance baseline...\n');

    try {
      const response = await fetch(`${this.baseUrl}/api/performance/benchmark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'establish-baseline' })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Baseline established successfully');
        console.log(`📊 Created ${result.data.length} baseline measurements`);
        
        result.data.forEach(baseline => {
          console.log(`   ${baseline.testName}:`);
          console.log(`     Response Time: ${baseline.metrics.responseTime.toFixed(2)}ms`);
          console.log(`     Throughput: ${baseline.metrics.throughput.toFixed(2)} req/s`);
          console.log(`     Error Rate: ${baseline.metrics.errorRate.toFixed(2)}%`);
        });
      } else {
        console.error('❌ Failed to establish baseline:', result.error);
      }
    } catch (error) {
      console.error('❌ Baseline establishment failed:', error.message);
    }
  }

  // 進行大規模負載測試（1000+併發用戶）
  async runLoadTests() {
    console.log('\n🚀 Running large-scale load tests...\n');

    const testConfigs = [
      { name: 'API Endpoints', users: 1000, endpoint: '/api/courses' },
      { name: 'Product Listing', users: 1200, endpoint: '/api/products' },
      { name: 'User Authentication', users: 800, endpoint: '/api/auth/login' },
      { name: 'File Upload', users: 500, endpoint: '/api/upload' },
      { name: 'Search Functionality', users: 1500, endpoint: '/api/search/multilingual' }
    ];

    for (const config of testConfigs) {
      console.log(`🔄 Testing ${config.name} with ${config.users} concurrent users...`);
      
      try {
        const response = await fetch(`${this.baseUrl}/api/performance/benchmark`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'load-test',
            config: {
              endpoint: config.endpoint,
              concurrentUsers: config.users,
              duration: 120, // 2 minutes
              rampUpTime: 30,
              testType: 'api'
            }
          })
        });

        const result = await response.json();
        
        if (result.success) {
          const benchmark = result.data.benchmark;
          const alerts = result.data.alerts;
          
          console.log(`✅ ${config.name} test completed:`);
          console.log(`   Response Time: ${benchmark.metrics.responseTime.toFixed(2)}ms`);
          console.log(`   Throughput: ${benchmark.metrics.throughput.toFixed(2)} req/s`);
          console.log(`   Error Rate: ${benchmark.metrics.errorRate.toFixed(2)}%`);
          console.log(`   CPU Usage: ${benchmark.metrics.cpuUsage.toFixed(1)}%`);
          console.log(`   Memory Usage: ${benchmark.metrics.memoryUsage.toFixed(1)}%`);
          
          if (alerts.length > 0) {
            console.log(`⚠️  ${alerts.length} alerts triggered:`);
            alerts.forEach(alert => {
              console.log(`     ${alert.severity.toUpperCase()}: ${alert.message}`);
            });
          }
          
          this.results.push({
            test: config.name,
            benchmark,
            alerts,
            passed: benchmark.metrics.errorRate < 5 && benchmark.metrics.responseTime < 3000
          });
        } else {
          console.error(`❌ ${config.name} test failed:`, result.error);
        }
      } catch (error) {
        console.error(`❌ ${config.name} test error:`, error.message);
      }
      
      // Wait between tests to avoid overwhelming the system
      await this.sleep(10000);
    }
  }

  // 進行壓力測試
  async runStressTest() {
    console.log('\n💪 Running stress test to find breaking point...\n');

    try {
      const response = await fetch(`${this.baseUrl}/api/performance/benchmark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'stress-test',
          config: {
            endpoint: '/api/courses'
          }
        })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Stress test completed');
        console.log(`📈 Tested up to ${result.data.length} load levels`);
        
        result.data.forEach((phase, index) => {
          const users = [100, 500, 1000, 1500, 2000][index];
          console.log(`   ${users} users:`);
          console.log(`     Response Time: ${phase.metrics.responseTime.toFixed(2)}ms`);
          console.log(`     Throughput: ${phase.metrics.throughput.toFixed(2)} req/s`);
          console.log(`     Error Rate: ${phase.metrics.errorRate.toFixed(2)}%`);
        });

        // Find breaking point
        const breakingPoint = result.data.find(phase => phase.metrics.errorRate > 10);
        if (breakingPoint) {
          console.log(`⚠️  System breaking point: ${breakingPoint.concurrentUsers} concurrent users`);
        } else {
          console.log('✅ System handled all stress test levels successfully');
        }
      } else {
        console.error('❌ Stress test failed:', result.error);
      }
    } catch (error) {
      console.error('❌ Stress test error:', error.message);
    }
  }

  // 優化關鍵路徑
  async optimizeCriticalPaths() {
    console.log('\n🔧 Analyzing and optimizing critical paths...\n');

    try {
      // Analyze critical paths
      const analysisResponse = await fetch(`${this.baseUrl}/api/performance/optimization`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze-critical-paths' })
      });

      const analysisResult = await analysisResponse.json();
      
      if (analysisResult.success) {
        console.log('📊 Critical path analysis completed:');
        
        analysisResult.data.forEach(analysis => {
          console.log(`\n   ${analysis.endpoint}:`);
          console.log(`     Average Response Time: ${analysis.averageResponseTime.toFixed(2)}ms`);
          console.log(`     Top Bottlenecks:`);
          
          analysis.bottlenecks.slice(0, 3).forEach(bottleneck => {
            console.log(`       ${bottleneck.component}: ${bottleneck.timeMs.toFixed(2)}ms (${bottleneck.percentage}%)`);
          });
          
          if (analysis.recommendations.length > 0) {
            console.log(`     Recommendations:`);
            analysis.recommendations.slice(0, 3).forEach(rec => {
              console.log(`       - ${rec}`);
            });
          }
        });

        // Auto-optimize high-impact, low-effort improvements
        console.log('\n🤖 Running auto-optimization...');
        
        const optimizeResponse = await fetch(`${this.baseUrl}/api/performance/optimization`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'auto-optimize' })
        });

        const optimizeResult = await optimizeResponse.json();
        
        if (optimizeResult.success) {
          console.log(`✅ Auto-optimization completed`);
          console.log(`📈 ${optimizeResult.data.autoImplemented.length} optimizations implemented`);
          
          optimizeResult.data.autoImplemented.forEach(impl => {
            console.log(`   ✓ ${impl.recommendationId}: ${impl.implemented ? 'Success' : 'Failed'}`);
          });
        }
      } else {
        console.error('❌ Critical path analysis failed:', result.error);
      }
    } catch (error) {
      console.error('❌ Optimization error:', error.message);
    }
  }

  // 建立性能監控和告警閾值
  async setupMonitoring() {
    console.log('\n📡 Setting up performance monitoring and alerts...\n');

    const thresholds = [
      { metric: 'responseTime', warning: 2000, critical: 5000, unit: 'ms' },
      { metric: 'throughput', warning: 20, critical: 10, unit: 'req/s' },
      { metric: 'errorRate', warning: 5, critical: 15, unit: '%' },
      { metric: 'cpuUsage', warning: 80, critical: 95, unit: '%' },
      { metric: 'memoryUsage', warning: 85, critical: 95, unit: '%' },
      { metric: 'dbConnections', warning: 80, critical: 100, unit: '' },
      { metric: 'cacheHitRate', warning: 70, critical: 50, unit: '%' }
    ];

    try {
      const response = await fetch(`${this.baseUrl}/api/performance/monitoring`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setup-monitoring',
          thresholds
        })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Performance monitoring setup completed');
        console.log(`📊 Configured ${thresholds.length} performance thresholds`);
        
        thresholds.forEach(threshold => {
          console.log(`   ${threshold.metric}: Warning ${threshold.warning}${threshold.unit}, Critical ${threshold.critical}${threshold.unit}`);
        });
      } else {
        console.error('❌ Monitoring setup failed:', result.error);
      }
    } catch (error) {
      console.error('❌ Monitoring setup error:', error.message);
    }
  }

  // 驗證系統在高負載下的穩定性
  async validateStability() {
    console.log('\n🔍 Validating system stability under high load...\n');

    const stabilityTests = [
      { name: 'Sustained Load', users: 1000, duration: 300 }, // 5 minutes
      { name: 'Peak Load', users: 1500, duration: 180 }, // 3 minutes
      { name: 'Burst Load', users: 2000, duration: 60 }   // 1 minute
    ];

    let allTestsPassed = true;

    for (const test of stabilityTests) {
      console.log(`🔄 Running ${test.name} test (${test.users} users for ${test.duration}s)...`);
      
      try {
        const response = await fetch(`${this.baseUrl}/api/performance/benchmark`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'load-test',
            config: {
              endpoint: '/api/courses',
              concurrentUsers: test.users,
              duration: test.duration,
              rampUpTime: 30,
              testType: 'api'
            }
          })
        });

        const result = await response.json();
        
        if (result.success) {
          const benchmark = result.data.benchmark;
          const passed = benchmark.metrics.errorRate < 5 && 
                        benchmark.metrics.responseTime < 5000 &&
                        benchmark.metrics.cpuUsage < 95;
          
          console.log(`${passed ? '✅' : '❌'} ${test.name}:`);
          console.log(`   Response Time: ${benchmark.metrics.responseTime.toFixed(2)}ms`);
          console.log(`   Error Rate: ${benchmark.metrics.errorRate.toFixed(2)}%`);
          console.log(`   CPU Usage: ${benchmark.metrics.cpuUsage.toFixed(1)}%`);
          console.log(`   Memory Usage: ${benchmark.metrics.memoryUsage.toFixed(1)}%`);
          
          if (!passed) {
            allTestsPassed = false;
            console.log(`   ⚠️  Stability test failed - system unstable under ${test.users} users`);
          }
        } else {
          console.error(`❌ ${test.name} failed:`, result.error);
          allTestsPassed = false;
        }
      } catch (error) {
        console.error(`❌ ${test.name} error:`, error.message);
        allTestsPassed = false;
      }
      
      // Wait between stability tests
      await this.sleep(30000);
    }

    if (allTestsPassed) {
      console.log('\n✅ System stability validation PASSED');
      console.log('🎉 System is stable under high load conditions');
    } else {
      console.log('\n❌ System stability validation FAILED');
      console.log('⚠️  System requires optimization before production deployment');
    }

    return allTestsPassed;
  }

  // 生成性能報告
  async generateReport() {
    console.log('\n📋 Generating performance benchmark report...\n');

    try {
      const response = await fetch(`${this.baseUrl}/api/performance/optimization?action=report`);
      const result = await response.json();
      
      if (result.success) {
        const report = result.data;
        
        console.log('📊 PERFORMANCE BENCHMARK REPORT');
        console.log('================================\n');
        
        console.log('Summary:');
        console.log(`  Total Recommendations: ${report.summary.totalRecommendations}`);
        console.log(`  Implemented Optimizations: ${report.summary.implementedOptimizations}`);
        console.log(`  Average Improvement: ${report.summary.averageImprovement.toFixed(1)}%`);
        console.log(`  Top Bottlenecks: ${report.summary.topBottlenecks.join(', ')}\n`);
        
        console.log('Test Results Summary:');
        const passedTests = this.results.filter(r => r.passed).length;
        const totalTests = this.results.length;
        console.log(`  Tests Passed: ${passedTests}/${totalTests}`);
        console.log(`  Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`);
        
        if (this.results.length > 0) {
          console.log('Individual Test Results:');
          this.results.forEach(result => {
            console.log(`  ${result.test}: ${result.passed ? '✅ PASS' : '❌ FAIL'}`);
            console.log(`    Response Time: ${result.benchmark.metrics.responseTime.toFixed(2)}ms`);
            console.log(`    Error Rate: ${result.benchmark.metrics.errorRate.toFixed(2)}%`);
            if (result.alerts.length > 0) {
              console.log(`    Alerts: ${result.alerts.length}`);
            }
          });
        }
        
        console.log('\n🎯 RECOMMENDATIONS FOR PRODUCTION:');
        if (passedTests === totalTests) {
          console.log('✅ System is ready for production deployment');
          console.log('✅ All performance benchmarks passed');
          console.log('✅ System stability validated under high load');
        } else {
          console.log('⚠️  System requires optimization before production');
          console.log('⚠️  Address failing tests and implement recommended optimizations');
          console.log('⚠️  Re-run benchmarks after optimizations');
        }
        
      } else {
        console.error('❌ Failed to generate report:', result.error);
      }
    } catch (error) {
      console.error('❌ Report generation error:', error.message);
    }
  }

  // 輔助方法
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 主執行方法
  async run() {
    console.log('🚀 Starting Performance Benchmark Suite');
    console.log('========================================\n');
    
    const startTime = performance.now();
    
    try {
      // 1. 建立基準線
      await this.establishBaseline();
      
      // 2. 設置監控
      await this.setupMonitoring();
      
      // 3. 運行負載測試
      await this.runLoadTests();
      
      // 4. 運行壓力測試
      await this.runStressTest();
      
      // 5. 優化關鍵路徑
      await this.optimizeCriticalPaths();
      
      // 6. 驗證穩定性
      const stabilityPassed = await this.validateStability();
      
      // 7. 生成報告
      await this.generateReport();
      
      const endTime = performance.now();
      const totalTime = ((endTime - startTime) / 1000 / 60).toFixed(1);
      
      console.log(`\n⏱️  Total benchmark time: ${totalTime} minutes`);
      console.log(stabilityPassed ? '🎉 Benchmark suite completed successfully!' : '⚠️  Benchmark suite completed with issues');
      
    } catch (error) {
      console.error('❌ Benchmark suite failed:', error);
      process.exit(1);
    }
  }
}

// 運行基準測試
if (require.main === module) {
  const runner = new PerformanceBenchmarkRunner();
  runner.run().catch(console.error);
}

module.exports = PerformanceBenchmarkRunner;