import { NextRequest, NextResponse } from 'next/server'
import { inventoryAlertService } from '@/lib/services/inventory-alert.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { ApiResponse, PaginationParams } from '@/types'
import { AlertType } from '@prisma/client'

/**
 * GET /api/inventory/alerts - Get inventory alerts for craftsman
 */
export async function GET(request: NextRequest) {
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
        { success: false, error: 'Only craftsmen can access inventory alerts' },
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

    const { searchParams } = new URL(request.url)
    
    const pagination: PaginationParams = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10')
    }

    const filters = {
      alertType: searchParams.get('alertType') as AlertType | undefined,
      isAcknowledged: searchParams.get('isAcknowledged') === 'true' ? true : 
                     searchParams.get('isAcknowledged') === 'false' ? false : undefined
    }

    const result = await inventoryAlertService.getAlertsForCraftsman(
      craftsmanProfile.id, 
      pagination, 
      filters
    )

    const response: ApiResponse = {
      success: true,
      data: result
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching inventory alerts:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch inventory alerts'
    }

    return NextResponse.json(response, { status: 500 })
  }
}

/**
 * POST /api/inventory/alerts - Check and create low stock alerts
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

    // Check if user is a craftsman or admin
    if (!['CRAFTSMAN', 'ADMIN'].includes(authResult.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    let craftsmanId: string | undefined

    if (authResult.user.role === 'CRAFTSMAN') {
      const craftsmanProfile = authResult.user.craftsmanProfile
      if (!craftsmanProfile) {
        return NextResponse.json(
          { success: false, error: 'Craftsman profile not found' },
          { status: 404 }
        )
      }
      craftsmanId = craftsmanProfile.id
    }

    const alerts = await inventoryAlertService.checkLowStockAlerts(craftsmanId)

    const response: ApiResponse = {
      success: true,
      data: alerts,
      message: `Created ${alerts.length} new inventory alerts`
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error checking inventory alerts:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check inventory alerts'
    }

    return NextResponse.json(response, { status: 500 })
  }
}