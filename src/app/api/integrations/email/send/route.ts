import { NextRequest, NextResponse } from 'next/server'
import { emailService } from '@/lib/services/email.service'
import { getServerSession } from 'next-auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { type, to, data } = await request.json()

    let result
    
    switch (type) {
      case 'welcome':
        result = await emailService.sendWelcomeEmail(to, data.userName)
        break
      
      case 'booking_confirmation':
        result = await emailService.sendBookingConfirmationEmail(to, data)
        break
      
      case 'order_confirmation':
        result = await emailService.sendOrderConfirmationEmail(to, data)
        break
      
      case 'password_reset':
        result = await emailService.sendPasswordResetEmail(to, data.resetToken)
        break
      
      case 'craftsman_status':
        result = await emailService.sendCraftsmanStatusNotification(to, data.craftsmanName, data.status)
        break
      
      case 'custom':
        result = await emailService.sendEmail({
          to,
          subject: data.subject,
          html: data.html,
          text: data.text
        })
        break
      
      default:
        return NextResponse.json(
          { error: 'Invalid email type' },
          { status: 400 }
        )
    }

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        messageId: result.messageId 
      })
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Email sending error:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}

// Test email endpoint (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const testType = searchParams.get('test')
    const email = searchParams.get('email') || session.user.email

    if (!email) {
      return NextResponse.json(
        { error: 'Email address required' },
        { status: 400 }
      )
    }

    let result
    
    switch (testType) {
      case 'welcome':
        result = await emailService.sendWelcomeEmail(email, 'Test User')
        break
      
      case 'booking':
        result = await emailService.sendBookingConfirmationEmail(email, {
          userName: 'Test User',
          courseName: '手雕麻將入門課程',
          craftsmanName: '李師傅',
          bookingDate: '2024-01-15',
          bookingTime: '14:00-16:00',
          location: '香港島工作室'
        })
        break
      
      case 'order':
        result = await emailService.sendOrderConfirmationEmail(email, {
          userName: 'Test User',
          orderId: 'TEST-ORDER-123',
          items: [
            { name: '手雕麻將套裝', quantity: 1, price: 1200 },
            { name: '竹編籃子', quantity: 2, price: 300 }
          ],
          totalAmount: 1800,
          shippingAddress: '香港島中環德輔道中123號'
        })
        break
      
      default:
        result = await emailService.sendEmail({
          to: email,
          subject: 'Email Service Test',
          html: '<h1>Email Service Test</h1><p>This is a test email from the Heritage Crafts Platform.</p>'
        })
        break
    }

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      error: result.error
    })
  } catch (error) {
    console.error('Test email error:', error)
    return NextResponse.json(
      { error: 'Failed to send test email' },
      { status: 500 }
    )
  }
}