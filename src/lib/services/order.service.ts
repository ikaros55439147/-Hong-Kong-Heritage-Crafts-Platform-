import { PrismaClient, OrderStatus, PaymentStatus } from '@prisma/client'
import { 
  OrderData, 
  OrderWithDetails, 
  ShippingAddress,
  PaginationParams,
  PaginationResult,
  ValidationResult
} from '@/types'
import { validateOrderData } from '@/lib/validations'
import { productService } from './product.service'
import { cartService } from './cart.service'

const prisma = new PrismaClient()

export class OrderService {
  /**
   * Create order from cart
   */
  async createOrderFromCart(userId: string, shippingAddress: ShippingAddress): Promise<OrderWithDetails> {
    // Validate cart
    const cartValidation = await cartService.validateCart(userId)
    if (!cartValidation.isValid) {
      throw new Error(`Cart validation failed: ${cartValidation.errors.join(', ')}`)
    }

    // Get cart items
    const cart = await cartService.getCart(userId)
    if (cart.items.length === 0) {
      throw new Error('Cart is empty')
    }

    // Create order data
    const orderData: OrderData = {
      items: cart.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        customizationNotes: item.customizationNotes
      })),
      shippingAddress
    }

    return this.createOrder(userId, orderData)
  }

  /**
   * Create order
   */
  async createOrder(userId: string, orderData: OrderData): Promise<OrderWithDetails> {
    // Validate order data
    const validation = validateOrderData(orderData)
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`)
    }

    // Use transaction to ensure data consistency
    const order = await prisma.$transaction(async (tx) => {
      let totalAmount = 0
      const orderItems = []

      // Process each order item
      for (const itemData of orderData.items) {
        const product = await tx.product.findUnique({
          where: { id: itemData.productId },
          include: {
            craftsman: {
              include: {
                user: true
              }
            }
          }
        })

        if (!product) {
          throw new Error(`Product ${itemData.productId} not found`)
        }

        if (product.status !== 'ACTIVE') {
          throw new Error(`Product "${product.name}" is not available`)
        }

        if (itemData.quantity > product.inventoryQuantity) {
          throw new Error(`Insufficient inventory for product "${product.name}"`)
        }

        // Reserve inventory
        const success = await productService.reserveInventory(itemData.productId, itemData.quantity)
        if (!success) {
          throw new Error(`Failed to reserve inventory for product "${product.name}"`)
        }

        const itemPrice = Number(product.price)
        const itemTotal = itemPrice * itemData.quantity
        totalAmount += itemTotal

        orderItems.push({
          productId: itemData.productId,
          quantity: itemData.quantity,
          price: itemPrice
        })
      }

      // Create order
      const newOrder = await tx.order.create({
        data: {
          userId,
          totalAmount,
          status: OrderStatus.PENDING,
          shippingAddress: orderData.shippingAddress,
          paymentStatus: PaymentStatus.PENDING,
          orderItems: {
            create: orderItems
          }
        },
        include: {
          user: true,
          orderItems: {
            include: {
              product: {
                include: {
                  craftsman: {
                    include: {
                      user: true
                    }
                  }
                }
              }
            }
          }
        }
      })

      return newOrder
    })

    // Clear cart after successful order creation
    await cartService.clearCart(userId)

    return order
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId: string): Promise<OrderWithDetails | null> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        orderItems: {
          include: {
            product: {
              include: {
                craftsman: {
                  include: {
                    user: true
                  }
                }
              }
            }
          }
        }
      }
    })

    return order
  }

  /**
   * Get orders by user
   */
  async getOrdersByUser(
    userId: string, 
    pagination: PaginationParams = {}
  ): Promise<PaginationResult<OrderWithDetails>> {
    const { page = 1, limit = 10 } = pagination
    const skip = (page - 1) * limit

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { userId },
        include: {
          user: true,
          orderItems: {
            include: {
              product: {
                include: {
                  craftsman: {
                    include: {
                      user: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.order.count({
        where: { userId }
      })
    ])

    return {
      data: orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  /**
   * Get orders by craftsman
   */
  async getOrdersByCraftsman(
    craftsmanId: string, 
    pagination: PaginationParams = {}
  ): Promise<PaginationResult<OrderWithDetails>> {
    const { page = 1, limit = 10 } = pagination
    const skip = (page - 1) * limit

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: {
          orderItems: {
            some: {
              product: {
                craftsmanId: craftsmanId
              }
            }
          }
        },
        include: {
          user: true,
          orderItems: {
            include: {
              product: {
                include: {
                  craftsman: {
                    include: {
                      user: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.order.count({
        where: {
          orderItems: {
            some: {
              product: {
                craftsmanId: craftsmanId
              }
            }
          }
        }
      })
    ])

    return {
      data: orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<OrderWithDetails> {
    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: {
        user: true,
        orderItems: {
          include: {
            product: {
              include: {
                craftsman: {
                  include: {
                    user: true
                  }
                }
              }
            }
          }
        }
      }
    })

    return order
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(orderId: string, paymentStatus: PaymentStatus): Promise<OrderWithDetails> {
    const order = await prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus },
      include: {
        user: true,
        orderItems: {
          include: {
            product: {
              include: {
                craftsman: {
                  include: {
                    user: true
                  }
                }
              }
            }
          }
        }
      }
    })

    return order
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: string, userId?: string): Promise<OrderWithDetails> {
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            product: true
          }
        }
      }
    })

    if (!existingOrder) {
      throw new Error('Order not found')
    }

    // Check if user has permission to cancel (if userId provided)
    if (userId && existingOrder.userId !== userId) {
      throw new Error('Access denied')
    }

    // Check if order can be cancelled
    if (existingOrder.status === OrderStatus.DELIVERED || 
        existingOrder.status === OrderStatus.CANCELLED) {
      throw new Error('Order cannot be cancelled')
    }

    // Use transaction to ensure consistency
    const order = await prisma.$transaction(async (tx) => {
      // Release reserved inventory
      for (const item of existingOrder.orderItems) {
        await productService.releaseInventory(item.productId, item.quantity)
      }

      // Update order status
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { 
          status: OrderStatus.CANCELLED,
          paymentStatus: existingOrder.paymentStatus === PaymentStatus.COMPLETED 
            ? PaymentStatus.REFUNDED 
            : PaymentStatus.FAILED
        },
        include: {
          user: true,
          orderItems: {
            include: {
              product: {
                include: {
                  craftsman: {
                    include: {
                      user: true
                    }
                  }
                }
              }
            }
          }
        }
      })

      return updatedOrder
    })

    return order
  }

  /**
   * Get order statistics for craftsman
   */
  async getOrderStatistics(craftsmanId: string): Promise<{
    totalOrders: number
    totalRevenue: number
    pendingOrders: number
    completedOrders: number
    cancelledOrders: number
  }> {
    const [
      totalOrders,
      totalRevenue,
      pendingOrders,
      completedOrders,
      cancelledOrders
    ] = await Promise.all([
      // Total orders
      prisma.order.count({
        where: {
          orderItems: {
            some: {
              product: {
                craftsmanId: craftsmanId
              }
            }
          }
        }
      }),
      // Total revenue (from completed orders)
      prisma.order.aggregate({
        where: {
          orderItems: {
            some: {
              product: {
                craftsmanId: craftsmanId
              }
            }
          },
          status: OrderStatus.DELIVERED,
          paymentStatus: PaymentStatus.COMPLETED
        },
        _sum: {
          totalAmount: true
        }
      }),
      // Pending orders
      prisma.order.count({
        where: {
          orderItems: {
            some: {
              product: {
                craftsmanId: craftsmanId
              }
            }
          },
          status: {
            in: [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PROCESSING]
          }
        }
      }),
      // Completed orders
      prisma.order.count({
        where: {
          orderItems: {
            some: {
              product: {
                craftsmanId: craftsmanId
              }
            }
          },
          status: OrderStatus.DELIVERED
        }
      }),
      // Cancelled orders
      prisma.order.count({
        where: {
          orderItems: {
            some: {
              product: {
                craftsmanId: craftsmanId
              }
            }
          },
          status: OrderStatus.CANCELLED
        }
      })
    ])

    return {
      totalOrders,
      totalRevenue: Number(totalRevenue._sum.totalAmount || 0),
      pendingOrders,
      completedOrders,
      cancelledOrders
    }
  }
}

export const orderService = new OrderService()