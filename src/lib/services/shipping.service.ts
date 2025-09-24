import { PrismaClient, OrderStatus } from '@prisma/client'
import { orderService } from './order.service'

const prisma = new PrismaClient()

export interface ShippingProvider {
  name: string
  calculateShippingCost(weight: number, dimensions: Dimensions, destination: string): Promise<number>
  createShipment(shipmentData: ShipmentData): Promise<ShipmentResult>
  trackShipment(trackingNumber: string): Promise<TrackingInfo>
  cancelShipment(trackingNumber: string): Promise<boolean>
}

export interface Dimensions {
  length: number // cm
  width: number  // cm
  height: number // cm
}

export interface ShipmentData {
  orderId: string
  sender: Address
  recipient: Address
  weight: number // kg
  dimensions: Dimensions
  serviceType: 'standard' | 'express' | 'overnight'
  insuranceValue?: number
  specialInstructions?: string
}

export interface Address {
  name: string
  phone: string
  addressLine1: string
  addressLine2?: string
  city: string
  district: string
  postalCode?: string
  country: string
}

export interface ShipmentResult {
  success: boolean
  trackingNumber?: string
  estimatedDelivery?: Date
  shippingCost?: number
  error?: string
}

export interface TrackingInfo {
  trackingNumber: string
  status: ShippingStatus
  estimatedDelivery?: Date
  actualDelivery?: Date
  events: TrackingEvent[]
}

export interface TrackingEvent {
  timestamp: Date
  status: string
  location: string
  description: string
}

export enum ShippingStatus {
  PENDING = 'PENDING',
  PICKED_UP = 'PICKED_UP',
  IN_TRANSIT = 'IN_TRANSIT',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  FAILED_DELIVERY = 'FAILED_DELIVERY',
  RETURNED = 'RETURNED',
  CANCELLED = 'CANCELLED'
}

export interface ShippingRecord {
  id: string
  orderId: string
  provider: string
  trackingNumber: string
  status: ShippingStatus
  shippingCost: number
  estimatedDelivery?: Date
  actualDelivery?: Date
  specialInstructions?: string
  createdAt: Date
  updatedAt: Date
}

// Mock Hong Kong Post provider
class HongKongPostProvider implements ShippingProvider {
  name = 'Hong Kong Post'

  async calculateShippingCost(weight: number, dimensions: Dimensions, destination: string): Promise<number> {
    // Mock shipping cost calculation
    let baseCost = 30 // HKD base cost
    
    // Weight-based pricing
    if (weight > 1) {
      baseCost += (weight - 1) * 15
    }
    
    // Size-based pricing
    const volume = dimensions.length * dimensions.width * dimensions.height / 1000 // cubic cm to liters
    if (volume > 5) {
      baseCost += (volume - 5) * 5
    }
    
    // Destination-based pricing
    if (destination !== 'Hong Kong') {
      baseCost *= 2.5 // International shipping
    }
    
    return Math.round(baseCost)
  }

  async createShipment(shipmentData: ShipmentData): Promise<ShipmentResult> {
    try {
      // Mock shipment creation
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const trackingNumber = `HKP${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`
      const estimatedDelivery = new Date()
      
      // Add delivery time based on service type
      switch (shipmentData.serviceType) {
        case 'overnight':
          estimatedDelivery.setDate(estimatedDelivery.getDate() + 1)
          break
        case 'express':
          estimatedDelivery.setDate(estimatedDelivery.getDate() + 2)
          break
        default:
          estimatedDelivery.setDate(estimatedDelivery.getDate() + 5)
      }
      
      const shippingCost = await this.calculateShippingCost(
        shipmentData.weight,
        shipmentData.dimensions,
        shipmentData.recipient.country
      )
      
      return {
        success: true,
        trackingNumber,
        estimatedDelivery,
        shippingCost
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Shipment creation failed'
      }
    }
  }

