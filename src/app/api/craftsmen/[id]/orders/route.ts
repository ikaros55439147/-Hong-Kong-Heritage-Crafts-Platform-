import { NextRequest, NextResponse } from 'next/server'
import { orderService } from '@/lib/services/order.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { validateUUID } from '@/lib/validations'
import { ApiResponse, PaginationParams } from '@/types'

/**
 * GET /api/craftsmen/[id]/orders - Get orders for craftsman
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

    // Authenticate user
    const authResult = await authMiddleware(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user has access to this craftsman's orders
    const craftsmanProfile = authResult.user.craftsmanProfile
    if (authResult.user.role !== 'ADMIN' && 
        (!craftsmanProfile || craftsmanProfile.id !== craftsmanId)) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    
    const pagination: PaginationParams = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10')
    }

    const result = await orderService.getOrdersByCraftsman(craftsmanId, pagination)

    const response: ApiResponse = {
      success: true,
      data: result
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error getting craftsman orders:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get craftsman orders'
    }

    return NextResponse.json(response, { status: 500 })
  }
}