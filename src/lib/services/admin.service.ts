import { PrismaClient, User, UserRole, CraftsmanProfile, Course, Product, Order, Report, ReportStatus } from '@prisma/client'
import { ValidationResult, PaginationParams, PaginationResult } from '@/types'
import { validatePaginationParams } from '@/lib/validations'

const prisma = new PrismaClient()

export interface AdminDashboardStats {
  totalUsers: number
  totalCraftsmen: number
  totalCourses: number
  totalProducts: number
  totalOrders: number
  pendingReports: number
  recentActivity: AdminActivity[]
}

export interface AdminActivity {
  id: string
  type: 'user_registration' | 'craftsman_verification' | 'course_created' | 'order_placed' | 'report_submitted'
  description: string
  userId?: string
  userName?: string
  timestamp: Date
  metadata?: Record<string, any>
}

export interface UserManagementFilters {
  role?: UserRole
  search?: string
  verificationStatus?: string
  dateFrom?: Date
  dateTo?: Date
}

export interface ContentModerationFilters {
  entityType?: string
  status?: ReportStatus
  reportedBy?: string
  dateFrom?: Date
  dateTo?: Date
}

export interface SystemLogEntry {
  id: string
  level: 'info' | 'warn' | 'error'
  message: string
  category: string
  userId?: string
  metadata?: Record<string, any>
  timestamp: Date
}

