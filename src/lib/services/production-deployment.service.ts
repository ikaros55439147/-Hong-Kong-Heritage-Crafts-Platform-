import { logger } from '@/lib/utils/logger'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface DeploymentConfig {
  environment: 'production' | 'staging'
  version: string
  rollbackVersion?: string
  healthCheckUrl: string
  maxHealthCheckAttempts: number
  healthCheckInterval: number
}

export interface DeploymentStatus {
  id: string
  status: 'pending' | 'running' | 'success' | 'failed' | 'rolled_back'
  startTime: Date
  endTime?: Date
  version: string
  environment: string
  logs: string[]
  error?: string
}

export class ProductionDeploymentService {
  private deployments: Map<string, DeploymentStatus> = new Map()

  async deploy(config: DeploymentConfig): Promise<string> {
    const deploymentId = this.generateDeploymentId()
    
    const deployment: DeploymentStatus = {
      id: deploymentId,
      status: 'pending',
      startTime: new Date(),
      version: config.version,
      environment: config.environment,
      logs: []
    }

    this.deployments.set(deploymentId, deployment)

    // 異步執行部署
    this.executeDeployment(deploymentId, config).catch(error => {
      logger.error('部署執行失敗', { deploymentId, error })
      this.updateDeploymentStatus(deploymentId, 'failed', error.message)
    })

    return deploymentId
  }

  async getDeploymentStatus(deploymentId: string): Promise<DeploymentStatus | null> {
    return this.deployments.get(deploymentId) || null
  }

  async getAllDeployments(): Promise<DeploymentStatus[]> {
    return Array.from(this.deployments.values())
  }

  async rollback(deploymentId: string, rollbackVersion: string): Promise<void> {
    const deployment = this.deployments.get(deploymentId)
    if (!deployment) {
      throw new Error('部署記錄不存在')
    }

    logger.info('開始回滾部署', { deploymentId, rollbackVersion })

    try {
      // 執行回滾腳本
      await this.executeRollback(rollbackVersion)
      
      this.updateDeploymentStatus(deploymentId, 'rolled_back')
      this.addDeploymentLog(deploymentId, `回滾到版本 ${rollbackVersion} 成功`)

    } catch (error) {
      logger.error('回滾失敗', { deploymentId, error })
      this.addDeploymentLog(deploymentId, `回滾失敗: ${error}`)
      throw error
    }
  }

  private async executeDeployment(deploymentId: string, config: DeploymentConfig): Promise<void> {
    this.updateDeploymentStatus(deploymentId, 'running')
    this.addDeploymentLog(deploymentId, '開始部署流程')

    try {
      // 1. 環境檢查
      await this.checkEnvironment(deploymentId)
      
      // 2. 數據庫備份
      await this.backupDatabase(deploymentId)
      
      // 3. 數據庫遷移
      await this.runDatabaseMigration(deploymentId)
      
      // 4. 構建應用程式
      await this.buildApplication(deploymentId, config.version)
      
      // 5. 部署到生產環境
      await this.deployToProduction(deploymentId)
      
      // 6. 健康檢查
      await this.performHealthCheck(deploymentId, config)
      
      // 7. 設置監控
      await this.setupMonitoring(deploymentId)
      
      // 8. 部署後驗證
      await this.postDeploymentVerification(deploymentId)

      this.updateDeploymentStatus(deploymentId, 'success')
      this.addDeploymentLog(deploymentId, '部署成功完成')

    } catch (error) {
      logger.error('部署失敗', { deploymentId, error })
      this.updateDeploymentStatus(deploymentId, 'failed', error.message)
      this.addDeploymentLog(deploymentId, `部署失敗: ${error.message}`)
      
      // 自動回滾
      if (config.rollbackVersion) {
        await this.executeRollback(config.rollbackVersion)
      }
    }
  }

