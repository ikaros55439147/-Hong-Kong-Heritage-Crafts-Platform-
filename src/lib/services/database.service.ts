import { PrismaClient, Prisma } from '@prisma/client'
import { prisma } from '../prisma'
import { 
  UserRegistrationData, 
  CraftsmanProfileData, 
  CourseData, 
  ProductData, 
  OrderData,
  BookingData,
  SearchQuery,
  PaginationParams,
  PaginationResult
} from '@/types'
import { validateData } from '../data-utils'
import { 
  userRegistrationSchema, 
  craftsmanProfileSchema, 
  courseSchema, 
  productSchema, 
  orderSchema,
  bookingSchema 
} from '../validations'
import bcrypt from 'bcryptjs'

/**
 * Database service class for handling all database operations
 */
export class DatabaseService {
  private prisma: PrismaClient

  constructor() {
    this.prisma = prisma
  }

  // User operations
  async createUser(userData: UserRegistrationData) {
    const validation = validateData(userRegistrationSchema, userData)
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`)
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10)
    
    return await this.prisma.user.create({
      data: {
        email: userData.email,
        passwordHash: hashedPassword,
        role: userData.role || 'LEARNER',
        preferredLanguage: userData.preferredLanguage || 'zh-HK',
      },
      select: {
        id: true,
        email: true,
        role: true,
        preferredLanguage: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  }

  async getUserByEmail(email: string) {
    return await this.prisma.user.findUnique({
      where: { email },
      include: {
        craftsmanProfile: true,
      },
    })
  }

  async getUserById(id: string) {
    return await this.prisma.user.findUnique({
      where: { id },
      include: {
        craftsmanProfile: true,
      },
    })
  }

  async updateUser(id: string, data: Partial<UserRegistrationData>) {
    return await this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        role: true,
        preferredLanguage: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  }

  // Craftsman operations
  async createCraftsmanProfile(userId: string, profileData: CraftsmanProfileData) {
    const validation = validateData(craftsmanProfileSchema, profileData)
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`)
    }

    return await this.prisma.craftsmanProfile.create({
      data: {
        userId,
        ...profileData,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            preferredLanguage: true,
          },
        },
      },
    })
  }

  async updateCraftsmanProfile(id: string, profileData: Partial<CraftsmanProfileData>) {
    return await this.prisma.craftsmanProfile.update({
      where: { id },
      data: profileData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            preferredLanguage: true,
          },
        },
      },
    })
  }

  async getCraftsmanProfile(id: string) {
    return await this.prisma.craftsmanProfile.findUnique({
      where: { id },
      include: {
        user: true,
        courses: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
        },
        products: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
        },
      },
    })
  }

  async getCraftsmanByUserId(userId: string) {
    return await this.prisma.craftsmanProfile.findUnique({
      where: { userId },
      include: {
        user: true,
      },
    })
  }

  async getCraftsmen(params: PaginationParams & { category?: string; verified?: boolean }) {
    const { page = 1, limit = 20, category, verified } = params
    const skip = (page - 1) * limit

    const where: Prisma.CraftsmanProfileWhereInput = {}
    
    if (category) {
      where.craftSpecialties = {
        has: category,
      }
    }
    
    if (verified !== undefined) {
      where.verificationStatus = verified ? 'VERIFIED' : { not: 'VERIFIED' }
    }

    const [craftsmen, total] = await Promise.all([
      this.prisma.craftsmanProfile.findMany({
        where,
        include: {
          user: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.craftsmanProfile.count({ where }),
    ])

    return {
      data: craftsmen,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  // Course operations
  async createCourse(craftsmanId: string, courseData: CourseData) {
    const validation = validateData(courseSchema, courseData)
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`)
    }

    return await this.prisma.course.create({
      data: {
        craftsmanId,
        ...courseData,
      },
      include: {
        craftsman: {
          include: {
            user: true,
          },
        },
      },
    })
  }

  async updateCourse(id: string, courseData: Partial<CourseData>) {
    return await this.prisma.course.update({
      where: { id },
      data: courseData,
      include: {
        craftsman: {
          include: {
            user: true,
          },
        },
      },
    })
  }

  async getCourse(id: string) {
    return await this.prisma.course.findUnique({
      where: { id },
      include: {
        craftsman: {
          include: {
            user: true,
          },
        },
        bookings: {
          include: {
            user: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })
  }

  async getCourses(params: PaginationParams & { category?: string; craftsmanId?: string }) {
    const { page = 1, limit = 20, category, craftsmanId } = params
    const skip = (page - 1) * limit

    const where: Prisma.CourseWhereInput = {
      status: 'ACTIVE',
    }
    
    if (category) {
      where.craftCategory = category
    }
    
    if (craftsmanId) {
      where.craftsmanId = craftsmanId
    }

    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        include: {
          craftsman: {
            include: {
              user: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.course.count({ where }),
    ])

    return {
      data: courses,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  // Booking operations
  async createBooking(userId: string, courseId: string, bookingData: BookingData) {
    const validation = validateData(bookingSchema, bookingData)
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`)
    }

    // Check if course exists and has available spots
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        bookings: {
          where: {
            status: { in: ['PENDING', 'CONFIRMED'] },
          },
        },
      },
    })

    if (!course) {
      throw new Error('Course not found')
    }

    if (course.maxParticipants && course.bookings.length >= course.maxParticipants) {
      throw new Error('Course is fully booked')
    }

    // Check if user already has a booking for this course
    const existingBooking = await this.prisma.booking.findFirst({
      where: {
        userId,
        courseId,
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    })

    if (existingBooking) {
      throw new Error('User already has a booking for this course')
    }

    return await this.prisma.booking.create({
      data: {
        userId,
        courseId,
        ...bookingData,
      },
      include: {
        user: true,
        course: {
          include: {
            craftsman: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    })
  }

  async updateBookingStatus(id: string, status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED') {
    return await this.prisma.booking.update({
      where: { id },
      data: { status },
      include: {
        user: true,
        course: {
          include: {
            craftsman: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    })
  }

  async getUserBookings(userId: string, params: PaginationParams) {
    const { page = 1, limit = 20 } = params
    const skip = (page - 1) * limit

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where: { userId },
        include: {
          course: {
            include: {
              craftsman: {
                include: {
                  user: true,
                },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.booking.count({ where: { userId } }),
    ])

    return {
      data: bookings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  // Product operations
  async createProduct(craftsmanId: string, productData: ProductData) {
    const validation = validateData(productSchema, productData)
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`)
    }

    return await this.prisma.product.create({
      data: {
        craftsmanId,
        ...productData,
      },
      include: {
        craftsman: {
          include: {
            user: true,
          },
        },
      },
    })
  }

  async updateProduct(id: string, productData: Partial<ProductData>) {
    return await this.prisma.product.update({
      where: { id },
      data: productData,
      include: {
        craftsman: {
          include: {
            user: true,
          },
        },
      },
    })
  }

  async getProduct(id: string) {
    return await this.prisma.product.findUnique({
      where: { id },
      include: {
        craftsman: {
          include: {
            user: true,
          },
        },
      },
    })
  }

  async getProducts(params: PaginationParams & { category?: string; craftsmanId?: string }) {
    const { page = 1, limit = 20, category, craftsmanId } = params
    const skip = (page - 1) * limit

    const where: Prisma.ProductWhereInput = {
      status: 'ACTIVE',
    }
    
    if (category) {
      where.craftCategory = category
    }
    
    if (craftsmanId) {
      where.craftsmanId = craftsmanId
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          craftsman: {
            include: {
              user: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ])

    return {
      data: products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  // Order operations
  async createOrder(userId: string, orderData: OrderData) {
    const validation = validateData(orderSchema, orderData)
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`)
    }

    return await this.prisma.$transaction(async (tx) => {
      // Calculate total amount and check inventory
      let totalAmount = 0
      const orderItems = []

      for (const item of orderData.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        })

        if (!product) {
          throw new Error(`Product ${item.productId} not found`)
        }

        if (product.inventoryQuantity < item.quantity) {
          throw new Error(`Insufficient inventory for product ${product.name}`)
        }

        const itemTotal = product.price.toNumber() * item.quantity
        totalAmount += itemTotal

        orderItems.push({
          productId: item.productId,
          quantity: item.quantity,
          price: product.price,
        })

        // Update inventory
        await tx.product.update({
          where: { id: item.productId },
          data: {
            inventoryQuantity: {
              decrement: item.quantity,
            },
          },
        })
      }

      // Create order
      const order = await tx.order.create({
        data: {
          userId,
          totalAmount,
          shippingAddress: orderData.shippingAddress,
          orderItems: {
            create: orderItems,
          },
        },
        include: {
          orderItems: {
            include: {
              product: {
                include: {
                  craftsman: {
                    include: {
                      user: true,
                    },
                  },
                },
              },
            },
          },
          user: true,
        },
      })

      return order
    })
  }

  async updateOrderStatus(id: string, status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED') {
    return await this.prisma.order.update({
      where: { id },
      data: { status },
      include: {
        orderItems: {
          include: {
            product: {
              include: {
                craftsman: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
        user: true,
      },
    })
  }

  async getUserOrders(userId: string, params: PaginationParams) {
    const { page = 1, limit = 20 } = params
    const skip = (page - 1) * limit

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId },
        include: {
          orderItems: {
            include: {
              product: {
                include: {
                  craftsman: {
                    include: {
                      user: true,
                    },
                  },
                },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where: { userId } }),
    ])

    return {
      data: orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  // Follow operations
  async followUser(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new Error('Cannot follow yourself')
    }

    const existingFollow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    })

    if (existingFollow) {
      throw new Error('Already following this user')
    }

    return await this.prisma.follow.create({
      data: {
        followerId,
        followingId,
      },
      include: {
        following: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    })
  }

  async unfollowUser(followerId: string, followingId: string) {
    return await this.prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    })
  }

  async getUserFollowing(userId: string, params: PaginationParams) {
    const { page = 1, limit = 20 } = params
    const skip = (page - 1) * limit

    const [following, total] = await Promise.all([
      this.prisma.follow.findMany({
        where: { followerId: userId },
        include: {
          following: {
            include: {
              craftsmanProfile: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.follow.count({ where: { followerId: userId } }),
    ])

    return {
      data: following,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  // Media operations
  async createMediaFile(uploaderId: string, fileData: {
    fileType: string
    fileUrl: string
    fileSize?: number
    metadata?: any
  }) {
    return await this.prisma.mediaFile.create({
      data: {
        uploaderId,
        ...fileData,
      },
    })
  }

  async getMediaFile(id: string) {
    return await this.prisma.mediaFile.findUnique({
      where: { id },
      include: {
        uploader: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    })
  }

  // Search operations
  async searchAll(query: string, params: PaginationParams) {
    const { page = 1, limit = 20 } = params
    const skip = (page - 1) * limit

    // Search across courses, products, and craftsmen
    const [courses, products, craftsmen] = await Promise.all([
      this.prisma.course.findMany({
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
        take: Math.ceil(limit / 3),
      }),
      this.prisma.product.findMany({
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
        take: Math.ceil(limit / 3),
      }),
      this.prisma.craftsmanProfile.findMany({
        where: {
          OR: [
            {
              craftSpecialties: {
                has: query,
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
        take: Math.ceil(limit / 3),
      }),
    ])

    const results = [
      ...courses.map(item => ({ ...item, _type: 'course' })),
      ...products.map(item => ({ ...item, _type: 'product' })),
      ...craftsmen.map(item => ({ ...item, _type: 'craftsman' })),
    ]

    return {
      data: results.slice(skip, skip + limit),
      total: results.length,
      page,
      limit,
      totalPages: Math.ceil(results.length / limit),
    }
  }
}

// Export singleton instance
export const databaseService = new DatabaseService()