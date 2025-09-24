'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Navigation, Button, Badge, Grid, GridItem, Tabs, TabsContent, TabsList, TabsTrigger, Input } from '@/components/ui'
import { LanguageSwitcher } from '@/components/language/LanguageSwitcher'

interface UserProfile {
  id: string
  email: string
  firstName?: string
  lastName?: string
  phone?: string
  preferredLanguage: string
  role: string
  createdAt: string
  craftsmanProfile?: {
    id: string
    craftSpecialties: string[]
    verificationStatus: string
    bio: Record<string, string>
    experienceYears: number
    workshopLocation: string
  }
}

interface UserBooking {
  id: string
  status: string
  createdAt: string
  course: {
    id: string
    title: Record<string, string>
    craftCategory: string
    price: number
    durationHours: number
    craftsman: {
      user: {
        firstName?: string
        lastName?: string
        email: string
      }
    }
  }
}

interface UserOrder {
  id: string
  totalAmount: number
  status: string
  createdAt: string
  items: Array<{
    id: string
    quantity: number
    product: {
      id: string
      name: Record<string, string>
      price: number
    }
  }>
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [bookings, setBookings] = useState<UserBooking[]>([])
  const [orders, setOrders] = useState<UserOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('profile')
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    preferredLanguage: 'zh-HK'
  })

  useEffect(() => {
    fetchProfile()
    fetchBookings()
    fetchOrders()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/users/profile')
      if (response.ok) {
        const data = await response.json()
        setProfile(data)
        setEditForm({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          phone: data.phone || '',
          preferredLanguage: data.preferredLanguage || 'zh-HK'
        })
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchBookings = async () => {
    try {
      const response = await fetch('/api/bookings')
      if (response.ok) {
        const data = await response.json()
        setBookings(data)
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error)
    }
  }

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders')
      if (response.ok) {
        const data = await response.json()
        setOrders(data)
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      })

      if (response.ok) {
        setIsEditing(false)
        fetchProfile()
      }
    } catch (error) {
      console.error('Failed to update profile:', error)
    }
  }

  const getStatusBadge = (status: string, type: 'booking' | 'order') => {
    const statusConfig = {
      booking: {
        CONFIRMED: { variant: 'success' as const, text: '已確認' },
        PENDING: { variant: 'warning' as const, text: '待確認' },
        CANCELLED: { variant: 'error' as const, text: '已取消' },
        COMPLETED: { variant: 'info' as const, text: '已完成' }
      },
      order: {
        PENDING: { variant: 'warning' as const, text: '待付款' },
        PAID: { variant: 'success' as const, text: '已付款' },
        SHIPPED: { variant: 'info' as const, text: '已發貨' },
        DELIVERED: { variant: 'success' as const, text: '已送達' },
        CANCELLED: { variant: 'error' as const, text: '已取消' }
      }
    }

    const config = statusConfig[type][status as keyof typeof statusConfig[typeof type]]
    return config ? (
      <Badge variant={config.variant} size="sm">
        {config.text}
      </Badge>
    ) : (
      <Badge variant="default" size="sm">
        {status}
      </Badge>
    )
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

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">無法載入個人資料</h2>
          <p className="text-gray-600 mb-4">請重新登入後再試</p>
          <Link href="/auth/login">
            <Button>重新登入</Button>
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
              <Button variant="outline" size="sm">
                登出
              </Button>
            </div>
          </div>
        </div>
      </Navigation>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">
                  {profile.role === 'CRAFTSMAN' ? '👨‍🎨' : '👤'}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {profile.firstName && profile.lastName 
                    ? `${profile.firstName} ${profile.lastName}`
                    : profile.email.split('@')[0]
                  }
                </h1>
                <div className="flex items-center space-x-3 mt-1">
                  <Badge variant={profile.role === 'CRAFTSMAN' ? 'info' : 'default'}>
                    {profile.role === 'CRAFTSMAN' ? '工藝師傅' : '學習者'}
                  </Badge>
                  {profile.craftsmanProfile && (
                    <Badge variant={
                      profile.craftsmanProfile.verificationStatus === 'VERIFIED' ? 'success' :
                      profile.craftsmanProfile.verificationStatus === 'PENDING' ? 'warning' : 'error'
                    }>
                      {profile.craftsmanProfile.verificationStatus === 'VERIFIED' ? '已驗證' :
                       profile.craftsmanProfile.verificationStatus === 'PENDING' ? '審核中' : '未通過'}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3">
              {profile.role !== 'CRAFTSMAN' && (
                <Link href="/craftsmen/apply">
                  <Button variant="outline">
                    申請成為師傅
                  </Button>
                </Link>
              )}
              {profile.craftsmanProfile && (
                <Link href={`/craftsmen/${profile.craftsmanProfile.id}/edit`}>
                  <Button variant="outline">
                    編輯師傅檔案
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="profile">個人資料</TabsTrigger>
            <TabsTrigger value="bookings">我的預約 ({bookings.length})</TabsTrigger>
            <TabsTrigger value="orders">我的訂單 ({orders.length})</TabsTrigger>
            <TabsTrigger value="settings">帳戶設定</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">個人資料</h2>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? '取消編輯' : '編輯資料'}
                </Button>
              </div>

              {isEditing ? (
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        名字
                      </label>
                      <Input
                        value={editForm.firstName}
                        onChange={(e) => setEditForm(prev => ({ ...prev, firstName: e.target.value }))}
                        placeholder="請輸入名字"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        姓氏
                      </label>
                      <Input
                        value={editForm.lastName}
                        onChange={(e) => setEditForm(prev => ({ ...prev, lastName: e.target.value }))}
                        placeholder="請輸入姓氏"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        電話號碼
                      </label>
                      <Input
                        value={editForm.phone}
                        onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+852 1234 5678"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        偏好語言
                      </label>
                      <select
                        value={editForm.preferredLanguage}
                        onChange={(e) => setEditForm(prev => ({ ...prev, preferredLanguage: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="zh-HK">繁體中文</option>
                        <option value="zh-CN">簡體中文</option>
                        <option value="en">English</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex space-x-3 pt-4">
                    <Button type="submit">
                      儲存變更
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                      取消
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">基本資料</h3>
                    <dl className="space-y-2">
                      <div>
                        <dt className="text-sm text-gray-500">電子郵件</dt>
                        <dd className="text-sm font-medium text-gray-900">{profile.email}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-gray-500">姓名</dt>
                        <dd className="text-sm font-medium text-gray-900">
                          {profile.firstName && profile.lastName 
                            ? `${profile.firstName} ${profile.lastName}`
                            : '未設定'
                          }
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-gray-500">電話號碼</dt>
                        <dd className="text-sm font-medium text-gray-900">
                          {profile.phone || '未設定'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-gray-500">偏好語言</dt>
                        <dd className="text-sm font-medium text-gray-900">
                          {profile.preferredLanguage === 'zh-HK' ? '繁體中文' :
                           profile.preferredLanguage === 'zh-CN' ? '簡體中文' : 'English'}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">帳戶資訊</h3>
                    <dl className="space-y-2">
                      <div>
                        <dt className="text-sm text-gray-500">帳戶類型</dt>
                        <dd className="text-sm font-medium text-gray-900">
                          {profile.role === 'CRAFTSMAN' ? '工藝師傅' : '學習者'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-gray-500">註冊日期</dt>
                        <dd className="text-sm font-medium text-gray-900">
                          {new Date(profile.createdAt).toLocaleDateString('zh-HK')}
                        </dd>
                      </div>
                      {profile.craftsmanProfile && (
                        <>
                          <div>
                            <dt className="text-sm text-gray-500">驗證狀態</dt>
                            <dd className="text-sm font-medium text-gray-900">
                              {getStatusBadge(profile.craftsmanProfile.verificationStatus, 'booking')}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm text-gray-500">專長技藝</dt>
                            <dd className="text-sm font-medium text-gray-900">
                              {profile.craftsmanProfile.craftSpecialties.join(', ')}
                            </dd>
                          </div>
                        </>
                      )}
                    </dl>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="bookings">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">我的課程預約</h2>
              
              {bookings.length > 0 ? (
                <div className="space-y-4">
                  {bookings.map((booking) => (
                    <div key={booking.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-medium text-gray-900">
                              {booking.course.title['zh-HK'] || booking.course.title['en']}
                            </h3>
                            {getStatusBadge(booking.status, 'booking')}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">師傅：</span>
                              {booking.course.craftsman.user.firstName || booking.course.craftsman.user.email.split('@')[0]}
                            </div>
                            <div>
                              <span className="font-medium">課程時長：</span>
                              {booking.course.durationHours} 小時
                            </div>
                            <div>
                              <span className="font-medium">預約日期：</span>
                              {new Date(booking.createdAt).toLocaleDateString('zh-HK')}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-lg font-bold text-blue-600 mb-2">
                            HK${booking.course.price}
                          </div>
                          <Link href={`/courses/${booking.course.id}`}>
                            <Button variant="outline" size="sm">
                              查看課程
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">📚</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    尚未預約任何課程
                  </h3>
                  <p className="text-gray-600 mb-4">
                    探索我們的課程，開始您的學習之旅
                  </p>
                  <Link href="/courses">
                    <Button>瀏覽課程</Button>
                  </Link>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="orders">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">我的訂單</h2>
              
              {orders.length > 0 ? (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-medium text-gray-900">
                              訂單 #{order.id.slice(-8)}
                            </h3>
                            {getStatusBadge(order.status, 'order')}
                          </div>
                          <div className="text-sm text-gray-600">
                            下單日期：{new Date(order.createdAt).toLocaleDateString('zh-HK')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">
                            HK${order.totalAmount}
                          </div>
                        </div>
                      </div>
                      
                      <div className="border-t pt-3">
                        <h4 className="font-medium text-gray-900 mb-2">訂單商品</h4>
                        <div className="space-y-2">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between text-sm">
                              <div className="flex-1">
                                <span className="text-gray-900">
                                  {item.product.name['zh-HK'] || item.product.name['en']}
                                </span>
                                <span className="text-gray-500 ml-2">
                                  × {item.quantity}
                                </span>
                              </div>
                              <div className="font-medium text-gray-900">
                                HK${item.product.price * item.quantity}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">🛒</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    尚未有任何訂單
                  </h3>
                  <p className="text-gray-600 mb-4">
                    瀏覽我們的工藝品商店，發現精美的手工作品
                  </p>
                  <Link href="/products">
                    <Button>瀏覽商品</Button>
                  </Link>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">帳戶設定</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">通知設定</h3>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" defaultChecked />
                      <span className="ml-2 text-sm text-gray-700">接收課程預約確認通知</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" defaultChecked />
                      <span className="ml-2 text-sm text-gray-700">接收訂單狀態更新通知</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      <span className="ml-2 text-sm text-gray-700">接收新課程推薦通知</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      <span className="ml-2 text-sm text-gray-700">接收促銷活動通知</span>
                    </label>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-medium text-gray-900 mb-3">隱私設定</h3>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" defaultChecked />
                      <span className="ml-2 text-sm text-gray-700">允許其他用戶查看我的學習記錄</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      <span className="ml-2 text-sm text-gray-700">允許師傅主動聯繫我</span>
                    </label>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-medium text-gray-900 mb-3">帳戶安全</h3>
                  <div className="space-y-3">
                    <Button variant="outline">
                      更改密碼
                    </Button>
                    <Button variant="outline">
                      雙重驗證設定
                    </Button>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <Button>
                    儲存設定
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}