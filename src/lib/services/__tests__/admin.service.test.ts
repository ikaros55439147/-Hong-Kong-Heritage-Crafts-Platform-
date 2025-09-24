import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock the entire admin service module
const mockPrismaInstance = {
  user: {
    count: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  craftsmanProfile: {
    count: vi.fn(),
    update: vi.fn()
  },
  course: {
    count: vi.fn(),
    findMany: vi.fn()
  },
  product: {
    count: vi.fn()
  },
  order: {
    count: vi.fn(),
    findMany: vi.fn()
  },
  report: {
    count: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn()
  },
  comment: {
    update: vi.fn()
  }
}

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrismaInstance),
  UserRole: {
    LEARNER: 'LEARNER',
    CRAFTSMAN: 'CRAFTSMAN',
    ADMIN: 'ADMIN'
  },
  ReportStatus: {
    PENDING: 'PENDING',
    RESOLVED: 'RESOLVED',
    DISMISSED: 'DISMISSED'
  },
  VerificationStatus: {
    PENDING: 'PENDING',
    VERIFIED: 'VERIFIED',
    REJECTED: 'REJECTED'
  }
}))

// Import after mocking
const { AdminService } = await import('../admin.service')
const { UserRole, ReportStatus, VerificationStatus } = await import('@prisma/client')

