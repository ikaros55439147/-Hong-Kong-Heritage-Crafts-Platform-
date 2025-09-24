import { NextRequest, NextResponse } from 'next/server'
import { contentSearchService } from '@/lib/services/content-search.service'
import { z } from 'zod'

const suggestionsQuerySchema = z.object({
  query: z.string().default(''),
  limit: z.coerce.number().min(1).max(20).default(5),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const queryData = {
      query: searchParams.get('query') || '',
      limit: searchParams.get('limit') || '5',
    }

    const { query, limit } = suggestionsQuerySchema.parse(queryData)

    const suggestions = await contentSearchService.getSearchSuggestions(query, limit)

    return NextResponse.json({
      success: true,
      suggestions,
      query,
    })

  } catch (error) {
    console.error('Get suggestions error:', error)
    
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