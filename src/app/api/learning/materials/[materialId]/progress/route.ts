import { NextRequest, NextResponse } from 'next/server'
import { LearningMaterialService } from '@/lib/services/learning-material.service'
import { prisma } from '@/lib/database'
import { verifyAuth } from '@/lib/auth/middleware'
import { LearningProgressData } from '@/types'

const learningMaterialService = new LearningMaterialService(prisma)

/**
 * POST /api/learning/materials/[materialId]/progress - Update learning progress for a material
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { materialId: string } }
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

    const body = await request.json()
    const progressData: LearningProgressData = body

    const progress = await learningMaterialService.updateLearningProgress(
      authResult.user.id,
      params.materialId,
      progressData
    )

    return NextResponse.json({
      success: true,
      data: progress
    })
  } catch (error) {
    console.error('Error updating learning progress:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update learning progress'
      },
      { status: 400 }
    )
  }
}