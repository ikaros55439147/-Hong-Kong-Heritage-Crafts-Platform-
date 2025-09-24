import { NextRequest, NextResponse } from 'next/server'
import { productService } from '@/lib/services/product.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { validateProductData } from '@/lib/validations'
import { ApiResponse, ProductData, SearchParams, PaginationParams } from '@/types'

/**
 * GET /api/products - Search and list products
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const params: SearchParams & PaginationParams = {
      query: searchParams.get('query') || undefined,
      category: searchParams.get('category') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10'),
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
    }

    const result = await productService.searchProducts(params)

    const response: ApiResponse = {
      success: true,
      data: result
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error searching products:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search products'
    }

    return NextResponse.json(response, { status: 500 })
  }
}

/**
 * POST /api/products - Create a new product
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authMiddleware(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user is a craftsman
    if (authResult.user.role !== 'CRAFTSMAN') {
      return NextResponse.json(
        { success: false, error: 'Only craftsmen can create products' },
        { status: 403 }
      )
    }

    // Get craftsman profile
    const craftsmanProfile = authResult.user.craftsmanProfile
    if (!craftsmanProfile) {
      return NextResponse.json(
        { success: false, error: 'Craftsman profile not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    
    // Validate product data
    const validation = validateProductData(body)
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation failed',
          details: validation.errors
        },
        { status: 400 }
      )
    }

    const productData: ProductData = validation.data
    const product = await productService.createProduct(craftsmanProfile.id, productData)

    const response: ApiResponse = {
      success: true,
      data: product,
      message: 'Product created successfully'
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Error creating product:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create product'
    }

    return NextResponse.json(response, { status: 500 })
  }
}