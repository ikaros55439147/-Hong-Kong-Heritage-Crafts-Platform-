import { NextRequest, NextResponse } from 'next/server'
import { BookingService } from '@/lib/services/booking.service'
import { prisma } from '@/lib/database'

const bookingService = new BookingService(prisma)

/**
 * GET /api/courses/[id]/availability - Check course availability
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const availability = await bookingService.checkCourseAvailability(params.id)

    return NextResponse.json({
      success: true,
      data: availability
    })
  } catch (error) {
    console.error('Error checking course availability:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check course availability'
      },
      { status: 400 }
    )
  }
}