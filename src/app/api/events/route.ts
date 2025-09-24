import { NextRequest, NextResponse } from 'next/server'
import { eventService } from '@/lib/services/event.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { ApiResponse, PaginationParams } from '@/types'
import { EventType, EventStatus } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const eventData = await request.json()

    // Validate required fields
    if (!eventData.title || !eventData.eventType || !eventData.startDateTime || !eventData.endDateTime) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Convert date strings to Date objects
    eventData.startDateTime = new Date(eventData.startDateTime)
    eventData.endDateTime = new Date(eventData.endDateTime)

    // Validate dates
    if (eventData.startDateTime >= eventData.endDateTime) {
      return NextResponse.json(
        { success: false, error: 'End time must be after start time' },
        { status: 400 }
      )
    }

    if (eventData.startDateTime < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Event cannot be scheduled in the past' },
        { status: 400 }
      )
    }

    const event = await eventService.createEvent(authResult.user.id, eventData)

    const response: ApiResponse = {
      success: true,
      data: event,
      message: 'Event created successfully'
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Create event error:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create event'
    }

    return NextResponse.json(response, { status: 400 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request)
    const { searchParams } = new URL(request.url)
    
    const pagination: PaginationParams = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20')
    }

    const filters: any = {}

    // Parse event types
    const eventTypes = searchParams.get('eventTypes')
    if (eventTypes) {
      filters.eventType = eventTypes.split(',') as EventType[]
    }

    // Parse categories
    const categories = searchParams.get('categories')
    if (categories) {
      filters.category = categories.split(',')
    }

    // Parse date range
    const startDate = searchParams.get('startDate')
    if (startDate) {
      filters.startDate = new Date(startDate)
    }

    const endDate = searchParams.get('endDate')
    if (endDate) {
      filters.endDate = new Date(endDate)
    }

    // Parse price range
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    if (minPrice || maxPrice) {
      filters.priceRange = {}
      if (minPrice) filters.priceRange.min = parseFloat(minPrice)
      if (maxPrice) filters.priceRange.max = parseFloat(maxPrice)
    }

    // Parse tags
    const tags = searchParams.get('tags')
    if (tags) {
      filters.tags = tags.split(',')
    }

    // Parse status
    const status = searchParams.get('status')
    if (status) {
      filters.status = status.split(',') as EventStatus[]
    }

    const events = await eventService.getEvents(filters, pagination, authResult.user?.id)

    const response: ApiResponse = {
      success: true,
      data: events
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Get events error:', error)
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get events'
    }

    return NextResponse.json(response, { status: 500 })
  }
}