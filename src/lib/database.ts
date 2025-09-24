import { PrismaClient, Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { ValidationResult } from '@/types'

// Re-export prisma for convenience
export { prisma }

/**
 * Database utility functions for common operations
 */

/**
 * Check if database connection is healthy
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('Database health check failed:', error)
    return false
  }
}

/**
 * Execute database transaction with retry logic
 */
export async function executeTransaction<T>(
  operations: (tx: Prisma.TransactionClient) => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await prisma.$transaction(operations, {
        maxWait: 5000, // 5 seconds
        timeout: 10000, // 10 seconds
      })
    } catch (error) {
      lastError = error as Error
      
      // Don't retry on certain errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Unique constraint violation, foreign key constraint, etc.
        if (['P2002', 'P2003', 'P2025'].includes(error.code)) {
          throw error
        }
      }
      
      if (attempt === maxRetries) {
        break
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
    }
  }
  
  throw lastError || new Error('Transaction failed after maximum retries')
}

/**
 * Soft delete utility (updates a deleted_at field instead of actually deleting)
 */
export async function softDelete(
  model: string,
  id: string
): Promise<boolean> {
  try {
    // Note: This would require adding deleted_at fields to models
    // For now, we'll use the status field where available
    const modelMap: Record<string, any> = {
      course: prisma.course,
      product: prisma.product,
    }
    
    if (modelMap[model]) {
      await modelMap[model].update({
        where: { id },
        data: { status: 'INACTIVE' },
      })
      return true
    }
    
    return false
  } catch (error) {
    console.error(`Soft delete failed for ${model}:${id}`, error)
    return false
  }
}

/**
 * Bulk insert with conflict resolution
 */
export async function bulkUpsert<T>(
  model: any,
  data: T[],
  uniqueFields: string[]
): Promise<{ created: number; updated: number; errors: any[] }> {
  const results = { created: 0, updated: 0, errors: [] as any[] }
  
  for (const item of data) {
    try {
      const whereClause = uniqueFields.reduce((acc, field) => {
        acc[field] = (item as any)[field]
        return acc
      }, {} as any)
      
      const existing = await model.findFirst({ where: whereClause })
      
      if (existing) {
        await model.update({
          where: { id: existing.id },
          data: item,
        })
        results.updated++
      } else {
        await model.create({ data: item })
        results.created++
      }
    } catch (error) {
      results.errors.push({ item, error })
    }
  }
  
  return results
}

/**
 * Search with full-text search capabilities
 */
