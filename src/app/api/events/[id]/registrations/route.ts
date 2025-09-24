import { NextRequest, NextResponse } from 'next/server'
import { eventService } from '@/lib/services/event.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { ApiResponse, PaginationParams } from '@/types'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authMiddleware(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const eventId = params.id
    const { searchParams } = new URL(request.url)
    
    const pagination: PaginationParams = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20')
    }

    // Check if user is the event organizer
    const event = await eventService.getEvent(eventId)
    if (event.organizer.id !== authResult.user.id) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to view registrations' },
        { status: 403 }
      )
    }

    // Get event registrations (this would need to be implemented in eventService)
    // For now, return mock data structure
    const registrations = {
      data: [],
      total: 0,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: 0
    }

    const response: ApiResponse = {
      success: true,
      data: registrations
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Get event registrations error:', error)
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get event registrations'
    }

    return NextResponse.json(response, { status: 500 })
  }
}