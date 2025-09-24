import { NextRequest, NextResponse } from 'next/server'
import { orderService } from '@/lib/services/order.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { validateUUID } from '@/lib/validations'
import { ApiResponse } from '@/types'

/**
 * GET /api/craftsmen/[id]/orders/statistics - Get order statistics for craftsman
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

    // Check if user has access to this craftsman's statistics
    const craftsmanProfile = authResult.user.craftsmanProfile
    if (authResult.user.role !== 'ADMIN' && 
        (!craftsmanProfile || craftsmanProfile.id !== craftsmanId)) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    const statistics = await orderService.getOrderStatistics(craftsmanId)

    const response: ApiResponse = {
      success: true,
      data: statistics
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error getting order statistics:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get order statistics'
    }

    return NextResponse.json(response, { status: 500 })
  }
}