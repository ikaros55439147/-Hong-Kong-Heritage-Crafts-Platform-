import { NextRequest, NextResponse } from 'next/server'
import { productService } from '@/lib/services/product.service'
import { ApiResponse } from '@/types'

/**
 * GET /api/products/categories - Get product categories with counts
 */
export async function GET(request: NextRequest) {
  try {
    const categories = await productService.getProductCategories()

    const response: ApiResponse = {
      success: true,
      data: categories
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error getting product categories:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get product categories'
    }

    return NextResponse.json(response, { status: 500 })
  }
}