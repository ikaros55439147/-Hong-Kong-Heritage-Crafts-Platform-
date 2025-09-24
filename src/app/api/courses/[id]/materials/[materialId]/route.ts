import { NextRequest, NextResponse } from 'next/server'
import { LearningMaterialService } from '@/lib/services/learning-material.service'
import { prisma } from '@/lib/database'
import { verifyAuth } from '@/lib/auth/middleware'
import { LearningMaterialData } from '@/types'

const learningMaterialService = new LearningMaterialService(prisma)

/**
 * GET /api/courses/[id]/materials/[materialId] - Get learning material by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; materialId: string } }
) {
  try {
    const material = await learningMaterialService.getLearningMaterialById(params.materialId)

    if (!material) {
      return NextResponse.json(
        {
          success: false,
          error: 'Learning material not found'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: material
    })
  } catch (error) {
    console.error('Error fetching learning material:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch learning material'
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/courses/[id]/materials/[materialId] - Update learning material
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; materialId: string } }
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
    const updates: Partial<LearningMaterialData> = body

    const material = await learningMaterialService.updateLearningMaterial(
      params.materialId,
      craftsmanProfile.id,
      updates
    )

    return NextResponse.json({
      success: true,
      data: material
    })
  } catch (error) {
    console.error('Error updating learning material:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update learning material'
      },
      { status: 400 }
    )
  }
}

/**
 * DELETE /api/courses/[id]/materials/[materialId] - Delete learning material
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; materialId: string } }
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

    await learningMaterialService.deleteLearningMaterial(
      params.materialId,
      craftsmanProfile.id
    )

    return NextResponse.json({
      success: true,
      message: 'Learning material deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting learning material:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete learning material'
      },
      { status: 400 }
    )
  }
}