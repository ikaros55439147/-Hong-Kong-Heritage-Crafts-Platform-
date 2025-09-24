import { NextRequest, NextResponse } from 'next/server'
import { BookingService } from '@/lib/services/booking.service'
import { prisma } from '@/lib/database'
import { verifyAuth } from '@/lib/auth/middleware'

const bookingService = new BookingService(prisma)

/**
 * POST /api/bookings/[id]/cancel - Cancel a booking
 */
export async function POST(
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

    const booking = await bookingService.cancelBooking(params.id, authResult.user.id)

    return NextResponse.json({
      success: true,
      data: booking,
      message: 'Booking cancelled successfully'
    })
  } catch (error) {
    console.error('Error cancelling booking:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel booking'
      },
      { status: 400 }
    )
  }
}