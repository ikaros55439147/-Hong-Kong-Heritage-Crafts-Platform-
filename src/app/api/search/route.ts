import { NextRequest, NextResponse } from 'next/server'
import { contentSearchService } from '@/lib/services/content-search.service'
import { z } from 'zod'

// Validation schema for search query
const searchQuerySchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  craftType: z.string().optional(),
  language: z.string().default('zh-HK'),
  fileType: z.string().optional(),
  userId: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  sortBy: z.enum(['relevance', 'date', 'popularity']).default('relevance'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse and validate query parameters
    const queryData = {
      query: searchParams.get('query') || undefined,
      category: searchParams.get('category') || undefined,
      craftType: searchParams.get('craftType') || undefined,
      language: searchParams.get('language') || 'zh-HK',
      fileType: searchParams.get('fileType') || undefined,
      userId: searchParams.get('userId') || undefined,
      limit: searchParams.get('limit') || '20',
      offset: searchParams.get('offset') || '0',
      sortBy: searchParams.get('sortBy') || 'relevance',
      sortOrder: searchParams.get('sortOrder') || 'desc',
    }

    const validatedQuery = searchQuerySchema.parse(queryData)

    // Perform search
    const searchResults = await contentSearchService.search(validatedQuery)

    return NextResponse.json({
      success: true,
      ...searchResults,
    })

  } catch (error) {
    console.error('Search error:', error)
    
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