import { NextRequest, NextResponse } from 'next/server'
import { contentSearchService } from '@/lib/services/content-search.service'
import { z } from 'zod'

const popularQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(10),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const queryData = {
      limit: searchParams.get('limit') || '10',
    }

    const { limit } = popularQuerySchema.parse(queryData)

    const popularTerms = await contentSearchService.getPopularSearchTerms(limit)

    return NextResponse.json({
      success: true,
      terms: popularTerms,
    })

  } catch (error) {
    console.error('Get popular terms error:', error)
    
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