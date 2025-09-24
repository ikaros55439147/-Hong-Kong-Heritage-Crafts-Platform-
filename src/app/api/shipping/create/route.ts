import { NextRequest, NextResponse } from 'next/server'
import { shippingService } from '@/lib/services/shipping.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { orderService } from '@/lib/services/order.service'
import { validateUUID } from '@/lib/validations'
import { ApiResponse } from '@/types'

/**
 * POST /api/shipping/create - Create shipment for order
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

    const body = await request.json()
    const { 
      orderId, 
      providerId, 
      sender, 
      recipient, 
      weight, 
      dimensions, 
      serviceType, 
      insuranceValue, 
      specialInstructions 
    } = body

    // Validate input
    if (!orderId || !validateUUID(orderId)) {
      return NextResponse.json(
        { success: false, error: 'Valid order ID is required' },
        { status: 400 }
      )
    }

    if (!providerId || typeof providerId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Provider ID is required' },
        { status: 400 }
      )
    }

    // Verify order access
    const order = await orderService.getOrderById(orderId)
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    // Only craftsman with products in order or admin can create shipments
    let hasAccess = false
    if (authResult.user.role === 'ADMIN') {
      hasAccess = true
    } else if (authResult.user.role === 'CRAFTSMAN' && authResult.user.craftsmanProfile) {
      const hasProducts = order.orderItems.some(item => 
        item.product.craftsmanId === authResult.user.craftsmanProfile?.id
      )
      hasAccess = hasProducts
    }

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Only craftsmen with products in the order can create shipments' },
        { status: 403 }
      )
    }

    // Validate sender address
    if (!sender) {
      return NextResponse.json(
        { success: false, error: 'Sender address is required' },
        { status: 400 }
      )
    }

    const senderValidation = shippingService.validateShippingAddress(sender)
    if (!senderValidation.isValid) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid sender address',
          details: senderValidation.errors
        },
        { status: 400 }
      )
    }

    // Use provided recipient or order shipping address
    let recipientAddress = recipient
    if (!recipientAddress) {
      const orderShippingAddress = order.shippingAddress as any
      if (!orderShippingAddress) {
        return NextResponse.json(
          { success: false, error: 'Recipient address is required' },
          { status: 400 }
        )
      }

      recipientAddress = {
        name: orderShippingAddress.recipientName,
        phone: orderShippingAddress.phone,
        addressLine1: orderShippingAddress.addressLine1,
        addressLine2: orderShippingAddress.addressLine2,
        city: orderShippingAddress.city,
        district: orderShippingAddress.district,
        postalCode: orderShippingAddress.postalCode,
        country: orderShippingAddress.country
      }
    }

    const recipientValidation = shippingService.validateShippingAddress(recipientAddress)
    if (!recipientValidation.isValid) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid recipient address',
          details: recipientValidation.errors
        },
        { status: 400 }
      )
    }

    // Use provided package details or calculate from order
    let packageDetails
    if (weight && dimensions) {
      packageDetails = { weight, dimensions }
    } else {
      packageDetails = await shippingService.calculatePackageDetails(orderId)
    }

    // Create shipment
    const shipmentData = {
      sender,
      recipient: recipientAddress,
      weight: packageDetails.weight,
      dimensions: packageDetails.dimensions,
      serviceType: serviceType || 'standard',
      insuranceValue,
      specialInstructions
    }

    const shippingRecord = await shippingService.createShipment(orderId, providerId, shipmentData)

    const response: ApiResponse = {
      success: true,
      data: shippingRecord,
      message: 'Shipment created successfully'
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Error creating shipment:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create shipment'
    }

    return NextResponse.json(response, { status: 500 })
  }
}