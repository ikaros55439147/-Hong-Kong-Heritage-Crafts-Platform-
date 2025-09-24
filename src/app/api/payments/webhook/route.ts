import { NextRequest, NextResponse } from 'next/server'
import { paymentService } from '@/lib/services/payment.service'
import { ApiResponse } from '@/types'

/**
 * POST /api/payments/webhook - Handle payment provider webhooks
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider')

    if (!provider) {
      return NextResponse.json(
        { success: false, error: 'Provider parameter is required' },
        { status: 400 }
      )
    }

    // Get webhook payload
    const payload = await request.json()

    // Process webhook
    await paymentService.handlePaymentWebhook(provider, payload)

    const response: ApiResponse = {
      success: true,
      message: 'Webhook processed successfully'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error processing webhook:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Webhook processing failed'
    }

    return NextResponse.json(response, { status: 500 })
  }
}