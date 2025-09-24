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

    const userId = params.id
    
    // Users can only view their own events unless they're admin
    if (authResult.user.id !== userId && authResult.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Not authorized to view these events' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    
    const pagination: PaginationParams = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20')
    }

    const type = searchParams.get('type') // 'registered' or 'organized'

    let events
    if (type === 'organized') {
      events = await eventService.getOrganizedEvents(userId, pagination)
    } else {
      events = await eventService.getUserRegistrations(userId, pagination)
    }

    const response: ApiResponse = {
      success: true,
      data: events
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Get user events error:', error)
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get user events'
    }

    return NextResponse.json(response, { status: 500 })
  }
}