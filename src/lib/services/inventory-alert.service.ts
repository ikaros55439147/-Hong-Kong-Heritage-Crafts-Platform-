import { PrismaClient, AlertType } from '@prisma/client'
import { 
  InventoryAlertData, 
  InventoryAlertWithDetails, 
  PaginationParams, 
  PaginationResult
} from '@/types'
import { notificationService } from './notification.service'

const prisma = new PrismaClient()

export class InventoryAlertService {
  /**
   * Create inventory alert
   */
  async createAlert(alertData: InventoryAlertData): Promise<InventoryAlertWithDetails> {
    // Verify product exists and belongs to craftsman
    const product = await prisma.product.findFirst({
      where: {
        id: alertData.productId,
        craftsmanId: alertData.craftsmanId
      },
      include: {
        craftsman: {
          include: {
            user: true
          }
        }
      }
    })

    if (!product) {
      throw new Error('Product not found or access denied')
    }

    const alert = await prisma.inventoryAlert.create({
      data: {
        productId: alertData.productId,
        craftsmanId: alertData.craftsmanId,
        alertType: alertData.alertType,
        thresholdQuantity: alertData.thresholdQuantity,
        currentQuantity: alertData.currentQuantity
      },
      include: {
        product: {
          include: {
            craftsman: {
              include: {
                user: true
              }
            }
          }
        },
        craftsman: {
          include: {
            user: true
          }
        }
      }
    })

    // Send notification to craftsman
    await this.sendAlertNotification(alert)

    return alert
  }

