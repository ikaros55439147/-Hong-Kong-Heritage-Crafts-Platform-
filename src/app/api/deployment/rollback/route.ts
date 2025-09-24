import { NextRequest, NextResponse } from 'next/server'
import { productionDeploymentService } from '@/lib/services/production-deployment.service'
import { logger } from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
  try {
    const { deploymentId, rollbackVersion } = await request.json()
    
    if (!deploymentId || !rollbackVersion) {
      return NextResponse.json(
        { error: '缺少部署ID或回滾版本' },
        { status: 400 }
      )
    }

    logger.info('開始回滾部署', { deploymentId, rollbackVersion })

    await productionDeploymentService.rollback(deploymentId, rollbackVersion)

    return NextResponse.json({
      success: true,
      message: '回滾完成'
    })

  } catch (error) {
    logger.error('回滾失敗', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '回滾失敗' },
      { status: 500 }
    )
  }
}