  async trackShipment(trackingNumber: string): Promise<TrackingInfo> {
    // Mock tracking info
    const events: TrackingEvent[] = [
      {
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        status: 'PICKED_UP',
        location: 'Hong Kong Central Post Office',
        description: 'Package picked up from sender'
      },
      {
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        status: 'IN_TRANSIT',
        location: 'Hong Kong Sorting Facility',
        description: 'Package sorted and in transit'
      },
      {
        timestamp: new Date(),
        status: 'OUT_FOR_DELIVERY',
        location: 'Local Delivery Office',
        description: 'Package out for delivery'
      }
    ]
    
    return {
      trackingNumber,
      status: ShippingStatus.OUT_FOR_DELIVERY,
      estimatedDelivery: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
      events
    }
  }

  async cancelShipment(trackingNumber: string): Promise<boolean> {
    // Mock cancellation
    await new Promise(resolve => setTimeout(resolve, 50))
    return true
  }
}

// Mock SF Express provider
class SFExpressProvider implements ShippingProvider {
  name = 'SF Express'

  async calculateShippingCost(weight: number, dimensions: Dimensions, destination: string): Promise<number> {
    let baseCost = 45 // HKD base cost (premium service)
    
    if (weight > 1) {
      baseCost += (weight - 1) * 20
    }
    
    const volume = dimensions.length * dimensions.width * dimensions.height / 1000
    if (volume > 5) {
      baseCost += (volume - 5) * 8
    }
    
    if (destination !== 'Hong Kong') {
      baseCost *= 3 // International express
    }
    
    return Math.round(baseCost)
  }

  async createShipment(shipmentData: ShipmentData): Promise<ShipmentResult> {
    try {
      await new Promise(resolve => setTimeout(resolve, 80))
      
      const trackingNumber = `SF${Date.now()}${Math.random().toString(36).substr(2, 8).toUpperCase()}`
      const estimatedDelivery = new Date()
      
      // SF Express is faster
      switch (shipmentData.serviceType) {
        case 'overnight':
          estimatedDelivery.setHours(estimatedDelivery.getHours() + 12)
          break
        case 'express':
          estimatedDelivery.setDate(estimatedDelivery.getDate() + 1)
          break
        default:
          estimatedDelivery.setDate(estimatedDelivery.getDate() + 3)
      }
      
      const shippingCost = await this.calculateShippingCost(
        shipmentData.weight,
        shipmentData.dimensions,
        shipmentData.recipient.country
      )
      
      return {
        success: true,
        trackingNumber,
        estimatedDelivery,
        shippingCost
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Shipment creation failed'
      }
    }
  }

  async trackShipment(trackingNumber: string): Promise<TrackingInfo> {
    const events: TrackingEvent[] = [
      {
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        status: 'PICKED_UP',
        location: 'SF Express Hub - Central',
        description: 'Package collected from sender'
      },
      {
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
        status: 'IN_TRANSIT',
        location: 'SF Express Sorting Center',
        description: 'Package processed and dispatched'
      },
      {
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        status: 'OUT_FOR_DELIVERY',
        location: 'Local SF Station',
        description: 'Package out for delivery'
      }
    ]
    
    return {
      trackingNumber,
      status: ShippingStatus.OUT_FOR_DELIVERY,
      estimatedDelivery: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      events
    }
  }

  async cancelShipment(trackingNumber: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 60))
    return true
  }
}

export class ShippingService {
  private providers: Map<string, ShippingProvider> = new Map()
  private shippingRecords: Map<string, ShippingRecord> = new Map() // In-memory storage for demo

  constructor() {
    // Initialize shipping providers
    this.providers.set('hongkong_post', new HongKongPostProvider())
    this.providers.set('sf_express', new SFExpressProvider())
  }

