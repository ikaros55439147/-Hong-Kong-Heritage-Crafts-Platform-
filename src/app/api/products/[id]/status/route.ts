import { NextRequest, NextResponse } from 'next/server'
import { productService } from '@/lib/services/product.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { validateUUID } from '@/lib/validations'
import { ApiResponse } from '@/types'
import { ProductStatus } from '@prisma/client'

/**
 * PATCH /api/products/[id]/status - Update product status
 */
export async function PATCH(
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
        { success: false, error: 'Only craftsmen can update product status' },
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
    const { status } = body

    // Validate status
    if (!Object.values(ProductStatus).includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid product status' },
        { status: 400 }
      )
    }

    const product = await productService.updateProductStatus(productId, craftsmanProfile.id, status)

    const response: ApiResponse = {
      success: true,
      data: product,
      message: 'Product status updated successfully'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error updating product status:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update product status'
    }

    return NextResponse.json(response, { status: 500 })
  }
}