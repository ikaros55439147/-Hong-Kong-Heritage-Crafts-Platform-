import { NextRequest, NextResponse } from 'next/server'
import { contentManagementService } from '@/lib/services/content-management.service'
import { authMiddleware } from '@/lib/auth/middleware'

export async function POST(request: NextRequest) {
  try {
    const user = await authMiddleware(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entityType')

    const results = await contentManagementService.batchCalculateQualityScores(
      entityType || undefined
    )

    return NextResponse.json({
      processed: results.length,
      results
    })
  } catch (error) {
    console.error('Error batch calculating quality scores:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}