'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Navigation, Button, Badge, Input } from '@/components/ui'
import { LanguageSwitcher } from '@/components/language/LanguageSwitcher'

interface CartItem {
  productId: string
  quantity: number
  customizationNotes?: string
  addedAt: string
  product: {
    id: string
    name: Record<string, string>
    price: number
    inventoryQuantity: number
    status: string
    isCustomizable: boolean
    craftCategory: string
    mediaFiles?: Array<{
      id: string
      fileUrl: string
      fileType: string
    }>
    craftsman: {
      id: string
      user: {
        id: string
        email: string
        firstName?: string
        lastName?: string
      }
    }
  }
}

interface CartSummary {
  items: CartItem[]
  totalItems: number
  totalAmount: number
  updatedAt: string
}

export default function CartPage() {
  const [cart, setCart] = useState<CartSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [promoCode, setPromoCode] = useState('')
  const [discount, setDiscount] = useState(0)

  useEffect(() => {
    fetchCart()
  }, [])

  const fetchCart = async () => {
    try {
      const response = await fetch('/api/cart')
      if (response.ok) {
        const data = await response.json()
        setCart(data)
      }
    } catch (error) {
      console.error('Failed to fetch cart:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateQuantity = async (productId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeItem(productId)
      return
    }

    setIsUpdating(productId)
    try {
      const response = await fetch(`/api/cart/items/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quantity: newQuantity }),
      })

      if (response.ok) {
        fetchCart()
      }
    } catch (error) {
      console.error('Failed to update quantity:', error)
    } finally {
      setIsUpdating(null)
    }
  }

  const removeItem = async (productId: string) => {
    setIsUpdating(productId)
    try {
      const response = await fetch(`/api/cart/items/${productId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchCart()
      }
    } catch (error) {
      console.error('Failed to remove item:', error)
    } finally {
      setIsUpdating(null)
    }
  }

  const applyPromoCode = async () => {
    if (!promoCode.trim()) return

    try {
      const response = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: promoCode }),
      })

      if (response.ok) {
        const coupon = await response.json()
        setDiscount(coupon.discountAmount || (cart!.totalAmount * (coupon.discountPercentage / 100)))
      }
    } catch (error) {
      console.error('Failed to apply promo code:', error)
    }
  }

  const clearCart = async () => {
    try {
      const response = await fetch('/api/cart', {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchCart()
      }
    } catch (error) {
      console.error('Failed to clear cart:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">載入中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <Navigation className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-gray-900">
                香港弱勢行業傳承平台
              </Link>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/craftsmen" className="text-gray-700 hover:text-gray-900">
                師傅檔案
              </Link>
              <Link href="/courses" className="text-gray-700 hover:text-gray-900">
                課程學習
              </Link>
              <Link href="/products" className="text-gray-700 hover:text-gray-900">
                工藝品商店
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              <button className="relative p-2 text-blue-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5-6m0 0h15M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6" />
                </svg>
                <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cart?.totalItems || 0}
                </span>
              </button>
              <LanguageSwitcher variant="dropdown" />
              <Link href="/auth/login">
                <Button variant="outline" size="sm">
                  登入
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Navigation>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="mb-8">
          <ol className="flex items-center space-x-2 text-sm text-gray-500">
            <li><Link href="/" className="hover:text-gray-700">首頁</Link></li>
            <li>/</li>
            <li className="text-gray-900">購物車</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">購物車</h1>
          {cart && cart.items.length > 0 && (
            <Button variant="outline" onClick={clearCart}>
              清空購物車
            </Button>
          )}
        </div>

        {!cart || cart.items.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-gray-400 text-6xl mb-4">🛒</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">購物車是空的</h2>
            <p className="text-gray-600 mb-6">
              還沒有添加任何商品到購物車
            </p>
            <Link href="/products">
              <Button>開始購物</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-md">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    購物車商品 ({cart.totalItems} 件)
                  </h2>
                </div>
                
                <div className="divide-y divide-gray-200">
                  {cart.items.map((item) => (
                    <div key={item.productId} className="p-6">
                      <div className="flex items-start space-x-4">
                        {/* Product Image */}
                        <div className="w-20 h-20 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          {item.product.mediaFiles && item.product.mediaFiles.length > 0 ? (
                            <img 
                              src={item.product.mediaFiles[0].fileUrl} 
                              alt={item.product.name['zh-HK'] || item.product.name['en']}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <div className="text-center">
                              <div className="text-2xl mb-1">🎨</div>
                              <div className="text-xs text-gray-600">{item.product.craftCategory}</div>
                            </div>
                          )}
                        </div>

                        {/* Product Details */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-medium text-gray-900 mb-1">
                                <Link href={`/products/${item.product.id}`} className="hover:text-blue-600">
                                  {item.product.name['zh-HK'] || item.product.name['en']}
                                </Link>
                              </h3>
                              <p className="text-sm text-gray-600 mb-2">
                                師傅：{item.product.craftsman.user.firstName || item.product.craftsman.user.email.split('@')[0]}
                              </p>
                              {item.product.isCustomizable && item.customizationNotes && (
                                <div className="mb-2">
                                  <p className="text-sm text-blue-600 font-medium">客製化需求：</p>
                                  <p className="text-sm text-gray-600">{item.customizationNotes}</p>
                                </div>
                              )}
                              <div className="flex items-center space-x-4">
                                <Badge variant={item.product.status === 'ACTIVE' ? 'success' : 'warning'} size="sm">
                                  {item.product.status === 'ACTIVE' ? '有庫存' : '缺貨'}
                                </Badge>
                                {item.product.isCustomizable && (
                                  <Badge variant="info" size="sm">可客製化</Badge>
                                )}
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <div className="text-lg font-bold text-gray-900 mb-2">
                                HK${(item.product.price * item.quantity).toLocaleString()}
                              </div>
                              <div className="text-sm text-gray-500">
                                單價 HK${item.product.price}
                              </div>
                            </div>
                          </div>

                          {/* Quantity Controls */}
                          <div className="flex items-center justify-between mt-4">
                            <div className="flex items-center space-x-3">
                              <span className="text-sm text-gray-700">數量：</span>
                              <div className="flex items-center border border-gray-300 rounded-md">
                                <button
                                  onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                  disabled={isUpdating === item.productId}
                                  className="px-3 py-1 text-gray-600 hover:text-gray-900 disabled:opacity-50"
                                >
                                  -
                                </button>
                                <span className="px-3 py-1 text-center min-w-[3rem]">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                  disabled={isUpdating === item.productId || item.quantity >= item.product.inventoryQuantity}
                                  className="px-3 py-1 text-gray-600 hover:text-gray-900 disabled:opacity-50"
                                >
                                  +
                                </button>
                              </div>
                              {item.quantity >= item.product.inventoryQuantity && (
                                <span className="text-xs text-red-600">已達庫存上限</span>
                              )}
                            </div>

                            <button
                              onClick={() => removeItem(item.productId)}
                              disabled={isUpdating === item.productId}
                              className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                            >
                              移除
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">訂單摘要</h2>
                
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">商品小計 ({cart.totalItems} 件)：</span>
                    <span className="font-medium">HK${cart.totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">運費：</span>
                    <span className="font-medium text-green-600">免費</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">優惠折扣：</span>
                      <span className="font-medium text-green-600">-HK${discount.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {/* Promo Code */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    優惠代碼
                  </label>
                  <div className="flex space-x-2">
                    <Input
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="輸入優惠代碼"
                      className="flex-1"
                    />
                    <Button variant="outline" size="sm" onClick={applyPromoCode}>
                      套用
                    </Button>
                  </div>
                </div>

                <div className="border-t pt-4 mb-6">
                  <div className="flex justify-between text-lg font-bold">
                    <span>總計：</span>
                    <span className="text-blue-600">
                      HK${(cart.totalAmount - discount).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <Link href="/checkout">
                    <Button className="w-full">
                      前往結帳
                    </Button>
                  </Link>
                  <Link href="/products">
                    <Button variant="outline" className="w-full">
                      繼續購物
                    </Button>
                  </Link>
                </div>

                <div className="mt-6 text-xs text-gray-500">
                  <p>• 支持多種付款方式</p>
                  <p>• 香港地區免費送貨</p>
                  <p>• 7天無理由退換貨</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}