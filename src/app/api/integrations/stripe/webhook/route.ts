import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { paymentService } from '@/lib/services/payment.service'
import { orderService } from '@/lib/services/order.service'
import { emailService } from '@/lib/services/email.service'
import { pushNotificationService } from '@/lib/services/push-notification.service'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia'
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      )
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent)
        break
      
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent)
        break
      
      case 'payment_intent.requires_action':
        await handlePaymentRequiresAction(event.data.object as Stripe.PaymentIntent)
        break
      
      case 'charge.dispute.created':
        await handleChargeDispute(event.data.object as Stripe.Dispute)
        break
      
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
        break
      
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Stripe webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    const orderId = paymentIntent.metadata?.orderId
    if (!orderId) {
      console.error('No orderId in payment intent metadata')
      return
    }

    // Update order status
    await orderService.updatePaymentStatus(orderId, 'COMPLETED')
    
    // Get order details for notifications
    const order = await orderService.getOrderById(orderId)
    if (!order) {
      console.error('Order not found:', orderId)
      return
    }

    // Send confirmation email
    await emailService.sendOrderConfirmationEmail(order.user.email, {
      userName: order.user.name || order.user.email,
      orderId: order.id,
      items: order.items.map(item => ({
        name: item.product.name.zh || item.product.name.en || 'Product',
        quantity: item.quantity,
        price: Number(item.price)
      })),
      totalAmount: Number(order.totalAmount),
      shippingAddress: order.shippingAddress ? JSON.stringify(order.shippingAddress) : undefined
    })

    // Send push notification if user has push tokens
    // This would require storing push tokens in user profile
    console.log('Payment succeeded for order:', orderId)
  } catch (error) {
    console.error('Error handling payment succeeded:', error)
  }
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  try {
    const orderId = paymentIntent.metadata?.orderId
    if (!orderId) {
      console.error('No orderId in payment intent metadata')
      return
    }

    // Update order status
    await orderService.updatePaymentStatus(orderId, 'FAILED')
    
    // Get order details
    const order = await orderService.getOrderById(orderId)
    if (!order) {
      console.error('Order not found:', orderId)
      return
    }

    // Send failure notification email
    await emailService.sendEmail({
      to: order.user.email,
      subject: '付款失敗通知 - Payment Failed',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #dc2626;">付款失敗</h1>
          <p>親愛的 ${order.user.name || order.user.email}，</p>
          <p>很抱歉，您的訂單 ${order.id} 付款失敗。</p>
          <p>失敗原因：${paymentIntent.last_payment_error?.message || '未知錯誤'}</p>
          <p>請重新嘗試付款或聯繫客服。</p>
          <p><a href="${process.env.NEXTAUTH_URL}/orders/${order.id}" style="color: #2563eb;">查看訂單詳情</a></p>
        </div>
      `
    })

    console.log('Payment failed for order:', orderId)
  } catch (error) {
    console.error('Error handling payment failed:', error)
  }
}

async function handlePaymentRequiresAction(paymentIntent: Stripe.PaymentIntent) {
  try {
    const orderId = paymentIntent.metadata?.orderId
    if (!orderId) {
      console.error('No orderId in payment intent metadata')
      return
    }

    // Update order status to pending action
    await orderService.updatePaymentStatus(orderId, 'PENDING')
    
    console.log('Payment requires action for order:', orderId)
  } catch (error) {
    console.error('Error handling payment requires action:', error)
  }
}

async function handleChargeDispute(dispute: Stripe.Dispute) {
  try {
    // Handle charge dispute - notify admin
    console.log('Charge dispute created:', dispute.id)
    
    // Send admin notification
    await emailService.sendEmail({
      to: process.env.ADMIN_EMAIL || 'admin@example.com',
      subject: 'Charge Dispute Created',
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h1>Charge Dispute Created</h1>
          <p><strong>Dispute ID:</strong> ${dispute.id}</p>
          <p><strong>Amount:</strong> $${(dispute.amount / 100).toFixed(2)} ${dispute.currency.toUpperCase()}</p>
          <p><strong>Reason:</strong> ${dispute.reason}</p>
          <p><strong>Status:</strong> ${dispute.status}</p>
          <p>Please review this dispute in the Stripe dashboard.</p>
        </div>
      `
    })
  } catch (error) {
    console.error('Error handling charge dispute:', error)
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    // Handle subscription invoice payment
    console.log('Invoice payment succeeded:', invoice.id)
  } catch (error) {
    console.error('Error handling invoice payment succeeded:', error)
  }
}