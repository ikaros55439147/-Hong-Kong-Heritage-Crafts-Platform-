'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/Alert';

interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  cpuUsage: number;
  memoryUsage: number;
  dbConnections: number;
  cacheHitRate: number;
}

interface PerformanceBenchmark {
  id: string;
  testName: string;
  timestamp: string;
  endpoint?: string;
  concurrentUsers?: number;
  metrics: PerformanceMetrics;
}

interface PerformanceAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  resolved: boolean;
}

interface OptimizationRecommendation {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  estimatedImprovement: number;
}

export default function PerformanceDashboard() {
  const [benchmarks, setBenchmarks] = useState<PerformanceBenchmark[]>([]);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [recommendations, setRecommendations] = useState<OptimizationRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Load benchmarks
      const benchmarkResponse = await fetch('/api/performance/benchmark');
      const benchmarkData = await benchmarkResponse.json();
      if (benchmarkData.success) {
        setBenchmarks(benchmarkData.data || []);
      }

      // Load alerts
      const alertResponse = await fetch('/api/performance/monitoring?action=active-alerts');
      const alertData = await alertResponse.json();
      if (alertData.success) {
        setAlerts(alertData.data || []);
      }

      // Load recommendations
      const recResponse = await fetch('/api/performance/optimization?action=recommendations');
      const recData = await recResponse.json();
      if (recData.success) {
        setRecommendations(recData.data?.slice(0, 5) || []);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const runPerformanceTest = async (testType: string) => {
    try {
      setIsRunningTest(true);
      setTestResults(null);

      const config = {
        endpoint: '/api/courses',
        concurrentUsers: testType === 'load' ? 100 : testType === 'stress' ? 500 : 1000,
        duration: testType === 'baseline' ? 60 : testType === 'load' ? 120 : 180,
        rampUpTime: 10
      };

      const response = await fetch('/api/performance/benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: testType === 'baseline' ? 'establish-baseline' : 'load-test',
          config
        })
      });

      const result = await response.json();
      if (result.success) {
        setTestResults(result.data);
        await loadDashboardData(); // Refresh data
      }
    } catch (error) {
      console.error('Performance test failed:', error);
    } finally {
      setIsRunningTest(false);
    }
  };

  const runOptimization = async () => {
    try {
      const response = await fetch('/api/performance/optimization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'auto-optimize' })
      });

      const result = await response.json();
      if (result.success) {
        await loadDashboardData(); // Refresh data
        alert(`Auto-optimization completed! ${result.data.autoImplemented.length} optimizations implemented.`);
      }
    } catch (error) {
      console.error('Optimization failed:', error);
    }
  };

  const formatMetric = (value: number, unit: string) => {
    return `${value.toFixed(unit === '%' ? 1 : 0)}${unit}`;
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      default: return 'text-blue-600';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading performance dashboard...</div>
      </div>
    );
  }

  const latestBenchmark = benchmarks[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Performance Dashboard</h1>
        <div className="space-x-2">
          <Button
            onClick={() => runPerformanceTest('baseline')}
            disabled={isRunningTest}
            variant="outline"
          >
            {isRunningTest ? 'Running...' : 'Establish Baseline'}
          </Button>
          <Button
            onClick={() => runPerformanceTest('load')}
            disabled={isRunningTest}
          >
            {isRunningTest ? 'Running...' : 'Run Load Test'}
          </Button>
          <Button
            onClick={() => runPerformanceTest('stress')}
            disabled={isRunningTest}
            variant="secondary"
          >
            {isRunningTest ? 'Running...' : 'Stress Test'}
          </Button>
          <Button
            onClick={runOptimization}
            disabled={isRunningTest}
            className="bg-green-600 hover:bg-green-700"
          >
            Auto-Optimize
          </Button>
        </div>
      </div>

      {/* Test Results */}
      {testResults && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription>
            <strong>Test Completed!</strong> 
            {testResults.benchmark ? (
              <span> Response Time: {testResults.benchmark.metrics.responseTime.toFixed(2)}ms, 
                    Throughput: {testResults.benchmark.metrics.throughput.toFixed(2)} req/s, 
                    Error Rate: {testResults.benchmark.metrics.errorRate.toFixed(2)}%</span>
            ) : (
              <span> {Array.isArray(testResults) ? `${testResults.length} baselines established` : 'Test completed successfully'}</span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Current Performance Metrics */}
      {latestBenchmark && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatMetric(latestBenchmark.metrics.responseTime, 'ms')}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Target: &lt; 2000ms
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Throughput</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatMetric(latestBenchmark.metrics.throughput, ' req/s')}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Target: &gt; 50 req/s
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatMetric(latestBenchmark.metrics.errorRate, '%')}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Target: &lt; 1%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatMetric(latestBenchmark.metrics.cacheHitRate, '%')}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Target: &gt; 80%
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Active Alerts
              <span className="text-sm font-normal text-gray-500">
                {alerts.filter(a => !a.resolved).length} active
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.filter(a => !a.resolved).slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border ${getAlertColor(alert.severity)}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">
                      {alert.severity.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm mt-1">{alert.message}</p>
                </div>
              ))}
              {alerts.filter(a => !a.resolved).length === 0 && (
                <p className="text-gray-500 text-center py-4">
                  No active alerts
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Optimization Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle>Optimization Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.map((rec) => (
                <div key={rec.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">{rec.title}</h4>
                    <span className={`text-xs font-medium ${getPriorityColor(rec.priority)}`}>
                      {rec.priority.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">{rec.category}</span>
                    <span className="text-xs font-medium text-green-600">
                      +{rec.estimatedImprovement}% improvement
                    </span>
                  </div>
                </div>
              ))}
              {recommendations.length === 0 && (
                <p className="text-gray-500 text-center py-4">
                  No recommendations available
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Benchmarks */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Performance Tests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Test Name</th>
                  <th className="text-left p-2">Endpoint</th>
                  <th className="text-left p-2">Users</th>
                  <th className="text-left p-2">Response Time</th>
                  <th className="text-left p-2">Throughput</th>
                  <th className="text-left p-2">Error Rate</th>
                  <th className="text-left p-2">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {benchmarks.slice(0, 10).map((benchmark) => (
                  <tr key={benchmark.id} className="border-b">
                    <td className="p-2">{benchmark.testName}</td>
                    <td className="p-2 font-mono text-xs">
                      {benchmark.endpoint || '-'}
                    </td>
                    <td className="p-2">{benchmark.concurrentUsers || '-'}</td>
                    <td className="p-2">
                      {formatMetric(benchmark.metrics.responseTime, 'ms')}
                    </td>
                    <td className="p-2">
                      {formatMetric(benchmark.metrics.throughput, ' req/s')}
                    </td>
                    <td className="p-2">
                      {formatMetric(benchmark.metrics.errorRate, '%')}
                    </td>
                    <td className="p-2 text-xs text-gray-500">
                      {new Date(benchmark.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {benchmarks.length === 0 && (
              <p className="text-gray-500 text-center py-8">
                No performance tests available. Run a test to get started.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* System Resource Usage */}
      {latestBenchmark && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      latestBenchmark.metrics.cpuUsage > 90 ? 'bg-red-500' :
                      latestBenchmark.metrics.cpuUsage > 70 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(latestBenchmark.metrics.cpuUsage, 100)}%` }}
                  />
                </div>
                <span className="text-sm font-medium">
                  {formatMetric(latestBenchmark.metrics.cpuUsage, '%')}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      latestBenchmark.metrics.memoryUsage > 90 ? 'bg-red-500' :
                      latestBenchmark.metrics.memoryUsage > 70 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(latestBenchmark.metrics.memoryUsage, 100)}%` }}
                  />
                </div>
                <span className="text-sm font-medium">
                  {formatMetric(latestBenchmark.metrics.memoryUsage, '%')}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">DB Connections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {latestBenchmark.metrics.dbConnections}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Active connections
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}