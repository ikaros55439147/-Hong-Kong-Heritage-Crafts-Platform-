import { PrismaClient } from '@prisma/client'
import { productService } from './product.service'

const prisma = new PrismaClient()

export interface CartItem {
  productId: string
  quantity: number
  customizationNotes?: string
  addedAt: Date
}

export interface Cart {
  userId: string
  items: CartItem[]
  updatedAt: Date
}

export interface CartItemWithProduct extends CartItem {
  product: {
    id: string
    name: any
    price: number
    inventoryQuantity: number
    status: string
    craftsman: {
      id: string
      user: {
        id: string
        email: string
      }
    }
  }
}

export interface CartSummary {
  items: CartItemWithProduct[]
  totalItems: number
  totalAmount: number
  updatedAt: Date
}

export class CartService {
  private carts = new Map<string, Cart>() // In-memory storage for demo

  /**
   * Get cart for user
   */
  async getCart(userId: string): Promise<CartSummary> {
    const cart = this.carts.get(userId) || {
      userId,
      items: [],
      updatedAt: new Date()
    }

    // Get product details for each cart item
    const itemsWithProducts: CartItemWithProduct[] = []
    let totalAmount = 0

    for (const item of cart.items) {
      const product = await productService.getProductById(item.productId)
      if (product && product.status === 'ACTIVE') {
        const itemWithProduct: CartItemWithProduct = {
          ...item,
          product: {
            id: product.id,
            name: product.name,
            price: Number(product.price),
            inventoryQuantity: product.inventoryQuantity,
            status: product.status,
            craftsman: {
              id: product.craftsman.id,
              user: {
                id: product.craftsman.user.id,
                email: product.craftsman.user.email
              }
            }
          }
        }
        itemsWithProducts.push(itemWithProduct)
        totalAmount += Number(product.price) * item.quantity
      }
    }

    return {
      items: itemsWithProducts,
      totalItems: itemsWithProducts.reduce((sum, item) => sum + item.quantity, 0),
      totalAmount,
      updatedAt: cart.updatedAt
    }
  }

  /**
   * Add item to cart
   */
  async addToCart(
    userId: string, 
    productId: string, 
    quantity: number, 
    customizationNotes?: string
  ): Promise<CartSummary> {
    // Validate product exists and is available
    const product = await productService.getProductById(productId)
    if (!product) {
      throw new Error('Product not found')
    }

    if (product.status !== 'ACTIVE') {
      throw new Error('Product is not available')
    }

    if (quantity <= 0) {
      throw new Error('Quantity must be positive')
    }

    // Get or create cart
    let cart = this.carts.get(userId) || {
      userId,
      items: [],
      updatedAt: new Date()
    }

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(item => item.productId === productId)
    
    if (existingItemIndex >= 0) {
      // Update existing item
      const newQuantity = cart.items[existingItemIndex].quantity + quantity
      
      // Check inventory availability
      if (newQuantity > product.inventoryQuantity) {
        throw new Error(`Only ${product.inventoryQuantity} items available in stock`)
      }
      
      cart.items[existingItemIndex].quantity = newQuantity
      cart.items[existingItemIndex].customizationNotes = customizationNotes || cart.items[existingItemIndex].customizationNotes
    } else {
      // Check inventory availability
      if (quantity > product.inventoryQuantity) {
        throw new Error(`Only ${product.inventoryQuantity} items available in stock`)
      }
      
      // Add new item
      cart.items.push({
        productId,
        quantity,
        customizationNotes,
        addedAt: new Date()
      })
    }

    cart.updatedAt = new Date()
    this.carts.set(userId, cart)

    return this.getCart(userId)
  }

  /**
   * Update cart item quantity
   */
  async updateCartItem(
    userId: string, 
    productId: string, 
    quantity: number, 
    customizationNotes?: string
  ): Promise<CartSummary> {
    const cart = this.carts.get(userId)
    if (!cart) {
      throw new Error('Cart not found')
    }

    const itemIndex = cart.items.findIndex(item => item.productId === productId)
    if (itemIndex === -1) {
      throw new Error('Item not found in cart')
    }

    if (quantity <= 0) {
      // Remove item if quantity is 0 or negative
      cart.items.splice(itemIndex, 1)
    } else {
      // Validate product availability
      const product = await productService.getProductById(productId)
      if (!product) {
        throw new Error('Product not found')
      }

      if (quantity > product.inventoryQuantity) {
        throw new Error(`Only ${product.inventoryQuantity} items available in stock`)
      }

      // Update item
      cart.items[itemIndex].quantity = quantity
      if (customizationNotes !== undefined) {
        cart.items[itemIndex].customizationNotes = customizationNotes
      }
    }

    cart.updatedAt = new Date()
    this.carts.set(userId, cart)

    return this.getCart(userId)
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(userId: string, productId: string): Promise<CartSummary> {
    const cart = this.carts.get(userId)
    if (!cart) {
      throw new Error('Cart not found')
    }

    const itemIndex = cart.items.findIndex(item => item.productId === productId)
    if (itemIndex === -1) {
      throw new Error('Item not found in cart')
    }

    cart.items.splice(itemIndex, 1)
    cart.updatedAt = new Date()
    this.carts.set(userId, cart)

    return this.getCart(userId)
  }

  /**
   * Clear cart
   */
  async clearCart(userId: string): Promise<void> {
    this.carts.delete(userId)
  }

  /**
   * Validate cart before checkout
   */
  async validateCart(userId: string): Promise<{ isValid: boolean; errors: string[] }> {
    const cart = this.carts.get(userId)
    if (!cart || cart.items.length === 0) {
      return { isValid: false, errors: ['Cart is empty'] }
    }

    const errors: string[] = []

    for (const item of cart.items) {
      const product = await productService.getProductById(item.productId)
      
      if (!product) {
        errors.push(`Product ${item.productId} not found`)
        continue
      }

      if (product.status !== 'ACTIVE') {
        errors.push(`Product "${product.name['zh-HK'] || product.name['en']}" is no longer available`)
        continue
      }

      if (item.quantity > product.inventoryQuantity) {
        errors.push(`Only ${product.inventoryQuantity} items available for "${product.name['zh-HK'] || product.name['en']}"`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Get cart items count for user
   */
  async getCartItemsCount(userId: string): Promise<number> {
    const cart = this.carts.get(userId)
    if (!cart) {
      return 0
    }

    return cart.items.reduce((sum, item) => sum + item.quantity, 0)
  }

  /**
   * Merge guest cart with user cart (for login scenarios)
   */
  async mergeCart(userId: string, guestCartItems: CartItem[]): Promise<CartSummary> {
    for (const guestItem of guestCartItems) {
      try {
        await this.addToCart(
          userId, 
          guestItem.productId, 
          guestItem.quantity, 
          guestItem.customizationNotes
        )
      } catch (error) {
        // Skip items that can't be added (out of stock, etc.)
        console.warn(`Failed to merge cart item ${guestItem.productId}:`, error)
      }
    }

    return this.getCart(userId)
  }
}

export const cartService = new CartService()