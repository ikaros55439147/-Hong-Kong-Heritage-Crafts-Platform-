import { NextRequest, NextResponse } from 'next/server'
import { CourseService } from '@/lib/services/course.service'
import { prisma } from '@/lib/database'

const courseService = new CourseService(prisma)

/**
 * GET /api/courses/tags - Get course tags/categories for filtering
 */
export async function GET(request: NextRequest) {
  try {
    const tags = await courseService.getCourseTags()

    return NextResponse.json({
      success: true,
      data: tags
    })
  } catch (error) {
    console.error('Error fetching course tags:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch course tags'
      },
      { status: 500 }
    )
  }
}