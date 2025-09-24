import { PrismaClient, Booking, BookingStatus, CourseStatus, Prisma } from '@prisma/client'
import { 
  BookingData, 
  BookingWithDetails, 
  PaginationParams, 
  PaginationResult 
} from '@/types'
import { validateBookingData } from '@/lib/validations'

export class BookingService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * Create a new booking for a course
   */
  async createBooking(userId: string, courseId: string, bookingData: BookingData): Promise<Booking> {
    // Validate booking data
    const validation = validateBookingData(bookingData)
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`)
    }

    // Check if course exists and is active
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        _count: {
          select: {
            bookings: {
              where: {
                status: {
                  in: [BookingStatus.PENDING, BookingStatus.CONFIRMED]
                }
              }
            }
          }
        }
      }
    })

    if (!course) {
      throw new Error('Course not found')
    }

    if (course.status !== CourseStatus.ACTIVE) {
      throw new Error('Course is not available for booking')
    }

    // Check if user already has a booking for this course
    const existingBooking = await this.prisma.booking.findFirst({
      where: {
        userId,
        courseId,
        status: {
          in: [BookingStatus.PENDING, BookingStatus.CONFIRMED]
        }
      }
    })

    if (existingBooking) {
      throw new Error('You already have an active booking for this course')
    }

    // Check if course has available spots
    const currentBookings = course._count.bookings
    const maxParticipants = course.maxParticipants

    if (maxParticipants && currentBookings >= maxParticipants) {
      throw new Error('Course is fully booked')
    }

    // Create booking
    const booking = await this.prisma.booking.create({
      data: {
        userId,
        courseId,
        notes: bookingData.notes,
        status: BookingStatus.PENDING
      }
    })

    return booking
  }

  /**
   * Update booking status
   */
  async updateBookingStatus(bookingId: string, status: BookingStatus, userId?: string): Promise<Booking> {
    // If userId is provided, verify the booking belongs to the user
    const whereClause: Prisma.BookingWhereUniqueInput = { id: bookingId }
    
    if (userId) {
      const booking = await this.prisma.booking.findFirst({
        where: {
          id: bookingId,
          userId: userId
        }
      })

      if (!booking) {
        throw new Error('Booking not found or access denied')
      }
    }

    const updatedBooking = await this.prisma.booking.update({
      where: whereClause,
      data: { status }
    })

    return updatedBooking
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(bookingId: string, userId: string): Promise<Booking> {
    // Verify booking exists and belongs to user
    const booking = await this.prisma.booking.findFirst({
      where: {
        id: bookingId,
        userId: userId,
        status: {
          in: [BookingStatus.PENDING, BookingStatus.CONFIRMED]
        }
      }
    })

    if (!booking) {
      throw new Error('Booking not found or cannot be cancelled')
    }

    // Cancel the booking
    const cancelledBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CANCELLED }
    })

    // Check if there's a waitlist and promote the next person
    await this.processWaitlist(booking.courseId)

    return cancelledBooking
  }

  /**
   * Confirm a booking (for craftsman)
   */
  async confirmBooking(bookingId: string, craftsmanId: string): Promise<Booking> {
    // Verify booking exists and course belongs to craftsman
    const booking = await this.prisma.booking.findFirst({
      where: {
        id: bookingId,
        course: {
          craftsmanId: craftsmanId
        },
        status: BookingStatus.PENDING
      }
    })

    if (!booking) {
      throw new Error('Booking not found or access denied')
    }

    const confirmedBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CONFIRMED }
    })

    return confirmedBooking
  }

  /**
   * Get booking by ID with details
   */
  async getBookingById(bookingId: string): Promise<BookingWithDetails | null> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: true,
        course: {
          include: {
            craftsman: {
              include: {
                user: true
              }
            }
          }
        }
      }
    })

    return booking
  }

  /**
   * Get bookings by user
   */
  async getBookingsByUser(
    userId: string, 
    pagination?: PaginationParams,
    status?: BookingStatus
  ): Promise<PaginationResult<BookingWithDetails>> {
    const page = pagination?.page || 1
    const limit = pagination?.limit || 10
    const skip = (page - 1) * limit

    const where: Prisma.BookingWhereInput = {
      userId,
      ...(status && { status })
    }

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: {
          user: true,
          course: {
            include: {
              craftsman: {
                include: {
                  user: true
                }
              }
            }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.booking.count({ where })
    ])

    return {
      data: bookings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  /**
   * Get bookings by course (for craftsman)
   */
  async getBookingsByCourse(
    courseId: string,
    craftsmanId: string,
    pagination?: PaginationParams,
    status?: BookingStatus
  ): Promise<PaginationResult<BookingWithDetails>> {
    // Verify course belongs to craftsman
    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        craftsmanId: craftsmanId
      }
    })

    if (!course) {
      throw new Error('Course not found or access denied')
    }

    const page = pagination?.page || 1
    const limit = pagination?.limit || 10
    const skip = (page - 1) * limit

    const where: Prisma.BookingWhereInput = {
      courseId,
      ...(status && { status })
    }

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: {
          user: true,
          course: {
            include: {
              craftsman: {
                include: {
                  user: true
                }
              }
            }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' } // First come, first served
      }),
      this.prisma.booking.count({ where })
    ])

    return {
      data: bookings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  /**
   * Get bookings by craftsman
   */
  async getBookingsByCraftsman(
    craftsmanId: string,
    pagination?: PaginationParams,
    status?: BookingStatus
  ): Promise<PaginationResult<BookingWithDetails>> {
    const page = pagination?.page || 1
    const limit = pagination?.limit || 10
    const skip = (page - 1) * limit

    const where: Prisma.BookingWhereInput = {
      course: {
        craftsmanId: craftsmanId
      },
      ...(status && { status })
    }

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: {
          user: true,
          course: {
            include: {
              craftsman: {
                include: {
                  user: true
                }
              }
            }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.booking.count({ where })
    ])

    return {
      data: bookings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  /**
   * Check if course has available spots
   */
  async checkCourseAvailability(courseId: string): Promise<{
    available: boolean
    currentBookings: number
    maxParticipants: number | null
    waitlistCount: number
  }> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        _count: {
          select: {
            bookings: {
              where: {
                status: {
                  in: [BookingStatus.PENDING, BookingStatus.CONFIRMED]
                }
              }
            }
          }
        }
      }
    })

    if (!course) {
      throw new Error('Course not found')
    }

    const currentBookings = course._count.bookings
    const maxParticipants = course.maxParticipants
    const available = !maxParticipants || currentBookings < maxParticipants

    // For waitlist count, we could implement a separate waitlist table
    // For now, we'll return 0 as a placeholder
    const waitlistCount = 0

    return {
      available,
      currentBookings,
      maxParticipants,
      waitlistCount
    }
  }

  /**
   * Process waitlist when a spot becomes available
   */
  private async processWaitlist(courseId: string): Promise<void> {
    // This is a placeholder for waitlist functionality
    // In a full implementation, you would:
    // 1. Check if there are people on the waitlist
    // 2. Promote the next person from waitlist to confirmed booking
    // 3. Send notification to the promoted user
    
    // For now, we'll just log that waitlist processing would happen here
    console.log(`Processing waitlist for course ${courseId}`)
  }

  /**
   * Get booking statistics for a course
   */
  async getCourseBookingStats(courseId: string, craftsmanId: string): Promise<{
    total: number
    pending: number
    confirmed: number
    cancelled: number
    completed: number
  }> {
    // Verify course belongs to craftsman
    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        craftsmanId: craftsmanId
      }
    })

    if (!course) {
      throw new Error('Course not found or access denied')
    }

    const stats = await this.prisma.booking.groupBy({
      by: ['status'],
      where: { courseId },
      _count: { status: true }
    })

    const result = {
      total: 0,
      pending: 0,
      confirmed: 0,
      cancelled: 0,
      completed: 0
    }

    stats.forEach(stat => {
      result.total += stat._count.status
      switch (stat.status) {
        case BookingStatus.PENDING:
          result.pending = stat._count.status
          break
        case BookingStatus.CONFIRMED:
          result.confirmed = stat._count.status
          break
        case BookingStatus.CANCELLED:
          result.cancelled = stat._count.status
          break
        case BookingStatus.COMPLETED:
          result.completed = stat._count.status
          break
      }
    })

    return result
  }

  /**
   * Check for booking conflicts (if implementing time-based courses)
   */
  async checkBookingConflicts(userId: string, courseId: string): Promise<boolean> {
    // This is a placeholder for conflict checking
    // In a full implementation with scheduled courses, you would:
    // 1. Get the course schedule/time
    // 2. Check if user has other confirmed bookings at the same time
    // 3. Return true if there's a conflict
    
    // For now, we'll just check if user already has a booking for this course
    const existingBooking = await this.prisma.booking.findFirst({
      where: {
        userId,
        courseId,
        status: {
          in: [BookingStatus.PENDING, BookingStatus.CONFIRMED]
        }
      }
    })

    return !!existingBooking
  }
}