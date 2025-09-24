import { NextRequest, NextResponse } from 'next/server'
import { productService } from '@/lib/services/product.service'
import { validateUUID } from '@/lib/validations'
import { ApiResponse, PaginationParams } from '@/types'

/**
 * GET /api/craftsmen/[id]/products - Get products by craftsman
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const craftsmanId = params.id

    // Validate craftsman ID
    if (!validateUUID(craftsmanId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid craftsman ID' },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)
    
    const pagination: PaginationParams = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10')
    }

    const result = await productService.getProductsByCraftsman(craftsmanId, pagination)

    const response: ApiResponse = {
      success: true,
      data: result
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error getting craftsman products:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get craftsman products'
    }

    return NextResponse.json(response, { status: 500 })
  }
}