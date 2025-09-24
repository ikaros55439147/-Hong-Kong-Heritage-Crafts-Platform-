import { NextRequest, NextResponse } from 'next/server'
import { shippingService } from '@/lib/services/shipping.service'
import { ApiResponse } from '@/types'

/**
 * GET /api/shipping/providers - Get available shipping providers
 */
export async function GET(request: NextRequest) {
  try {
    const providers = shippingService.getAvailableProviders()

    const response: ApiResponse = {
      success: true,
      data: providers
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error getting shipping providers:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get shipping providers'
    }

    return NextResponse.json(response, { status: 500 })
  }
}