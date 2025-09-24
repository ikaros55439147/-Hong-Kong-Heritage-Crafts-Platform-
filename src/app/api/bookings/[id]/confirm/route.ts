import { NextRequest, NextResponse } from 'next/server'
import { BookingService } from '@/lib/services/booking.service'
import { prisma } from '@/lib/database'
import { verifyAuth } from '@/lib/auth/middleware'

const bookingService = new BookingService(prisma)

/**
 * POST /api/bookings/[id]/confirm - Confirm a booking (for craftsman)
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

    // Get craftsman profile
    const craftsmanProfile = await prisma.craftsmanProfile.findUnique({
      where: { userId: authResult.user.id }
    })

    if (!craftsmanProfile) {
      return NextResponse.json(
        {
          success: false,
          error: 'Craftsman profile required'
        },
        { status: 403 }
      )
    }

    const booking = await bookingService.confirmBooking(params.id, craftsmanProfile.id)

    return NextResponse.json({
      success: true,
      data: booking,
      message: 'Booking confirmed successfully'
    })
  } catch (error) {
    console.error('Error confirming booking:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to confirm booking'
      },
      { status: 400 }
    )
  }
}