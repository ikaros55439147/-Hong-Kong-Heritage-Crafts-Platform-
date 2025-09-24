import { NextRequest, NextResponse } from 'next/server'
import { BookingService } from '@/lib/services/booking.service'
import { prisma } from '@/lib/database'
import { verifyAuth } from '@/lib/auth/middleware'
import { BookingStatus } from '@/types'

const bookingService = new BookingService(prisma)

/**
 * GET /api/bookings/[id] - Get booking by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const booking = await bookingService.getBookingById(params.id)

    if (!booking) {
      return NextResponse.json(
        {
          success: false,
          error: 'Booking not found'
        },
        { status: 404 }
      )
    }

    // Check if user has access to this booking
    if (booking.userId !== authResult.user.id && booking.course.craftsmanId !== authResult.user.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied'
        },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: booking
    })
  } catch (error) {
    console.error('Error fetching booking:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch booking'
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/bookings/[id] - Update booking status
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { status } = body

    // Validate status
    if (!Object.values(BookingStatus).includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid booking status'
        },
        { status: 400 }
      )
    }

    const booking = await bookingService.updateBookingStatus(params.id, status, authResult.user.id)

    return NextResponse.json({
      success: true,
      data: booking
    })
  } catch (error) {
    console.error('Error updating booking:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update booking'
      },
      { status: 400 }
    )
  }
}