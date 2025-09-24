import { NextRequest, NextResponse } from 'next/server'
import { contentSearchService } from '@/lib/services/content-search.service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const craftType = searchParams.get('craftType')

    let categories
    if (craftType) {
      categories = await contentSearchService.getCategoriesByCraftType(craftType)
    } else {
      categories = await contentSearchService.getCategories()
    }

    return NextResponse.json({
      success: true,
      categories,
    })

  } catch (error) {
    console.error('Get categories error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}