import { NextRequest, NextResponse } from 'next/server'
import { couponService } from '@/lib/services/coupon.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { ApiResponse, CouponData, PaginationParams } from '@/types'

/**
 * GET /api/coupons - Get coupons with pagination and filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const pagination: PaginationParams = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10')
    }

    const filters = {
      isActive: searchParams.get('isActive') === 'true' ? true : 
                searchParams.get('isActive') === 'false' ? false : undefined,
      createdBy: searchParams.get('createdBy') || undefined,
      category: searchParams.get('category') || undefined
    }

    const result = await couponService.getCoupons(pagination, filters)

    const response: ApiResponse = {
      success: true,
      data: result
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching coupons:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch coupons'
    }

    return NextResponse.json(response, { status: 500 })
  }
}

/**
 * POST /api/coupons - Create a new coupon
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

    // Check if user is admin or craftsman
    if (!['ADMIN', 'CRAFTSMAN'].includes(authResult.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Only admins and craftsmen can create coupons' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const couponData: CouponData = body

    const coupon = await couponService.createCoupon(authResult.user.id, couponData)

    const response: ApiResponse = {
      success: true,
      data: coupon,
      message: 'Coupon created successfully'
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Error creating coupon:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create coupon'
    }

    return NextResponse.json(response, { status: 500 })
  }
}