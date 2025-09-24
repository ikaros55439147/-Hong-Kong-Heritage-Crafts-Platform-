import { NextRequest, NextResponse } from 'next/server'
import { LearningMaterialService } from '@/lib/services/learning-material.service'
import { prisma } from '@/lib/database'
import { verifyAuth } from '@/lib/auth/middleware'
import { LearningMaterialData } from '@/types'

const learningMaterialService = new LearningMaterialService(prisma)

/**
 * GET /api/courses/[id]/materials - Get learning materials for a course
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const materials = await learningMaterialService.getLearningMaterialsByCourse(params.id)

    return NextResponse.json({
      success: true,
      data: materials
    })
  } catch (error) {
    console.error('Error fetching learning materials:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch learning materials'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/courses/[id]/materials - Create a new learning material
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
    const materialData: LearningMaterialData = body

    const material = await learningMaterialService.createLearningMaterial(
      params.id,
      craftsmanProfile.id,
      materialData
    )

    return NextResponse.json({
      success: true,
      data: material
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating learning material:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create learning material'
      },
      { status: 400 }
    )
  }
}