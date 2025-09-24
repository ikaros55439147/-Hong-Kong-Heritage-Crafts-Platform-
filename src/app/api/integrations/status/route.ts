import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { getServiceStatus, validateThirdPartyConfig } from '@/lib/config/third-party.config'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    // Only allow admin users to check service status
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Get service status
    const serviceStatus = getServiceStatus()
    
    // Validate configuration
    const configValidation = validateThirdPartyConfig()
    
    // Test basic connectivity (without making actual API calls)
    const connectivityTests = {
      database: await testDatabaseConnection(),
      redis: await testRedisConnection()
    }

    return NextResponse.json({
      services: serviceStatus,
      configuration: {
        isValid: configValidation.isValid,
        errors: configValidation.errors
      },
      connectivity: connectivityTests,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Service status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check service status' },
      { status: 500 }
    )
  }
}

async function testDatabaseConnection(): Promise<{ available: boolean; error?: string }> {
  try {
    const { prisma } = await import('@/lib/database')
    await prisma.$queryRaw`SELECT 1`
    return { available: true }
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : 'Database connection failed'
    }
  }
}

async function testRedisConnection(): Promise<{ available: boolean; error?: string }> {
  try {
    // Test Redis connection if configured
    if (process.env.REDIS_URL) {
      const { createClient } = await import('redis')
      const client = createClient({ url: process.env.REDIS_URL })
      await client.connect()
      await client.ping()
      await client.disconnect()
      return { available: true }
    } else {
      return { available: false, error: 'Redis not configured' }
    }
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : 'Redis connection failed'
    }
  }
}