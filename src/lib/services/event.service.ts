import { prisma } from '@/lib/database'
import { Event, EventRegistration, EventType, EventStatus, EventRegistrationStatus, User } from '@prisma/client'
import { PaginationParams, PaginationResult, MultiLanguageContent } from '@/types'
import { notificationService } from './notification.service'

export interface EventData {
  title: MultiLanguageContent
  description?: MultiLanguageContent
  eventType: EventType
  category: string
  startDateTime: Date
  endDateTime: Date
  timezone?: string
  location?: EventLocation
  maxParticipants?: number
  registrationFee?: number
  isPublic?: boolean
  tags?: string[]
  requirements?: MultiLanguageContent
  materials?: EventMaterial[]
}

export interface EventLocation {
  type: 'physical' | 'virtual' | 'hybrid'
  address?: string
  venue?: string
  city?: string
  district?: string
  virtualUrl?: string
  virtualPlatform?: string
  instructions?: MultiLanguageContent
}

export interface EventMaterial {
  name: MultiLanguageContent
  description?: MultiLanguageContent
  isRequired: boolean
  providedByOrganizer: boolean
  estimatedCost?: number
}

export interface EventWithDetails extends Event {
  organizer: User
  registrations?: EventRegistrationWithUser[]
  registrationCount: number
  isRegistered?: boolean
  userRegistration?: EventRegistration
}

export interface EventRegistrationWithUser extends EventRegistration {
  user: User
}

export interface EventRegistrationData {
  notes?: string
}

export interface EventSearchFilters {
  eventType?: EventType[]
  category?: string[]
  startDate?: Date
  endDate?: Date
  location?: string
  priceRange?: {
    min?: number
    max?: number
  }
  tags?: string[]
  status?: EventStatus[]
}

export class EventService {
  /**
   * Create a new event
   */
  async createEvent(organizerId: string, eventData: EventData): Promise<EventWithDetails> {
    const event = await prisma.event.create({
      data: {
        organizerId,
        title: eventData.title,
        description: eventData.description,
        eventType: eventData.eventType,
        category: eventData.category,
        startDateTime: eventData.startDateTime,
        endDateTime: eventData.endDateTime,
        timezone: eventData.timezone || 'Asia/Hong_Kong',
        location: eventData.location,
        maxParticipants: eventData.maxParticipants,
        registrationFee: eventData.registrationFee,
        isPublic: eventData.isPublic ?? true,
        tags: eventData.tags || [],
        requirements: eventData.requirements,
        materials: eventData.materials,
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

    return this.formatEventWithDetails(event)
  }

  /**
   * Update an event
   */
  async updateEvent(
    eventId: string,
    organizerId: string,
    updates: Partial<EventData>
  ): Promise<EventWithDetails> {
    // Check if user owns the event
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    })

    if (!event) {
      throw new Error('Event not found')
    }

    if (event.organizerId !== organizerId) {
      throw new Error('Not authorized to update this event')
    }

    // Don't allow updates to published events with registrations
    if (event.status !== 'DRAFT' && event.status !== 'PUBLISHED') {
      const registrationCount = await prisma.eventRegistration.count({
        where: { eventId, status: 'CONFIRMED' }
      })

      if (registrationCount > 0) {
        throw new Error('Cannot update event with confirmed registrations')
      }
    }

    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: updates,
      include: {
        organizer: true,
        registrations: {
          include: {
            user: true
          }
        }
      }
    })

