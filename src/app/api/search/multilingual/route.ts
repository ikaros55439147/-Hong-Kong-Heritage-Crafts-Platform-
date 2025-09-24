import { NextRequest, NextResponse } from 'next/server'
import { MultilingualSearchService, SearchQuery } from '../../../../lib/services/multilingual-search.service'
import { SupportedLanguage, supportedLanguages } from '../../../../lib/i18n/config'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const query = searchParams.get('q') || ''
    const language = (searchParams.get('lang') || 'zh-HK') as SupportedLanguage
    const entityTypesParam = searchParams.get('types')
    const categoriesParam = searchParams.get('categories')
    const tagsParam = searchParams.get('tags')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Validate language
    if (!supportedLanguages.includes(language)) {
      return NextResponse.json(
        { error: 'Invalid language parameter' },
        { status: 400 }
      )
    }

    // Parse array parameters
    const entityTypes = entityTypesParam 
      ? entityTypesParam.split(',').filter(type => 
          ['course', 'product', 'craftsman', 'event'].includes(type)
        ) as Array<'course' | 'product' | 'craftsman' | 'event'>
      : undefined

    const categories = categoriesParam 
      ? categoriesParam.split(',').filter(cat => cat.trim())
      : undefined

    const tags = tagsParam 
      ? tagsParam.split(',').filter(tag => tag.trim())
      : undefined

    // Build search query
    const searchQuery: SearchQuery = {
      query,
      language,
      entityTypes,
      categories,
      tags,
      limit: Math.min(limit, 100), // Cap at 100 results
      offset: Math.max(offset, 0)
    }

    // Perform search
    const results = await MultilingualSearchService.search(searchQuery)

    return NextResponse.json(results)
  } catch (error) {
    console.error('Multilingual search error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, language, entityTypes, categories, tags, limit, offset } = body

    // Validate required fields
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    if (!language || !supportedLanguages.includes(language)) {
      return NextResponse.json(
        { error: 'Valid language is required' },
        { status: 400 }
      )
    }

    // Build search query
    const searchQuery: SearchQuery = {
      query: query.trim(),
      language,
      entityTypes,
      categories,
      tags,
      limit: limit ? Math.min(limit, 100) : 20,
      offset: offset ? Math.max(offset, 0) : 0
    }

    // Perform search
    const results = await MultilingualSearchService.search(searchQuery)

    return NextResponse.json(results)
  } catch (error) {
    console.error('Multilingual search error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}