import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PrismaClient, BookingStatus, CourseStatus, UserRole } from '@prisma/client'
import { BookingService } from '../booking.service'
import { BookingData } from '@/types'

// Mock Prisma
const mockPrisma = {
  booking: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
  course: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
  },
} as unknown as PrismaClient

describe('BookingService', () => {
  let bookingService: BookingService
  
  const mockUserId = 'user-123'
  const mockCourseId = 'course-123'
  const mockBookingId = 'booking-123'
  const mockCraftsmanId = 'craftsman-123'
  
  const mockBookingData: BookingData = {
    notes: 'Looking forward to learning!'
  }

  const mockCourse = {
    id: mockCourseId,
    craftsmanId: mockCraftsmanId,
    title: { 'zh-HK': '手雕麻將課程' },
    description: { 'zh-HK': '學習傳統手雕麻將技藝' },
    craftCategory: '手雕麻將',
    maxParticipants: 8,
    durationHours: 4,
    price: 500,
    status: CourseStatus.ACTIVE,
    createdAt: new Date(),
    _count: {
      bookings: 3
    }
  }

  const mockBooking = {
    id: mockBookingId,
    userId: mockUserId,
    courseId: mockCourseId,
    status: BookingStatus.PENDING,
    notes: mockBookingData.notes,
    createdAt: new Date()
  }

  const mockUser = {
    id: mockUserId,
    email: 'user@example.com',
    role: UserRole.LEARNER
  }

  beforeEach(() => {
    bookingService = new BookingService(mockPrisma)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('createBooking', () => {
    it('should create a booking successfully', async () => {
      mockPrisma.course.findUnique.mockResolvedValue(mockCourse)
      mockPrisma.booking.findFirst.mockResolvedValue(null) // No existing booking
      mockPrisma.booking.create.mockResolvedValue(mockBooking)

      const result = await bookingService.createBooking(mockUserId, mockCourseId, mockBookingData)

      expect(mockPrisma.course.findUnique).toHaveBeenCalledWith({
        where: { id: mockCourseId },
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
      expect(mockPrisma.booking.findFirst).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          courseId: mockCourseId,
          status: {
            in: [BookingStatus.PENDING, BookingStatus.CONFIRMED]
          }
        }
      })
      expect(mockPrisma.booking.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          courseId: mockCourseId,
          notes: mockBookingData.notes,
          status: BookingStatus.PENDING
        }
      })
      expect(result).toEqual(mockBooking)
    })

    it('should throw error if course not found', async () => {
      mockPrisma.course.findUnique.mockResolvedValue(null)

      await expect(
        bookingService.createBooking(mockUserId, mockCourseId, mockBookingData)
      ).rejects.toThrow('Course not found')
    })

    it('should throw error if course is not active', async () => {
      const inactiveCourse = { ...mockCourse, status: CourseStatus.INACTIVE }
      mockPrisma.course.findUnique.mockResolvedValue(inactiveCourse)

      await expect(
        bookingService.createBooking(mockUserId, mockCourseId, mockBookingData)
      ).rejects.toThrow('Course is not available for booking')
    })

    it('should throw error if user already has a booking', async () => {
      mockPrisma.course.findUnique.mockResolvedValue(mockCourse)
      mockPrisma.booking.findFirst.mockResolvedValue(mockBooking)

      await expect(
        bookingService.createBooking(mockUserId, mockCourseId, mockBookingData)
      ).rejects.toThrow('You already have an active booking for this course')
    })

    it('should throw error if course is fully booked', async () => {
      const fullCourse = { ...mockCourse, _count: { bookings: 8 } } // maxParticipants is 8
      mockPrisma.course.findUnique.mockResolvedValue(fullCourse)
      mockPrisma.booking.findFirst.mockResolvedValue(null)

      await expect(
        bookingService.createBooking(mockUserId, mockCourseId, mockBookingData)
      ).rejects.toThrow('Course is fully booked')
    })
  })

  describe('updateBookingStatus', () => {
    it('should update booking status successfully', async () => {
      const updatedBooking = { ...mockBooking, status: BookingStatus.CONFIRMED }
      mockPrisma.booking.update.mockResolvedValue(updatedBooking)

      const result = await bookingService.updateBookingStatus(mockBookingId, BookingStatus.CONFIRMED)

      expect(mockPrisma.booking.update).toHaveBeenCalledWith({
        where: { id: mockBookingId },
        data: { status: BookingStatus.CONFIRMED }
      })
      expect(result).toEqual(updatedBooking)
    })

    it('should verify user ownership when userId provided', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue(mockBooking)
      mockPrisma.booking.update.mockResolvedValue({ ...mockBooking, status: BookingStatus.CONFIRMED })

      await bookingService.updateBookingStatus(mockBookingId, BookingStatus.CONFIRMED, mockUserId)

      expect(mockPrisma.booking.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockBookingId,
          userId: mockUserId
        }
      })
    })

    it('should throw error if booking not found when userId provided', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue(null)

      await expect(
        bookingService.updateBookingStatus(mockBookingId, BookingStatus.CONFIRMED, mockUserId)
      ).rejects.toThrow('Booking not found or access denied')
    })
  })

  describe('cancelBooking', () => {
    it('should cancel booking successfully', async () => {
      const cancelledBooking = { ...mockBooking, status: BookingStatus.CANCELLED }
      mockPrisma.booking.findFirst.mockResolvedValue(mockBooking)
      mockPrisma.booking.update.mockResolvedValue(cancelledBooking)

      const result = await bookingService.cancelBooking(mockBookingId, mockUserId)

      expect(mockPrisma.booking.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockBookingId,
          userId: mockUserId,
          status: {
            in: [BookingStatus.PENDING, BookingStatus.CONFIRMED]
          }
        }
      })
      expect(mockPrisma.booking.update).toHaveBeenCalledWith({
        where: { id: mockBookingId },
        data: { status: BookingStatus.CANCELLED }
      })
      expect(result).toEqual(cancelledBooking)
    })

    it('should throw error if booking cannot be cancelled', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue(null)

      await expect(
        bookingService.cancelBooking(mockBookingId, mockUserId)
      ).rejects.toThrow('Booking not found or cannot be cancelled')
    })
  })

  describe('confirmBooking', () => {
    it('should confirm booking successfully', async () => {
      const confirmedBooking = { ...mockBooking, status: BookingStatus.CONFIRMED }
      mockPrisma.booking.findFirst.mockResolvedValue(mockBooking)
      mockPrisma.booking.update.mockResolvedValue(confirmedBooking)

      const result = await bookingService.confirmBooking(mockBookingId, mockCraftsmanId)

      expect(mockPrisma.booking.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockBookingId,
          course: {
            craftsmanId: mockCraftsmanId
          },
          status: BookingStatus.PENDING
        }
      })
      expect(mockPrisma.booking.update).toHaveBeenCalledWith({
        where: { id: mockBookingId },
        data: { status: BookingStatus.CONFIRMED }
      })
      expect(result).toEqual(confirmedBooking)
    })

    it('should throw error if booking not found or access denied', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue(null)

      await expect(
        bookingService.confirmBooking(mockBookingId, mockCraftsmanId)
      ).rejects.toThrow('Booking not found or access denied')
    })
  })

  describe('getBookingById', () => {
    it('should return booking with details', async () => {
      const bookingWithDetails = {
        ...mockBooking,
        user: mockUser,
        course: {
          ...mockCourse,
          craftsman: {
            id: mockCraftsmanId,
            user: mockUser
          }
        }
      }

      mockPrisma.booking.findUnique.mockResolvedValue(bookingWithDetails)

      const result = await bookingService.getBookingById(mockBookingId)

      expect(mockPrisma.booking.findUnique).toHaveBeenCalledWith({
        where: { id: mockBookingId },
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
      expect(result).toEqual(bookingWithDetails)
    })

    it('should return null if booking not found', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(null)

      const result = await bookingService.getBookingById(mockBookingId)

      expect(result).toBeNull()
    })
  })

  describe('getBookingsByUser', () => {
    it('should return user bookings with pagination', async () => {
      const mockBookings = [mockBooking]
      const mockTotal = 1

      mockPrisma.booking.findMany.mockResolvedValue(mockBookings)
      mockPrisma.booking.count.mockResolvedValue(mockTotal)

      const result = await bookingService.getBookingsByUser(mockUserId, { page: 1, limit: 10 })

      expect(mockPrisma.booking.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
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
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' }
      })

      expect(result).toEqual({
        data: mockBookings,
        total: mockTotal,
        page: 1,
        limit: 10,
        totalPages: 1
      })
    })

    it('should filter by status when provided', async () => {
      mockPrisma.booking.findMany.mockResolvedValue([])
      mockPrisma.booking.count.mockResolvedValue(0)

      await bookingService.getBookingsByUser(mockUserId, { page: 1, limit: 10 }, BookingStatus.CONFIRMED)

      expect(mockPrisma.booking.findMany).toHaveBeenCalledWith({
        where: { 
          userId: mockUserId,
          status: BookingStatus.CONFIRMED
        },
        include: expect.any(Object),
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' }
      })
    })
  })

  describe('checkCourseAvailability', () => {
    it('should return availability information', async () => {
      mockPrisma.course.findUnique.mockResolvedValue(mockCourse)

      const result = await bookingService.checkCourseAvailability(mockCourseId)

      expect(result).toEqual({
        available: true,
        currentBookings: 3,
        maxParticipants: 8,
        waitlistCount: 0
      })
    })

    it('should return unavailable when course is full', async () => {
      const fullCourse = { ...mockCourse, _count: { bookings: 8 } }
      mockPrisma.course.findUnique.mockResolvedValue(fullCourse)

      const result = await bookingService.checkCourseAvailability(mockCourseId)

      expect(result.available).toBe(false)
      expect(result.currentBookings).toBe(8)
    })

    it('should throw error if course not found', async () => {
      mockPrisma.course.findUnique.mockResolvedValue(null)

      await expect(
        bookingService.checkCourseAvailability(mockCourseId)
      ).rejects.toThrow('Course not found')
    })
  })

  describe('getCourseBookingStats', () => {
    it('should return booking statistics', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(mockCourse)
      mockPrisma.booking.groupBy.mockResolvedValue([
        { status: BookingStatus.PENDING, _count: { status: 2 } },
        { status: BookingStatus.CONFIRMED, _count: { status: 5 } },
        { status: BookingStatus.CANCELLED, _count: { status: 1 } }
      ])

      const result = await bookingService.getCourseBookingStats(mockCourseId, mockCraftsmanId)

      expect(mockPrisma.course.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockCourseId,
          craftsmanId: mockCraftsmanId
        }
      })

      expect(result).toEqual({
        total: 8,
        pending: 2,
        confirmed: 5,
        cancelled: 1,
        completed: 0
      })
    })

    it('should throw error if course not found or access denied', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(null)

      await expect(
        bookingService.getCourseBookingStats(mockCourseId, mockCraftsmanId)
      ).rejects.toThrow('Course not found or access denied')
    })
  })

  describe('checkBookingConflicts', () => {
    it('should return true if user already has booking for course', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue(mockBooking)

      const result = await bookingService.checkBookingConflicts(mockUserId, mockCourseId)

      expect(result).toBe(true)
      expect(mockPrisma.booking.findFirst).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          courseId: mockCourseId,
          status: {
            in: [BookingStatus.PENDING, BookingStatus.CONFIRMED]
          }
        }
      })
    })

    it('should return false if no conflicts', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue(null)

      const result = await bookingService.checkBookingConflicts(mockUserId, mockCourseId)

      expect(result).toBe(false)
    })
  })
})