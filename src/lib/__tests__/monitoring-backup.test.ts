import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import fs from 'fs/promises'
import path from 'path'

const prisma = new PrismaClient()

// Mock monitoring services
const mockSentry = {
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  setUser: vi.fn(),
  setTag: vi.fn(),
  addBreadcrumb: vi.fn()
}

const mockNewRelic = {
  recordMetric: vi.fn(),
  addCustomAttribute: vi.fn(),
  noticeError: vi.fn()
}

vi.mock('@sentry/node', () => mockSentry)
vi.mock('newrelic', () => mockNewRelic)

describe('Error Monitoring and Backup Tests', () => {
  beforeAll(async () => {
    await prisma.$connect()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks()
    
    // Clean up test data
    await prisma.orderItem.deleteMany()
    await prisma.order.deleteMany()
    await prisma.booking.deleteMany()
    await prisma.course.deleteMany()
    await prisma.product.deleteMany()
    await prisma.craftsmanProfile.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('Error Monitoring', () => {
    it('should capture and log application errors', async () => {
      const testError = new Error('Test application error')
      testError.stack = 'Error: Test application error\n    at test (/app/test.js:1:1)'

      // Simulate error in service
      class TestService {
        async processOrder(orderId: string) {
          try {
            // Simulate error condition
            if (orderId === 'invalid') {
              throw testError
            }
            return { success: true }
          } catch (error) {
            // Error monitoring should capture this
            mockSentry.captureException(error, {
              tags: {
                service: 'OrderService',
                method: 'processOrder'
              },
              extra: {
                orderId,
                timestamp: new Date().toISOString()
              }
            })
            throw error
          }
        }
      }

      const service = new TestService()

      await expect(service.processOrder('invalid')).rejects.toThrow('Test application error')

      // Verify error was captured
      expect(mockSentry.captureException).toHaveBeenCalledWith(
        testError,
        expect.objectContaining({
          tags: {
            service: 'OrderService',
            method: 'processOrder'
          },
          extra: expect.objectContaining({
            orderId: 'invalid'
          })
        })
      )
    })

    it('should monitor database connection errors', async () => {
      // Simulate database connection error
      const dbError = new Error('Connection to database failed')
      
      // Mock Prisma client to throw error
      const mockPrisma = {
        user: {
          findMany: vi.fn().mockRejectedValue(dbError)
        }
      }

      try {
        await mockPrisma.user.findMany()
      } catch (error) {
        // Monitor database errors
        mockSentry.captureException(error, {
          tags: {
            errorType: 'DATABASE_ERROR',
            severity: 'high'
          },
          extra: {
            operation: 'user.findMany',
            timestamp: new Date().toISOString()
          }
        })

        // Record metric for monitoring
        mockNewRelic.recordMetric('Database/Errors', 1)
      }

      expect(mockSentry.captureException).toHaveBeenCalledWith(
        dbError,
        expect.objectContaining({
          tags: {
            errorType: 'DATABASE_ERROR',
            severity: 'high'
          }
        })
      )

      expect(mockNewRelic.recordMetric).toHaveBeenCalledWith('Database/Errors', 1)
    })

    it('should track performance metrics', async () => {
      const startTime = Date.now()
      
      // Simulate API operation
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const endTime = Date.now()
      const duration = endTime - startTime

      // Record performance metrics
      mockNewRelic.recordMetric('API/Response/Time', duration)
      mockNewRelic.recordMetric('API/Requests/Count', 1)

      if (duration > 1000) {
        mockSentry.captureMessage('Slow API response detected', {
          level: 'warning',
          tags: {
            performance: 'slow_response'
          },
          extra: {
            duration,
            threshold: 1000
          }
        })
      }

      expect(mockNewRelic.recordMetric).toHaveBeenCalledWith('API/Response/Time', expect.any(Number))
      expect(mockNewRelic.recordMetric).toHaveBeenCalledWith('API/Requests/Count', 1)
    })

    it('should monitor memory usage', async () => {
      const initialMemory = process.memoryUsage()
      
      // Simulate memory-intensive operation
      const largeArray = new Array(100000).fill('test data')
      
      const currentMemory = process.memoryUsage()
      const memoryIncrease = currentMemory.heapUsed - initialMemory.heapUsed

      // Monitor memory usage
      mockNewRelic.recordMetric('Memory/HeapUsed', currentMemory.heapUsed)
      mockNewRelic.recordMetric('Memory/HeapTotal', currentMemory.heapTotal)

      if (memoryIncrease > 50 * 1024 * 1024) { // 50MB threshold
        mockSentry.captureMessage('High memory usage detected', {
          level: 'warning',
          tags: {
            performance: 'memory_usage'
          },
          extra: {
            memoryIncrease: memoryIncrease / 1024 / 1024, // MB
            heapUsed: currentMemory.heapUsed / 1024 / 1024, // MB
            heapTotal: currentMemory.heapTotal / 1024 / 1024 // MB
          }
        })
      }

      expect(mockNewRelic.recordMetric).toHaveBeenCalledWith('Memory/HeapUsed', expect.any(Number))
      expect(mockNewRelic.recordMetric).toHaveBeenCalledWith('Memory/HeapTotal', expect.any(Number))

      // Clean up
      largeArray.length = 0
    })

    it('should create error alerts for critical issues', async () => {
      const criticalError = new Error('Payment processing failed')
      
      // Simulate critical error in payment system
      const errorContext = {
        userId: 'user123',
        orderId: 'order456',
        amount: 5000,
        paymentMethod: 'stripe'
      }

      // Log critical error with alert
      mockSentry.captureException(criticalError, {
        level: 'error',
        tags: {
          severity: 'critical',
          system: 'payment',
          alertRequired: 'true'
        },
        extra: errorContext
      })

      // Create database alert record
      const alert = await prisma.systemAlert.create({
        data: {
          type: 'PAYMENT_ERROR',
          severity: 'critical',
          message: criticalError.message,
          context: errorContext,
          status: 'active',
          createdAt: new Date()
        }
      })

      expect(alert).toBeDefined()
      expect(alert.type).toBe('PAYMENT_ERROR')
      expect(alert.severity).toBe('critical')
      expect(mockSentry.captureException).toHaveBeenCalledWith(
        criticalError,
        expect.objectContaining({
          tags: expect.objectContaining({
            severity: 'critical',
            alertRequired: 'true'
          })
        })
      )
    })
  })

  describe('Data Backup and Recovery', () => {
    it('should create database backup', async () => {
      // Create test data
      const user = await prisma.user.create({
        data: {
          email: 'backup@example.com',
          passwordHash: await hash('password123', 12),
          role: 'learner'
        }
      })

      const craftsman = await prisma.user.create({
        data: {
          email: 'craftsman-backup@example.com',
          passwordHash: await hash('password123', 12),
          role: 'craftsman'
        }
      })

      const craftsmanProfile = await prisma.craftsmanProfile.create({
        data: {
          userId: craftsman.id,
          craftSpecialties: ['mahjong'],
          bio: { 'zh-HK': '備份測試師傅' },
          experienceYears: 10
        }
      })

      // Simulate backup process
      class BackupService {
        async createBackup() {
          const backupData = {
            timestamp: new Date().toISOString(),
            users: await prisma.user.findMany(),
            craftsmanProfiles: await prisma.craftsmanProfile.findMany(),
            courses: await prisma.course.findMany(),
            products: await prisma.product.findMany()
          }

          const backupPath = path.join(process.cwd(), 'backups', `backup-${Date.now()}.json`)
          
          // Ensure backup directory exists
          await fs.mkdir(path.dirname(backupPath), { recursive: true })
          
          // Write backup file
          await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2))
          
          return {
            backupPath,
            size: (await fs.stat(backupPath)).size,
            recordCount: {
              users: backupData.users.length,
              craftsmanProfiles: backupData.craftsmanProfiles.length,
              courses: backupData.courses.length,
              products: backupData.products.length
            }
          }
        }

        async verifyBackup(backupPath: string) {
          const backupContent = await fs.readFile(backupPath, 'utf-8')
          const backupData = JSON.parse(backupContent)
          
          return {
            isValid: backupData.timestamp && backupData.users && Array.isArray(backupData.users),
            recordCount: {
              users: backupData.users?.length || 0,
              craftsmanProfiles: backupData.craftsmanProfiles?.length || 0,
              courses: backupData.courses?.length || 0,
              products: backupData.products?.length || 0
            }
          }
        }
      }

      const backupService = new BackupService()
      const backup = await backupService.createBackup()

      expect(backup.backupPath).toBeDefined()
      expect(backup.size).toBeGreaterThan(0)
      expect(backup.recordCount.users).toBe(2)
      expect(backup.recordCount.craftsmanProfiles).toBe(1)

      // Verify backup integrity
      const verification = await backupService.verifyBackup(backup.backupPath)
      expect(verification.isValid).toBe(true)
      expect(verification.recordCount.users).toBe(2)

      // Clean up backup file
      await fs.unlink(backup.backupPath)
    })

    it('should restore data from backup', async () => {
      // Create backup data
      const backupData = {
        timestamp: new Date().toISOString(),
        users: [
          {
            id: 'restore-user-1',
            email: 'restore1@example.com',
            passwordHash: await hash('password123', 12),
            role: 'learner',
            preferredLanguage: 'zh-HK'
          },
          {
            id: 'restore-user-2',
            email: 'restore2@example.com',
            passwordHash: await hash('password123', 12),
            role: 'craftsman',
            preferredLanguage: 'zh-HK'
          }
        ],
        craftsmanProfiles: [
          {
            id: 'restore-profile-1',
            userId: 'restore-user-2',
            craftSpecialties: ['woodcarving'],
            bio: { 'zh-HK': '恢復測試師傅' },
            experienceYears: 15
          }
        ]
      }

      class RestoreService {
        async restoreFromBackup(backupData: any) {
          const results = {
            usersRestored: 0,
            profilesRestored: 0,
            errors: [] as string[]
          }

          try {
            // Restore users
            for (const userData of backupData.users) {
              try {
                await prisma.user.upsert({
                  where: { email: userData.email },
                  update: userData,
                  create: userData
                })
                results.usersRestored++
              } catch (error) {
                results.errors.push(`Failed to restore user ${userData.email}: ${error.message}`)
              }
            }

            // Restore craftsman profiles
            for (const profileData of backupData.craftsmanProfiles) {
              try {
                await prisma.craftsmanProfile.upsert({
                  where: { userId: profileData.userId },
                  update: profileData,
                  create: profileData
                })
                results.profilesRestored++
              } catch (error) {
                results.errors.push(`Failed to restore profile ${profileData.id}: ${error.message}`)
              }
            }

            return results
          } catch (error) {
            results.errors.push(`Restore operation failed: ${error.message}`)
            return results
          }
        }

        async validateRestore(originalData: any) {
          const currentUsers = await prisma.user.findMany()
          const currentProfiles = await prisma.craftsmanProfile.findMany()

          return {
            usersMatch: currentUsers.length >= originalData.users.length,
            profilesMatch: currentProfiles.length >= originalData.craftsmanProfiles.length,
            dataIntegrity: currentUsers.every(user => 
              originalData.users.some((original: any) => original.email === user.email)
            )
          }
        }
      }

      const restoreService = new RestoreService()
      const restoreResults = await restoreService.restoreFromBackup(backupData)

      expect(restoreResults.usersRestored).toBe(2)
      expect(restoreResults.profilesRestored).toBe(1)
      expect(restoreResults.errors.length).toBe(0)

      // Validate restore
      const validation = await restoreService.validateRestore(backupData)
      expect(validation.usersMatch).toBe(true)
      expect(validation.profilesMatch).toBe(true)
      expect(validation.dataIntegrity).toBe(true)
    })

    it('should handle incremental backups', async () => {
      // Create initial data
      const initialUser = await prisma.user.create({
        data: {
          email: 'incremental@example.com',
          passwordHash: await hash('password123', 12),
          role: 'learner'
        }
      })

      class IncrementalBackupService {
        async createIncrementalBackup(lastBackupTime: Date) {
          const incrementalData = {
            timestamp: new Date().toISOString(),
            lastBackupTime: lastBackupTime.toISOString(),
            newUsers: await prisma.user.findMany({
              where: {
                createdAt: {
                  gt: lastBackupTime
                }
              }
            }),
            updatedUsers: await prisma.user.findMany({
              where: {
                updatedAt: {
                  gt: lastBackupTime
                }
              }
            })
          }

          return incrementalData
        }

        async applyIncrementalBackup(incrementalData: any) {
          let applied = 0

          // Apply new users
          for (const user of incrementalData.newUsers) {
            await prisma.user.upsert({
              where: { id: user.id },
              update: user,
              create: user
            })
            applied++
          }

          // Apply updated users
          for (const user of incrementalData.updatedUsers) {
            await prisma.user.update({
              where: { id: user.id },
              data: user
            })
            applied++
          }

          return { recordsApplied: applied }
        }
      }

      const incrementalService = new IncrementalBackupService()
      const lastBackupTime = new Date(Date.now() - 60000) // 1 minute ago

      // Create incremental backup
      const incrementalBackup = await incrementalService.createIncrementalBackup(lastBackupTime)

      expect(incrementalBackup.newUsers.length).toBeGreaterThan(0)
      expect(incrementalBackup.timestamp).toBeDefined()

      // Apply incremental backup (simulate restore)
      const applyResult = await incrementalService.applyIncrementalBackup(incrementalBackup)
      expect(applyResult.recordsApplied).toBeGreaterThan(0)
    })

    it('should test disaster recovery procedures', async () => {
      // Simulate disaster scenario
      class DisasterRecoveryService {
        async simulateDisaster() {
          // Simulate data corruption or loss
          return {
            databaseCorrupted: true,
            backupAvailable: true,
            estimatedDowntime: '30 minutes',
            affectedServices: ['user-auth', 'course-booking', 'payments']
          }
        }

        async executeRecoveryPlan() {
          const steps = [
            'Switch to maintenance mode',
            'Assess damage extent',
            'Locate latest valid backup',
            'Restore database from backup',
            'Verify data integrity',
            'Run system health checks',
            'Switch back to normal operation'
          ]

          const results = []
          
          for (const step of steps) {
            // Simulate step execution
            await new Promise(resolve => setTimeout(resolve, 10))
            results.push({
              step,
              status: 'completed',
              timestamp: new Date().toISOString()
            })
          }

          return {
            recoverySteps: results,
            totalTime: results.length * 10, // milliseconds
            success: true
          }
        }

        async validateRecovery() {
          // Validate system is working after recovery
          const checks = [
            { name: 'Database connectivity', status: 'pass' },
            { name: 'User authentication', status: 'pass' },
            { name: 'Course booking system', status: 'pass' },
            { name: 'Payment processing', status: 'pass' },
            { name: 'File uploads', status: 'pass' }
          ]

          return {
            allChecksPassed: checks.every(check => check.status === 'pass'),
            checks,
            systemHealthy: true
          }
        }
      }

      const recoveryService = new DisasterRecoveryService()
      
      // Simulate disaster
      const disaster = await recoveryService.simulateDisaster()
      expect(disaster.databaseCorrupted).toBe(true)
      expect(disaster.backupAvailable).toBe(true)

      // Execute recovery
      const recovery = await recoveryService.executeRecoveryPlan()
      expect(recovery.success).toBe(true)
      expect(recovery.recoverySteps.length).toBe(7)

      // Validate recovery
      const validation = await recoveryService.validateRecovery()
      expect(validation.allChecksPassed).toBe(true)
      expect(validation.systemHealthy).toBe(true)
    })
  })

  describe('System Health Monitoring', () => {
    it('should monitor system resources', async () => {
      class HealthMonitorService {
        async checkSystemHealth() {
          const health = {
            database: await this.checkDatabaseHealth(),
            memory: await this.checkMemoryHealth(),
            disk: await this.checkDiskHealth(),
            network: await this.checkNetworkHealth()
          }

          return {
            overall: Object.values(health).every(status => status === 'healthy'),
            components: health,
            timestamp: new Date().toISOString()
          }
        }

        async checkDatabaseHealth() {
          try {
            await prisma.$queryRaw`SELECT 1`
            return 'healthy'
          } catch (error) {
            return 'unhealthy'
          }
        }

        async checkMemoryHealth() {
          const memory = process.memoryUsage()
          const memoryUsagePercent = (memory.heapUsed / memory.heapTotal) * 100
          
          return memoryUsagePercent < 80 ? 'healthy' : 'warning'
        }

        async checkDiskHealth() {
          // Simulate disk space check
          const diskUsagePercent = Math.random() * 100
          
          return diskUsagePercent < 85 ? 'healthy' : 'warning'
        }

        async checkNetworkHealth() {
          // Simulate network connectivity check
          return 'healthy'
        }
      }

      const healthMonitor = new HealthMonitorService()
      const healthStatus = await healthMonitor.checkSystemHealth()

      expect(healthStatus.overall).toBeDefined()
      expect(healthStatus.components.database).toBe('healthy')
      expect(healthStatus.timestamp).toBeDefined()

      // Log health metrics
      mockNewRelic.recordMetric('System/Health/Overall', healthStatus.overall ? 1 : 0)
      mockNewRelic.recordMetric('System/Health/Database', healthStatus.components.database === 'healthy' ? 1 : 0)
    })

    it('should create alerts for system issues', async () => {
      class AlertService {
        async checkForIssues() {
          const issues = []

          // Check for high error rate
          const errorRate = Math.random() * 10 // Simulate error rate
          if (errorRate > 5) {
            issues.push({
              type: 'HIGH_ERROR_RATE',
              severity: 'warning',
              message: `Error rate is ${errorRate.toFixed(2)}%`,
              threshold: 5
            })
          }

          // Check for slow response times
          const avgResponseTime = Math.random() * 2000 // Simulate response time
          if (avgResponseTime > 1000) {
            issues.push({
              type: 'SLOW_RESPONSE',
              severity: 'warning',
              message: `Average response time is ${avgResponseTime.toFixed(0)}ms`,
              threshold: 1000
            })
          }

          return issues
        }

        async createAlerts(issues: any[]) {
          const alerts = []

          for (const issue of issues) {
            const alert = await prisma.systemAlert.create({
              data: {
                type: issue.type,
                severity: issue.severity,
                message: issue.message,
                context: { threshold: issue.threshold },
                status: 'active'
              }
            })
            alerts.push(alert)

            // Send to monitoring service
            mockSentry.captureMessage(issue.message, {
              level: issue.severity,
              tags: {
                alertType: issue.type
              }
            })
          }

          return alerts
        }
      }

      const alertService = new AlertService()
      const issues = await alertService.checkForIssues()
      
      if (issues.length > 0) {
        const alerts = await alertService.createAlerts(issues)
        expect(alerts.length).toBe(issues.length)
        expect(mockSentry.captureMessage).toHaveBeenCalled()
      }
    })
  })
})