import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PrismaClient, BookingStatus, CourseStatus, UserRole, VerificationStatus } from '@prisma/client'
import { BookingService } from '../booking.service'
import { CourseService } from '../course.service'
import { BookingData, CourseData, MultiLanguageContent } from '@/types'

// Mock Prisma for integration testing
const mockPrisma = {
  course: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
  craftsmanProfile: {
    findUnique: vi.fn(),
  },
  booking: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
} as unknown as PrismaClient

describe('Booking Integration Tests', () => {
  let bookingService: BookingService
  let courseService: CourseService
  
  const mockUserId = 'user-123'
  const mockCraftsmanId = 'craftsman-123'
  
  const mockCraftsman = {
    id: mockCraftsmanId,
    userId: 'craftsman-user-123',
    craftSpecialties: ['手雕麻將'],
    bio: null,
    experienceYears: 20,
    workshopLocation: '香港',
    contactInfo: null,
    verificationStatus: VerificationStatus.VERIFIED,
    createdAt: new Date()
  }

  const mockCourseData: CourseData = {
    title: {
      'zh-HK': '手雕麻將課程',
      'en': 'Hand-carved Mahjong Course'
    } as MultiLanguageContent,
    description: {
      'zh-HK': '學習傳統手雕麻將技藝',
      'en': 'Learn traditional hand-carved mahjong craftsmanship'
    } as MultiLanguageContent,
    craftCategory: '手雕麻將',
    maxParticipants: 2, // Small class for testing
    durationHours: 4,
    price: 500,
    status: CourseStatus.ACTIVE
  }

  const mockBookingData: BookingData = {
    notes: 'Very excited to learn!'
  }

  beforeEach(() => {
    bookingService = new BookingService(mockPrisma)
    courseService = new CourseService(mockPrisma)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Complete booking workflow', () => {
    it('should handle full booking lifecycle', async () => {
      // Step 1: Create a course
      const mockCourse = {
        id: 'course-123',
        craftsmanId: mockCraftsmanId,
        title: mockCourseData.title,
        description: mockCourseData.description,
        craftCategory: mockCourseData.craftCategory,
        maxParticipants: mockCourseData.maxParticipants,
        durationHours: mockCourseData.durationHours,
        price: mockCourseData.price,
        status: mockCourseData.status,
        createdAt: new Date()
      }

      mockPrisma.craftsmanProfile.findUnique.mockResolvedValue(mockCraftsman)
      mockPrisma.course.create.mockResolvedValue(mockCourse)

      const course = await courseService.createCourse(mockCraftsmanId, mockCourseData)
      expect(course).toEqual(mockCourse)

      // Step 2: Check course availability
      const courseWithCount = {
        ...mockCourse,
        _count: { bookings: 0 }
      }
      mockPrisma.course.findUnique.mockResolvedValue(courseWithCount)

      const availability = await bookingService.checkCourseAvailability(course.id)
      expect(availability.available).toBe(true)
      expect(availability.currentBookings).toBe(0)
      expect(availability.maxParticipants).toBe(2)

      // Step 3: Create first booking
      const mockBooking1 = {
        id: 'booking-1',
        userId: 'user-1',
        courseId: course.id,
        status: BookingStatus.PENDING,
        notes: mockBookingData.notes,
        createdAt: new Date()
      }

      mockPrisma.course.findUnique.mockResolvedValue({ ...courseWithCount, _count: { bookings: 0 } })
      mockPrisma.booking.findFirst.mockResolvedValue(null) // No existing booking
      mockPrisma.booking.create.mockResolvedValue(mockBooking1)

      const booking1 = await bookingService.createBooking('user-1', course.id, mockBookingData)
      expect(booking1).toEqual(mockBooking1)

      // Step 4: Create second booking (should still work)
      const mockBooking2 = {
        id: 'booking-2',
        userId: 'user-2',
        courseId: course.id,
        status: BookingStatus.PENDING,
        notes: mockBookingData.notes,
        createdAt: new Date()
      }

      mockPrisma.course.findUnique.mockResolvedValue({ ...courseWithCount, _count: { bookings: 1 } })
      mockPrisma.booking.findFirst.mockResolvedValue(null) // No existing booking for user-2
      mockPrisma.booking.create.mockResolvedValue(mockBooking2)

      const booking2 = await bookingService.createBooking('user-2', course.id, mockBookingData)
      expect(booking2).toEqual(mockBooking2)

      // Step 5: Try to create third booking (should fail - course full)
      mockPrisma.course.findUnique.mockResolvedValue({ ...courseWithCount, _count: { bookings: 2 } })
      mockPrisma.booking.findFirst.mockResolvedValue(null)

      await expect(
        bookingService.createBooking('user-3', course.id, mockBookingData)
      ).rejects.toThrow('Course is fully booked')

      // Step 6: Confirm first booking
      mockPrisma.booking.findFirst.mockResolvedValue(mockBooking1)
      mockPrisma.booking.update.mockResolvedValue({ ...mockBooking1, status: BookingStatus.CONFIRMED })

      const confirmedBooking = await bookingService.confirmBooking(mockBooking1.id, mockCraftsmanId)
      expect(confirmedBooking.status).toBe(BookingStatus.CONFIRMED)

      // Step 7: Cancel second booking
      mockPrisma.booking.findFirst.mockResolvedValue(mockBooking2)
      mockPrisma.booking.update.mockResolvedValue({ ...mockBooking2, status: BookingStatus.CANCELLED })

      const cancelledBooking = await bookingService.cancelBooking(mockBooking2.id, 'user-2')
      expect(cancelledBooking.status).toBe(BookingStatus.CANCELLED)

      // Step 8: Check final availability (should have 1 spot available again)
      mockPrisma.course.findUnique.mockResolvedValue({ ...courseWithCount, _count: { bookings: 1 } })

      const finalAvailability = await bookingService.checkCourseAvailability(course.id)
      expect(finalAvailability.available).toBe(true)
      expect(finalAvailability.currentBookings).toBe(1)
    })

    it('should prevent duplicate bookings for same user', async () => {
      const mockCourse = {
        id: 'course-123',
        craftsmanId: mockCraftsmanId,
        status: CourseStatus.ACTIVE,
        maxParticipants: 5,
        _count: { bookings: 1 }
      }

      const existingBooking = {
        id: 'existing-booking',
        userId: mockUserId,
        courseId: 'course-123',
        status: BookingStatus.PENDING,
        notes: 'Previous booking',
        createdAt: new Date()
      }

      mockPrisma.course.findUnique.mockResolvedValue(mockCourse)
      mockPrisma.booking.findFirst.mockResolvedValue(existingBooking)

      await expect(
        bookingService.createBooking(mockUserId, 'course-123', mockBookingData)
      ).rejects.toThrow('You already have an active booking for this course')
    })

    it('should handle booking conflicts correctly', async () => {
      const existingBooking = {
        id: 'existing-booking',
        userId: mockUserId,
        courseId: 'course-123',
        status: BookingStatus.CONFIRMED,
        notes: 'Existing booking',
        createdAt: new Date()
      }

      mockPrisma.booking.findFirst.mockResolvedValue(existingBooking)

      const hasConflict = await bookingService.checkBookingConflicts(mockUserId, 'course-123')
      expect(hasConflict).toBe(true)

      // Test no conflict
      mockPrisma.booking.findFirst.mockResolvedValue(null)
      const noConflict = await bookingService.checkBookingConflicts(mockUserId, 'different-course')
      expect(noConflict).toBe(false)
    })

    it('should generate correct booking statistics', async () => {
      const mockCourse = {
        id: 'course-123',
        craftsmanId: mockCraftsmanId,
        title: { 'zh-HK': '測試課程' }
      }

      const mockStats = [
        { status: BookingStatus.PENDING, _count: { status: 3 } },
        { status: BookingStatus.CONFIRMED, _count: { status: 5 } },
        { status: BookingStatus.CANCELLED, _count: { status: 2 } },
        { status: BookingStatus.COMPLETED, _count: { status: 1 } }
      ]

      mockPrisma.course.findFirst.mockResolvedValue(mockCourse)
      mockPrisma.booking.groupBy.mockResolvedValue(mockStats)

      const stats = await bookingService.getCourseBookingStats('course-123', mockCraftsmanId)

      expect(stats).toEqual({
        total: 11,
        pending: 3,
        confirmed: 5,
        cancelled: 2,
        completed: 1
      })
    })

    it('should handle course status changes affecting bookings', async () => {
      // Test booking creation on inactive course
      const inactiveCourse = {
        id: 'course-123',
        craftsmanId: mockCraftsmanId,
        status: CourseStatus.INACTIVE,
        maxParticipants: 5,
        _count: { bookings: 0 }
      }

      mockPrisma.course.findUnique.mockResolvedValue(inactiveCourse)

      await expect(
        bookingService.createBooking(mockUserId, 'course-123', mockBookingData)
      ).rejects.toThrow('Course is not available for booking')

      // Test booking creation on draft course
      const draftCourse = {
        ...inactiveCourse,
        status: CourseStatus.DRAFT
      }

      mockPrisma.course.findUnique.mockResolvedValue(draftCourse)

      await expect(
        bookingService.createBooking(mockUserId, 'course-123', mockBookingData)
      ).rejects.toThrow('Course is not available for booking')
    })
  })

  describe('Booking pagination and filtering', () => {
    it('should paginate user bookings correctly', async () => {
      const mockBookings = [
        {
          id: 'booking-1',
          userId: mockUserId,
          courseId: 'course-1',
          status: BookingStatus.CONFIRMED,
          user: { id: mockUserId, email: 'user@example.com' },
          course: { id: 'course-1', title: { 'zh-HK': '課程1' } }
        },
        {
          id: 'booking-2',
          userId: mockUserId,
          courseId: 'course-2',
          status: BookingStatus.PENDING,
          user: { id: mockUserId, email: 'user@example.com' },
          course: { id: 'course-2', title: { 'zh-HK': '課程2' } }
        }
      ]

      mockPrisma.booking.findMany.mockResolvedValue(mockBookings)
      mockPrisma.booking.count.mockResolvedValue(2)

      const result = await bookingService.getBookingsByUser(
        mockUserId,
        { page: 1, limit: 10 },
        BookingStatus.CONFIRMED
      )

      expect(result.data).toEqual(mockBookings)
      expect(result.total).toBe(2)
      expect(result.page).toBe(1)
      expect(result.limit).toBe(10)
      expect(result.totalPages).toBe(1)

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

    it('should handle empty booking results', async () => {
      mockPrisma.booking.findMany.mockResolvedValue([])
      mockPrisma.booking.count.mockResolvedValue(0)

      const result = await bookingService.getBookingsByUser(mockUserId)

      expect(result.data).toEqual([])
      expect(result.total).toBe(0)
      expect(result.totalPages).toBe(0)
    })
  })
})