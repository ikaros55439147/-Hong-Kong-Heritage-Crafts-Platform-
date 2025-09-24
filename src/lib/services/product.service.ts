import { PrismaClient, ProductStatus } from '@prisma/client'
import { 
  ProductData, 
  ProductCreateInput,
  ProductUpdateInput,
  ProductWithCraftsmanInclude, 
  PaginationParams, 
  PaginationResult,
  SearchParams,
  ValidationResult,
  ValidationError
} from '@/types'
import { validateProductData } from '@/lib/validations'

const prisma = new PrismaClient()

export class ProductService {
  /**
   * Create a new product
   */
  async createProduct(craftsmanId: string, productData: ProductData): Promise<ProductWithCraftsmanInclude> {
    // Validate product data
    const validation = validateProductData(productData)
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`)
    }

    // Verify craftsman exists
    const craftsman = await prisma.craftsmanProfile.findUnique({
      where: { id: craftsmanId },
      include: { user: true }
    })

    if (!craftsman) {
      throw new Error('Craftsman not found')
    }

    // Convert to Prisma input format
    const createInput: ProductCreateInput = {
      name: productData.name as any,
      description: productData.description as any,
      price: productData.price,
      inventoryQuantity: productData.inventoryQuantity || 0,
      isCustomizable: productData.isCustomizable || false,
      craftCategory: productData.craftCategory,
      status: productData.status || ProductStatus.ACTIVE
    }

    // Create product
    const product = await prisma.product.create({
      data: {
        craftsmanId,
        ...createInput
      },
      include: {
        craftsman: {
          include: {
            user: true
          }
        }
      }
    })

    return product
  }

  /**
   * Get product by ID
   */
  async getProductById(productId: string): Promise<ProductWithCraftsmanInclude | null> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        craftsman: {
          include: {
            user: true
          }
        }
      }
    })

    return product
  }

  /**
   * Update product
   */
  async updateProduct(productId: string, craftsmanId: string, updates: Partial<ProductData>): Promise<ProductWithCraftsmanInclude> {
    // Verify product exists and belongs to craftsman
    const existingProduct = await prisma.product.findFirst({
      where: {
        id: productId,
        craftsmanId: craftsmanId
      }
    })

    if (!existingProduct) {
      throw new Error('Product not found or access denied')
    }

    // Validate updates
    if (Object.keys(updates).length > 0) {
      const validation = validateProductData(updates, true) // partial validation
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`)
      }
    }

    // Convert to Prisma input format
    const updateInput: Partial<ProductUpdateInput> = {}
    if (updates.name) updateInput.name = updates.name as any
    if (updates.description !== undefined) updateInput.description = updates.description as any
    if (updates.price !== undefined) updateInput.price = updates.price
    if (updates.inventoryQuantity !== undefined) updateInput.inventoryQuantity = updates.inventoryQuantity
    if (updates.isCustomizable !== undefined) updateInput.isCustomizable = updates.isCustomizable
    if (updates.craftCategory) updateInput.craftCategory = updates.craftCategory
    if (updates.status) updateInput.status = updates.status

    const product = await prisma.product.update({
      where: { id: productId },
      data: updateInput,
      include: {
        craftsman: {
          include: {
            user: true
          }
        }
      }
    })

    return product
  }

  /**
   * Delete product
   */
  async deleteProduct(productId: string, craftsmanId: string): Promise<void> {
    // Verify product exists and belongs to craftsman
    const existingProduct = await prisma.product.findFirst({
      where: {
        id: productId,
        craftsmanId: craftsmanId
      }
    })

    if (!existingProduct) {
      throw new Error('Product not found or access denied')
    }

    // Check if product has pending orders
    const pendingOrders = await prisma.orderItem.findFirst({
      where: {
        productId: productId,
        order: {
          status: {
            in: ['PENDING', 'CONFIRMED', 'PROCESSING']
          }
        }
      }
    })

    if (pendingOrders) {
      throw new Error('Cannot delete product with pending orders')
    }

    await prisma.product.delete({
      where: { id: productId }
    })
  }

  /**
   * Get products by craftsman
   */
  async getProductsByCraftsman(
    craftsmanId: string, 
    pagination: PaginationParams = {}
  ): Promise<PaginationResult<ProductWithCraftsmanInclude>> {
    const { page = 1, limit = 10 } = pagination
    const skip = (page - 1) * limit

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: { craftsmanId },
        include: {
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
      prisma.product.count({
        where: { craftsmanId }
      })
    ])

    return {
      data: products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  /**
   * Search products
   */
  async searchProducts(params: SearchParams & PaginationParams): Promise<PaginationResult<ProductWithCraftsmanInclude>> {
    const { query, category, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = params
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {
      status: ProductStatus.ACTIVE
    }

    if (query) {
      where.OR = [
        {
          name: {
            path: ['zh-HK'],
            string_contains: query
          }
        },
        {
          name: {
            path: ['zh-CN'],
            string_contains: query
          }
        },
        {
          name: {
            path: ['en'],
            string_contains: query
          }
        },
        {
          description: {
            path: ['zh-HK'],
            string_contains: query
          }
        },
        {
          description: {
            path: ['zh-CN'],
            string_contains: query
          }
        },
        {
          description: {
            path: ['en'],
            string_contains: query
          }
        }
      ]
    }

    if (category) {
      where.craftCategory = category
    }

    // Build order by clause
    const orderBy: any = {}
    if (sortBy === 'price') {
      orderBy.price = sortOrder
    } else if (sortBy === 'name') {
      orderBy.name = sortOrder
    } else {
      orderBy.createdAt = sortOrder
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          craftsman: {
            include: {
              user: true
            }
          }
        },
        orderBy,
        skip,
        take: limit
      }),
      prisma.product.count({ where })
    ])

    return {
      data: products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  /**
   * Update product status
   */
  async updateProductStatus(productId: string, craftsmanId: string, status: ProductStatus): Promise<ProductWithCraftsmanInclude> {
    // Verify product exists and belongs to craftsman
    const existingProduct = await prisma.product.findFirst({
      where: {
        id: productId,
        craftsmanId: craftsmanId
      }
    })

    if (!existingProduct) {
      throw new Error('Product not found or access denied')
    }

    const product = await prisma.product.update({
      where: { id: productId },
      data: { status },
      include: {
        craftsman: {
          include: {
            user: true
          }
        }
      }
    })

    return product
  }

  /**
   * Update product inventory
   */
  async updateInventory(productId: string, craftsmanId: string, quantity: number): Promise<ProductWithCraftsmanInclude> {
    if (quantity < 0) {
      throw new Error('Inventory quantity cannot be negative')
    }

    // Verify product exists and belongs to craftsman
    const existingProduct = await prisma.product.findFirst({
      where: {
        id: productId,
        craftsmanId: craftsmanId
      }
    })

    if (!existingProduct) {
      throw new Error('Product not found or access denied')
    }

    // Auto-update status based on inventory
    let status: ProductStatus = existingProduct.status
    if (quantity === 0 && status === ProductStatus.ACTIVE) {
      status = ProductStatus.OUT_OF_STOCK
    } else if (quantity > 0 && status === ProductStatus.OUT_OF_STOCK) {
      status = ProductStatus.ACTIVE
    }

    const product = await prisma.product.update({
      where: { id: productId },
      data: { 
        inventoryQuantity: quantity,
        status
      },
      include: {
        craftsman: {
          include: {
            user: true
          }
        }
      }
    })

    return product
  }

  /**
   * Reserve inventory for order (atomic operation)
   */
  async reserveInventory(productId: string, quantity: number): Promise<boolean> {
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Get current product with lock
        const product = await tx.product.findUnique({
          where: { id: productId }
        })

        if (!product) {
          throw new Error('Product not found')
        }

        if (product.status !== ProductStatus.ACTIVE) {
          throw new Error('Product is not available')
        }

        if (product.inventoryQuantity < quantity) {
          throw new Error('Insufficient inventory')
        }

        // Update inventory
        const newQuantity = product.inventoryQuantity - quantity
        let newStatus: ProductStatus = product.status

        // Auto-update status if out of stock
        if (newQuantity === 0) {
          newStatus = ProductStatus.OUT_OF_STOCK
        }

        await tx.product.update({
          where: { id: productId },
          data: {
            inventoryQuantity: newQuantity,
            status: newStatus
          }
        })

        return true
      })

      return result
    } catch (error) {
      console.error('Failed to reserve inventory:', error)
      return false
    }
  }

  /**
   * Release reserved inventory (for cancelled orders)
   */
  async releaseInventory(productId: string, quantity: number): Promise<boolean> {
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Get current product
        const product = await tx.product.findUnique({
          where: { id: productId }
        })

        if (!product) {
          throw new Error('Product not found')
        }

        // Update inventory
        const newQuantity = product.inventoryQuantity + quantity
        let newStatus: ProductStatus = product.status

        // Auto-update status if back in stock
        if (product.status === ProductStatus.OUT_OF_STOCK && newQuantity > 0) {
          newStatus = ProductStatus.ACTIVE
        }

        await tx.product.update({
          where: { id: productId },
          data: {
            inventoryQuantity: newQuantity,
            status: newStatus
          }
        })

        return true
      })

      return result
    } catch (error) {
      console.error('Failed to release inventory:', error)
      return false
    }
  }

  /**
   * Get product categories
   */
  async getProductCategories(): Promise<{ category: string; count: number }[]> {
    const categories = await prisma.product.groupBy({
      by: ['craftCategory'],
      where: {
        status: ProductStatus.ACTIVE
      },
      _count: {
        craftCategory: true
      },
      orderBy: {
        _count: {
          craftCategory: 'desc'
        }
      }
    })

    return categories.map(cat => ({
      category: cat.craftCategory,
      count: cat._count.craftCategory
    }))
  }

  /**
   * Get low stock products for a craftsman
   */
  async getLowStockProducts(craftsmanId: string, threshold: number = 5): Promise<ProductWithCraftsmanInclude[]> {
    const products = await prisma.product.findMany({
      where: {
        craftsmanId,
        inventoryQuantity: {
          lte: threshold
        },
        status: {
          in: [ProductStatus.ACTIVE, ProductStatus.OUT_OF_STOCK]
        }
      },
      include: {
        craftsman: {
          include: {
            user: true
          }
        }
      },
      orderBy: {
        inventoryQuantity: 'asc'
      }
    })

    return products
  }
}

export const productService = new ProductService()