  private async checkEnvironment(deploymentId: string): Promise<void> {
    this.addDeploymentLog(deploymentId, '檢查環境變數...')
    
    const requiredVars = [
      'DATABASE_URL',
      'REDIS_URL',
      'JWT_SECRET',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'STRIPE_SECRET_KEY',
      'SENDGRID_API_KEY'
    ]

    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        throw new Error(`缺少環境變數: ${varName}`)
      }
    }

    this.addDeploymentLog(deploymentId, '環境變數檢查完成')
  }

  private async backupDatabase(deploymentId: string): Promise<void> {
    this.addDeploymentLog(deploymentId, '備份數據庫...')
    
    try {
      const { stdout } = await execAsync('npm run db:backup')
      this.addDeploymentLog(deploymentId, `數據庫備份完成: ${stdout}`)
    } catch (error) {
      throw new Error(`數據庫備份失敗: ${error}`)
    }
  }

  private async runDatabaseMigration(deploymentId: string): Promise<void> {
    this.addDeploymentLog(deploymentId, '執行數據庫遷移...')
    
    try {
      const { stdout } = await execAsync('npx prisma migrate deploy')
      this.addDeploymentLog(deploymentId, `數據庫遷移完成: ${stdout}`)
    } catch (error) {
      throw new Error(`數據庫遷移失敗: ${error}`)
    }
  }

  private async buildApplication(deploymentId: string, version: string): Promise<void> {
    this.addDeploymentLog(deploymentId, `構建應用程式版本 ${version}...`)
    
    try {
      // 清理舊的構建文件
      await execAsync('rm -rf .next dist')
      
      // 安裝依賴
      const { stdout: installOutput } = await execAsync('npm ci --only=production')
      this.addDeploymentLog(deploymentId, `依賴安裝完成: ${installOutput}`)
      
      // 構建應用程式
      const { stdout: buildOutput } = await execAsync('npm run build')
      this.addDeploymentLog(deploymentId, `應用程式構建完成: ${buildOutput}`)
      
    } catch (error) {
      throw new Error(`應用程式構建失敗: ${error}`)
    }
  }

  private async deployToProduction(deploymentId: string): Promise<void> {
    this.addDeploymentLog(deploymentId, '部署到生產環境...')
    
    try {
      // 停止現有服務
      await execAsync('docker-compose -f docker-compose.prod.yml down')
      this.addDeploymentLog(deploymentId, '現有服務已停止')
      
      // 拉取最新鏡像
      await execAsync('docker-compose -f docker-compose.prod.yml pull')
      this.addDeploymentLog(deploymentId, '最新鏡像已拉取')
      
      // 啟動服務
      await execAsync('docker-compose -f docker-compose.prod.yml up -d')
      this.addDeploymentLog(deploymentId, '生產服務已啟動')
      
      // 等待服務啟動
      await new Promise(resolve => setTimeout(resolve, 30000))
      
    } catch (error) {
      throw new Error(`生產環境部署失敗: ${error}`)
    }
  }

  private async performHealthCheck(deploymentId: string, config: DeploymentConfig): Promise<void> {
    this.addDeploymentLog(deploymentId, '執行健康檢查...')
    
    let attempts = 0
    const maxAttempts = config.maxHealthCheckAttempts
    
    while (attempts < maxAttempts) {
      try {
        const response = await fetch(config.healthCheckUrl)
        if (response.ok) {
          this.addDeploymentLog(deploymentId, '健康檢查通過')
          return
        }
      } catch (error) {
        // 忽略錯誤，繼續嘗試
      }
      
      attempts++
      this.addDeploymentLog(deploymentId, `健康檢查嘗試 ${attempts}/${maxAttempts}`)
      
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, config.healthCheckInterval))
      }
    }
    
    throw new Error('健康檢查失敗')
  }

  private async setupMonitoring(deploymentId: string): Promise<void> {
    this.addDeploymentLog(deploymentId, '設置監控系統...')
    
    try {
      // 啟動監控服務
      await execAsync('docker-compose -f monitoring/docker-compose.monitoring.yml up -d')
      this.addDeploymentLog(deploymentId, '監控服務已啟動')
      
      // 配置告警規則
      await execAsync('npm run monitoring:setup-alerts')
      this.addDeploymentLog(deploymentId, '告警規則已配置')
      
    } catch (error) {
      // 監控設置失敗不應該導致部署失敗
      logger.warn('監控設置失敗', { deploymentId, error })
      this.addDeploymentLog(deploymentId, `監控設置警告: ${error}`)
    }
  }

  private async postDeploymentVerification(deploymentId: string): Promise<void> {
    this.addDeploymentLog(deploymentId, '執行部署後驗證...')
    
    try {
      // 執行關鍵功能測試
      await execAsync('npm run test:production')
      this.addDeploymentLog(deploymentId, '關鍵功能測試通過')
      
      // 檢查性能指標
      await execAsync('npm run performance:check')
      this.addDeploymentLog(deploymentId, '性能指標檢查通過')
      
      // 驗證安全配置
      await execAsync('npm run security:verify')
      this.addDeploymentLog(deploymentId, '安全配置驗證通過')
      
    } catch (error) {
      throw new Error(`部署後驗證失敗: ${error}`)
    }
  }

  private async executeRollback(rollbackVersion: string): Promise<void> {
    logger.info('執行回滾', { rollbackVersion })
    
    try {
      await execAsync(`npm run deployment:rollback -- --version=${rollbackVersion}`)
      logger.info('回滾完成', { rollbackVersion })
    } catch (error) {
      logger.error('回滾失敗', { rollbackVersion, error })
      throw error
    }
  }

  private updateDeploymentStatus(
    deploymentId: string, 
    status: DeploymentStatus['status'], 
    error?: string
  ): void {
    const deployment = this.deployments.get(deploymentId)
    if (deployment) {
      deployment.status = status
      deployment.error = error
      if (status === 'success' || status === 'failed' || status === 'rolled_back') {
        deployment.endTime = new Date()
      }
    }
  }

  private addDeploymentLog(deploymentId: string, message: string): void {
    const deployment = this.deployments.get(deploymentId)
    if (deployment) {
      const timestamp = new Date().toISOString()
      deployment.logs.push(`[${timestamp}] ${message}`)
      logger.info('部署日誌', { deploymentId, message })
    }
  }

  private generateDeploymentId(): string {
    return `deploy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

export const productionDeploymentService = new ProductionDeploymentService()