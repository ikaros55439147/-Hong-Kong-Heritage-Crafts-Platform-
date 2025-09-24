import { NextRequest, NextResponse } from 'next/server'
import { inventoryAlertService } from '@/lib/services/inventory-alert.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { ApiResponse } from '@/types'

/**
 * POST /api/inventory/alerts/[id]/acknowledge - Acknowledge an inventory alert
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
        { success: false, error: 'Only craftsmen can acknowledge inventory alerts' },
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

    const alert = await inventoryAlertService.acknowledgeAlert(params.id, craftsmanProfile.id)

    const response: ApiResponse = {
      success: true,
      data: alert,
      message: 'Alert acknowledged successfully'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error acknowledging inventory alert:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to acknowledge inventory alert'
    }

    return NextResponse.json(response, { status: 500 })
  }
}