'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Navigation, Button, Badge, Input } from '@/components/ui'
import { LanguageSwitcher } from '@/components/language/LanguageSwitcher'

interface CartItem {
  productId: string
  quantity: number
  customizationNotes?: string
  product: {
    id: string
    name: Record<string, string>
    price: number
    craftCategory: string
    isCustomizable: boolean
    mediaFiles?: Array<{
      id: string
      fileUrl: string
      fileType: string
    }>
    craftsman: {
      user: {
        firstName?: string
        lastName?: string
        email: string
      }
    }
  }
}

interface CartSummary {
  items: CartItem[]
  totalItems: number
  totalAmount: number
}

interface ShippingAddress {
  firstName: string
  lastName: string
  phone: string
  address: string
  district: string
  region: string
  postalCode: string
  specialInstructions?: string
}

export default function CheckoutPage() {
  const router = useRouter()
  const [cart, setCart] = useState<CartSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    district: '',
    region: 'Hong Kong Island',
    postalCode: '',
    specialInstructions: ''
  })
  
  const [paymentMethod, setPaymentMethod] = useState('credit_card')
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const districts = {
    'Hong Kong Island': ['中環', '金鐘', '灣仔', '銅鑼灣', '天后', '北角', '鰂魚涌', '太古', '西灣河', '筲箕灣', '柴灣'],
    'Kowloon': ['尖沙咀', '佐敦', '油麻地', '旺角', '太子', '深水埗', '長沙灣', '荔枝角', '美孚', '九龍塘', '樂富', '黃大仙', '鑽石山', '彩虹', '九龍灣', '牛頭角', '觀塘', '藍田', '油塘'],
    'New Territories': ['荃灣', '葵涌', '青衣', '沙田', '大圍', '馬鞍山', '大埔', '粉嶺', '上水', '元朗', '天水圍', '屯門', '東涌', '將軍澳']
  }

  useEffect(() => {
    fetchCart()
  }, [])

  const fetchCart = async () => {
    try {
      const response = await fetch('/api/cart')
      if (response.ok) {
        const data = await response.json()
        if (data.items.length === 0) {
          router.push('/cart')
          return
        }
        setCart(data)
      }
    } catch (error) {
      console.error('Failed to fetch cart:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}

    if (step === 1) {
      // Validate shipping address
      if (!shippingAddress.firstName.trim()) newErrors.firstName = '請輸入名字'
      if (!shippingAddress.lastName.trim()) newErrors.lastName = '請輸入姓氏'
      if (!shippingAddress.phone.trim()) newErrors.phone = '請輸入電話號碼'
      if (!shippingAddress.address.trim()) newErrors.address = '請輸入詳細地址'
      if (!shippingAddress.district) newErrors.district = '請選擇地區'
      if (!shippingAddress.postalCode.trim()) newErrors.postalCode = '請輸入郵政編碼'
    }

    if (step === 2) {
      // Validate payment method
      if (paymentMethod === 'credit_card') {
        if (!cardDetails.cardNumber.trim()) newErrors.cardNumber = '請輸入信用卡號碼'
        if (!cardDetails.expiryDate.trim()) newErrors.expiryDate = '請輸入到期日期'
        if (!cardDetails.cvv.trim()) newErrors.cvv = '請輸入CVV'
        if (!cardDetails.cardholderName.trim()) newErrors.cardholderName = '請輸入持卡人姓名'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePreviousStep = () => {
    setCurrentStep(currentStep - 1)
  }

  const handlePlaceOrder = async () => {
    if (!validateStep(2)) return

    setIsProcessing(true)
    try {
      const orderData = {
        shippingAddress,
        paymentMethod,
        paymentDetails: paymentMethod === 'credit_card' ? cardDetails : null,
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      })

      if (response.ok) {
        const order = await response.json()
        router.push(`/orders/${order.id}/success`)
      } else {
        const errorData = await response.json()
        setErrors({ general: errorData.message || '下單失敗，請重試' })
      }
    } catch (error) {
      setErrors({ general: '下單失敗，請重試' })
    } finally {
      setIsProcessing(false)
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

  if (!cart || cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">🛒</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">購物車是空的</h2>
          <p className="text-gray-600 mb-4">請先添加商品到購物車</p>
          <Link href="/products">
            <Button>開始購物</Button>
          </Link>
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
            
            <div className="flex items-center space-x-4">
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
            <li><Link href="/cart" className="hover:text-gray-700">購物車</Link></li>
            <li>/</li>
            <li className="text-gray-900">結帳</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">結帳</h1>
          
          {/* Progress Steps */}
          <div className="flex items-center space-x-4">
            <div className={`flex items-center ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                1
              </div>
              <span className="ml-2 text-sm font-medium">配送資訊</span>
            </div>
            <div className="flex-1 h-px bg-gray-200"></div>
            <div className={`flex items-center ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                2
              </div>
              <span className="ml-2 text-sm font-medium">付款方式</span>
            </div>
            <div className="flex-1 h-px bg-gray-200"></div>
            <div className={`flex items-center ${currentStep >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                3
              </div>
              <span className="ml-2 text-sm font-medium">確認訂單</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Step 1: Shipping Address */}
            {currentStep === 1 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">配送資訊</h2>
                
                <form className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        名字 *
                      </label>
                      <Input
                        value={shippingAddress.firstName}
                        onChange={(e) => setShippingAddress(prev => ({ ...prev, firstName: e.target.value }))}
                        placeholder="請輸入名字"
                        error={errors.firstName}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        姓氏 *
                      </label>
                      <Input
                        value={shippingAddress.lastName}
                        onChange={(e) => setShippingAddress(prev => ({ ...prev, lastName: e.target.value }))}
                        placeholder="請輸入姓氏"
                        error={errors.lastName}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      電話號碼 *
                    </label>
                    <Input
                      value={shippingAddress.phone}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+852 1234 5678"
                      error={errors.phone}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        地區 *
                      </label>
                      <select
                        value={shippingAddress.region}
                        onChange={(e) => setShippingAddress(prev => ({ ...prev, region: e.target.value, district: '' }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="Hong Kong Island">香港島</option>
                        <option value="Kowloon">九龍</option>
                        <option value="New Territories">新界</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        區域 *
                      </label>
                      <select
                        value={shippingAddress.district}
                        onChange={(e) => setShippingAddress(prev => ({ ...prev, district: e.target.value }))}
                        className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.district ? 'border-red-300' : 'border-gray-300'
                        }`}
                      >
                        <option value="">請選擇區域</option>
                        {districts[shippingAddress.region as keyof typeof districts]?.map(district => (
                          <option key={district} value={district}>{district}</option>
                        ))}
                      </select>
                      {errors.district && (
                        <p className="text-red-600 text-xs mt-1">{errors.district}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      詳細地址 *
                    </label>
                    <Input
                      value={shippingAddress.address}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="請輸入街道地址、大廈名稱、樓層及單位號碼"
                      error={errors.address}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      郵政編碼 *
                    </label>
                    <Input
                      value={shippingAddress.postalCode}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, postalCode: e.target.value }))}
                      placeholder="請輸入郵政編碼"
                      error={errors.postalCode}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      特殊配送指示 (可選)
                    </label>
                    <textarea
                      value={shippingAddress.specialInstructions}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, specialInstructions: e.target.value }))}
                      rows={3}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="如有特殊配送要求，請在此說明..."
                    />
                  </div>
                </form>

                <div className="flex justify-end mt-6">
                  <Button onClick={handleNextStep}>
                    下一步
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Payment Method */}
            {currentStep === 2 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">付款方式</h2>
                
                <div className="space-y-4 mb-6">
                  <label className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="credit_card"
                      checked={paymentMethod === 'credit_card'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <div className="ml-3">
                      <div className="font-medium text-gray-900">信用卡</div>
                      <div className="text-sm text-gray-600">支持 Visa、Mastercard、American Express</div>
                    </div>
                  </label>

                  <label className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="paypal"
                      checked={paymentMethod === 'paypal'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <div className="ml-3">
                      <div className="font-medium text-gray-900">PayPal</div>
                      <div className="text-sm text-gray-600">使用您的 PayPal 帳戶付款</div>
                    </div>
                  </label>

                  <label className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="bank_transfer"
                      checked={paymentMethod === 'bank_transfer'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <div className="ml-3">
                      <div className="font-medium text-gray-900">銀行轉帳</div>
                      <div className="text-sm text-gray-600">直接轉帳到我們的銀行帳戶</div>
                    </div>
                  </label>
                </div>

                {paymentMethod === 'credit_card' && (
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium text-gray-900">信用卡資訊</h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        持卡人姓名 *
                      </label>
                      <Input
                        value={cardDetails.cardholderName}
                        onChange={(e) => setCardDetails(prev => ({ ...prev, cardholderName: e.target.value }))}
                        placeholder="請輸入持卡人姓名"
                        error={errors.cardholderName}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        信用卡號碼 *
                      </label>
                      <Input
                        value={cardDetails.cardNumber}
                        onChange={(e) => setCardDetails(prev => ({ ...prev, cardNumber: e.target.value }))}
                        placeholder="1234 5678 9012 3456"
                        error={errors.cardNumber}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          到期日期 *
                        </label>
                        <Input
                          value={cardDetails.expiryDate}
                          onChange={(e) => setCardDetails(prev => ({ ...prev, expiryDate: e.target.value }))}
                          placeholder="MM/YY"
                          error={errors.expiryDate}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          CVV *
                        </label>
                        <Input
                          value={cardDetails.cvv}
                          onChange={(e) => setCardDetails(prev => ({ ...prev, cvv: e.target.value }))}
                          placeholder="123"
                          error={errors.cvv}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between mt-6">
                  <Button variant="outline" onClick={handlePreviousStep}>
                    上一步
                  </Button>
                  <Button onClick={handleNextStep}>
                    下一步
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Order Confirmation */}
            {currentStep === 3 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">確認訂單</h2>
                
                {/* Shipping Address Summary */}
                <div className="mb-6">
                  <h3 className="font-medium text-gray-900 mb-3">配送地址</h3>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="font-medium">{shippingAddress.firstName} {shippingAddress.lastName}</p>
                    <p className="text-sm text-gray-600">{shippingAddress.phone}</p>
                    <p className="text-sm text-gray-600">
                      {shippingAddress.address}, {shippingAddress.district}, {shippingAddress.region}
                    </p>
                    <p className="text-sm text-gray-600">{shippingAddress.postalCode}</p>
                    {shippingAddress.specialInstructions && (
                      <p className="text-sm text-gray-600 mt-2">
                        特殊指示：{shippingAddress.specialInstructions}
                      </p>
                    )}
                  </div>
                </div>

                {/* Payment Method Summary */}
                <div className="mb-6">
                  <h3 className="font-medium text-gray-900 mb-3">付款方式</h3>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="font-medium">
                      {paymentMethod === 'credit_card' ? '信用卡' :
                       paymentMethod === 'paypal' ? 'PayPal' : '銀行轉帳'}
                    </p>
                    {paymentMethod === 'credit_card' && (
                      <p className="text-sm text-gray-600">
                        **** **** **** {cardDetails.cardNumber.slice(-4)}
                      </p>
                    )}
                  </div>
                </div>

                {errors.general && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-sm">{errors.general}</p>
                  </div>
                )}

                <div className="flex justify-between">
                  <Button variant="outline" onClick={handlePreviousStep}>
                    上一步
                  </Button>
                  <Button 
                    onClick={handlePlaceOrder}
                    disabled={isProcessing}
                  >
                    {isProcessing ? '處理中...' : '確認下單'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">訂單摘要</h2>
              
              <div className="space-y-4 mb-4">
                {cart.items.map((item) => (
                  <div key={item.productId} className="flex items-start space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      {item.product.mediaFiles && item.product.mediaFiles.length > 0 ? (
                        <img 
                          src={item.product.mediaFiles[0].fileUrl} 
                          alt={item.product.name['zh-HK'] || item.product.name['en']}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="text-lg">🎨</div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 text-sm line-clamp-2">
                        {item.product.name['zh-HK'] || item.product.name['en']}
                      </h3>
                      <p className="text-xs text-gray-600">
                        {item.product.craftsman.user.firstName || item.product.craftsman.user.email.split('@')[0]}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-gray-600">× {item.quantity}</span>
                        <span className="font-medium text-sm">
                          HK${(item.product.price * item.quantity).toLocaleString()}
                        </span>
                      </div>
                      {item.product.isCustomizable && item.customizationNotes && (
                        <p className="text-xs text-blue-600 mt-1">客製化</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">商品小計：</span>
                  <span className="font-medium">HK${cart.totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">運費：</span>
                  <span className="font-medium text-green-600">免費</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>總計：</span>
                  <span className="text-blue-600">HK${cart.totalAmount.toLocaleString()}</span>
                </div>
              </div>

              <div className="mt-6 text-xs text-gray-500 space-y-1">
                <p>• 所有價格均以港幣計算</p>
                <p>• 香港地區免費送貨</p>
                <p>• 支持7天無理由退換貨</p>
                <p>• 客製化商品製作時間為7-14個工作日</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}