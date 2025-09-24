'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Navigation, Button, Badge } from '@/components/ui'
import { LanguageSwitcher } from '@/components/language/LanguageSwitcher'

interface OrderDetails {
  id: string
  totalAmount: number
  status: string
  createdAt: string
  shippingAddress: {
    firstName: string
    lastName: string
    phone: string
    address: string
    district: string
    region: string
    postalCode: string
    specialInstructions?: string
  }
  paymentMethod: string
  items: Array<{
    id: string
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
  }>
}

export default function OrderSuccessPage() {
  const params = useParams()
  const orderId = params.id as string
  
  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (orderId) {
      fetchOrder()
    }
  }, [orderId])

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}`)
      if (response.ok) {
        const data = await response.json()
        setOrder(data)
      } else {
        setError('訂單不存在或無法訪問')
      }
    } catch (error) {
      setError('載入訂單資訊時發生錯誤')
    } finally {
      setIsLoading(false)
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

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">訂單不存在</h2>
          <p className="text-gray-600 mb-4">{error || '您要查看的訂單可能不存在或無法訪問'}</p>
          <Link href="/profile">
            <Button>查看我的訂單</Button>
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
              <LanguageSwitcher variant="dropdown" />
              <Link href="/profile">
                <Button variant="outline" size="sm">
                  個人資料
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Navigation>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">訂單提交成功！</h1>
          <p className="text-lg text-gray-600 mb-4">
            感謝您的購買，我們已收到您的訂單並開始處理
          </p>
          <div className="text-sm text-gray-500">
            訂單編號：#{order.id.slice(-8)}
          </div>
        </div>

        {/* Order Details */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">訂單詳情</h2>
            <Badge variant="success">
              {order.status === 'PENDING' ? '待付款' : 
               order.status === 'PAID' ? '已付款' : 
               order.status === 'SHIPPED' ? '已發貨' : 
               order.status === 'DELIVERED' ? '已送達' : '處理中'}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-3">訂單資訊</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-600">訂單編號：</dt>
                  <dd className="font-medium">#{order.id.slice(-8)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">下單時間：</dt>
                  <dd className="font-medium">{new Date(order.createdAt).toLocaleString('zh-HK')}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">付款方式：</dt>
                  <dd className="font-medium">
                    {order.paymentMethod === 'credit_card' ? '信用卡' :
                     order.paymentMethod === 'paypal' ? 'PayPal' : '銀行轉帳'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">訂單總額：</dt>
                  <dd className="font-bold text-lg text-blue-600">HK${order.totalAmount.toLocaleString()}</dd>
                </div>
              </dl>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-3">配送地址</h3>
              <div className="text-sm text-gray-600">
                <p className="font-medium text-gray-900">
                  {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                </p>
                <p>{order.shippingAddress.phone}</p>
                <p>
                  {order.shippingAddress.address}<br />
                  {order.shippingAddress.district}, {order.shippingAddress.region}<br />
                  {order.shippingAddress.postalCode}
                </p>
                {order.shippingAddress.specialInstructions && (
                  <p className="mt-2 text-blue-600">
                    特殊指示：{order.shippingAddress.specialInstructions}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div>
            <h3 className="font-medium text-gray-900 mb-4">訂單商品</h3>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
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

                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">
                      {item.product.name['zh-HK'] || item.product.name['en']}
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">
                      師傅：{item.product.craftsman.user.firstName || item.product.craftsman.user.email.split('@')[0]}
                    </p>
                    {item.product.isCustomizable && item.customizationNotes && (
                      <div className="mb-2">
                        <p className="text-sm text-blue-600 font-medium">客製化需求：</p>
                        <p className="text-sm text-gray-600">{item.customizationNotes}</p>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">數量：{item.quantity}</span>
                      <span className="font-medium">
                        HK${(item.product.price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-blue-50 rounded-lg p-6 mb-6">
          <h3 className="font-medium text-blue-900 mb-3">接下來會發生什麼？</h3>
          <div className="space-y-3 text-sm text-blue-800">
            <div className="flex items-start">
              <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center mr-3 mt-0.5">
                <span className="text-xs font-bold">1</span>
              </div>
              <div>
                <p className="font-medium">訂單確認</p>
                <p>我們會在24小時內確認您的訂單並發送確認郵件</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center mr-3 mt-0.5">
                <span className="text-xs font-bold">2</span>
              </div>
              <div>
                <p className="font-medium">製作準備</p>
                <p>師傅開始準備您的商品，客製化商品需要7-14個工作日</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center mr-3 mt-0.5">
                <span className="text-xs font-bold">3</span>
              </div>
              <div>
                <p className="font-medium">發貨配送</p>
                <p>商品準備完成後，我們會安排發貨並提供追蹤號碼</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center mr-3 mt-0.5">
                <span className="text-xs font-bold">4</span>
              </div>
              <div>
                <p className="font-medium">收貨確認</p>
                <p>收到商品後，歡迎分享您的使用體驗和評價</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/profile">
            <Button variant="outline" className="w-full sm:w-auto">
              查看我的訂單
            </Button>
          </Link>
          <Link href="/products">
            <Button className="w-full sm:w-auto">
              繼續購物
            </Button>
          </Link>
        </div>

        {/* Contact Information */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600 mb-2">
            如有任何問題，請聯繫我們的客服團隊
          </p>
          <div className="flex justify-center space-x-6 text-sm">
            <a href="mailto:support@hk-heritage-crafts.com" className="text-blue-600 hover:text-blue-800">
              📧 support@hk-heritage-crafts.com
            </a>
            <a href="tel:+85212345678" className="text-blue-600 hover:text-blue-800">
              📞 +852 1234 5678
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}