'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';

interface SystemMetrics {
  timestamp: string;
  cpu: { usage: number; loadAverage: number[] };
  memory: { used: number; total: number; percentage: number };
  disk: { used: number; total: number; percentage: number };
  application: { activeUsers: number; requestsPerMinute: number; errorRate: number; responseTime: number };
}

interface BackupStats {
  total: number;
  successful: number;
  failed: number;
  totalSize: number;
  lastBackup?: string;
}

interface HealthStatus {
  status: 'healthy' | 'warning' | 'critical';
  score: number;
  issues: string[];
}

export default function ProductionDashboard() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [backupStats, setBackupStats] = useState<BackupStats | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // 每 30 秒更新
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // 並行載入所有數據
      const [metricsRes, backupRes, healthRes] = await Promise.all([
        fetch('/api/admin/production/monitoring?action=metrics'),
        fetch('/api/admin/production/backup?action=stats'),
        fetch('/api/admin/production/monitoring?action=health')
      ]);

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData);
      }

      if (backupRes.ok) {
        const backupData = await backupRes.json();
        setBackupStats(backupData);
      }

      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setHealthStatus(healthData);
      }

      setError(null);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDatabaseOptimization = async () => {
    try {
      const response = await fetch('/api/admin/production/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'optimize' })
      });

      if (response.ok) {
        alert('Database optimization completed successfully');
      } else {
        alert('Database optimization failed');
      }
    } catch (error) {
      alert('Error during database optimization');
    }
  };

  const handleBackupNow = async (type: 'database' | 'files') => {
    try {
      const response = await fetch('/api/admin/production/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'backup', type })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`${type} backup ${result.success ? 'completed' : 'failed'}`);
        loadDashboardData(); // 重新載入數據
      } else {
        alert(`${type} backup failed`);
      }
    } catch (error) {
      alert(`Error during ${type} backup`);
    }
  };

  const handleCachePurge = async () => {
    try {
      const response = await fetch('/api/admin/production/cdn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'purge_cache' })
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
      } else {
        alert('Cache purge failed');
      }
    } catch (error) {
      alert('Error during cache purge');
    }
  };

  const handleAssetOptimization = async () => {
    try {
      const response = await fetch('/api/admin/production/cdn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'optimize_assets' })
      });

      if (response.ok) {
        alert('Static assets optimization completed');
      } else {
        alert('Asset optimization failed');
      }
    } catch (error) {
      alert('Error during asset optimization');
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (loading && !metrics) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading production dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Production Environment Dashboard</h1>
        <Button onClick={loadDashboardData} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <div>{error}</div>
        </Alert>
      )}

      {/* System Health Overview */}
      {healthStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              System Health
              <span className={`text-sm font-medium ${getStatusColor(healthStatus.status)}`}>
                {healthStatus.status.toUpperCase()}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="text-2xl font-bold">
                Health Score: {healthStatus.score}/100
              </div>
              <div className={`px-3 py-1 rounded-full text-sm ${
                healthStatus.status === 'healthy' ? 'bg-green-100 text-green-800' :
                healthStatus.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {healthStatus.status}
              </div>
            </div>
            {healthStatus.issues.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Issues:</h4>
                <ul className="list-disc list-inside space-y-1">
                  {healthStatus.issues.map((issue, index) => (
                    <li key={index} className="text-sm text-gray-600">{issue}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="monitoring" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="backup">Backup & Recovery</TabsTrigger>
          <TabsTrigger value="cdn">CDN & Assets</TabsTrigger>
        </TabsList>

        {/* Monitoring Tab */}
        <TabsContent value="monitoring" className="space-y-4">
          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.cpu.usage.toFixed(1)}%</div>
                  <div className="text-xs text-gray-500">
                    Load: {metrics.cpu.loadAverage.map(l => l.toFixed(2)).join(', ')}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.memory.percentage.toFixed(1)}%</div>
                  <div className="text-xs text-gray-500">
                    {formatBytes(metrics.memory.used)} / {formatBytes(metrics.memory.total)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Response Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.application.responseTime}ms</div>
                  <div className="text-xs text-gray-500">Average response time</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.application.errorRate.toFixed(1)}%</div>
                  <div className="text-xs text-gray-500">
                    {metrics.application.requestsPerMinute} req/min
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Database Tab */}
        <TabsContent value="database" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Database Optimization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Optimize database performance by analyzing queries, updating statistics, and cleaning up old data.
              </p>
              <div className="flex gap-2">
                <Button onClick={handleDatabaseOptimization}>
                  Optimize Database
                </Button>
                <Button variant="outline" onClick={() => window.open('/api/admin/production/database?action=analyze')}>
                  View Query Analysis
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backup Tab */}
        <TabsContent value="backup" className="space-y-4">
          {backupStats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Backups</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{backupStats.total}</div>
                  <div className="text-xs text-gray-500">
                    {backupStats.successful} successful, {backupStats.failed} failed
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Size</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatBytes(backupStats.totalSize)}</div>
                  <div className="text-xs text-gray-500">All backups combined</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Last Backup</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm font-bold">
                    {backupStats.lastBackup 
                      ? new Date(backupStats.lastBackup).toLocaleString()
                      : 'Never'
                    }
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Backup Operations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button onClick={() => handleBackupNow('database')}>
                  Backup Database
                </Button>
                <Button onClick={() => handleBackupNow('files')}>
                  Backup Files
                </Button>
                <Button variant="outline" onClick={() => window.open('/api/admin/production/backup?action=history')}>
                  View History
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CDN Tab */}
        <TabsContent value="cdn" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>CDN & Static Assets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Manage CDN cache and optimize static assets for better performance.
              </p>
              <div className="flex gap-2">
                <Button onClick={handleCachePurge}>
                  Purge CDN Cache
                </Button>
                <Button onClick={handleAssetOptimization}>
                  Optimize Assets
                </Button>
                <Button variant="outline" onClick={() => window.open('/api/admin/production/cdn?action=optimization_report')}>
                  View Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}