describe('AdminService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getDashboardStats', () => {
    it('should return dashboard statistics', async () => {
      // Mock data
      mockPrismaInstance.user.count.mockResolvedValue(100)
      mockPrismaInstance.craftsmanProfile.count.mockResolvedValue(25)
      mockPrismaInstance.course.count.mockResolvedValue(50)
      mockPrismaInstance.product.count.mockResolvedValue(75)
      mockPrismaInstance.order.count.mockResolvedValue(200)
      mockPrismaInstance.report.count.mockResolvedValue(5)
      
      mockPrismaInstance.user.findMany.mockResolvedValue([
        {
          id: 'user1',
          email: 'test1@example.com',
          role: UserRole.LEARNER,
          createdAt: new Date()
        }
      ])
      
      mockPrismaInstance.course.findMany.mockResolvedValue([
        {
          id: 'course1',
          title: '{"zh-HK": "Test Course"}',
          createdAt: new Date(),
          craftsman: {
            userId: 'user1',
            user: { email: 'craftsman@example.com' }
          }
        }
      ])
      
      mockPrismaInstance.order.findMany.mockResolvedValue([
        {
          id: 'order1',
          totalAmount: 100,
          createdAt: new Date(),
          user: { email: 'customer@example.com' }
        }
      ])

      const stats = await AdminService.getDashboardStats()

      expect(stats.totalUsers).toBe(100)
      expect(stats.totalCraftsmen).toBe(25)
      expect(stats.totalCourses).toBe(50)
      expect(stats.totalProducts).toBe(75)
      expect(stats.totalOrders).toBe(200)
      expect(stats.pendingReports).toBe(5)
      expect(stats.recentActivity).toBeDefined()
      expect(Array.isArray(stats.recentActivity)).toBe(true)
    })

    it('should handle errors gracefully', async () => {
      mockPrismaInstance.user.count.mockRejectedValue(new Error('Database error'))

      await expect(AdminService.getDashboardStats()).rejects.toThrow('Failed to get dashboard statistics')
    })
  })

  describe('getUsers', () => {
    it('should return paginated users with filters', async () => {
      const mockUsers = [
        {
          id: 'user1',
          email: 'test1@example.com',
          role: UserRole.LEARNER,
          createdAt: new Date(),
          craftsmanProfile: null
        },
        {
          id: 'user2',
          email: 'test2@example.com',
          role: UserRole.CRAFTSMAN,
          createdAt: new Date(),
          craftsmanProfile: {
            id: 'profile1',
            verificationStatus: VerificationStatus.VERIFIED
          }
        }
      ]

      mockPrismaInstance.user.findMany.mockResolvedValue(mockUsers)
      mockPrismaInstance.user.count.mockResolvedValue(2)

      const result = await AdminService.getUsers(
        { role: UserRole.LEARNER },
        { page: 1, limit: 10 }
      )

      expect(result.isValid).toBe(true)
      expect(result.data?.data).toEqual(mockUsers)
      expect(result.data?.total).toBe(2)
      expect(result.data?.page).toBe(1)
      expect(result.data?.limit).toBe(10)
    })

    it('should validate pagination parameters', async () => {
      const result = await AdminService.getUsers({}, { page: -1, limit: 0 })

      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('updateUser', () => {
    it('should update user role successfully', async () => {
      const mockUser = {
        id: 'user1',
        email: 'test@example.com',
        role: UserRole.CRAFTSMAN,
        craftsmanProfile: null
      }

      mockPrismaInstance.user.update.mockResolvedValue(mockUser)

      const result = await AdminService.updateUser('user1', { role: UserRole.CRAFTSMAN })

      expect(result.isValid).toBe(true)
      expect(result.data).toEqual(mockUser)
      expect(mockPrismaInstance.user.update).toHaveBeenCalledWith({
        where: { id: 'user1' },
        data: { role: UserRole.CRAFTSMAN },
        include: { craftsmanProfile: true }
      })
    })

    it('should update craftsman verification status', async () => {
      const mockUser = {
        id: 'user1',
        email: 'test@example.com',
        role: UserRole.CRAFTSMAN,
        craftsmanProfile: {
          id: 'profile1',
          verificationStatus: VerificationStatus.PENDING
        }
      }

      mockPrismaInstance.user.update.mockResolvedValue(mockUser)
      mockPrismaInstance.craftsmanProfile.update.mockResolvedValue({})

      const result = await AdminService.updateUser('user1', { 
        verificationStatus: VerificationStatus.VERIFIED 
      })

      expect(result.isValid).toBe(true)
      expect(mockPrismaInstance.craftsmanProfile.update).toHaveBeenCalledWith({
        where: { id: 'profile1' },
        data: { verificationStatus: VerificationStatus.VERIFIED }
      })
    })
  })

  describe('getReports', () => {
    it('should return paginated reports with details', async () => {
      const mockReports = [
        {
          id: 'report1',
          reason: 'Inappropriate content',
          status: ReportStatus.PENDING,
          createdAt: new Date(),
          reporter: { id: 'user1', email: 'reporter@example.com' },
          reviewer: null,
          comment: {
            id: 'comment1',
            content: 'Bad comment',
            user: { id: 'user2', email: 'commenter@example.com' }
          }
        }
      ]

      mockPrismaInstance.report.findMany.mockResolvedValue(mockReports)
      mockPrismaInstance.report.count.mockResolvedValue(1)

      const result = await AdminService.getReports(
        { status: ReportStatus.PENDING },
        { page: 1, limit: 20 }
      )

      expect(result.isValid).toBe(true)
      expect(result.data?.data).toEqual(mockReports)
      expect(result.data?.total).toBe(1)
    })
  })

  describe('reviewReport', () => {
    it('should approve report successfully', async () => {
      const mockReport = {
        id: 'report1',
        reason: 'Test reason',
        status: ReportStatus.PENDING,
        comment: { id: 'comment1' }
      }

      const updatedReport = {
        ...mockReport,
        status: ReportStatus.RESOLVED,
        reviewedBy: 'admin1',
        reviewedAt: new Date()
      }

      mockPrismaInstance.report.findUnique.mockResolvedValue(mockReport)
      mockPrismaInstance.report.update.mockResolvedValue(updatedReport)

      const result = await AdminService.reviewReport('report1', 'admin1', 'approve')

      expect(result.isValid).toBe(true)
      expect(result.data?.status).toBe(ReportStatus.RESOLVED)
    })

    it('should remove content when action is remove_content', async () => {
      const mockReport = {
        id: 'report1',
        reason: 'Test reason',
        status: ReportStatus.PENDING,
        comment: { id: 'comment1' }
      }

      mockPrismaInstance.report.findUnique.mockResolvedValue(mockReport)
      mockPrismaInstance.report.update.mockResolvedValue({ ...mockReport, status: ReportStatus.RESOLVED })
      mockPrismaInstance.comment.update.mockResolvedValue({})

      const result = await AdminService.reviewReport('report1', 'admin1', 'remove_content')

      expect(result.isValid).toBe(true)
      expect(mockPrismaInstance.comment.update).toHaveBeenCalledWith({
        where: { id: 'comment1' },
        data: { isApproved: false }
      })
    })

    it('should return error if report not found', async () => {
      mockPrismaInstance.report.findUnique.mockResolvedValue(null)

      const result = await AdminService.reviewReport('nonexistent', 'admin1', 'approve')

      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('NOT_FOUND')
    })
  })

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      mockPrismaInstance.user.delete.mockResolvedValue({})

      const result = await AdminService.deleteUser('user1')

      expect(result.isValid).toBe(true)
      expect(mockPrismaInstance.user.delete).toHaveBeenCalledWith({
        where: { id: 'user1' }
      })
    })

    it('should handle deletion errors', async () => {
      mockPrismaInstance.user.delete.mockRejectedValue(new Error('Constraint violation'))

      const result = await AdminService.deleteUser('user1')

      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('DELETE_ERROR')
    })
  })

  describe('bulkUpdateUsers', () => {
    it('should perform bulk delete operation', async () => {
      mockPrismaInstance.user.delete
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})

      const result = await AdminService.bulkUpdateUsers(
        ['user1', 'user2'],
        { action: 'delete' }
      )

      expect(result.isValid).toBe(true)
      expect(result.data?.updated).toBe(2)
      expect(result.data?.errors).toEqual([])
    })

    it('should handle partial failures in bulk operations', async () => {
      mockPrismaInstance.user.delete
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('Cannot delete'))

      const result = await AdminService.bulkUpdateUsers(
        ['user1', 'user2'],
        { action: 'delete' }
      )

      expect(result.isValid).toBe(true)
      expect(result.data?.updated).toBe(1)
      expect(result.data?.errors).toHaveLength(1)
    })
  })

  describe('getSystemLogs', () => {
    it('should return mock system logs with pagination', async () => {
      const result = await AdminService.getSystemLogs(
        { level: 'error' },
        { page: 1, limit: 10 }
      )

      expect(result.isValid).toBe(true)
      expect(result.data?.data).toBeDefined()
      expect(Array.isArray(result.data?.data)).toBe(true)
      expect(result.data?.total).toBeGreaterThanOrEqual(0)
    })

    it('should filter logs by level', async () => {
      const result = await AdminService.getSystemLogs({ level: 'error' })

      expect(result.isValid).toBe(true)
      // In mock implementation, should filter by level
      const errorLogs = result.data?.data.filter(log => log.level === 'error')
      expect(errorLogs?.length).toBe(result.data?.data.length)
    })
  })
})