import { NextRequest, NextResponse } from 'next/server'
import { productionDeploymentService, DeploymentConfig } from '@/lib/services/production-deployment.service'
import { logger } from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
  try {
    const config: DeploymentConfig = await request.json()
    
    // 驗證配置
    if (!config.version || !config.environment || !config.healthCheckUrl) {
      return NextResponse.json(
        { error: '缺少必要的部署配置' },
        { status: 400 }
      )
    }

    // 設置默認值
    const deploymentConfig: DeploymentConfig = {
      ...config,
      maxHealthCheckAttempts: config.maxHealthCheckAttempts || 10,
      healthCheckInterval: config.healthCheckInterval || 10000
    }

    logger.info('開始部署', { config: deploymentConfig })

    const deploymentId = await productionDeploymentService.deploy(deploymentConfig)

    return NextResponse.json({
      success: true,
      deploymentId,
      message: '部署已開始'
    })

  } catch (error) {
    logger.error('部署請求失敗', error)
    return NextResponse.json(
      { error: '部署請求失敗' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const deploymentId = searchParams.get('id')

    if (deploymentId) {
      // 獲取特定部署狀態
      const deployment = await productionDeploymentService.getDeploymentStatus(deploymentId)
      
      if (!deployment) {
        return NextResponse.json(
          { error: '部署記錄不存在' },
          { status: 404 }
        )
      }

      return NextResponse.json(deployment)
    } else {
      // 獲取所有部署記錄
      const deployments = await productionDeploymentService.getAllDeployments()
      return NextResponse.json(deployments)
    }

  } catch (error) {
    logger.error('獲取部署狀態失敗', error)
    return NextResponse.json(
      { error: '獲取部署狀態失敗' },
      { status: 500 }
    )
  }
}