  /**
   * Check and create alerts for low stock products
   */
  async checkLowStockAlerts(craftsmanId?: string): Promise<InventoryAlertWithDetails[]> {
    const where: any = {
      status: 'ACTIVE'
    }

    if (craftsmanId) {
      where.craftsmanId = craftsmanId
    }

    // Get products that might need alerts
    const products = await prisma.product.findMany({
      where,
      include: {
        craftsman: {
          include: {
            user: true
          }
        }
      }
    })

    const alerts: InventoryAlertWithDetails[] = []
    const lowStockThreshold = 5 // Default threshold

    for (const product of products) {
      // Check if we already have a recent alert for this product
      const recentAlert = await prisma.inventoryAlert.findFirst({
        where: {
          productId: product.id,
          alertType: {
            in: [AlertType.LOW_STOCK, AlertType.OUT_OF_STOCK]
          },
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      })

      if (recentAlert) continue // Skip if already alerted recently

      let alertType: AlertType | null = null

      if (product.inventoryQuantity === 0) {
        alertType = AlertType.OUT_OF_STOCK
      } else if (product.inventoryQuantity <= lowStockThreshold) {
        alertType = AlertType.LOW_STOCK
      }

      if (alertType) {
        const alert = await this.createAlert({
          productId: product.id,
          craftsmanId: product.craftsmanId,
          alertType,
          thresholdQuantity: lowStockThreshold,
          currentQuantity: product.inventoryQuantity
        })

        alerts.push(alert)
      }
    }

    return alerts
  }

  /**
   * Get alerts for craftsman
   */
  async getAlertsForCraftsman(
    craftsmanId: string,
    pagination: PaginationParams = {},
    filters: {
      alertType?: AlertType
      isAcknowledged?: boolean
    } = {}
  ): Promise<PaginationResult<InventoryAlertWithDetails>> {
    const { page = 1, limit = 10 } = pagination
    const skip = (page - 1) * limit

    const where: any = { craftsmanId }

    if (filters.alertType) {
      where.alertType = filters.alertType
    }

    if (filters.isAcknowledged !== undefined) {
      where.isAcknowledged = filters.isAcknowledged
    }

    const [alerts, total] = await Promise.all([
      prisma.inventoryAlert.findMany({
        where,
        include: {
          product: {
            include: {
              craftsman: {
                include: {
                  user: true
                }
              }
            }
          },
          craftsman: {
            include: {
              user: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.inventoryAlert.count({ where })
    ])

    return {
      data: alerts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId: string, craftsmanId: string): Promise<InventoryAlertWithDetails> {
    // Verify alert exists and belongs to craftsman
    const existingAlert = await prisma.inventoryAlert.findFirst({
      where: {
        id: alertId,
        craftsmanId
      }
    })

    if (!existingAlert) {
      throw new Error('Alert not found or access denied')
    }

    const alert = await prisma.inventoryAlert.update({
      where: { id: alertId },
      data: {
        isAcknowledged: true,
        acknowledgedAt: new Date()
      },
      include: {
        product: {
          include: {
            craftsman: {
              include: {
                user: true
              }
            }
          }
        },
        craftsman: {
          include: {
            user: true
          }
        }
      }
    })

    return alert
  }

  /**
   * Get alert statistics for craftsman
   */
  async getAlertStatistics(craftsmanId: string): Promise<{
    totalAlerts: number
    unacknowledgedAlerts: number
    lowStockAlerts: number
    outOfStockAlerts: number
    restockReminders: number
    alertsByMonth: { month: string; count: number }[]
  }> {
    const [
      totalAlerts,
      unacknowledgedAlerts,
      lowStockAlerts,
      outOfStockAlerts,
      restockReminders,
      alertsByMonth
    ] = await Promise.all([
      // Total alerts
      prisma.inventoryAlert.count({
        where: { craftsmanId }
      }),
      // Unacknowledged alerts
      prisma.inventoryAlert.count({
        where: {
          craftsmanId,
          isAcknowledged: false
        }
      }),
      // Low stock alerts
      prisma.inventoryAlert.count({
        where: {
          craftsmanId,
          alertType: AlertType.LOW_STOCK
        }
      }),
      // Out of stock alerts
      prisma.inventoryAlert.count({
        where: {
          craftsmanId,
          alertType: AlertType.OUT_OF_STOCK
        }
      }),
      // Restock reminders
      prisma.inventoryAlert.count({
        where: {
          craftsmanId,
          alertType: AlertType.RESTOCK_REMINDER
        }
      }),
      // Alerts by month
      prisma.inventoryAlert.groupBy({
        by: ['createdAt'],
        where: { craftsmanId },
        _count: { id: true }
      })
    ])

    // Process alerts by month
    const monthlyAlerts = alertsByMonth.reduce((acc, alert) => {
      const month = alert.createdAt.toISOString().substring(0, 7) // YYYY-MM
      const existing = acc.find(item => item.month === month)
      
      if (existing) {
        existing.count += alert._count.id
      } else {
        acc.push({
          month,
          count: alert._count.id
        })
      }
      
      return acc
    }, [] as { month: string; count: number }[])

    return {
      totalAlerts,
      unacknowledgedAlerts,
      lowStockAlerts,
      outOfStockAlerts,
      restockReminders,
      alertsByMonth: monthlyAlerts.sort((a, b) => a.month.localeCompare(b.month))
    }
  }

  /**
   * Create restock reminder
   */
  async createRestockReminder(
    productId: string,
    craftsmanId: string,
    reminderDate?: Date
  ): Promise<InventoryAlertWithDetails> {
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        craftsmanId
      }
    })

    if (!product) {
      throw new Error('Product not found or access denied')
    }

    // Check if there's already a pending restock reminder
    const existingReminder = await prisma.inventoryAlert.findFirst({
      where: {
        productId,
        craftsmanId,
        alertType: AlertType.RESTOCK_REMINDER,
        isAcknowledged: false
      }
    })

    if (existingReminder) {
      throw new Error('Restock reminder already exists for this product')
    }

    const alert = await this.createAlert({
      productId,
      craftsmanId,
      alertType: AlertType.RESTOCK_REMINDER,
      currentQuantity: product.inventoryQuantity
    })

    return alert
  }

  /**
   * Send alert notification
   */
  private async sendAlertNotification(alert: InventoryAlertWithDetails): Promise<void> {
    let message = ''
    const productName = typeof alert.product.name === 'object' 
      ? (alert.product.name as any)['zh-HK'] || (alert.product.name as any)['en'] || 'Product'
      : alert.product.name

    switch (alert.alertType) {
      case AlertType.LOW_STOCK:
        message = `Low stock alert: ${productName} has only ${alert.currentQuantity} items remaining`
        break
      case AlertType.OUT_OF_STOCK:
        message = `Out of stock alert: ${productName} is now out of stock`
        break
      case AlertType.RESTOCK_REMINDER:
        message = `Restock reminder: Consider restocking ${productName}`
        break
    }

    try {
      await notificationService.createNotification({
        userId: alert.craftsman.userId,
        type: 'PRODUCT_UPDATE',
        title: 'Inventory Alert',
        message,
        entityType: 'PRODUCT',
        entityId: alert.productId
      })
    } catch (error) {
      console.error('Failed to send alert notification:', error)
      // Don't throw error as the alert was created successfully
    }
  }

  /**
   * Delete old acknowledged alerts (cleanup)
   */
  async cleanupOldAlerts(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000)

    const result = await prisma.inventoryAlert.deleteMany({
      where: {
        isAcknowledged: true,
        acknowledgedAt: {
          lt: cutoffDate
        }
      }
    })

    return result.count
  }

  /**
   * Set low stock threshold for craftsman (stored in user preferences)
   */
  async setLowStockThreshold(craftsmanId: string, threshold: number): Promise<void> {
    if (threshold < 0) {
      throw new Error('Threshold must be non-negative')
    }

    // This could be stored in user preferences or craftsman profile
    // For now, we'll store it in the craftsman profile's contactInfo as a temporary solution
    const craftsman = await prisma.craftsmanProfile.findUnique({
      where: { id: craftsmanId }
    })

    if (!craftsman) {
      throw new Error('Craftsman not found')
    }

    const contactInfo = (craftsman.contactInfo as any) || {}
    contactInfo.lowStockThreshold = threshold

    await prisma.craftsmanProfile.update({
      where: { id: craftsmanId },
      data: {
        contactInfo: contactInfo
      }
    })
  }

  /**
   * Get low stock threshold for craftsman
   */
  async getLowStockThreshold(craftsmanId: string): Promise<number> {
    const craftsman = await prisma.craftsmanProfile.findUnique({
      where: { id: craftsmanId }
    })

    if (!craftsman) {
      throw new Error('Craftsman not found')
    }

    const contactInfo = (craftsman.contactInfo as any) || {}
    return contactInfo.lowStockThreshold || 5 // Default threshold
  }
}

export const inventoryAlertService = new InventoryAlertService()