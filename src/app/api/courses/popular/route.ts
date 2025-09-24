import { NextRequest, NextResponse } from 'next/server'
import { CourseService } from '@/lib/services/course.service'
import { prisma } from '@/lib/database'

const courseService = new CourseService(prisma)

/**
 * GET /api/courses/popular - Get popular courses
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    const courses = await courseService.getPopularCourses(limit)

    return NextResponse.json({
      success: true,
      data: courses
    })
  } catch (error) {
    console.error('Error fetching popular courses:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch popular courses'
      },
      { status: 500 }
    )
  }
}