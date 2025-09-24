import { NextRequest, NextResponse } from 'next/server'
import { CourseService } from '@/lib/services/course.service'
import { prisma } from '@/lib/database'

const courseService = new CourseService(prisma)

/**
 * GET /api/courses/categories - Get course categories with counts
 */
export async function GET(request: NextRequest) {
  try {
    const categories = await courseService.getCourseCategories()

    return NextResponse.json({
      success: true,
      data: categories
    })
  } catch (error) {
    console.error('Error fetching course categories:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch course categories'
      },
      { status: 500 }
    )
  }
}