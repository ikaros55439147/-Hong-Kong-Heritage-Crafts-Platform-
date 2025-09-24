'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Navigation, Button, Badge, Grid, GridItem, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui'
import { LanguageSwitcher } from '@/components/language/LanguageSwitcher'
import { CraftsmanProfile } from '@/components/craftsman/CraftsmanProfile'

interface CraftsmanWithDetails {
  id: string
  userId: string
  craftSpecialties: string[]
  bio: Record<string, string>
  experienceYears: number
  workshopLocation: string
  verificationStatus: string
  contactInfo: any
  createdAt: string
  user: {
    id: string
    email: string
    firstName?: string
    lastName?: string
  }
  courses: Array<{
    id: string
    title: Record<string, string>
    description: Record<string, string>
    price: number
    craftCategory: string
    status: string
    maxParticipants: number
    durationHours: number
    _count: {
      bookings: number
    }
  }>
  products: Array<{
    id: string
    name: Record<string, string>
    description: Record<string, string>
    price: number
    inventoryQuantity: number
    craftCategory: string
    status: string
    isCustomizable: boolean
    mediaFiles?: Array<{
      id: string
      fileUrl: string
      fileType: string
    }>
  }>
  _count: {
    courses: number
    products: number
    followers?: number
  }
}

export default function CraftsmanDetailPage() {
  const params = useParams()
  const craftsmanId = params.id as string
  
  const [craftsman, setCraftsman] = useState<CraftsmanWithDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isFollowing, setIsFollowing] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')

  useEffect(() => {
    if (craftsmanId) {
      fetchCraftsman()
    }
  }, [craftsmanId])

  const fetchCraftsman = async () => {
    try {
      const response = await fetch(`/api/craftsmen/${craftsmanId}`)
      if (response.ok) {
        const data = await response.json()
        setCraftsman(data)
      } else {
        setError('師傅檔案不存在或已被刪除')
      }
    } catch (error) {
      setError('載入師傅檔案時發生錯誤')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFollow = async () => {
    try {
      const response = await fetch(`/api/users/${craftsmanId}/follow`, {
        method: isFollowing ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        setIsFollowing(!isFollowing)
      }
    } catch (error) {
      console.error('Follow action failed:', error)
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

  if (error || !craftsman) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">師傅檔案不存在</h2>
          <p className="text-gray-600 mb-4">{error || '您要查看的師傅檔案可能已被刪除或不存在'}</p>
          <Link href="/craftsmen">
            <Button>返回師傅列表</Button>
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
              <Link href="/craftsmen" className="text-blue-600 font-medium">
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
            <li><Link href="/craftsmen" className="hover:text-gray-700">師傅檔案</Link></li>
            <li>/</li>
            <li className="text-gray-900">
              {craftsman.user.firstName || craftsman.user.email.split('@')[0]}師傅
            </li>
          </ol>
        </nav>

        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-6">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                <span className="text-4xl">👨‍🎨</span>
              </div>
              
              <div>
                <div className="flex items-center mb-2">
                  <h1 className="text-3xl font-bold text-gray-900 mr-3">
                    {craftsman.user.firstName || craftsman.user.email.split('@')[0]}師傅
                  </h1>
                  {craftsman.verificationStatus === 'VERIFIED' && (
                    <Badge variant="success">已驗證</Badge>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-2 mb-3">
                  {craftsman.craftSpecialties.map((specialty, index) => (
                    <Badge key={index} variant="info" size="sm">
                      {specialty}
                    </Badge>
                  ))}
                </div>
                
                <div className="flex items-center space-x-6 text-sm text-gray-600">
                  {craftsman.experienceYears > 0 && (
                    <span className="flex items-center">
                      <span className="w-4 h-4 mr-1">🏆</span>
                      {craftsman.experienceYears} 年經驗
                    </span>
                  )}
                  {craftsman.workshopLocation && (
                    <span className="flex items-center">
                      <span className="w-4 h-4 mr-1">📍</span>
                      {craftsman.workshopLocation}
                    </span>
                  )}
                  <span className="flex items-center">
                    <span className="w-4 h-4 mr-1">📚</span>
                    {craftsman._count.courses} 個課程
                  </span>
                  <span className="flex items-center">
                    <span className="w-4 h-4 mr-1">🎨</span>
                    {craftsman._count.products} 件作品
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <Button
                variant={isFollowing ? "outline" : "default"}
                onClick={handleFollow}
              >
                {isFollowing ? '已關注' : '關注師傅'}
              </Button>
              <Button variant="outline">
                發送訊息
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="profile">師傅介紹</TabsTrigger>
            <TabsTrigger value="courses">課程 ({craftsman._count.courses})</TabsTrigger>
            <TabsTrigger value="products">作品 ({craftsman._count.products})</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <div className="bg-white rounded-lg shadow-md p-6">
              {craftsman.bio && (craftsman.bio['zh-HK'] || craftsman.bio['en']) ? (
                <div className="prose prose-gray max-w-none">
                  <p className="text-gray-700 leading-relaxed text-lg">
                    {craftsman.bio['zh-HK'] || craftsman.bio['en']}
                  </p>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">📝</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    師傅尚未添加個人介紹
                  </h3>
                  <p className="text-gray-600">
                    請稍後再來查看師傅的詳細介紹
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="courses">
            {craftsman.courses.length > 0 ? (
              <Grid cols={1} mdCols={2} lgCols={3} gap={6}>
                {craftsman.courses.map((course) => (
                  <GridItem key={course.id}>
                    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                            {course.title['zh-HK'] || course.title['en']}
                          </h3>
                          <Badge variant={course.status === 'ACTIVE' ? 'success' : 'warning'} size="sm">
                            {course.status === 'ACTIVE' ? '開放報名' : '暫停'}
                          </Badge>
                        </div>
                        
                        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                          {course.description['zh-HK'] || course.description['en']}
                        </p>
                        
                        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                          <span>⏱️ {course.durationHours} 小時</span>
                          <span>👥 {course.maxParticipants - course._count.bookings} 位剩餘</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="text-2xl font-bold text-blue-600">
                            HK${course.price}
                          </div>
                          <Link href={`/courses/${course.id}`}>
                            <Button size="sm">查看詳情</Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </GridItem>
                ))}
              </Grid>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <div className="text-gray-400 text-6xl mb-4">📚</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  師傅尚未開設課程
                </h3>
                <p className="text-gray-600">
                  請稍後再來查看師傅的最新課程
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="products">
            {craftsman.products.length > 0 ? (
              <Grid cols={1} mdCols={2} lgCols={3} gap={6}>
                {craftsman.products.map((product) => (
                  <GridItem key={product.id}>
                    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="aspect-square bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                        {product.mediaFiles && product.mediaFiles.length > 0 ? (
                          <img 
                            src={product.mediaFiles[0].fileUrl} 
                            alt={product.name['zh-HK'] || product.name['en']}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center">
                            <div className="text-4xl mb-2">🎨</div>
                            <div className="text-sm text-gray-600">{product.craftCategory}</div>
                          </div>
                        )}
                      </div>
                      
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                            {product.name['zh-HK'] || product.name['en']}
                          </h3>
                          {product.isCustomizable && (
                            <Badge variant="info" size="sm">可客製化</Badge>
                          )}
                        </div>
                        
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                          {product.description['zh-HK'] || product.description['en']}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <div className="text-xl font-bold text-green-600">
                            HK${product.price}
                          </div>
                          <div className="flex space-x-2">
                            {product.inventoryQuantity > 0 ? (
                              <Badge variant="success" size="sm">有庫存</Badge>
                            ) : (
                              <Badge variant="error" size="sm">售罄</Badge>
                            )}
                            <Link href={`/products/${product.id}`}>
                              <Button size="sm">查看詳情</Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </GridItem>
                ))}
              </Grid>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <div className="text-gray-400 text-6xl mb-4">🎨</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  師傅尚未上架作品
                </h3>
                <p className="text-gray-600">
                  請稍後再來查看師傅的精美作品
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}