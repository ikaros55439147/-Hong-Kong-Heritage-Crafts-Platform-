import { NextRequest, NextResponse } from 'next/server'
import { paymentService } from '@/lib/services/payment.service'
import { orderService } from '@/lib/services/order.service'
import { emailService } from '@/lib/services/email.service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // PayPal webhook verification would go here
    // For now, we'll process the webhook without verification
    
    const eventType = body.event_type
    
    switch (eventType) {
      case 'PAYMENT.SALE.COMPLETED':
        await handlePaymentCompleted(body)
        break
      
      case 'PAYMENT.SALE.DENIED':
        await handlePaymentDenied(body)
        break
      
      case 'PAYMENT.SALE.REFUNDED':
        await handlePaymentRefunded(body)
        break
      
      case 'BILLING.SUBSCRIPTION.CREATED':
        await handleSubscriptionCreated(body)
        break
      
      default:
        console.log(`Unhandled PayPal event type: ${eventType}`)
    }

    return NextResponse.json({ status: 'success' })
  } catch (error) {
    console.error('PayPal webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handlePaymentCompleted(webhookData: any) {
  try {
    const resource = webhookData.resource
    const paymentId = resource.parent_payment
    
    // Find order by payment ID (this would need to be stored when creating payment)
    // For now, we'll log the event
    console.log('PayPal payment completed:', paymentId)
    
    // Update order status if we can find the order
    // await orderService.updatePaymentStatus(orderId, 'COMPLETED')
  } catch (error) {
    console.error('Error handling PayPal payment completed:', error)
  }
}

async function handlePaymentDenied(webhookData: any) {
  try {
    const resource = webhookData.resource
    const paymentId = resource.parent_payment
    
    console.log('PayPal payment denied:', paymentId)
    
    // Update order status if we can find the order
    // await orderService.updatePaymentStatus(orderId, 'FAILED')
  } catch (error) {
    console.error('Error handling PayPal payment denied:', error)
  }
}

async function handlePaymentRefunded(webhookData: any) {
  try {
    const resource = webhookData.resource
    const saleId = resource.sale_id
    
    console.log('PayPal payment refunded:', saleId)
    
    // Update order status if we can find the order
    // await orderService.updatePaymentStatus(orderId, 'REFUNDED')
  } catch (error) {
    console.error('Error handling PayPal payment refunded:', error)
  }
}

async function handleSubscriptionCreated(webhookData: any) {
  try {
    const resource = webhookData.resource
    const subscriptionId = resource.id
    
    console.log('PayPal subscription created:', subscriptionId)
  } catch (error) {
    console.error('Error handling PayPal subscription created:', error)
  }
}