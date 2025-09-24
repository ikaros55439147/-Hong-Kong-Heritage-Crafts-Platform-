import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CartService } from '../cart.service'

// Mock the product service
vi.mock('../product.service', () => ({
  productService: {
    getProductById: vi.fn()
  }
}))

describe('CartService', () => {
  let cartService: CartService
  
  const mockProduct = {
    id: 'product-1',
    name: { 'zh-HK': '手雕麻將', 'en': 'Hand-carved Mahjong' },
    price: 1500,
    inventoryQuantity: 10,
    status: 'ACTIVE',
    craftsman: {
      id: 'craftsman-1',
      user: {
        id: 'user-1',
        email: 'craftsman@example.com'
      }
    }
  }

  beforeEach(() => {
    cartService = new CartService()
    vi.clearAllMocks()
  })

  describe('getCart', () => {
    it('should return empty cart for new user', async () => {
      const { productService } = await import('../product.service')
      
      const result = await cartService.getCart('user-1')

      expect(result).toEqual({
        items: [],
        totalItems: 0,
        totalAmount: 0,
        updatedAt: expect.any(Date)
      })
    })
  })

  describe('addToCart', () => {
    it('should add item to cart successfully', async () => {
      const { productService } = await import('../product.service')
      productService.getProductById = vi.fn().mockResolvedValue(mockProduct)

      const result = await cartService.addToCart('user-1', 'product-1', 2, 'Custom notes')

      expect(productService.getProductById).toHaveBeenCalledWith('product-1')
      expect(result.items).toHaveLength(1)
      expect(result.items[0].quantity).toBe(2)
      expect(result.items[0].customizationNotes).toBe('Custom notes')
      expect(result.totalItems).toBe(2)
      expect(result.totalAmount).toBe(3000) // 1500 * 2
    })

    it('should throw error if product not found', async () => {
      const { productService } = await import('../product.service')
      productService.getProductById = vi.fn().mockResolvedValue(null)

      await expect(
        cartService.addToCart('user-1', 'invalid-product', 1)
      ).rejects.toThrow('Product not found')
    })

    it('should throw error if product not active', async () => {
      const { productService } = await import('../product.service')
      const inactiveProduct = { ...mockProduct, status: 'INACTIVE' }
      productService.getProductById = vi.fn().mockResolvedValue(inactiveProduct)

      await expect(
        cartService.addToCart('user-1', 'product-1', 1)
      ).rejects.toThrow('Product is not available')
    })

    it('should throw error if insufficient inventory', async () => {
      const { productService } = await import('../product.service')
      productService.getProductById = vi.fn().mockResolvedValue(mockProduct)

      await expect(
        cartService.addToCart('user-1', 'product-1', 15)
      ).rejects.toThrow('Only 10 items available in stock')
    })

    it('should update existing item quantity', async () => {
      const { productService } = await import('../product.service')
      productService.getProductById = vi.fn().mockResolvedValue(mockProduct)

      // Add item first time
      await cartService.addToCart('user-1', 'product-1', 2)
      
      // Add same item again
      const result = await cartService.addToCart('user-1', 'product-1', 3)

      expect(result.items).toHaveLength(1)
      expect(result.items[0].quantity).toBe(5) // 2 + 3
      expect(result.totalItems).toBe(5)
    })
  })

  describe('updateCartItem', () => {
    it('should update item quantity successfully', async () => {
      const { productService } = await import('../product.service')
      productService.getProductById = vi.fn().mockResolvedValue(mockProduct)

      // Add item first
      await cartService.addToCart('user-1', 'product-1', 2)
      
      // Update quantity
      const result = await cartService.updateCartItem('user-1', 'product-1', 5)

      expect(result.items[0].quantity).toBe(5)
      expect(result.totalItems).toBe(5)
    })

    it('should remove item if quantity is 0', async () => {
      const { productService } = await import('../product.service')
      productService.getProductById = vi.fn().mockResolvedValue(mockProduct)

      // Add item first
      await cartService.addToCart('user-1', 'product-1', 2)
      
      // Update quantity to 0
      const result = await cartService.updateCartItem('user-1', 'product-1', 0)

      expect(result.items).toHaveLength(0)
      expect(result.totalItems).toBe(0)
    })

    it('should throw error if cart not found', async () => {
      await expect(
        cartService.updateCartItem('user-1', 'product-1', 5)
      ).rejects.toThrow('Cart not found')
    })

    it('should throw error if item not in cart', async () => {
      const { productService } = await import('../product.service')
      productService.getProductById = vi.fn().mockResolvedValue(mockProduct)

      // Add different item first
      await cartService.addToCart('user-1', 'product-1', 2)
      
      await expect(
        cartService.updateCartItem('user-1', 'product-2', 5)
      ).rejects.toThrow('Item not found in cart')
    })
  })

  describe('removeFromCart', () => {
    it('should remove item from cart successfully', async () => {
      const { productService } = await import('../product.service')
      productService.getProductById = vi.fn().mockResolvedValue(mockProduct)

      // Add item first
      await cartService.addToCart('user-1', 'product-1', 2)
      
      // Remove item
      const result = await cartService.removeFromCart('user-1', 'product-1')

      expect(result.items).toHaveLength(0)
      expect(result.totalItems).toBe(0)
    })

    it('should throw error if cart not found', async () => {
      await expect(
        cartService.removeFromCart('user-1', 'product-1')
      ).rejects.toThrow('Cart not found')
    })
  })

  describe('validateCart', () => {
    it('should return valid for valid cart', async () => {
      const { productService } = await import('../product.service')
      productService.getProductById = vi.fn().mockResolvedValue(mockProduct)

      // Add item first
      await cartService.addToCart('user-1', 'product-1', 2)
      
      const result = await cartService.validateCart('user-1')

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should return invalid for empty cart', async () => {
      const result = await cartService.validateCart('user-1')

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Cart is empty')
    })

    it('should return invalid if product not found', async () => {
      const { productService } = await import('../product.service')
      
      // Add item first
      productService.getProductById = vi.fn().mockResolvedValue(mockProduct)
      await cartService.addToCart('user-1', 'product-1', 2)
      
      // Mock product not found for validation
      productService.getProductById = vi.fn().mockResolvedValue(null)
      
      const result = await cartService.validateCart('user-1')

      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('Product product-1 not found')
    })

    it('should return invalid if insufficient inventory', async () => {
      const { productService } = await import('../product.service')
      
      // Add item first
      productService.getProductById = vi.fn().mockResolvedValue(mockProduct)
      await cartService.addToCart('user-1', 'product-1', 2)
      
      // Mock low inventory for validation
      const lowInventoryProduct = { ...mockProduct, inventoryQuantity: 1 }
      productService.getProductById = vi.fn().mockResolvedValue(lowInventoryProduct)
      
      const result = await cartService.validateCart('user-1')

      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('Only 1 items available')
    })
  })

  describe('clearCart', () => {
    it('should clear cart successfully', async () => {
      const { productService } = await import('../product.service')
      productService.getProductById = vi.fn().mockResolvedValue(mockProduct)

      // Add item first
      await cartService.addToCart('user-1', 'product-1', 2)
      
      // Clear cart
      await cartService.clearCart('user-1')
      
      // Check cart is empty
      const result = await cartService.getCart('user-1')
      expect(result.items).toHaveLength(0)
    })
  })

  describe('getCartItemsCount', () => {
    it('should return correct items count', async () => {
      const { productService } = await import('../product.service')
      productService.getProductById = vi.fn().mockResolvedValue(mockProduct)

      // Add items
      await cartService.addToCart('user-1', 'product-1', 3)
      
      const count = await cartService.getCartItemsCount('user-1')
      expect(count).toBe(3)
    })

    it('should return 0 for empty cart', async () => {
      const count = await cartService.getCartItemsCount('user-1')
      expect(count).toBe(0)
    })
  })
})