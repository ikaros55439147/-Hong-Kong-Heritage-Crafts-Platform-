import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/auth/middleware'
import { ApiResponse } from '@/types'
import { prisma } from '@/lib/database'
import { EntityType, InteractionType } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { entityType, entityId, interactionType, metadata } = await request.json()

    if (!entityType || !entityId || !interactionType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate entity type and interaction type
    const validEntityTypes = ['COURSE', 'PRODUCT', 'CRAFTSMAN_PROFILE', 'EVENT', 'COMMENT']
    const validInteractionTypes = ['VIEW', 'LIKE', 'SHARE', 'COMMENT', 'BOOKMARK', 'CLICK']

    if (!validEntityTypes.includes(entityType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid entity type' },
        { status: 400 }
      )
    }

    if (!validInteractionTypes.includes(interactionType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid interaction type' },
        { status: 400 }
      )
    }

    // Create interaction record
    const interaction = await prisma.userInteraction.create({
      data: {
        userId: authResult.user.id,
        entityType: entityType as EntityType,
        entityId,
        interactionType: interactionType as InteractionType,
        metadata: metadata || {}
      }
    })

    const response: ApiResponse = {
      success: true,
      data: interaction,
      message: 'Interaction tracked successfully'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Track interaction error:', error)
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to track interaction'
    }

    return NextResponse.json(response, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entityType')
    const entityId = searchParams.get('entityId')
    const interactionType = searchParams.get('interactionType')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = {
      userId: authResult.user.id
    }

    if (entityType) where.entityType = entityType
    if (entityId) where.entityId = entityId
    if (interactionType) where.interactionType = interactionType

    const interactions = await prisma.userInteraction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    const response: ApiResponse = {
      success: true,
      data: interactions
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Get interactions error:', error)
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get interactions'
    }

    return NextResponse.json(response, { status: 500 })
  }
}