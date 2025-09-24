import { NextRequest, NextResponse } from 'next/server'
import { enhancedSearchService } from '@/lib/services/enhanced-search.service'
import { z } from 'zod'

const analyticsSchema = z.object({
  startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const queryData = {
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
    }

    const { startDate, endDate } = analyticsSchema.parse(queryData)

    const analytics = await enhancedSearchService.getSearchAnalytics(startDate, endDate)

    return NextResponse.json({
      success: true,
      analytics,
    })

  } catch (error) {
    console.error('Search analytics error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}