  /**
   * Get shipping quote for order
   */
  async getShippingQuote(
    orderId: string,
    weight: number,
    dimensions: Dimensions,
    serviceType: 'standard' | 'express' | 'overnight' = 'standard'
  ): Promise<{ provider: string; cost: number; estimatedDays: number }[]> {
    const order = await orderService.getOrderById(orderId)
    if (!order) {
      throw new Error('Order not found')
    }

    const destination = (order.shippingAddress as any)?.country || 'Hong Kong'
    const quotes = []

    for (const [providerId, provider] of this.providers) {
      try {
        const cost = await provider.calculateShippingCost(weight, dimensions, destination)
        
        // Estimate delivery days based on provider and service type
        let estimatedDays = 5
        if (providerId === 'sf_express') {
          estimatedDays = serviceType === 'overnight' ? 1 : serviceType === 'express' ? 2 : 3
        } else {
          estimatedDays = serviceType === 'overnight' ? 1 : serviceType === 'express' ? 2 : 5
        }
        
        quotes.push({
          provider: providerId,
          cost,
          estimatedDays
        })
      } catch (error) {
        console.error(`Failed to get quote from ${providerId}:`, error)
      }
    }

    return quotes.sort((a, b) => a.cost - b.cost) // Sort by cost
  }

  /**
   * Create shipment for order
   */
  async createShipment(
    orderId: string,
    providerId: string,
    shipmentData: Omit<ShipmentData, 'orderId'>
  ): Promise<ShippingRecord> {
    const order = await orderService.getOrderById(orderId)
    if (!order) {
      throw new Error('Order not found')
    }

    if (order.status !== OrderStatus.CONFIRMED && order.status !== OrderStatus.PROCESSING) {
      throw new Error('Order must be confirmed before shipping')
    }

    const provider = this.providers.get(providerId)
    if (!provider) {
      throw new Error(`Shipping provider ${providerId} not found`)
    }

    const fullShipmentData: ShipmentData = {
      ...shipmentData,
      orderId
    }

    const result = await provider.createShipment(fullShipmentData)

    if (!result.success) {
      throw new Error(result.error || 'Failed to create shipment')
    }

    // Create shipping record
    const shippingRecord: ShippingRecord = {
      id: `ship_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      orderId,
      provider: providerId,
      trackingNumber: result.trackingNumber!,
      status: ShippingStatus.PENDING,
      shippingCost: result.shippingCost || 0,
      estimatedDelivery: result.estimatedDelivery,
      specialInstructions: shipmentData.specialInstructions,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.shippingRecords.set(shippingRecord.id, shippingRecord)

    // Update order status to shipped
    await orderService.updateOrderStatus(orderId, OrderStatus.SHIPPED)

    return shippingRecord
  }

  /**
   * Track shipment
   */
  async trackShipment(trackingNumber: string): Promise<TrackingInfo> {
    // Find shipping record
    const shippingRecord = Array.from(this.shippingRecords.values())
      .find(record => record.trackingNumber === trackingNumber)

    if (!shippingRecord) {
      throw new Error('Shipping record not found')
    }

    const provider = this.providers.get(shippingRecord.provider)
    if (!provider) {
      throw new Error(`Shipping provider ${shippingRecord.provider} not found`)
    }

    const trackingInfo = await provider.trackShipment(trackingNumber)

    // Update local record if status changed
    if (trackingInfo.status !== shippingRecord.status) {
      shippingRecord.status = trackingInfo.status
      shippingRecord.updatedAt = new Date()
      
      if (trackingInfo.actualDelivery) {
        shippingRecord.actualDelivery = trackingInfo.actualDelivery
      }
      
      this.shippingRecords.set(shippingRecord.id, shippingRecord)

      // Update order status if delivered
      if (trackingInfo.status === ShippingStatus.DELIVERED) {
        await orderService.updateOrderStatus(shippingRecord.orderId, OrderStatus.DELIVERED)
      }
    }

    return trackingInfo
  }

  /**
   * Get shipping record by order ID
   */
  async getShippingByOrderId(orderId: string): Promise<ShippingRecord | null> {
    return Array.from(this.shippingRecords.values())
      .find(record => record.orderId === orderId) || null
  }

  /**
   * Get shipping record by tracking number
   */
  async getShippingByTrackingNumber(trackingNumber: string): Promise<ShippingRecord | null> {
    return Array.from(this.shippingRecords.values())
      .find(record => record.trackingNumber === trackingNumber) || null
  }

  /**
   * Cancel shipment
   */
  async cancelShipment(trackingNumber: string): Promise<boolean> {
    const shippingRecord = Array.from(this.shippingRecords.values())
      .find(record => record.trackingNumber === trackingNumber)

    if (!shippingRecord) {
      throw new Error('Shipping record not found')
    }

    if (shippingRecord.status === ShippingStatus.DELIVERED) {
      throw new Error('Cannot cancel delivered shipment')
    }

    const provider = this.providers.get(shippingRecord.provider)
    if (!provider) {
      throw new Error(`Shipping provider ${shippingRecord.provider} not found`)
    }

    const success = await provider.cancelShipment(trackingNumber)

    if (success) {
      shippingRecord.status = ShippingStatus.CANCELLED
      shippingRecord.updatedAt = new Date()
      this.shippingRecords.set(shippingRecord.id, shippingRecord)
    }

    return success
  }

  /**
   * Get available shipping providers
   */
  getAvailableProviders(): { id: string; name: string }[] {
    return Array.from(this.providers.entries()).map(([id, provider]) => ({
      id,
      name: provider.name
    }))
  }

  /**
   * Validate shipping address
   */
  validateShippingAddress(address: Address): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!address.name || address.name.trim().length === 0) {
      errors.push('Recipient name is required')
    }

    if (!address.phone || !/^\+?[1-9]\d{1,14}$/.test(address.phone)) {
      errors.push('Valid phone number is required')
    }

    if (!address.addressLine1 || address.addressLine1.trim().length === 0) {
      errors.push('Address line 1 is required')
    }

    if (!address.city || address.city.trim().length === 0) {
      errors.push('City is required')
    }

    if (!address.district || address.district.trim().length === 0) {
      errors.push('District is required')
    }

    if (!address.country || address.country.trim().length === 0) {
      errors.push('Country is required')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Calculate package dimensions and weight from order items
   */
  async calculatePackageDetails(orderId: string): Promise<{ weight: number; dimensions: Dimensions }> {
    const order = await orderService.getOrderById(orderId)
    if (!order) {
      throw new Error('Order not found')
    }

    // Mock calculation based on order items
    let totalWeight = 0
    let totalVolume = 0

    for (const item of order.orderItems) {
      // Estimate weight and volume based on product category and quantity
      const itemWeight = this.estimateProductWeight(item.product.craftCategory) * item.quantity
      const itemVolume = this.estimateProductVolume(item.product.craftCategory) * item.quantity
      
      totalWeight += itemWeight
      totalVolume += itemVolume
    }

    // Calculate dimensions assuming a roughly cubic package
    const sideLength = Math.cbrt(totalVolume)
    
    return {
      weight: Math.max(0.1, totalWeight), // Minimum 0.1kg
      dimensions: {
        length: Math.max(10, Math.round(sideLength * 1.2)), // Minimum 10cm
        width: Math.max(10, Math.round(sideLength)),
        height: Math.max(5, Math.round(sideLength * 0.8))
      }
    }
  }

  /**
   * Estimate product weight based on category
   */
  private estimateProductWeight(category: string): number {
    const weightMap: { [key: string]: number } = {
      '手工藝品': 0.5, // 0.5kg
      '傳統工具': 1.2, // 1.2kg
      '食品': 0.3,     // 0.3kg
      '服飾': 0.2,     // 0.2kg
      '書籍': 0.4,     // 0.4kg
      '陶瓷': 0.8,     // 0.8kg
      '木製品': 0.6,   // 0.6kg
      '金屬製品': 1.5, // 1.5kg
    }

    return weightMap[category] || 0.5 // Default 0.5kg
  }

  /**
   * Estimate product volume based on category (cubic cm)
   */
  private estimateProductVolume(category: string): number {
    const volumeMap: { [key: string]: number } = {
      '手工藝品': 1000,  // 1000 cubic cm
      '傳統工具': 2000,  // 2000 cubic cm
      '食品': 500,       // 500 cubic cm
      '服飾': 800,       // 800 cubic cm
      '書籍': 600,       // 600 cubic cm
      '陶瓷': 1200,      // 1200 cubic cm
      '木製品': 1500,    // 1500 cubic cm
      '金屬製品': 1800,  // 1800 cubic cm
    }

    return volumeMap[category] || 1000 // Default 1000 cubic cm
  }
}

export const shippingService = new ShippingService()