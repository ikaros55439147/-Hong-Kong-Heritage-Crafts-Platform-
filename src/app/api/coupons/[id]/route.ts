import { NextRequest, NextResponse } from 'next/server'
import { couponService } from '@/lib/services/coupon.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { ApiResponse, CouponData } from '@/types'

/**
 * GET /api/coupons/[id] - Get coupon by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const coupon = await couponService.getCouponById(params.id)

    if (!coupon) {
      return NextResponse.json(
        { success: false, error: 'Coupon not found' },
        { status: 404 }
      )
    }

    const response: ApiResponse = {
      success: true,
      data: coupon
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching coupon:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch coupon'
    }

    return NextResponse.json(response, { status: 500 })
  }
}

/**
 * PUT /api/coupons/[id] - Update coupon
 */
export async function PUT(
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

    // Get existing coupon to check ownership
    const existingCoupon = await couponService.getCouponById(params.id)
    if (!existingCoupon) {
      return NextResponse.json(
        { success: false, error: 'Coupon not found' },
        { status: 404 }
      )
    }

    // Check if user can update this coupon
    if (authResult.user.role !== 'ADMIN' && existingCoupon.createdBy !== authResult.user.id) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const updates: Partial<CouponData> = body

    const coupon = await couponService.updateCoupon(params.id, updates)

    const response: ApiResponse = {
      success: true,
      data: coupon,
      message: 'Coupon updated successfully'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error updating coupon:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update coupon'
    }

    return NextResponse.json(response, { status: 500 })
  }
}

/**
 * DELETE /api/coupons/[id] - Delete coupon
 */
export async function DELETE(
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

    // Get existing coupon to check ownership
    const existingCoupon = await couponService.getCouponById(params.id)
    if (!existingCoupon) {
      return NextResponse.json(
        { success: false, error: 'Coupon not found' },
        { status: 404 }
      )
    }

    // Check if user can delete this coupon
    if (authResult.user.role !== 'ADMIN' && existingCoupon.createdBy !== authResult.user.id) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    await couponService.deleteCoupon(params.id)

    const response: ApiResponse = {
      success: true,
      message: 'Coupon deleted successfully'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error deleting coupon:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete coupon'
    }

    return NextResponse.json(response, { status: 500 })
  }
}