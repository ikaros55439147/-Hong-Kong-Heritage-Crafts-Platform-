import { NextRequest, NextResponse } from 'next/server'
import { contentManagementService } from '@/lib/services/content-management.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { z } from 'zod'

const BatchQualityCalculationSchema = z.object({
  entityType: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const user = await authMiddleware(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin permissions for batch operations
    if (user.role !== 'ADMIN' && user.role !== 'CRAFTSMAN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const operation = searchParams.get('operation')

    if (operation === 'calculate-quality') {
      const body = await request.json()
      const validatedData = BatchQualityCalculationSchema.parse(body)
      
      const results = await contentManagementService.batchCalculateQualityScores(
        validatedData.entityType
      )
      
      return NextResponse.json({
        message: 'Batch quality calculation completed',
        processed: results.length,
        results: results.slice(0, 10) // Return first 10 results as sample
      })
    }

    return NextResponse.json({ error: 'Unknown operation' }, { status: 400 })
  } catch (error) {
    console.error('Error in batch operation:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}