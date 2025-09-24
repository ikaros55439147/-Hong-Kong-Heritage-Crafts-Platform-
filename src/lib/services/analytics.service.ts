import { PrismaClient, UserRole, OrderStatus, BookingStatus } from '@prisma/client'
import { ValidationResult, PaginationParams } from '@/types'
import { validatePaginationParams } from '@/lib/validations'

const prisma = new PrismaClient()

export interface AnalyticsDateRange {
  startDate: Date
  endDate: Date
}

export interface UserAnalytics {
  totalUsers: number
  newUsersThisMonth: number
  usersByRole: {
    role: UserRole
    count: number
  }[]
  userGrowthTrend: {
    date: string
    count: number
  }[]
  topActiveUsers: {
    userId: string
    email: string
    activityScore: number
  }[]
}

export interface CourseAnalytics {
  totalCourses: number
  activeCourses: number
  totalBookings: number
  completedBookings: number
  averageBookingsPerCourse: number
  popularCategories: {
    category: string
    courseCount: number
    bookingCount: number
  }[]
  topCourses: {
    courseId: string
    title: string
    bookingCount: number
    revenue: number
  }[]
}

export interface ProductAnalytics {
  totalProducts: number
  activeProducts: number
  totalOrders: number
  totalRevenue: number
  averageOrderValue: number
  topSellingProducts: {
    productId: string
    name: string
    orderCount: number
    revenue: number
  }[]
  salesByCategory: {
    category: string
    productCount: number
    orderCount: number
    revenue: number
  }[]
}

export interface PlatformAnalytics {
  userAnalytics: UserAnalytics
  courseAnalytics: CourseAnalytics
  productAnalytics: ProductAnalytics
  revenueAnalytics: {
    totalRevenue: number
    courseRevenue: number
    productRevenue: number
    monthlyRevenue: {
      month: string
      courseRevenue: number
      productRevenue: number
      totalRevenue: number
    }[]
  }
}

export interface ExportData {
  users: any[]
  courses: any[]
  products: any[]
  orders: any[]
  bookings: any[]
}

export class AnalyticsService {
  /**
   * Get comprehensive platform analytics
   */
  static async getPlatformAnalytics(dateRange?: AnalyticsDateRange): Promise<PlatformAnalytics> {
    try {
      const [userAnalytics, courseAnalytics, productAnalytics] = await Promise.all([
        this.getUserAnalytics(dateRange),
        this.getCourseAnalytics(dateRange),
        this.getProductAnalytics(dateRange)
      ])

      const revenueAnalytics = await this.getRevenueAnalytics(dateRange)

      return {
        userAnalytics,
        courseAnalytics,
        productAnalytics,
        revenueAnalytics
      }
    } catch (error) {
      console.error('Error getting platform analytics:', error)
      throw new Error('Failed to get platform analytics')
    }
  }

  /**
   * Get user analytics
   */
  static async getUserAnalytics(dateRange?: AnalyticsDateRange): Promise<UserAnalytics> {
    try {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      
      const whereClause = dateRange ? {
        createdAt: {
          gte: dateRange.startDate,
          lte: dateRange.endDate
        }
      } : {}

      const [
        totalUsers,
        newUsersThisMonth,
        usersByRole,
        recentUsers
      ] = await Promise.all([
        prisma.user.count(dateRange ? { where: whereClause } : {}),
        prisma.user.count({
          where: {
            createdAt: { gte: startOfMonth }
          }
        }),
        prisma.user.groupBy({
          by: ['role'],
          _count: { role: true },
          ...(dateRange && { where: whereClause })
        }),
        prisma.user.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: { id: true, email: true, createdAt: true },
          ...(dateRange && { where: whereClause })
        })
      ])

      // Generate user growth trend (last 30 days)
      const userGrowthTrend = await this.getUserGrowthTrend(30)

      // Calculate top active users (mock implementation)
      const topActiveUsers = recentUsers.map(user => ({
        userId: user.id,
        email: user.email,
        activityScore: Math.floor(Math.random() * 100) // Mock activity score
      })).sort((a, b) => b.activityScore - a.activityScore)