export async function searchContent(
  query: string,
  models: string[] = ['course', 'product', 'craftsmanProfile'],
  limit: number = 20
): Promise<any[]> {
  const results: any[] = []
  
  try {
    // Search courses
    if (models.includes('course')) {
      const courses = await prisma.course.findMany({
        where: {
          OR: [
            {
              title: {
                path: ['zh-HK'],
                string_contains: query,
              },
            },
            {
              title: {
                path: ['zh-CN'],
                string_contains: query,
              },
            },
            {
              title: {
                path: ['en'],
                string_contains: query,
              },
            },
            {
              craftCategory: {
                contains: query,
                mode: 'insensitive',
              },
            },
          ],
          status: 'ACTIVE',
        },
        include: {
          craftsman: {
            include: {
              user: true,
            },
          },
        },
        take: limit,
      })
      
      results.push(...courses.map(course => ({ ...course, _type: 'course' })))
    }
    
    // Search products
    if (models.includes('product')) {
      const products = await prisma.product.findMany({
        where: {
          OR: [
            {
              name: {
                path: ['zh-HK'],
                string_contains: query,
              },
            },
            {
              name: {
                path: ['zh-CN'],
                string_contains: query,
              },
            },
            {
              name: {
                path: ['en'],
                string_contains: query,
              },
            },
            {
              craftCategory: {
                contains: query,
                mode: 'insensitive',
              },
            },
          ],
          status: 'ACTIVE',
        },
        include: {
          craftsman: {
            include: {
              user: true,
            },
          },
        },
        take: limit,
      })
      
      results.push(...products.map(product => ({ ...product, _type: 'product' })))
    }
    
    // Search craftsman profiles
    if (models.includes('craftsmanProfile')) {
      const craftsmen = await prisma.craftsmanProfile.findMany({
        where: {
          OR: [
            {
              craftSpecialties: {
                has: query,
              },
            },
            {
              bio: {
                path: ['zh-HK'],
                string_contains: query,
              },
            },
            {
              bio: {
                path: ['zh-CN'],
                string_contains: query,
              },
            },
            {
              bio: {
                path: ['en'],
                string_contains: query,
              },
            },
            {
              workshopLocation: {
                contains: query,
                mode: 'insensitive',
              },
            },
          ],
          verificationStatus: 'VERIFIED',
        },
        include: {
          user: true,
        },
        take: limit,
      })
      
      results.push(...craftsmen.map(craftsman => ({ ...craftsman, _type: 'craftsman' })))
    }
    
    return results.slice(0, limit)
  } catch (error) {
    console.error('Search failed:', error)
    return []
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats(): Promise<Record<string, number>> {
  try {
    const [
      userCount,
      craftsmanCount,
      courseCount,
      productCount,
      orderCount,
      bookingCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.craftsmanProfile.count(),
      prisma.course.count(),
      prisma.product.count(),
      prisma.order.count(),
      prisma.booking.count(),
    ])
    
    return {
      users: userCount,
      craftsmen: craftsmanCount,
      courses: courseCount,
      products: productCount,
      orders: orderCount,
      bookings: bookingCount,
    }
  } catch (error) {
    console.error('Failed to get database stats:', error)
    return {}
  }
}

/**
 * Clean up old data (for maintenance)
 */
export async function cleanupOldData(daysOld: number = 90): Promise<void> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysOld)
  
  try {
    await executeTransaction(async (tx) => {
      // Clean up old media files that are not referenced
      const orphanedMedia = await tx.mediaFile.findMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
          // Add conditions to check if media is not referenced anywhere
        },
      })
      
      if (orphanedMedia.length > 0) {
        await tx.mediaFile.deleteMany({
          where: {
            id: {
              in: orphanedMedia.map(m => m.id),
            },
          },
        })
      }
      
      // Clean up old cancelled bookings
      await tx.booking.deleteMany({
        where: {
          status: 'CANCELLED',
          createdAt: {
            lt: cutoffDate,
          },
        },
      })
    })
  } catch (error) {
    console.error('Cleanup failed:', error)
    throw error
  }
}

/**
 * Backup critical data
 */
export async function backupCriticalData(): Promise<{
  users: any[]
  craftsmen: any[]
  orders: any[]
}> {
  try {
    const [users, craftsmen, orders] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
        },
      }),
      prisma.craftsmanProfile.findMany({
        include: {
          user: {
            select: {
              email: true,
            },
          },
        },
      }),
      prisma.order.findMany({
        where: {
          status: {
            in: ['CONFIRMED', 'PROCESSING', 'SHIPPED'],
          },
        },
        include: {
          orderItems: {
            include: {
              product: true,
            },
          },
          user: {
            select: {
              email: true,
            },
          },
        },
      }),
    ])
    
    return { users, craftsmen, orders }
  } catch (error) {
    console.error('Backup failed:', error)
    throw error
  }
}

/**
 * Validate database constraints
 */
export async function validateDatabaseConstraints(): Promise<ValidationResult> {
  const errors: any[] = []
  
  try {
    // Check for orphaned records
    const orphanedBookings = await prisma.booking.findMany({
      where: {
        course: null,
      },
    })
    
    if (orphanedBookings.length > 0) {
      errors.push({
        field: 'bookings',
        message: `Found ${orphanedBookings.length} orphaned bookings`,
        code: 'orphaned_records',
      })
    }
    
    // Check for invalid email formats
    const invalidEmails = await prisma.user.findMany({
      where: {
        email: {
          not: {
            contains: '@',
          },
        },
      },
    })
    
    if (invalidEmails.length > 0) {
      errors.push({
        field: 'users.email',
        message: `Found ${invalidEmails.length} users with invalid email formats`,
        code: 'invalid_email',
      })
    }
    
    // Check for negative prices
    const negativeProducts = await prisma.product.findMany({
      where: {
        price: {
          lt: 0,
        },
      },
    })
    
    if (negativeProducts.length > 0) {
      errors.push({
        field: 'products.price',
        message: `Found ${negativeProducts.length} products with negative prices`,
        code: 'negative_price',
      })
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    }
  } catch (error) {
    return {
      isValid: false,
      errors: [{
        field: 'database',
        message: 'Failed to validate database constraints',
        code: 'validation_error',
      }],
    }
  }
}