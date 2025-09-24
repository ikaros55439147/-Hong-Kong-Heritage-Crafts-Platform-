import { NextRequest, NextResponse } from 'next/server'
import { productService } from '@/lib/services/product.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { validateProductData, validateUUID } from '@/lib/validations'
import { ApiResponse, ProductData } from '@/types'
import { ProductStatus } from '@prisma/client'

/**
 * GET /api/products/[id] - Get product by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id

    // Validate product ID
    if (!validateUUID(productId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid product ID' },
        { status: 400 }
      )
    }

    const product = await productService.getProductById(productId)

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    const response: ApiResponse = {
      success: true,
      data: product
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error getting product:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get product'
    }

    return NextResponse.json(response, { status: 500 })
  }
}

/**
 * PUT /api/products/[id] - Update product
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id

    // Validate product ID
    if (!validateUUID(productId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid product ID' },
        { status: 400 }
      )
    }

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
        { success: false, error: 'Only craftsmen can update products' },
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
    
    // Validate product data (partial update)
    const validation = validateProductData(body, true)
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

    const updates: Partial<ProductData> = validation.data
    const product = await productService.updateProduct(productId, craftsmanProfile.id, updates)

    const response: ApiResponse = {
      success: true,
      data: product,
      message: 'Product updated successfully'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error updating product:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update product'
    }

    return NextResponse.json(response, { status: 500 })
  }
}

/**
 * DELETE /api/products/[id] - Delete product
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id

    // Validate product ID
    if (!validateUUID(productId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid product ID' },
        { status: 400 }
      )
    }

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
        { success: false, error: 'Only craftsmen can delete products' },
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

    await productService.deleteProduct(productId, craftsmanProfile.id)

    const response: ApiResponse = {
      success: true,
      message: 'Product deleted successfully'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error deleting product:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete product'
    }

    return NextResponse.json(response, { status: 500 })
  }
}