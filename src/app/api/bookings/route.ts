import { NextRequest, NextResponse } from 'next/server'
import { BookingService } from '@/lib/services/booking.service'
import { prisma } from '@/lib/database'
import { verifyAuth } from '@/lib/auth/middleware'
import { BookingData, BookingStatus, PaginationParams } from '@/types'

const bookingService = new BookingService(prisma)

/**
 * GET /api/bookings - Get user's bookings
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required'
        },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    
    const params: PaginationParams = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10')
    }

    const status = searchParams.get('status') as BookingStatus | undefined

    const result = await bookingService.getBookingsByUser(authResult.user.id, params, status)

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Error fetching bookings:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch bookings'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/bookings - Create a new booking
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required'
        },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { courseId, ...bookingData }: { courseId: string } & BookingData = body

    if (!courseId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Course ID is required'
        },
        { status: 400 }
      )
    }

    const booking = await bookingService.createBooking(authResult.user.id, courseId, bookingData)

    return NextResponse.json({
      success: true,
      data: booking
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating booking:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create booking'
      },
      { status: 400 }
    )
  }
}