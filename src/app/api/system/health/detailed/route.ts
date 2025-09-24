import { NextResponse } from 'next/server'
import { prisma } from '@/lib/database'
import { redis } from '@/lib/redis'
import { logger } from '@/lib/utils/logger'

interface HealthCheck {
  service: string
  status: 'healthy' | 'unhealthy' | 'degraded'
  responseTime: number
  details?: any
  error?: string
}

export async function GET() {
  const startTime = Date.now()
  const healthChecks: HealthCheck[] = []

  try {
    // 檢查數據庫連接
    const dbCheck = await checkDatabase()
    healthChecks.push(dbCheck)

    // 檢查Redis連接
    const redisCheck = await checkRedis()
    healthChecks.push(redisCheck)

    // 檢查外部服務
    const externalChecks = await checkExternalServices()
    healthChecks.push(...externalChecks)

    // 檢查系統資源
    const systemCheck = await checkSystemResources()
    healthChecks.push(systemCheck)

    // 計算整體健康狀態
    const overallStatus = calculateOverallStatus(healthChecks)
    const totalResponseTime = Date.now() - startTime

    const response = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTime: totalResponseTime,
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: healthChecks,
      summary: {
        total: healthChecks.length,
        healthy: healthChecks.filter(c => c.status === 'healthy').length,
        unhealthy: healthChecks.filter(c => c.status === 'unhealthy').length,
        degraded: healthChecks.filter(c => c.status === 'degraded').length
      }
    }

    // 記錄健康檢查結果
    logger.info('系統健康檢查完成', {
      status: overallStatus,
      responseTime: totalResponseTime,
      summary: response.summary
    })

    const statusCode = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503

    return NextResponse.json(response, { status: statusCode })

  } catch (error) {
    logger.error('健康檢查失敗', error)
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      error: '健康檢查執行失敗',
      checks: healthChecks
    }, { status: 503 })
  }
}

async function checkDatabase(): Promise<HealthCheck> {
  const startTime = Date.now()
  
  try {
    // 執行簡單的數據庫查詢
    await prisma.$queryRaw`SELECT 1`
    
    // 檢查數據庫連接池狀態
    const connectionInfo = await prisma.$queryRaw`
      SELECT 
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections
      FROM pg_stat_activity 
      WHERE datname = current_database()
    ` as any[]

    const responseTime = Date.now() - startTime
    
    return {
      service: 'database',
      status: responseTime < 1000 ? 'healthy' : 'degraded',
      responseTime,
      details: {
        type: 'PostgreSQL',
        connections: connectionInfo[0]
      }
    }
  } catch (error) {
    return {
      service: 'database',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : '數據庫連接失敗'
    }
  }
}

async function checkRedis(): Promise<HealthCheck> {
  const startTime = Date.now()
  
  try {
    // 測試Redis連接
    await redis.ping()
    
    // 獲取Redis信息
    const info = await redis.info('memory')
    const memoryInfo = parseRedisInfo(info)
    
    const responseTime = Date.now() - startTime
    
    return {
      service: 'redis',
      status: responseTime < 500 ? 'healthy' : 'degraded',
      responseTime,
      details: {
        memory: memoryInfo
      }
    }
  } catch (error) {
    return {
      service: 'redis',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Redis連接失敗'
    }
  }
}

async function checkExternalServices(): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = []
  
  // 檢查AWS S3
  checks.push(await checkS3())
  
  // 檢查支付服務
  checks.push(await checkPaymentServices())
  
  // 檢查郵件服務
  checks.push(await checkEmailService())
  
  return checks
}

async function checkS3(): Promise<HealthCheck> {
  const startTime = Date.now()
  
  try {
    // 這裡應該檢查S3連接
    // 暫時模擬檢查
    const responseTime = Date.now() - startTime
    
    return {
      service: 's3',
      status: 'healthy',
      responseTime,
      details: {
        bucket: process.env.AWS_S3_BUCKET || 'hk-heritage-media'
      }
    }
  } catch (error) {
    return {
      service: 's3',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'S3連接失敗'
    }
  }
}

async function checkPaymentServices(): Promise<HealthCheck> {
  const startTime = Date.now()
  
  try {
    // 檢查Stripe API狀態
    const response = await fetch('https://status.stripe.com/api/v2/status.json')
    const status = await response.json()
    
    const responseTime = Date.now() - startTime
    
    return {
      service: 'payment',
      status: status.status.indicator === 'none' ? 'healthy' : 'degraded',
      responseTime,
      details: {
        provider: 'Stripe',
        status: status.status.description
      }
    }
  } catch (error) {
    return {
      service: 'payment',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : '支付服務檢查失敗'
    }
  }
}

async function checkEmailService(): Promise<HealthCheck> {
  const startTime = Date.now()
  
  try {
    // 這裡應該檢查郵件服務狀態
    // 暫時模擬檢查
    const responseTime = Date.now() - startTime
    
    return {
      service: 'email',
      status: 'healthy',
      responseTime,
      details: {
        provider: 'SendGrid'
      }
    }
  } catch (error) {
    return {
      service: 'email',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : '郵件服務檢查失敗'
    }
  }
}

async function checkSystemResources(): Promise<HealthCheck> {
  const startTime = Date.now()
  
  try {
    const memoryUsage = process.memoryUsage()
    const cpuUsage = process.cpuUsage()
    
    // 計算記憶體使用率
    const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
    
    const responseTime = Date.now() - startTime
    
    // 根據資源使用情況判斷狀態
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    if (memoryUsagePercent > 90) {
      status = 'unhealthy'
    } else if (memoryUsagePercent > 75) {
      status = 'degraded'
    }
    
    return {
      service: 'system',
      status,
      responseTime,
      details: {
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          usage: Math.round(memoryUsagePercent)
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        },
        uptime: Math.round(process.uptime())
      }
    }
  } catch (error) {
    return {
      service: 'system',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : '系統資源檢查失敗'
    }
  }
}

function calculateOverallStatus(checks: HealthCheck[]): 'healthy' | 'degraded' | 'unhealthy' {
  const unhealthyCount = checks.filter(c => c.status === 'unhealthy').length
  const degradedCount = checks.filter(c => c.status === 'degraded').length
  
  if (unhealthyCount > 0) {
    return 'unhealthy'
  } else if (degradedCount > 0) {
    return 'degraded'
  } else {
    return 'healthy'
  }
}

function parseRedisInfo(info: string): any {
  const lines = info.split('\r\n')
  const result: any = {}
  
  for (const line of lines) {
    if (line.includes(':')) {
      const [key, value] = line.split(':')
      result[key] = value
    }
  }
  
  return result
}