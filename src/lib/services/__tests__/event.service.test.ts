import { describe, it, expect, beforeEach, vi } from 'vitest'
import { eventService } from '../event.service'
import { notificationService } from '../notification.service'
import { prisma } from '@/lib/database'

// Mock the notification service
vi.mock('../notification.service', () => ({
  notificationService: {
    createNotification: vi.fn()
  }
}))

// Mock Prisma
vi.mock('@/lib/database', () => ({
  prisma: {
    event: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn()
    },
    eventRegistration: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn()
    }
  }
}))

describe('EventService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createEvent', () => {
    it('should create an event successfully', async () => {
      const organizerId = 'user1'
      const eventData = {
        title: { 'zh-HK': '手雕麻將工作坊', 'en': 'Mahjong Carving Workshop' },
        description: { 'zh-HK': '學習傳統手雕麻將技藝', 'en': 'Learn traditional mahjong carving' },
        eventType: 'WORKSHOP' as const,
        category: 'mahjong',
        startDateTime: new Date('2024-12-25T10:00:00Z'),
        endDateTime: new Date('2024-12-25T16:00:00Z'),
        maxParticipants: 20,
        registrationFee: 500,
        isPublic: true,
        tags: ['traditional', 'craft', 'mahjong']
      }

      const mockEvent = {
        id: 'event1',
        organizerId,
        title: eventData.title,
        description: eventData.description,
        eventType: eventData.eventType,
        category: eventData.category,
        startDateTime: eventData.startDateTime,
        endDateTime: eventData.endDateTime,
        timezone: 'Asia/Hong_Kong',
        location: null,
        maxParticipants: eventData.maxParticipants,
        registrationFee: eventData.registrationFee,
        status: 'DRAFT' as const,
        isPublic: eventData.isPublic,
        tags: eventData.tags,
        requirements: null,
        materials: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        organizer: {
          id: organizerId,
          email: 'organizer@example.com',
          passwordHash: 'hash',
          role: 'CRAFTSMAN' as const,
          preferredLanguage: 'zh-HK',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        registrations: []
      }

      vi.mocked(prisma.event.create).mockResolvedValue(mockEvent)

      const result = await eventService.createEvent(organizerId, eventData)

      expect(result).toMatchObject({
        id: 'event1',
        title: eventData.title,
        eventType: eventData.eventType,
        registrationCount: 0,
        isRegistered: false
      })

      expect(prisma.event.create).toHaveBeenCalledWith({
        data: {
          organizerId,
          title: eventData.title,
          description: eventData.description,
          eventType: eventData.eventType,
          category: eventData.category,
          startDateTime: eventData.startDateTime,
          endDateTime: eventData.endDateTime,
          timezone: 'Asia/Hong_Kong',
          location: undefined,
          maxParticipants: eventData.maxParticipants,
          registrationFee: eventData.registrationFee,
          isPublic: true,
          tags: eventData.tags,
          requirements: undefined,
          materials: undefined,
          status: 'DRAFT'
        },
        include: {
          organizer: true,
          registrations: {
            include: {
              user: true
            }
          }
        }
      })
    })
  })

  describe('publishEvent', () => {
    it('should publish a draft event successfully', async () => {
      const eventId = 'event1'
      const organizerId = 'user1'

      // Mock existing draft event
      vi.mocked(prisma.event.findUnique).mockResolvedValue({
        id: eventId,
        organizerId,
        title: { 'zh-HK': '工作坊' },
        description: null,
        eventType: 'WORKSHOP',
        category: 'craft',
        startDateTime: new Date('2024-12-25T10:00:00Z'),
        endDateTime: new Date('2024-12-25T16:00:00Z'),
        timezone: 'Asia/Hong_Kong',
        location: null,
        maxParticipants: 20,
        registrationFee: null,
        status: 'DRAFT',
        isPublic: true,
        tags: [],
        requirements: null,
        materials: null,
        createdAt: new Date(),
        updatedAt: new Date()
      })

      // Mock event update
      const publishedEvent = {
        id: eventId,
        organizerId,
        title: { 'zh-HK': '工作坊' },
        description: null,
        eventType: 'WORKSHOP' as const,
        category: 'craft',
        startDateTime: new Date('2024-12-25T10:00:00Z'),
        endDateTime: new Date('2024-12-25T16:00:00Z'),
        timezone: 'Asia/Hong_Kong',
        location: null,
        maxParticipants: 20,
        registrationFee: null,
        status: 'REGISTRATION_OPEN' as const,
        isPublic: true,
        tags: [],
        requirements: null,
        materials: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        organizer: {
          id: organizerId,
          email: 'organizer@example.com',
          passwordHash: 'hash',
          role: 'CRAFTSMAN' as const,
          preferredLanguage: 'zh-HK',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        registrations: []
      }

      vi.mocked(prisma.event.update).mockResolvedValue(publishedEvent)

      const result = await eventService.publishEvent(eventId, organizerId)

      expect(result.status).toBe('REGISTRATION_OPEN')
      expect(prisma.event.update).toHaveBeenCalledWith({
        where: { id: eventId },
        data: { 
          status: 'REGISTRATION_OPEN',
          updatedAt: expect.any(Date)
        },
        include: {
          organizer: true,
          registrations: {
            include: {
              user: true
            }
          }
        }
      })
    })

    it('should throw error if event not found', async () => {
      const eventId = 'nonexistent'
      const organizerId = 'user1'

      vi.mocked(prisma.event.findUnique).mockResolvedValue(null)

      await expect(eventService.publishEvent(eventId, organizerId))
        .rejects.toThrow('Event not found')
    })

    it('should throw error if user not authorized', async () => {
      const eventId = 'event1'
      const organizerId = 'user1'

      vi.mocked(prisma.event.findUnique).mockResolvedValue({
        id: eventId,
        organizerId: 'user2', // Different organizer
        title: { 'zh-HK': '工作坊' },
        description: null,
        eventType: 'WORKSHOP',
        category: 'craft',
        startDateTime: new Date(),
        endDateTime: new Date(),
        timezone: 'Asia/Hong_Kong',
        location: null,
        maxParticipants: 20,
        registrationFee: null,
        status: 'DRAFT',
        isPublic: true,
        tags: [],
        requirements: null,
        materials: null,
        createdAt: new Date(),
        updatedAt: new Date()
      })

      await expect(eventService.publishEvent(eventId, organizerId))
        .rejects.toThrow('Not authorized to publish this event')
    })

    it('should throw error if event not in draft status', async () => {
      const eventId = 'event1'
      const organizerId = 'user1'

      vi.mocked(prisma.event.findUnique).mockResolvedValue({
        id: eventId,
        organizerId,
        title: { 'zh-HK': '工作坊' },
        description: null,
        eventType: 'WORKSHOP',
        category: 'craft',
        startDateTime: new Date(),
        endDateTime: new Date(),
        timezone: 'Asia/Hong_Kong',
        location: null,
        maxParticipants: 20,
        registrationFee: null,
        status: 'REGISTRATION_OPEN', // Already published
        isPublic: true,
        tags: [],
        requirements: null,
        materials: null,
        createdAt: new Date(),
        updatedAt: new Date()
      })

      await expect(eventService.publishEvent(eventId, organizerId))
        .rejects.toThrow('Only draft events can be published')
    })
  })

  describe('registerForEvent', () => {
    it('should register for event successfully', async () => {
      const eventId = 'event1'
      const userId = 'user1'

      // Mock event with open registration
      vi.mocked(prisma.event.findUnique).mockResolvedValue({
        id: eventId,
        organizerId: 'organizer1',
        title: { 'zh-HK': '工作坊' },
        description: null,
        eventType: 'WORKSHOP',
        category: 'craft',
        startDateTime: new Date('2024-12-25T10:00:00Z'),
        endDateTime: new Date('2024-12-25T16:00:00Z'),
        timezone: 'Asia/Hong_Kong',
        location: null,
        maxParticipants: 20,
        registrationFee: null,
        status: 'REGISTRATION_OPEN',
        isPublic: true,
        tags: [],
        requirements: null,
        materials: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        registrations: [] // No existing registrations
      })

      // Mock no existing registration
      vi.mocked(prisma.eventRegistration.findUnique).mockResolvedValue(null)

      // Mock registration creation
      const mockRegistration = {
        id: 'registration1',
        eventId,
        userId,
        status: 'CONFIRMED' as const,
        registeredAt: new Date(),
        attendedAt: null,
        feedback: null,
        rating: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      vi.mocked(prisma.eventRegistration.create).mockResolvedValue(mockRegistration)

      // Mock notification service
      vi.mocked(notificationService.createNotification).mockResolvedValue({} as any)

      const result = await eventService.registerForEvent(eventId, userId)

      expect(result).toEqual(mockRegistration)
      expect(result.status).toBe('CONFIRMED')

      expect(prisma.eventRegistration.create).toHaveBeenCalledWith({
        data: {
          eventId,
          userId,
          status: 'CONFIRMED',
          notes: undefined
        }
      })

      expect(notificationService.createNotification).toHaveBeenCalledWith(
        'organizer1',
        expect.objectContaining({
          type: 'ACTIVITY_UPDATE',
          metadata: expect.objectContaining({
            eventId,
            registrationId: 'registration1',
            status: 'CONFIRMED'
          })
        })
      )
    })

    it('should add to waitlist when event is full', async () => {
      const eventId = 'event1'
      const userId = 'user1'

      // Mock event with full registrations
      const existingRegistrations = Array.from({ length: 20 }, (_, i) => ({
        id: `reg${i}`,
        eventId,
        userId: `user${i + 2}`,
        status: 'CONFIRMED' as const,
        registeredAt: new Date(),
        attendedAt: null,
        feedback: null,
        rating: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }))

      vi.mocked(prisma.event.findUnique).mockResolvedValue({
        id: eventId,
        organizerId: 'organizer1',
        title: { 'zh-HK': '工作坊' },
        description: null,
        eventType: 'WORKSHOP',
        category: 'craft',
        startDateTime: new Date('2024-12-25T10:00:00Z'),
        endDateTime: new Date('2024-12-25T16:00:00Z'),
        timezone: 'Asia/Hong_Kong',
        location: null,
        maxParticipants: 20,
        registrationFee: null,
        status: 'REGISTRATION_OPEN',
        isPublic: true,
        tags: [],
        requirements: null,
        materials: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        registrations: existingRegistrations
      })

      vi.mocked(prisma.eventRegistration.findUnique).mockResolvedValue(null)

      const mockRegistration = {
        id: 'registration1',
        eventId,
        userId,
        status: 'WAITLISTED' as const,
        registeredAt: new Date(),
        attendedAt: null,
        feedback: null,
        rating: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      vi.mocked(prisma.eventRegistration.create).mockResolvedValue(mockRegistration)
      vi.mocked(notificationService.createNotification).mockResolvedValue({} as any)

      const result = await eventService.registerForEvent(eventId, userId)

      expect(result.status).toBe('WAITLISTED')
    })

    it('should throw error if already registered', async () => {
      const eventId = 'event1'
      const userId = 'user1'

      vi.mocked(prisma.event.findUnique).mockResolvedValue({
        id: eventId,
        organizerId: 'organizer1',
        title: { 'zh-HK': '工作坊' },
        description: null,
        eventType: 'WORKSHOP',
        category: 'craft',
        startDateTime: new Date(),
        endDateTime: new Date(),
        timezone: 'Asia/Hong_Kong',
        location: null,
        maxParticipants: 20,
        registrationFee: null,
        status: 'REGISTRATION_OPEN',
        isPublic: true,
        tags: [],
        requirements: null,
        materials: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        registrations: []
      })

      // Mock existing registration
      vi.mocked(prisma.eventRegistration.findUnique).mockResolvedValue({
        id: 'existing',
        eventId,
        userId,
        status: 'CONFIRMED',
        registeredAt: new Date(),
        attendedAt: null,
        feedback: null,
        rating: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date()
      })

      await expect(eventService.registerForEvent(eventId, userId))
        .rejects.toThrow('Already registered for this event')
    })

    it('should throw error if registration not open', async () => {
      const eventId = 'event1'
      const userId = 'user1'

      vi.mocked(prisma.event.findUnique).mockResolvedValue({
        id: eventId,
        organizerId: 'organizer1',
        title: { 'zh-HK': '工作坊' },
        description: null,
        eventType: 'WORKSHOP',
        category: 'craft',
        startDateTime: new Date(),
        endDateTime: new Date(),
        timezone: 'Asia/Hong_Kong',
        location: null,
        maxParticipants: 20,
        registrationFee: null,
        status: 'DRAFT', // Registration not open
        isPublic: true,
        tags: [],
        requirements: null,
        materials: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        registrations: []
      })

      await expect(eventService.registerForEvent(eventId, userId))
        .rejects.toThrow('Registration is not open for this event')
    })
  })

  describe('cancelRegistration', () => {
    it('should cancel registration and promote waitlisted user', async () => {
      const eventId = 'event1'
      const userId = 'user1'

      // Mock existing confirmed registration
      vi.mocked(prisma.eventRegistration.findUnique).mockResolvedValue({
        id: 'registration1',
        eventId,
        userId,
        status: 'CONFIRMED',
        registeredAt: new Date(),
        attendedAt: null,
        feedback: null,
        rating: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date()
      })

      // Mock waitlisted registration to promote
      vi.mocked(prisma.eventRegistration.findFirst).mockResolvedValue({
        id: 'waitlisted1',
        eventId,
        userId: 'user2',
        status: 'WAITLISTED',
        registeredAt: new Date(),
        attendedAt: null,
        feedback: null,
        rating: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date()
      })

      vi.mocked(prisma.eventRegistration.update).mockResolvedValue({} as any)
      vi.mocked(notificationService.createNotification).mockResolvedValue({} as any)

      await eventService.cancelRegistration(eventId, userId)

      expect(prisma.eventRegistration.update).toHaveBeenCalledTimes(2)
      
      // First call: cancel the registration
      expect(prisma.eventRegistration.update).toHaveBeenNthCalledWith(1, {
        where: { id: 'registration1' },
        data: { 
          status: 'CANCELLED',
          updatedAt: expect.any(Date)
        }
      })

      // Second call: promote waitlisted user
      expect(prisma.eventRegistration.update).toHaveBeenNthCalledWith(2, {
        where: { id: 'waitlisted1' },
        data: { status: 'CONFIRMED' }
      })

      // Should notify promoted user
      expect(notificationService.createNotification).toHaveBeenCalledWith(
        'user2',
        expect.objectContaining({
          type: 'ACTIVITY_UPDATE'
        })
      )
    })

    it('should throw error if registration not found', async () => {
      const eventId = 'event1'
      const userId = 'user1'

      vi.mocked(prisma.eventRegistration.findUnique).mockResolvedValue(null)

      await expect(eventService.cancelRegistration(eventId, userId))
        .rejects.toThrow('Registration not found')
    })
  })

  describe('submitFeedback', () => {
    it('should submit feedback successfully', async () => {
      const eventId = 'event1'
      const userId = 'user1'
      const feedback = 'Great workshop!'
      const rating = 5

      // Mock attended registration
      vi.mocked(prisma.eventRegistration.findUnique).mockResolvedValue({
        id: 'registration1',
        eventId,
        userId,
        status: 'ATTENDED',
        registeredAt: new Date(),
        attendedAt: new Date(),
        feedback: null,
        rating: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date()
      })

      const updatedRegistration = {
        id: 'registration1',
        eventId,
        userId,
        status: 'ATTENDED' as const,
        registeredAt: new Date(),
        attendedAt: new Date(),
        feedback,
        rating,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      vi.mocked(prisma.eventRegistration.update).mockResolvedValue(updatedRegistration)

      const result = await eventService.submitFeedback(eventId, userId, feedback, rating)

      expect(result.feedback).toBe(feedback)
      expect(result.rating).toBe(rating)

      expect(prisma.eventRegistration.update).toHaveBeenCalledWith({
        where: { id: 'registration1' },
        data: { feedback, rating }
      })
    })

    it('should throw error for invalid rating', async () => {
      const eventId = 'event1'
      const userId = 'user1'
      const feedback = 'Great workshop!'
      const rating = 6 // Invalid rating

      await expect(eventService.submitFeedback(eventId, userId, feedback, rating))
        .rejects.toThrow('Rating must be between 1 and 5')
    })

    it('should throw error if not attended', async () => {
      const eventId = 'event1'
      const userId = 'user1'
      const feedback = 'Great workshop!'
      const rating = 5

      // Mock non-attended registration
      vi.mocked(prisma.eventRegistration.findUnique).mockResolvedValue({
        id: 'registration1',
        eventId,
        userId,
        status: 'CONFIRMED', // Not attended
        registeredAt: new Date(),
        attendedAt: null,
        feedback: null,
        rating: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date()
      })

      await expect(eventService.submitFeedback(eventId, userId, feedback, rating))
        .rejects.toThrow('Can only submit feedback for attended events')
    })
  })
})