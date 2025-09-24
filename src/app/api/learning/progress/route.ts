import { NextRequest, NextResponse } from 'next/server'
import { LearningMaterialService } from '@/lib/services/learning-material.service'
import { prisma } from '@/lib/database'
import { verifyAuth } from '@/lib/auth/middleware'
import { PaginationParams } from '@/types'

const learningMaterialService = new LearningMaterialService(prisma)

/**
 * GET /api/learning/progress - Get user's learning progress across all courses
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    
    const params: PaginationParams = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10')
    }

    const result = await learningMaterialService.getUserLearningProgress(
      authResult.user.id,
      params
    )

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Error fetching learning progress:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch learning progress'
      },
      { status: 500 }
    )
  }
}