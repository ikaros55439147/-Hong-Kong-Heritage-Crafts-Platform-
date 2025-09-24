'use client'

import { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

interface HealthCheck {
  service: string
  status: 'healthy' | 'unhealthy' | 'degraded'
  responseTime: number
  details?: any
  error?: string
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  responseTime: number
  version: string
  environment: string
  checks: HealthCheck[]
  summary: {
    total: number
    healthy: number
    unhealthy: number
    degraded: number
  }
}

interface SystemMetrics {
  cpu: number
  memory: number
  disk: number
  network: number
  activeUsers: number
  requestsPerMinute: number
  errorRate: number
  avgResponseTime: number
}

export default function MonitoringPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    fetchSystemHealth()
    fetchSystemMetrics()

    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchSystemHealth()
        fetchSystemMetrics()
      }, 30000) // 每30秒刷新

      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const fetchSystemHealth = async () => {
    try {
      const response = await fetch('/api/system/health/detailed')
      const data = await response.json()
      setHealth(data)
    } catch (error) {
      console.error('獲取系統健康狀態失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSystemMetrics = async () => {
    try {
      const response = await fetch('/api/metrics')
      const data = await response.json()
      setMetrics(data)
    } catch (error) {
      console.error('獲取系統指標失敗:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800'
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800'
      case 'unhealthy':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return '✅'
      case 'degraded':
        return '⚠️'
      case 'unhealthy':
        return '❌'
      default:
        return '❓'
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">載入監控數據中...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 頁面標題 */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">系統監控</h1>
            <p className="text-gray-600">香港弱勢行業傳承平台系統健康監控</p>
          </div>
          <div className="flex space-x-4">
            <Button
              onClick={() => setAutoRefresh(!autoRefresh)}
              variant={autoRefresh ? 'default' : 'outline'}
            >
              {autoRefresh ? '停止自動刷新' : '開始自動刷新'}
            </Button>
            <Button onClick={() => {
              fetchSystemHealth()
              fetchSystemMetrics()
            }}>
              手動刷新
            </Button>
          </div>
        </div>

        {/* 系統整體狀態 */}
        {health && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>{getStatusIcon(health.status)}</span>
                <span>系統整體狀態</span>
                <Badge className={getStatusColor(health.status)}>
                  {health.status.toUpperCase()}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {health.summary.healthy}
                  </div>
                  <div className="text-sm text-gray-600">健康服務</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {health.summary.degraded}
                  </div>
                  <div className="text-sm text-gray-600">降級服務</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {health.summary.unhealthy}
                  </div>
                  <div className="text-sm text-gray-600">異常服務</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {health.responseTime}ms
                  </div>
                  <div className="text-sm text-gray-600">響應時間</div>
                </div>
              </div>
              
              <div className="mt-4 text-sm text-gray-600">
                <p>版本: {health.version} | 環境: {health.environment}</p>
                <p>最後更新: {new Date(health.timestamp).toLocaleString('zh-TW')}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 系統指標 */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">CPU使用率</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.cpu}%</div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className={`h-2 rounded-full ${
                      metrics.cpu > 80 ? 'bg-red-500' : 
                      metrics.cpu > 60 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${metrics.cpu}%` }}
                  ></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">記憶體使用率</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.memory}%</div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className={`h-2 rounded-full ${
                      metrics.memory > 80 ? 'bg-red-500' : 
                      metrics.memory > 60 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${metrics.memory}%` }}
                  ></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">活躍用戶</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.activeUsers}</div>
                <div className="text-sm text-gray-600">當前在線</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">錯誤率</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.errorRate}%</div>
                <div className={`text-sm ${
                  metrics.errorRate > 5 ? 'text-red-600' : 
                  metrics.errorRate > 2 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {metrics.errorRate > 5 ? '需要關注' : 
                   metrics.errorRate > 2 ? '輕微異常' : '正常'}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 服務狀態詳情 */}
        {health && (
          <Card>
            <CardHeader>
              <CardTitle>服務狀態詳情</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {health.checks.map((check, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{getStatusIcon(check.status)}</span>
                      <div>
                        <div className="font-medium capitalize">{check.service}</div>
                        {check.error && (
                          <div className="text-sm text-red-600">{check.error}</div>
                        )}
                        {check.details && (
                          <div className="text-sm text-gray-600">
                            {JSON.stringify(check.details, null, 2)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={getStatusColor(check.status)}>
                        {check.status}
                      </Badge>
                      <div className="text-sm text-gray-600 mt-1">
                        {check.responseTime}ms
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 快速操作 */}
        <Card>
          <CardHeader>
            <CardTitle>快速操作</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                onClick={() => window.open('http://localhost:3001', '_blank')}
                className="w-full"
              >
                📊 打開Grafana面板
              </Button>
              <Button 
                onClick={() => window.open('http://localhost:9090', '_blank')}
                className="w-full"
                variant="outline"
              >
                📈 打開Prometheus
              </Button>
              <Button 
                onClick={() => window.open('http://localhost:9093', '_blank')}
                className="w-full"
                variant="outline"
              >
                🚨 打開AlertManager
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}