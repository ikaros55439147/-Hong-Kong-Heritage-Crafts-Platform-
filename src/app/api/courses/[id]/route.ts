import { NextRequest, NextResponse } from 'next/server'
import { CourseService } from '@/lib/services/course.service'
import { prisma } from '@/lib/database'
import { verifyAuth } from '@/lib/auth/middleware'
import { CourseData, CourseStatus } from '@/types'

const courseService = new CourseService(prisma)

/**
 * GET /api/courses/[id] - Get course by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const course = await courseService.getCourseById(params.id)

    if (!course) {
      return NextResponse.json(
        {
          success: false,
          error: 'Course not found'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: course
    })
  } catch (error) {
    console.error('Error fetching course:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch course'
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/courses/[id] - Update course
 */
export async function PUT(
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
    const updates: Partial<CourseData> = body

    const course = await courseService.updateCourse(params.id, craftsmanProfile.id, updates)

    return NextResponse.json({
      success: true,
      data: course
    })
  } catch (error) {
    console.error('Error updating course:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update course'
      },
      { status: 400 }
    )
  }
}

/**
 * DELETE /api/courses/[id] - Delete course (soft delete)
 */
export async function DELETE(
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

    await courseService.deleteCourse(params.id, craftsmanProfile.id)

    return NextResponse.json({
      success: true,
      message: 'Course deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting course:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete course'
      },
      { status: 400 }
    )
  }
}