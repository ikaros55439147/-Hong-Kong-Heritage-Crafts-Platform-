import { NextRequest, NextResponse } from 'next/server'
import { enhancedSearchService } from '@/lib/services/enhanced-search.service'
import { z } from 'zod'

const enhancedSearchSchema = z.object({
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
  includeRecommendations: z.coerce.boolean().default(false),
  personalizeResults: z.coerce.boolean().default(true),
  trackSearch: z.coerce.boolean().default(true),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const queryData = Object.fromEntries(searchParams.entries())
    const searchQuery = enhancedSearchSchema.parse(queryData)

    const results = await enhancedSearchService.search(searchQuery)

    return NextResponse.json({
      success: true,
      ...results,
    })

  } catch (error) {
    console.error('Enhanced search error:', error)
    
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const searchQuery = enhancedSearchSchema.parse(body)

    const results = await enhancedSearchService.search(searchQuery)

    return NextResponse.json({
      success: true,
      ...results,
    })

  } catch (error) {
    console.error('Enhanced search error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}