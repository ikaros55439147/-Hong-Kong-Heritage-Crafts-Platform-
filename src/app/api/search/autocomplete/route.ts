import { NextRequest, NextResponse } from 'next/server'
import { enhancedSearchService } from '@/lib/services/enhanced-search.service'
import { z } from 'zod'

const autocompleteSchema = z.object({
  query: z.string().min(1),
  userId: z.string().optional(),
  limit: z.coerce.number().min(1).max(20).default(10),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const queryData = {
      query: searchParams.get('query') || '',
      userId: searchParams.get('userId') || undefined,
      limit: searchParams.get('limit') || '10',
    }

    const { query, userId, limit } = autocompleteSchema.parse(queryData)

    const results = await enhancedSearchService.getAutoComplete(query, userId, limit)

    return NextResponse.json({
      success: true,
      ...results,
    })

  } catch (error) {
    console.error('Autocomplete error:', error)
    
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