export class AdminService {
  /**
   * Get dashboard statistics
   */
  static async getDashboardStats(): Promise<AdminDashboardStats> {
    try {
      const [
        totalUsers,
        totalCraftsmen,
        totalCourses,
        totalProducts,
        totalOrders,
        pendingReports,
        recentUsers,
        recentCourses,
        recentOrders
      ] = await Promise.all([
        prisma.user.count(),
        prisma.craftsmanProfile.count(),
        prisma.course.count(),
        prisma.product.count(),
        prisma.order.count(),
        prisma.report.count({ where: { status: ReportStatus.PENDING } }),
        prisma.user.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: { id: true, email: true, role: true, createdAt: true }
        }),
        prisma.course.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { craftsman: { include: { user: true } } }
        }),
        prisma.order.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { user: true }
        })
      ])

      // Build recent activity
      const recentActivity: AdminActivity[] = []

      // Add recent user registrations
      recentUsers.forEach(user => {
        recentActivity.push({
          id: `user-${user.id}`,
          type: 'user_registration',
          description: `New ${user.role.toLowerCase()} registered: ${user.email}`,
          userId: user.id,
          userName: user.email,
          timestamp: user.createdAt
        })
      })

      // Add recent courses
      recentCourses.forEach(course => {
        recentActivity.push({
          id: `course-${course.id}`,
          type: 'course_created',
          description: `New course created: ${JSON.parse(course.title as string)['zh-HK'] || 'Untitled'}`,
          userId: course.craftsman.userId,
          userName: course.craftsman.user.email,
          timestamp: course.createdAt
        })
      })

      // Add recent orders
      recentOrders.forEach(order => {
        recentActivity.push({
          id: `order-${order.id}`,
          type: 'order_placed',
          description: `Order placed: $${order.totalAmount}`,
          userId: order.userId,
          userName: order.user.email,
          timestamp: order.createdAt
        })
      })

      // Sort by timestamp
      recentActivity.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

      return {
        totalUsers,
        totalCraftsmen,
        totalCourses,
        totalProducts,
        totalOrders,
        pendingReports,
        recentActivity: recentActivity.slice(0, 10)
      }
    } catch (error) {
      console.error('Error getting dashboard stats:', error)
      throw new Error('Failed to get dashboard statistics')
    }
  }

  /**
   * Get users with filtering and pagination
   */
  static async getUsers(
    filters: UserManagementFilters = {},
    pagination: PaginationParams = {}
  ): Promise<ValidationResult & { data?: PaginationResult<User & { craftsmanProfile?: CraftsmanProfile }> }> {
    const validation = validatePaginationParams(pagination)
    if (!validation.isValid) {
      return validation
    }

    const { page = 1, limit = 20 } = pagination
    const offset = (page - 1) * limit

    try {
      const where: any = {}

      if (filters.role) {
        where.role = filters.role
      }

      if (filters.search) {
        where.email = {
          contains: filters.search,
          mode: 'insensitive'
        }
      }

      if (filters.dateFrom || filters.dateTo) {
        where.createdAt = {}
        if (filters.dateFrom) {
          where.createdAt.gte = filters.dateFrom
        }
        if (filters.dateTo) {
          where.createdAt.lte = filters.dateTo
        }
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          include: {
            craftsmanProfile: true
          },
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limit
        }),
        prisma.user.count({ where })
      ])

      return {
        isValid: true,
        errors: [],
        data: {
          data: users,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      }
    } catch (error) {
      console.error('Error getting users:', error)
      return {
        isValid: false,
        errors: [{ field: 'general', message: 'Failed to get users', code: 'FETCH_ERROR' }]
      }
    }
  }

  /**
   * Update user role or status
   */
  static async updateUser(
    userId: string,
    updates: {
      role?: UserRole
      verificationStatus?: string
    }
  ): Promise<ValidationResult & { data?: User }> {
    try {
      const updateData: any = {}

      if (updates.role) {
        updateData.role = updates.role
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        include: { craftsmanProfile: true }
      })

      // If updating craftsman verification status
      if (updates.verificationStatus && user.craftsmanProfile) {
        await prisma.craftsmanProfile.update({
          where: { id: user.craftsmanProfile.id },
          data: { verificationStatus: updates.verificationStatus as any }
        })
      }

      return {
        isValid: true,
        errors: [],
        data: user
      }
    } catch (error) {
      console.error('Error updating user:', error)
      return {
        isValid: false,
        errors: [{ field: 'general', message: 'Failed to update user', code: 'UPDATE_ERROR' }]
      }
    }
  }

  /**
   * Get content reports for moderation
   */
  static async getReports(
    filters: ContentModerationFilters = {},
    pagination: PaginationParams = {}
  ): Promise<ValidationResult & { data?: PaginationResult<Report & { reporter: User; comment?: any }> }> {
    const validation = validatePaginationParams(pagination)
    if (!validation.isValid) {
      return validation
    }

    const { page = 1, limit = 20 } = pagination
    const offset = (page - 1) * limit

    try {
      const where: any = {}

      if (filters.status) {
        where.status = filters.status
      }

      if (filters.entityType) {
        where.entityType = filters.entityType
      }

      if (filters.dateFrom || filters.dateTo) {
        where.createdAt = {}
        if (filters.dateFrom) {
          where.createdAt.gte = filters.dateFrom
        }
        if (filters.dateTo) {
          where.createdAt.lte = filters.dateTo
        }
      }

      const [reports, total] = await Promise.all([
        prisma.report.findMany({
          where,
          include: {
            reporter: true,
            reviewer: true,
            comment: {
              include: {
                user: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limit
        }),
        prisma.report.count({ where })
      ])

      return {
        isValid: true,
        errors: [],
        data: {
          data: reports,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      }
    } catch (error) {
      console.error('Error getting reports:', error)
      return {
        isValid: false,
        errors: [{ field: 'general', message: 'Failed to get reports', code: 'FETCH_ERROR' }]
      }
    }
  }

  /**
   * Review and resolve a report
   */
  static async reviewReport(
    reportId: string,
    reviewerId: string,
    action: 'approve' | 'dismiss' | 'remove_content',
    notes?: string
  ): Promise<ValidationResult & { data?: Report }> {
    try {
      const report = await prisma.report.findUnique({
        where: { id: reportId },
        include: { comment: true }
      })

      if (!report) {
        return {
          isValid: false,
          errors: [{ field: 'reportId', message: 'Report not found', code: 'NOT_FOUND' }]
        }
      }

      // Update report status
      const updatedReport = await prisma.report.update({
        where: { id: reportId },
        data: {
          status: action === 'dismiss' ? ReportStatus.DISMISSED : ReportStatus.RESOLVED,
          reviewedBy: reviewerId,
          reviewedAt: new Date()
        },
        include: {
          reporter: true,
          reviewer: true,
          comment: true
        }
      })

      // Take action on content if needed
      if (action === 'remove_content' && report.comment) {
        await prisma.comment.update({
          where: { id: report.comment.id },
          data: { isApproved: false }
        })
      }

      return {
        isValid: true,
        errors: [],
        data: updatedReport
      }
    } catch (error) {
      console.error('Error reviewing report:', error)
      return {
        isValid: false,
        errors: [{ field: 'general', message: 'Failed to review report', code: 'REVIEW_ERROR' }]
      }
    }
  }

  /**
   * Get system logs (mock implementation - in real system would connect to logging service)
   */
  static async getSystemLogs(
    filters: {
      level?: string
      category?: string
      userId?: string
      dateFrom?: Date
      dateTo?: Date
    } = {},
    pagination: PaginationParams = {}
  ): Promise<ValidationResult & { data?: PaginationResult<SystemLogEntry> }> {
    const validation = validatePaginationParams(pagination)
    if (!validation.isValid) {
      return validation
    }

    const { page = 1, limit = 50 } = pagination

    try {
      // Mock system logs - in real implementation, this would query a logging service
      const mockLogs: SystemLogEntry[] = [
        {
          id: '1',
          level: 'info',
          message: 'User login successful',
          category: 'auth',
          userId: 'user-123',
          timestamp: new Date(Date.now() - 1000 * 60 * 5)
        },
        {
          id: '2',
          level: 'warn',
          message: 'Failed login attempt',
          category: 'auth',
          metadata: { ip: '192.168.1.1', email: 'test@example.com' },
          timestamp: new Date(Date.now() - 1000 * 60 * 10)
        },
        {
          id: '3',
          level: 'error',
          message: 'Database connection timeout',
          category: 'database',
          timestamp: new Date(Date.now() - 1000 * 60 * 15)
        }
      ]

      // Apply filters
      let filteredLogs = mockLogs
      if (filters.level) {
        filteredLogs = filteredLogs.filter(log => log.level === filters.level)
      }
      if (filters.category) {
        filteredLogs = filteredLogs.filter(log => log.category === filters.category)
      }
      if (filters.userId) {
        filteredLogs = filteredLogs.filter(log => log.userId === filters.userId)
      }

      const total = filteredLogs.length
      const offset = (page - 1) * limit
      const paginatedLogs = filteredLogs.slice(offset, offset + limit)

      return {
        isValid: true,
        errors: [],
        data: {
          data: paginatedLogs,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      }
    } catch (error) {
      console.error('Error getting system logs:', error)
      return {
        isValid: false,
        errors: [{ field: 'general', message: 'Failed to get system logs', code: 'FETCH_ERROR' }]
      }
    }
  }

  /**
   * Delete user account (admin only)
   */
  static async deleteUser(userId: string): Promise<ValidationResult> {
    try {
      await prisma.user.delete({
        where: { id: userId }
      })

      return {
        isValid: true,
        errors: []
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      return {
        isValid: false,
        errors: [{ field: 'general', message: 'Failed to delete user', code: 'DELETE_ERROR' }]
      }
    }
  }

  /**
   * Bulk operations on users
   */
  static async bulkUpdateUsers(
    userIds: string[],
    updates: {
      role?: UserRole
      action?: 'activate' | 'deactivate' | 'delete'
    }
  ): Promise<ValidationResult & { data?: { updated: number; errors: string[] } }> {
    try {
      const results = { updated: 0, errors: [] as string[] }

      for (const userId of userIds) {
        try {
          if (updates.action === 'delete') {
            await prisma.user.delete({ where: { id: userId } })
          } else if (updates.role) {
            await prisma.user.update({
              where: { id: userId },
              data: { role: updates.role }
            })
          }
          results.updated++
        } catch (error) {
          results.errors.push(`Failed to update user ${userId}: ${error}`)
        }
      }

      return {
        isValid: true,
        errors: [],
        data: results
      }
    } catch (error) {
      console.error('Error in bulk update:', error)
      return {
        isValid: false,
        errors: [{ field: 'general', message: 'Bulk update failed', code: 'BULK_UPDATE_ERROR' }]
      }
    }
  }
}