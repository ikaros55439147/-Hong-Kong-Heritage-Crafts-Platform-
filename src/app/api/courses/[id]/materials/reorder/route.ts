import { NextRequest, NextResponse } from 'next/server'
import { LearningMaterialService } from '@/lib/services/learning-material.service'
import { prisma } from '@/lib/database'
import { verifyAuth } from '@/lib/auth/middleware'

const learningMaterialService = new LearningMaterialService(prisma)

/**
 * POST /api/courses/[id]/materials/reorder - Reorder learning materials
 */
export async function POST(
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
    const { materialIds }: { materialIds: string[] } = body

    if (!Array.isArray(materialIds)) {
      return NextResponse.json(
        {
          success: false,
          error: 'materialIds must be an array'
        },
        { status: 400 }
      )
    }

    await learningMaterialService.reorderLearningMaterials(
      params.id,
      craftsmanProfile.id,
      materialIds
    )

    return NextResponse.json({
      success: true,
      message: 'Learning materials reordered successfully'
    })
  } catch (error) {
    console.error('Error reordering learning materials:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reorder learning materials'
      },
      { status: 400 }
    )
  }
}