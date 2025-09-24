import { NextRequest, NextResponse } from 'next/server'
import { BookingService } from '@/lib/services/booking.service'
import { prisma } from '@/lib/database'
import { verifyAuth } from '@/lib/auth/middleware'
import { BookingStatus, PaginationParams } from '@/types'

const bookingService = new BookingService(prisma)

/**
 * GET /api/courses/[id]/bookings - Get bookings for a course (for craftsman)
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

    const { searchParams } = new URL(request.url)
    
    const paginationParams: PaginationParams = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10')
    }

    const status = searchParams.get('status') as BookingStatus | undefined

    const result = await bookingService.getBookingsByCourse(
      params.id, 
      craftsmanProfile.id, 
      paginationParams, 
      status
    )

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Error fetching course bookings:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch course bookings'
      },
      { status: 400 }
    )
  }
}