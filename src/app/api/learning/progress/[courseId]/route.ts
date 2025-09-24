import { NextRequest, NextResponse } from 'next/server'
import { LearningMaterialService } from '@/lib/services/learning-material.service'
import { prisma } from '@/lib/database'
import { verifyAuth } from '@/lib/auth/middleware'

const learningMaterialService = new LearningMaterialService(prisma)

/**
 * GET /api/learning/progress/[courseId] - Get learning progress for a specific course
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
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

    const progress = await learningMaterialService.getCourseProgress(
      authResult.user.id,
      params.courseId
    )

    return NextResponse.json({
      success: true,
      data: progress
    })
  } catch (error) {
    console.error('Error fetching course progress:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch course progress'
      },
      { status: 400 }
    )
  }
}