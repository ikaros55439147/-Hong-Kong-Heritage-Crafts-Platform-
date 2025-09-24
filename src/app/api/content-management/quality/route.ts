import { NextRequest, NextResponse } from 'next/server'
import { contentManagementService } from '@/lib/services/content-management.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { z } from 'zod'

const CalculateQualitySchema = z.object({
  entityType: z.string(),
  entityId: z.string().uuid()
})

export async function POST(request: NextRequest) {
  try {
    const user = await authMiddleware(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = CalculateQualitySchema.parse(body)
    
    const qualityScore = await contentManagementService.calculateQualityScore(
      validatedData.entityType,
      validatedData.entityId
    )
    
    return NextResponse.json(qualityScore)
  } catch (error) {
    console.error('Error calculating quality score:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entityType')
    const entityId = searchParams.get('entityId')
    const minScore = searchParams.get('minScore')

    let qualityScores
    if (entityType && entityId) {
      // Get quality score for specific entity
      qualityScores = await contentManagementService.getQualityScores(
        entityType,
        minScore ? parseFloat(minScore) : undefined
      )
      // Filter for specific entity
      qualityScores = qualityScores.filter(score => 
        score.entityType === entityType && score.entityId === entityId
      )
    } else {
      qualityScores = await contentManagementService.getQualityScores(
        entityType || undefined,
        minScore ? parseFloat(minScore) : undefined
      )
    }
    
    return NextResponse.json(qualityScores)
  } catch (error) {
    console.error('Error fetching quality scores:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}