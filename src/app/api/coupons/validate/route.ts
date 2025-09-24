import { NextRequest, NextResponse } from 'next/server'
import { couponService } from '@/lib/services/coupon.service'
import { ApiResponse } from '@/types'

/**
 * POST /api/coupons/validate - Validate a coupon for an order
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, orderAmount, categories = [], craftsmanIds = [] } = body

    if (!code || !orderAmount) {
      return NextResponse.json(
        { success: false, error: 'Coupon code and order amount are required' },
        { status: 400 }
      )
    }

    const validation = await couponService.validateCoupon(
      code,
      orderAmount,
      categories,
      craftsmanIds
    )

    const response: ApiResponse = {
      success: validation.isValid,
      data: validation.isValid ? {
        coupon: validation.coupon,
        discount: validation.discount
      } : null,
      error: validation.error
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error validating coupon:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to validate coupon'
    }

    return NextResponse.json(response, { status: 500 })
  }
}