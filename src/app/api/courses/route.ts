import { NextRequest, NextResponse } from 'next/server'
import { CourseService } from '@/lib/services/course.service'
import { prisma } from '@/lib/database'
import { verifyAuth } from '@/lib/auth/middleware'
import { CourseData, SearchParams, PaginationParams } from '@/types'

const courseService = new CourseService(prisma)

/**
 * GET /api/courses - Search and list courses
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const params: SearchParams & PaginationParams = {
      query: searchParams.get('query') || undefined,
      category: searchParams.get('category') || undefined,
      language: searchParams.get('language') || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10')
    }

    const result = await courseService.searchCourses(params)

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Error searching courses:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to search courses'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/courses - Create a new course
 */
export async function POST(request: NextRequest) {
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

    // Check if user has craftsman profile
    const craftsmanProfile = await prisma.craftsmanProfile.findUnique({
      where: { userId: authResult.user.id }
    })

    if (!craftsmanProfile) {
      return NextResponse.json(
        {
          success: false,
          error: 'Craftsman profile required to create courses'
        },
        { status: 403 }
      )
    }

    const body = await request.json()
    const courseData: CourseData = body

    const course = await courseService.createCourse(craftsmanProfile.id, courseData)

    return NextResponse.json({
      success: true,
      data: course
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating course:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create course'
      },
      { status: 400 }
    )
  }
}