    return this.formatEventWithDetails(updatedEvent)
  }

  /**
   * Publish an event (make it available for registration)
   */
  async publishEvent(eventId: string, organizerId: string): Promise<EventWithDetails> {
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    })

    if (!event) {
      throw new Error('Event not found')
    }

    if (event.organizerId !== organizerId) {
      throw new Error('Not authorized to publish this event')
    }

    if (event.status !== 'DRAFT') {
      throw new Error('Only draft events can be published')
    }

    // Validate event has required information
    if (!event.title || !event.startDateTime || !event.endDateTime) {
      throw new Error('Event must have title, start time, and end time to be published')
    }

    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: { 
        status: 'REGISTRATION_OPEN',
        updatedAt: new Date()
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

    return this.formatEventWithDetails(updatedEvent)
  }

  /**
   * Get events with filtering and pagination
   */
  async getEvents(
    filters: EventSearchFilters = {},
    pagination: PaginationParams = {},
    userId?: string
  ): Promise<PaginationResult<EventWithDetails>> {
    const { page = 1, limit = 20 } = pagination
    const skip = (page - 1) * limit

    const where: any = {
      status: { in: filters.status || ['REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'IN_PROGRESS'] },
      isPublic: true
    }

    if (filters.eventType?.length) {
      where.eventType = { in: filters.eventType }
    }

    if (filters.category?.length) {
      where.category = { in: filters.category }
    }

    if (filters.startDate || filters.endDate) {
      where.startDateTime = {}
      if (filters.startDate) {
        where.startDateTime.gte = filters.startDate
      }
      if (filters.endDate) {
        where.startDateTime.lte = filters.endDate
      }
    }

    if (filters.priceRange) {
      where.registrationFee = {}
      if (filters.priceRange.min !== undefined) {
        where.registrationFee.gte = filters.priceRange.min
      }
      if (filters.priceRange.max !== undefined) {
        where.registrationFee.lte = filters.priceRange.max
      }
    }

    if (filters.tags?.length) {
      where.tags = { hasSome: filters.tags }
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          organizer: true,
          registrations: {
            include: {
              user: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: { startDateTime: 'asc' }
      }),
      prisma.event.count({ where })
    ])

    const formattedEvents = events.map(event => this.formatEventWithDetails(event, userId))

    return {
      data: formattedEvents,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  /**
   * Get a single event by ID
   */
  async getEvent(eventId: string, userId?: string): Promise<EventWithDetails> {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        organizer: true,
        registrations: {
          include: {
            user: true
          }
        }
      }
    })

    if (!event) {
      throw new Error('Event not found')
    }

    return this.formatEventWithDetails(event, userId)
  }

  /**
   * Register for an event
   */
  async registerForEvent(
    eventId: string,
    userId: string,
    registrationData: EventRegistrationData = {}
  ): Promise<EventRegistration> {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        registrations: {
          where: { status: { in: ['CONFIRMED', 'PENDING'] } }
        }
      }
    })

    if (!event) {
      throw new Error('Event not found')
    }

    if (event.status !== 'REGISTRATION_OPEN') {
      throw new Error('Registration is not open for this event')
    }

    // Check if user is already registered
    const existingRegistration = await prisma.eventRegistration.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId
        }
      }
    })

    if (existingRegistration) {
      throw new Error('Already registered for this event')
    }

    // Check if event is full
    const confirmedCount = event.registrations.filter(r => r.status === 'CONFIRMED').length
    const status = event.maxParticipants && confirmedCount >= event.maxParticipants 
      ? 'WAITLISTED' 
      : 'CONFIRMED'

    const registration = await prisma.eventRegistration.create({
      data: {
        eventId,
        userId,
        status,
        notes: registrationData.notes
      }
    })

    // Send notification to organizer
    try {
      await notificationService.createNotification(event.organizerId, {
        type: 'ACTIVITY_UPDATE',
        title: {
          'zh-HK': '新活動報名',
          'zh-CN': '新活动报名',
          'en': 'New Event Registration'
        },
        message: {
          'zh-HK': `有用戶報名參加您的活動`,
          'zh-CN': `有用户报名参加您的活动`,
          'en': `Someone registered for your event`
        },
        metadata: {
          eventId,
          registrationId: registration.id,
          status
        }
      })
    } catch (error) {
      console.warn('Failed to send registration notification:', error)
    }

    return registration
  }

  /**
   * Cancel event registration
   */
  async cancelRegistration(eventId: string, userId: string): Promise<void> {
    const registration = await prisma.eventRegistration.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId
        }
      }
    })

    if (!registration) {
      throw new Error('Registration not found')
    }

    if (registration.status === 'CANCELLED') {
      throw new Error('Registration already cancelled')
    }

    await prisma.eventRegistration.update({
      where: { id: registration.id },
      data: { 
        status: 'CANCELLED',
        updatedAt: new Date()
      }
    })

    // If this was a confirmed registration and there are waitlisted users, promote one
    if (registration.status === 'CONFIRMED') {
      const waitlistedRegistration = await prisma.eventRegistration.findFirst({
        where: {
          eventId,
          status: 'WAITLISTED'
        },
        orderBy: { registeredAt: 'asc' }
      })

      if (waitlistedRegistration) {
        await prisma.eventRegistration.update({
          where: { id: waitlistedRegistration.id },
          data: { status: 'CONFIRMED' }
        })

        // Notify the promoted user
        try {
          await notificationService.createNotification(waitlistedRegistration.userId, {
            type: 'ACTIVITY_UPDATE',
            title: {
              'zh-HK': '活動報名確認',
              'zh-CN': '活动报名确认',
              'en': 'Event Registration Confirmed'
            },
            message: {
              'zh-HK': '您的活動報名已從候補名單轉為確認',
              'zh-CN': '您的活动报名已从候补名单转为确认',
              'en': 'Your event registration has been confirmed from waitlist'
            },
            metadata: {
              eventId,
              registrationId: waitlistedRegistration.id
            }
          })
        } catch (error) {
          console.warn('Failed to send promotion notification:', error)
        }
      }
    }
  }

  /**
   * Get user's event registrations
   */
  async getUserRegistrations(
    userId: string,
    pagination: PaginationParams = {}
  ): Promise<PaginationResult<EventRegistrationWithUser & { event: EventWithDetails }>> {
    const { page = 1, limit = 20 } = pagination
    const skip = (page - 1) * limit

    const [registrations, total] = await Promise.all([
      prisma.eventRegistration.findMany({
        where: { userId },
        include: {
          user: true,
          event: {
            include: {
              organizer: true,
              registrations: {
                include: {
                  user: true
                }
              }
            }
          }
        },
        skip,
        take: limit,
        orderBy: { registeredAt: 'desc' }
      }),
      prisma.eventRegistration.count({
        where: { userId }
      })
    ])

    const formattedRegistrations = registrations.map(registration => ({
      ...registration,
      event: this.formatEventWithDetails(registration.event, userId)
    }))

    return {
      data: formattedRegistrations as any,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  /**
   * Get events organized by a user
   */
  async getOrganizedEvents(
    organizerId: string,
    pagination: PaginationParams = {}
  ): Promise<PaginationResult<EventWithDetails>> {
    const { page = 1, limit = 20 } = pagination
    const skip = (page - 1) * limit

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where: { organizerId },
        include: {
          organizer: true,
          registrations: {
            include: {
              user: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.event.count({
        where: { organizerId }
      })
    ])

    const formattedEvents = events.map(event => this.formatEventWithDetails(event))

    return {
      data: formattedEvents,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  /**
   * Mark attendance for an event registration
   */
  async markAttendance(
    eventId: string,
    userId: string,
    organizerId: string,
    attended: boolean
  ): Promise<EventRegistration> {
    // Verify organizer owns the event
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    })

    if (!event || event.organizerId !== organizerId) {
      throw new Error('Not authorized to mark attendance for this event')
    }

    const registration = await prisma.eventRegistration.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId
        }
      }
    })

    if (!registration) {
      throw new Error('Registration not found')
    }

    return await prisma.eventRegistration.update({
      where: { id: registration.id },
      data: {
        status: attended ? 'ATTENDED' : 'NO_SHOW',
        attendedAt: attended ? new Date() : null
      }
    })
  }

  /**
   * Submit feedback for an event
   */
  async submitFeedback(
    eventId: string,
    userId: string,
    feedback: string,
    rating: number
  ): Promise<EventRegistration> {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5')
    }

    const registration = await prisma.eventRegistration.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId
        }
      }
    })

    if (!registration) {
      throw new Error('Registration not found')
    }

    if (registration.status !== 'ATTENDED') {
      throw new Error('Can only submit feedback for attended events')
    }

    return await prisma.eventRegistration.update({
      where: { id: registration.id },
      data: {
        feedback,
        rating
      }
    })
  }

  /**
   * Get event statistics
   */
  async getEventStats(eventId: string, organizerId: string): Promise<{
    totalRegistrations: number
    confirmedRegistrations: number
    waitlistedRegistrations: number
    attendedCount: number
    averageRating: number
    feedbackCount: number
  }> {
    // Verify organizer owns the event
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    })

    if (!event || event.organizerId !== organizerId) {
      throw new Error('Not authorized to view stats for this event')
    }

    const registrations = await prisma.eventRegistration.findMany({
      where: { eventId }
    })

    const totalRegistrations = registrations.length
    const confirmedRegistrations = registrations.filter(r => r.status === 'CONFIRMED').length
    const waitlistedRegistrations = registrations.filter(r => r.status === 'WAITLISTED').length
    const attendedCount = registrations.filter(r => r.status === 'ATTENDED').length
    
    const ratingsWithFeedback = registrations.filter(r => r.rating !== null)
    const averageRating = ratingsWithFeedback.length > 0
      ? ratingsWithFeedback.reduce((sum, r) => sum + (r.rating || 0), 0) / ratingsWithFeedback.length
      : 0
    
    const feedbackCount = registrations.filter(r => r.feedback !== null).length

    return {
      totalRegistrations,
      confirmedRegistrations,
      waitlistedRegistrations,
      attendedCount,
      averageRating,
      feedbackCount
    }
  }

  /**
   * Format event with additional details
   */
  private formatEventWithDetails(
    event: Event & {
      organizer: User
      registrations: (EventRegistration & { user: User })[]
    },
    userId?: string
  ): EventWithDetails {
    const registrationCount = event.registrations.filter(r => 
      r.status === 'CONFIRMED' || r.status === 'WAITLISTED'
    ).length

    let isRegistered = false
    let userRegistration: EventRegistration | undefined

    if (userId) {
      userRegistration = event.registrations.find(r => r.userId === userId)
      isRegistered = !!userRegistration && userRegistration.status !== 'CANCELLED'
    }

    return {
      ...event,
      registrationCount,
      isRegistered,
      userRegistration
    }
  }
}

export const eventService = new EventService()