      return {
        totalUsers,
        newUsersThisMonth,
        usersByRole: usersByRole.map(item => ({
          role: item.role,
          count: item._count.role
        })),
        userGrowthTrend,
        topActiveUsers
      }
    } catch (error) {
      console.error('Error getting user analytics:', error)
      throw new Error('Failed to get user analytics')
    }
  }

  /**
   * Get course analytics
   */
  static async getCourseAnalytics(dateRange?: AnalyticsDateRange): Promise<CourseAnalytics> {
    try {
      const whereClause = dateRange ? {
        createdAt: {
          gte: dateRange.startDate,
          lte: dateRange.endDate
        }
      } : {}

      const [
        totalCourses,
        activeCourses,
        totalBookings,
        completedBookings,
        coursesByCategory,
        topCourses
      ] = await Promise.all([
        prisma.course.count(dateRange ? { where: whereClause } : {}),
        prisma.course.count({
          where: {
            status: 'ACTIVE',
            ...(dateRange && whereClause)
          }
        }),
        prisma.booking.count(dateRange ? { 
          where: {
            createdAt: {
              gte: dateRange.startDate,
              lte: dateRange.endDate
            }
          }
        } : {}),
        prisma.booking.count({
          where: {
            status: BookingStatus.COMPLETED,
            ...(dateRange && {
              createdAt: {
                gte: dateRange.startDate,
                lte: dateRange.endDate
              }
            })
          }
        }),
        prisma.course.groupBy({
          by: ['craftCategory'],
          _count: { id: true },
          ...(dateRange && { where: whereClause })
        }),
        prisma.course.findMany({
          take: 10,
          include: {
            bookings: true,
            _count: { select: { bookings: true } }
          },
          orderBy: {
            bookings: {
              _count: 'desc'
            }
          },
          ...(dateRange && { where: whereClause })
        })
      ])

      const averageBookingsPerCourse = totalCourses > 0 ? totalBookings / totalCourses : 0

      // Get popular categories with booking counts
      const popularCategories = await Promise.all(
        coursesByCategory.map(async (category) => {
          const bookingCount = await prisma.booking.count({
            where: {
              course: {
                craftCategory: category.craftCategory,
                ...(dateRange && whereClause)
              }
            }
          })
          return {
            category: category.craftCategory,
            courseCount: category._count.id,
            bookingCount
          }
        })
      )

      const topCoursesData = topCourses.map(course => ({
        courseId: course.id,
        title: typeof course.title === 'string' ? course.title : JSON.stringify(course.title),
        bookingCount: course._count.bookings,
        revenue: course.price ? Number(course.price) * course._count.bookings : 0
      }))

      return {
        totalCourses,
        activeCourses,
        totalBookings,
        completedBookings,
        averageBookingsPerCourse,
        popularCategories: popularCategories.sort((a, b) => b.bookingCount - a.bookingCount),
        topCourses: topCoursesData
      }
    } catch (error) {
      console.error('Error getting course analytics:', error)
      throw new Error('Failed to get course analytics')
    }
  }

  /**
   * Get product analytics
   */
  static async getProductAnalytics(dateRange?: AnalyticsDateRange): Promise<ProductAnalytics> {
    try {
      const whereClause = dateRange ? {
        createdAt: {
          gte: dateRange.startDate,
          lte: dateRange.endDate
        }
      } : {}

      const [
        totalProducts,
        activeProducts,
        totalOrders,
        orderData,
        productsByCategory
      ] = await Promise.all([
        prisma.product.count(dateRange ? { where: whereClause } : {}),
        prisma.product.count({
          where: {
            status: 'ACTIVE',
            ...(dateRange && whereClause)
          }
        }),
        prisma.order.count({
          where: {
            status: { not: OrderStatus.CANCELLED },
            ...(dateRange && {
              createdAt: {
                gte: dateRange.startDate,
                lte: dateRange.endDate
              }
            })
          }
        }),
        prisma.order.findMany({
          where: {
            status: { not: OrderStatus.CANCELLED },
            ...(dateRange && {
              createdAt: {
                gte: dateRange.startDate,
                lte: dateRange.endDate
              }
            })
          },
          include: {
            orderItems: {
              include: {
                product: true
              }
            }
          }
        }),
        prisma.product.groupBy({
          by: ['craftCategory'],
          _count: { id: true },
          ...(dateRange && { where: whereClause })
        })
      ])

      // Calculate revenue metrics
      const totalRevenue = orderData.reduce((sum, order) => sum + Number(order.totalAmount), 0)
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

      // Get top selling products
      const productSales = new Map<string, { product: any; orderCount: number; revenue: number }>()
      
      orderData.forEach(order => {
        order.orderItems.forEach(item => {
          const key = item.product.id
          if (!productSales.has(key)) {
            productSales.set(key, {
              product: item.product,
              orderCount: 0,
              revenue: 0
            })
          }
          const sales = productSales.get(key)!
          sales.orderCount += item.quantity
          sales.revenue += Number(item.price) * item.quantity
        })
      })

      const topSellingProducts = Array.from(productSales.values())
        .sort((a, b) => b.orderCount - a.orderCount)
        .slice(0, 10)
        .map(item => ({
          productId: item.product.id,
          name: typeof item.product.name === 'string' ? item.product.name : JSON.stringify(item.product.name),
          orderCount: item.orderCount,
          revenue: item.revenue
        }))

      // Get sales by category
      const salesByCategory = await Promise.all(
        productsByCategory.map(async (category) => {
          const categoryOrders = await prisma.orderItem.findMany({
            where: {
              product: {
                craftCategory: category.craftCategory,
                ...(dateRange && whereClause)
              },
              order: {
                status: { not: OrderStatus.CANCELLED }
              }
            },
            include: { product: true }
          })

          const orderCount = categoryOrders.reduce((sum, item) => sum + item.quantity, 0)
          const revenue = categoryOrders.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0)

          return {
            category: category.craftCategory,
            productCount: category._count.id,
            orderCount,
            revenue
          }
        })
      )

      return {
        totalProducts,
        activeProducts,
        totalOrders,
        totalRevenue,
        averageOrderValue,
        topSellingProducts,
        salesByCategory: salesByCategory.sort((a, b) => b.revenue - a.revenue)
      }
    } catch (error) {
      console.error('Error getting product analytics:', error)
      throw new Error('Failed to get product analytics')
    }
  }

  /**
   * Get revenue analytics
   */
  static async getRevenueAnalytics(dateRange?: AnalyticsDateRange) {
    try {
      const whereClause = dateRange ? {
        createdAt: {
          gte: dateRange.startDate,
          lte: dateRange.endDate
        }
      } : {}

      // Get order revenue
      const orders = await prisma.order.findMany({
        where: {
          status: { not: OrderStatus.CANCELLED },
          ...(dateRange && whereClause)
        }
      })

      const productRevenue = orders.reduce((sum, order) => sum + Number(order.totalAmount), 0)

      // Get course revenue (from bookings with paid courses)
      const courseBookings = await prisma.booking.findMany({
        where: {
          status: BookingStatus.COMPLETED,
          ...(dateRange && whereClause)
        },
        include: {
          course: true
        }
      })

      const courseRevenue = courseBookings.reduce((sum, booking) => {
        return sum + (booking.course.price ? Number(booking.course.price) : 0)
      }, 0)

      const totalRevenue = productRevenue + courseRevenue

      // Generate monthly revenue trend (last 12 months)
      const monthlyRevenue = await this.getMonthlyRevenueTrend(12)

      return {
        totalRevenue,
        courseRevenue,
        productRevenue,
        monthlyRevenue
      }
    } catch (error) {
      console.error('Error getting revenue analytics:', error)
      throw new Error('Failed to get revenue analytics')
    }
  }

  /**
   * Get user growth trend for specified number of days
   */
  private static async getUserGrowthTrend(days: number) {
    const trend = []
    const now = new Date()

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)

      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)

      const count = await prisma.user.count({
        where: {
          createdAt: {
            gte: date,
            lt: nextDate
          }
        }
      })

      trend.push({
        date: date.toISOString().split('T')[0],
        count
      })
    }

    return trend
  }

  /**
   * Get monthly revenue trend for specified number of months
   */
  private static async getMonthlyRevenueTrend(months: number) {
    const trend = []
    const now = new Date()

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1)

      const [orders, bookings] = await Promise.all([
        prisma.order.findMany({
          where: {
            status: { not: OrderStatus.CANCELLED },
            createdAt: {
              gte: date,
              lt: nextMonth
            }
          }
        }),
        prisma.booking.findMany({
          where: {
            status: BookingStatus.COMPLETED,
            createdAt: {
              gte: date,
              lt: nextMonth
            }
          },
          include: { course: true }
        })
      ])

      const productRevenue = orders.reduce((sum, order) => sum + Number(order.totalAmount), 0)
      const courseRevenue = bookings.reduce((sum, booking) => {
        return sum + (booking.course.price ? Number(booking.course.price) : 0)
      }, 0)

      trend.push({
        month: date.toISOString().slice(0, 7), // YYYY-MM format
        courseRevenue,
        productRevenue,
        totalRevenue: courseRevenue + productRevenue
      })
    }

    return trend
  }

  /**
   * Export platform data for backup or analysis
   */
  static async exportData(
    entities: ('users' | 'courses' | 'products' | 'orders' | 'bookings')[],
    dateRange?: AnalyticsDateRange
  ): Promise<ValidationResult & { data?: ExportData }> {
    try {
      const whereClause = dateRange ? {
        createdAt: {
          gte: dateRange.startDate,
          lte: dateRange.endDate
        }
      } : {}

      const exportData: Partial<ExportData> = {}

      if (entities.includes('users')) {
        exportData.users = await prisma.user.findMany({
          where: whereClause,
          include: {
            craftsmanProfile: true
          }
        })
      }

      if (entities.includes('courses')) {
        exportData.courses = await prisma.course.findMany({
          where: whereClause,
          include: {
            craftsman: {
              include: { user: true }
            },
            bookings: true
          }
        })
      }

      if (entities.includes('products')) {
        exportData.products = await prisma.product.findMany({
          where: whereClause,
          include: {
            craftsman: {
              include: { user: true }
            },
            orderItems: true
          }
        })
      }

      if (entities.includes('orders')) {
        exportData.orders = await prisma.order.findMany({
          where: whereClause,
          include: {
            user: true,
            orderItems: {
              include: { product: true }
            }
          }
        })
      }

      if (entities.includes('bookings')) {
        exportData.bookings = await prisma.booking.findMany({
          where: whereClause,
          include: {
            user: true,
            course: {
              include: {
                craftsman: {
                  include: { user: true }
                }
              }
            }
          }
        })
      }

      return {
        isValid: true,
        errors: [],
        data: exportData as ExportData
      }
    } catch (error) {
      console.error('Error exporting data:', error)
      return {
        isValid: false,
        errors: [{ field: 'general', message: 'Failed to export data', code: 'EXPORT_ERROR' }]
      }
    }
  }

  /**
   * Get user behavior analytics
   */
  static async getUserBehaviorAnalytics(dateRange?: AnalyticsDateRange) {
    try {
      const whereClause = dateRange ? {
        createdAt: {
          gte: dateRange.startDate,
          lte: dateRange.endDate
        }
      } : {}

      // Mock user behavior data - in real implementation, this would track actual user interactions
      const mockBehaviorData = {
        pageViews: {
          '/': Math.floor(Math.random() * 10000),
          '/courses': Math.floor(Math.random() * 5000),
          '/products': Math.floor(Math.random() * 3000),
          '/craftsmen': Math.floor(Math.random() * 2000)
        },
        userSessions: {
          averageSessionDuration: Math.floor(Math.random() * 300) + 60, // 1-6 minutes
          bounceRate: Math.random() * 0.5 + 0.2, // 20-70%
          pagesPerSession: Math.random() * 5 + 1 // 1-6 pages
        },
        conversionRates: {
          visitorToUser: Math.random() * 0.1 + 0.02, // 2-12%
          userToCustomer: Math.random() * 0.3 + 0.1, // 10-40%
          courseBookingRate: Math.random() * 0.2 + 0.05 // 5-25%
        }
      }

      return mockBehaviorData
    } catch (error) {
      console.error('Error getting user behavior analytics:', error)
      throw new Error('Failed to get user behavior analytics')
    }
  }
}