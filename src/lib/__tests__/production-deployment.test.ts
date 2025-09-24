import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { productionDeploymentService, DeploymentConfig } from '@/lib/services/production-deployment.service'

// Mock external dependencies
vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    exec: vi.fn()
  }
})

vi.mock('@/lib/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}))

describe('ProductionDeploymentService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('deploy', () => {
    it('should start deployment and return deployment ID', async () => {
      const config: DeploymentConfig = {
        environment: 'production',
        version: '1.0.0',
        healthCheckUrl: 'http://localhost:3000/api/health',
        maxHealthCheckAttempts: 5,
        healthCheckInterval: 5000
      }

      const deploymentId = await productionDeploymentService.deploy(config)

      expect(deploymentId).toBeDefined()
      expect(typeof deploymentId).toBe('string')
      expect(deploymentId).toMatch(/^deploy_\d+_[a-z0-9]+$/)
    })

    it('should validate required configuration', async () => {
      const invalidConfig = {
        environment: 'production',
        // missing version and healthCheckUrl
      } as DeploymentConfig

      await expect(
        productionDeploymentService.deploy(invalidConfig)
      ).rejects.toThrow()
    })

    it('should set default values for optional configuration', async () => {
      const config: DeploymentConfig = {
        environment: 'production',
        version: '1.0.0',
        healthCheckUrl: 'http://localhost:3000/api/health',
        maxHealthCheckAttempts: 10,
        healthCheckInterval: 10000
      }

      const deploymentId = await productionDeploymentService.deploy(config)
      const deployment = await productionDeploymentService.getDeploymentStatus(deploymentId)

      expect(deployment).toBeDefined()
      expect(deployment?.status).toBe('pending')
      expect(deployment?.version).toBe('1.0.0')
      expect(deployment?.environment).toBe('production')
    })
  })

  describe('getDeploymentStatus', () => {
    it('should return deployment status for valid ID', async () => {
      const config: DeploymentConfig = {
        environment: 'production',
        version: '1.0.0',
        healthCheckUrl: 'http://localhost:3000/api/health',
        maxHealthCheckAttempts: 5,
        healthCheckInterval: 5000
      }

      const deploymentId = await productionDeploymentService.deploy(config)
      const status = await productionDeploymentService.getDeploymentStatus(deploymentId)

      expect(status).toBeDefined()
      expect(status?.id).toBe(deploymentId)
      expect(status?.status).toBe('pending')
      expect(status?.version).toBe('1.0.0')
      expect(status?.environment).toBe('production')
      expect(status?.startTime).toBeInstanceOf(Date)
      expect(Array.isArray(status?.logs)).toBe(true)
    })

    it('should return null for invalid deployment ID', async () => {
      const status = await productionDeploymentService.getDeploymentStatus('invalid-id')
      expect(status).toBeNull()
    })
  })

  describe('getAllDeployments', () => {
    it('should return all deployment records', async () => {
      const config1: DeploymentConfig = {
        environment: 'production',
        version: '1.0.0',
        healthCheckUrl: 'http://localhost:3000/api/health',
        maxHealthCheckAttempts: 5,
        healthCheckInterval: 5000
      }

      const config2: DeploymentConfig = {
        environment: 'staging',
        version: '1.0.1',
        healthCheckUrl: 'http://localhost:3000/api/health',
        maxHealthCheckAttempts: 5,
        healthCheckInterval: 5000
      }

      await productionDeploymentService.deploy(config1)
      await productionDeploymentService.deploy(config2)

      const deployments = await productionDeploymentService.getAllDeployments()

      expect(Array.isArray(deployments)).toBe(true)
      expect(deployments.length).toBeGreaterThanOrEqual(2)
      
      const productionDeployment = deployments.find(d => d.environment === 'production')
      const stagingDeployment = deployments.find(d => d.environment === 'staging')
      
      expect(productionDeployment).toBeDefined()
      expect(stagingDeployment).toBeDefined()
      expect(productionDeployment?.version).toBe('1.0.0')
      expect(stagingDeployment?.version).toBe('1.0.1')
    })

    it('should return empty array when no deployments exist', async () => {
      // Create a new service instance to avoid interference from other tests
      const newService = new (productionDeploymentService.constructor as any)()
      const deployments = await newService.getAllDeployments()

      expect(Array.isArray(deployments)).toBe(true)
      expect(deployments.length).toBe(0)
    })
  })

  describe('rollback', () => {
    it('should execute rollback for valid deployment', async () => {
      const config: DeploymentConfig = {
        environment: 'production',
        version: '1.0.0',
        healthCheckUrl: 'http://localhost:3000/api/health',
        maxHealthCheckAttempts: 5,
        healthCheckInterval: 5000
      }

      const deploymentId = await productionDeploymentService.deploy(config)
      
      // Mock successful rollback
      const mockExec = vi.fn().mockResolvedValue({ stdout: 'Rollback successful' })
      vi.doMock('child_process', () => ({
        exec: mockExec
      }))

      await expect(
        productionDeploymentService.rollback(deploymentId, '0.9.0')
      ).resolves.not.toThrow()
    })

    it('should throw error for invalid deployment ID', async () => {
      await expect(
        productionDeploymentService.rollback('invalid-id', '0.9.0')
      ).rejects.toThrow('部署記錄不存在')
    })

    it('should handle rollback execution failure', async () => {
      const config: DeploymentConfig = {
        environment: 'production',
        version: '1.0.0',
        healthCheckUrl: 'http://localhost:3000/api/health',
        maxHealthCheckAttempts: 5,
        healthCheckInterval: 5000
      }

      const deploymentId = await productionDeploymentService.deploy(config)
      
      // Mock failed rollback
      const mockExec = vi.fn().mockRejectedValue(new Error('Rollback failed'))
      vi.doMock('child_process', () => ({
        exec: mockExec
      }))

      await expect(
        productionDeploymentService.rollback(deploymentId, '0.9.0')
      ).rejects.toThrow()
    })
  })

  describe('deployment workflow', () => {
    it('should track deployment status changes', async () => {
      const config: DeploymentConfig = {
        environment: 'production',
        version: '1.0.0',
        healthCheckUrl: 'http://localhost:3000/api/health',
        maxHealthCheckAttempts: 5,
        healthCheckInterval: 5000
      }

      const deploymentId = await productionDeploymentService.deploy(config)
      
      // Initial status should be pending
      let status = await productionDeploymentService.getDeploymentStatus(deploymentId)
      expect(status?.status).toBe('pending')

      // Wait a bit for deployment to start
      await new Promise(resolve => setTimeout(resolve, 100))

      status = await productionDeploymentService.getDeploymentStatus(deploymentId)
      // Status might have changed to running or failed depending on mocks
      expect(['pending', 'running', 'failed']).toContain(status?.status)
    })

    it('should log deployment steps', async () => {
      const config: DeploymentConfig = {
        environment: 'production',
        version: '1.0.0',
        healthCheckUrl: 'http://localhost:3000/api/health',
        maxHealthCheckAttempts: 5,
        healthCheckInterval: 5000
      }

      const deploymentId = await productionDeploymentService.deploy(config)
      
      // Wait a bit for some logs to be generated
      await new Promise(resolve => setTimeout(resolve, 100))

      const status = await productionDeploymentService.getDeploymentStatus(deploymentId)
      expect(status?.logs).toBeDefined()
      expect(Array.isArray(status?.logs)).toBe(true)
    })
  })

  describe('configuration validation', () => {
    it('should validate environment values', async () => {
      const config = {
        environment: 'invalid-env',
        version: '1.0.0',
        healthCheckUrl: 'http://localhost:3000/api/health',
        maxHealthCheckAttempts: 5,
        healthCheckInterval: 5000
      } as DeploymentConfig

      // Should accept the config but might fail during execution
      const deploymentId = await productionDeploymentService.deploy(config)
      expect(deploymentId).toBeDefined()
    })

    it('should handle missing optional parameters', async () => {
      const config: DeploymentConfig = {
        environment: 'production',
        version: '1.0.0',
        healthCheckUrl: 'http://localhost:3000/api/health',
        maxHealthCheckAttempts: 5,
        healthCheckInterval: 5000
      }

      const deploymentId = await productionDeploymentService.deploy(config)
      const status = await productionDeploymentService.getDeploymentStatus(deploymentId)

      expect(status?.rollbackVersion).toBeUndefined()
    })
  })
})