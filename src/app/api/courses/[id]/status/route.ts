import { NextRequest, NextResponse } from 'next/server'
import { CourseService } from '@/lib/services/course.service'
import { prisma } from '@/lib/database'
import { verifyAuth } from '@/lib/auth/middleware'
import { CourseStatus } from '@/types'

const courseService = new CourseService(prisma)

/**
 * PATCH /api/courses/[id]/status - Update course status
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

    const body = await request.json()
    const { status } = body

    // Validate status
    if (!Object.values(CourseStatus).includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid course status'
        },
        { status: 400 }
      )
    }

    const course = await courseService.updateCourseStatus(params.id, craftsmanProfile.id, status)

    return NextResponse.json({
      success: true,
      data: course
    })
  } catch (error) {
    console.error('Error updating course status:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update course status'
      },
      { status: 400 }
    )
  }
}