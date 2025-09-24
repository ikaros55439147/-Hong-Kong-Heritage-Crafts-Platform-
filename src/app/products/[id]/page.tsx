'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Navigation, Button, Badge, Grid, GridItem, Input, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui'
import { LanguageSwitcher } from '@/components/language/LanguageSwitcher'

interface Product {
  id: string
  name: Record<string, string>
  description: Record<string, string>
  price: number
  inventoryQuantity: number
  isCustomizable: boolean
  craftCategory: string
  status: string
  craftsman: {
    id: string
    user: {
      firstName: string
      lastName: string
    }
    craftSpecialties: string[]
    workshopLocation: string
    verificationStatus: string
    bio: Record<string, string>
  }
  mediaFiles?: Array<{
    id: string
    fileUrl: string
    fileType: string
  }>
  reviews?: Array<{
    id: string
    rating: number
    comment: string
    createdAt: string
    user: {
      id: string
      email: string
      firstName?: string
      lastName?: string
    }
  }>
  _count: {
    reviews: number
  }
}

interface RecommendedProduct {
  id: string
  name: Record<string, string>
  price: number
  craftCategory: string
  mediaFiles?: Array<{
    id: string
    fileUrl: string
    fileType: string
  }>
}

export default function ProductDetailPage() {
  const params = useParams()
  const productId = params.id as string
  
  const [product, setProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [activeTab, setActiveTab] = useState('details')
  const [customizationNotes, setCustomizationNotes] = useState('')
  const [recommendedProducts, setRecommendedProducts] = useState<RecommendedProduct[]>([])
  const [newReview, setNewReview] = useState('')
  const [newRating, setNewRating] = useState(5)
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)

  useEffect(() => {
    if (productId) {
      fetchProduct()
      fetchRecommendedProducts()
    }
  }, [productId])

  const fetchProduct = async () => {
    try {
      const response = await fetch(`/api/products/${productId}`)
      if (response.ok) {
        const data = await response.json()
        setProduct(data)
      } else {
        setError('產品不存在或已被刪除')
      }
    } catch (error) {
      setError('載入產品資訊時發生錯誤')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchRecommendedProducts = async () => {
    try {
      const response = await fetch(`/api/recommendations/cross-sell?productId=${productId}`)
      if (response.ok) {
        const data = await response.json()
        setRecommendedProducts(data.slice(0, 4)) // Show top 4 recommendations
      }
    } catch (error) {
      console.error('Failed to fetch recommendations:', error)
    }
  }

  const handleAddToCart = async () => {
    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          quantity,
          customizationNotes: product?.isCustomizable ? customizationNotes : undefined,
        }),
      })

      if (response.ok) {
        // Show success message or update cart count
        console.log('Added to cart successfully')
      }
    } catch (error) {
      console.error('Failed to add to cart:', error)
    }
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newReview.trim()) return

    setIsSubmittingReview(true)
    try {
      const response = await fetch(`/api/products/${productId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating: newRating,
          comment: newReview,
        }),
      })

      if (response.ok) {
        setNewReview('')
        setNewRating(5)
        // Refresh product data to show new review
        fetchProduct()
      }
    } catch (error) {
      console.error('Failed to submit review:', error)
    } finally {
      setIsSubmittingReview(false)
    }
  }

  const renderStars = (rating: number, interactive = false, onRatingChange?: (rating: number) => void) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type={interactive ? "button" : undefined}
            onClick={interactive && onRatingChange ? () => onRatingChange(star) : undefined}
            className={`text-lg ${
              star <= rating 
                ? 'text-yellow-400' 
                : 'text-gray-300'
            } ${interactive ? 'hover:text-yellow-400 cursor-pointer' : ''}`}
            disabled={!interactive}
          >
            ★
          </button>
        ))}
      </div>
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

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">產品不存在</h2>
          <p className="text-gray-600 mb-4">{error || '您要查看的產品可能已被刪除或不存在'}</p>
          <Link href="/products">
            <Button>返回商品列表</Button>
          </Link>
        </div>
      </div>
    )
  }

  const isOutOfStock = product.inventoryQuantity <= 0
  const isLowStock = product.inventoryQuantity <= 5 && product.inventoryQuantity > 0

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
              <Link href="/products" className="text-blue-600 font-medium">
                工藝品商店
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              <button className="relative p-2 text-gray-600 hover:text-gray-900">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5-6m0 0h15M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6" />
                </svg>
                <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  0
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
            <li><Link href="/products" className="hover:text-gray-700">商品</Link></li>
            <li>/</li>
            <li className="text-gray-900">{product.name['zh-HK'] || product.name['en']}</li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Product Images */}
          <div>
            <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4">
              <div className="aspect-square bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                {product.mediaFiles && product.mediaFiles.length > 0 ? (
                  <img 
                    src={product.mediaFiles[selectedImageIndex]?.fileUrl} 
                    alt={product.name['zh-HK'] || product.name['en']}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center">
                    <div className="text-6xl mb-4">🎨</div>
                    <div className="text-lg text-gray-600">{product.craftCategory}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Thumbnail Images */}
            {product.mediaFiles && product.mediaFiles.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {product.mediaFiles.map((media, index) => (
                  <button
                    key={media.id}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`aspect-square bg-white rounded-lg overflow-hidden border-2 ${
                      selectedImageIndex === index ? 'border-blue-600' : 'border-gray-200'
                    }`}
                  >
                    <img 
                      src={media.fileUrl} 
                      alt={`${product.name['zh-HK']} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            <div className="bg-white rounded-lg shadow-md p-6">
              {/* Product Header */}
              <div className="mb-6">
                <div className="flex items-start justify-between mb-4">
                  <h1 className="text-3xl font-bold text-gray-900">
                    {product.name['zh-HK'] || product.name['en']}
                  </h1>
                  <div className="flex flex-col items-end space-y-1">
                    {product.isCustomizable && (
                      <Badge variant="info" size="sm">可客製化</Badge>
                    )}
                    {isOutOfStock && (
                      <Badge variant="error" size="sm">售罄</Badge>
                    )}
                    {isLowStock && (
                      <Badge variant="warning" size="sm">存量不多</Badge>
                    )}
                  </div>
                </div>

                <div className="text-4xl font-bold text-blue-600 mb-4">
                  HK${product.price.toLocaleString()}
                </div>

                <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
                  <span className="flex items-center">
                    <span className="w-4 h-4 mr-1">🏷️</span>
                    {product.craftCategory}
                  </span>
                  {!isOutOfStock && (
                    <span className="flex items-center">
                      <span className="w-4 h-4 mr-1">📦</span>
                      庫存: {product.inventoryQuantity}
                    </span>
                  )}
                  {product.reviews && product.reviews.length > 0 && (
                    <span className="flex items-center">
                      <span className="w-4 h-4 mr-1">⭐</span>
                      {(product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length).toFixed(1)}
                      ({product.reviews.length} 評價)
                    </span>
                  )}
                </div>

                <p className="text-gray-700 text-lg leading-relaxed mb-6">
                  {product.description['zh-HK'] || product.description['en']}
                </p>
              </div>

              {/* Customization Options */}
              {product.isCustomizable && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">客製化選項</h3>
                  <p className="text-sm text-blue-700 mb-3">
                    此商品支持客製化，請在下方說明您的特殊需求
                  </p>
                  <textarea
                    value={customizationNotes}
                    onChange={(e) => setCustomizationNotes(e.target.value)}
                    rows={3}
                    className="w-full border border-blue-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="請描述您的客製化需求，如尺寸、顏色、圖案等..."
                  />
                </div>
              )}

              {/* Quantity and Add to Cart */}
              {!isOutOfStock && (
                <div className="mb-6">
                  <div className="flex items-center space-x-4 mb-4">
                    <label className="text-sm font-medium text-gray-700">數量:</label>
                    <div className="flex items-center border border-gray-300 rounded-md">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="px-3 py-2 text-gray-600 hover:text-gray-900"
                      >
                        -
                      </button>
                      <Input
                        type="number"
                        min="1"
                        max={product.inventoryQuantity}
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, Math.min(product.inventoryQuantity, parseInt(e.target.value) || 1)))}
                        className="w-16 text-center border-0 focus:ring-0"
                      />
                      <button
                        onClick={() => setQuantity(Math.min(product.inventoryQuantity, quantity + 1))}
                        className="px-3 py-2 text-gray-600 hover:text-gray-900"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <Button
                      onClick={handleAddToCart}
                      className="flex-1"
                      disabled={isOutOfStock}
                    >
                      加入購物車
                    </Button>
                    <Button variant="outline" className="flex-1">
                      立即購買
                    </Button>
                  </div>
                </div>
              )}

              {/* Product Features */}
              <div className="border-t pt-6">
                <h3 className="font-medium text-gray-900 mb-3">產品特色</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <span className="w-4 h-4 mr-2">✨</span>
                    100% 手工製作
                  </li>
                  <li className="flex items-center">
                    <span className="w-4 h-4 mr-2">🏆</span>
                    認證師傅作品
                  </li>
                  <li className="flex items-center">
                    <span className="w-4 h-4 mr-2">🎁</span>
                    精美包裝
                  </li>
                  {product.isCustomizable && (
                    <li className="flex items-center">
                      <span className="w-4 h-4 mr-2">🎨</span>
                      支持客製化設計
                    </li>
                  )}
                </ul>
              </div>
            </div>

            {/* Craftsman Info */}
            <div className="bg-white rounded-lg shadow-md p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">工藝師傅</h3>
              
              <div className="flex items-start space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">👨‍🎨</span>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <h4 className="font-medium text-gray-900">
                      {product.craftsman.user.firstName} {product.craftsman.user.lastName}
                    </h4>
                    {product.craftsman.verificationStatus === 'verified' && (
                      <span className="ml-2 text-blue-600">✓</span>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-3">
                    專長: {product.craftsman.craftSpecialties.join(', ')}
                  </div>
                  
                  {product.craftsman.bio && (
                    <p className="text-sm text-gray-600 line-clamp-3 mb-3">
                      {product.craftsman.bio['zh-HK'] || product.craftsman.bio['en']}
                    </p>
                  )}
                  
                  <Link href={`/craftsmen/${product.craftsman.id}`}>
                    <Button variant="outline" size="sm">
                      查看師傅檔案
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Details Tabs */}
        <div className="mt-8">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="details">商品詳情</TabsTrigger>
              <TabsTrigger value="reviews">
                顧客評價 ({product.reviews?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="craftsman">師傅介紹</TabsTrigger>
            </TabsList>

            <TabsContent value="details">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">商品詳情</h2>
                
                <div className="prose prose-gray max-w-none">
                  <p className="text-gray-700 leading-relaxed mb-6">
                    {product.description['zh-HK'] || product.description['en']}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">商品規格</h3>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex justify-between">
                        <span>工藝類型：</span>
                        <span className="font-medium">{product.craftCategory}</span>
                      </li>
                      <li className="flex justify-between">
                        <span>製作方式：</span>
                        <span className="font-medium">純手工製作</span>
                      </li>
                      <li className="flex justify-between">
                        <span>材質：</span>
                        <span className="font-medium">天然材料</span>
                      </li>
                      <li className="flex justify-between">
                        <span>產地：</span>
                        <span className="font-medium">香港</span>
                      </li>
                      {product.isCustomizable && (
                        <li className="flex justify-between">
                          <span>客製化：</span>
                          <span className="font-medium text-blue-600">支持</span>
                        </li>
                      )}
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">購買須知</h3>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li>• 每件商品均為手工製作，可能存在細微差異</li>
                      <li>• 商品圖片僅供參考，以實物為準</li>
                      <li>• 支持7天無理由退換貨</li>
                      <li>• 香港地區免費送貨</li>
                      {product.isCustomizable && (
                        <li>• 客製化商品製作時間為7-14個工作日</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="reviews">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">顧客評價</h2>
                
                {/* Add Review Form */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-3">分享您的購買體驗</h3>
                  <form onSubmit={handleSubmitReview}>
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">評分</label>
                      {renderStars(newRating, true, setNewRating)}
                    </div>
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">評價內容</label>
                      <textarea
                        value={newReview}
                        onChange={(e) => setNewReview(e.target.value)}
                        rows={3}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="分享您對這件商品的看法..."
                        required
                      />
                    </div>
                    <Button 
                      type="submit" 
                      size="sm" 
                      disabled={isSubmittingReview || !newReview.trim()}
                    >
                      {isSubmittingReview ? '提交中...' : '提交評價'}
                    </Button>
                  </form>
                </div>

                {/* Reviews List */}
                {product.reviews && product.reviews.length > 0 ? (
                  <div className="space-y-4">
                    {product.reviews.map((review) => (
                      <div key={review.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-green-800">
                                {(review.user.firstName || review.user.email.split('@')[0]).charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {review.user.firstName || review.user.email.split('@')[0]}
                              </div>
                              <div className="flex items-center space-x-2">
                                {renderStars(review.rating)}
                                <span className="text-sm text-gray-500">
                                  {new Date(review.createdAt).toLocaleDateString('zh-HK')}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <p className="text-gray-700 ml-13">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-4xl mb-3">💬</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      暫無顧客評價
                    </h3>
                    <p className="text-gray-600">
                      成為第一個分享購買體驗的顧客
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="craftsman">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">工藝師傅</h2>
                
                <div className="flex items-start space-x-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-3xl">👨‍🎨</span>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center mb-3">
                      <h3 className="text-xl font-semibold text-gray-900 mr-3">
                        {product.craftsman.user.firstName} {product.craftsman.user.lastName}
                      </h3>
                      {product.craftsman.verificationStatus === 'verified' && (
                        <Badge variant="success">已驗證師傅</Badge>
                      )}
                    </div>
                    
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-2">
                        {product.craftsman.craftSpecialties.map((specialty, index) => (
                          <Badge key={index} variant="info" size="sm">
                            {specialty}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    {product.craftsman.bio && (
                      <p className="text-gray-700 leading-relaxed mb-4">
                        {product.craftsman.bio['zh-HK'] || product.craftsman.bio['en']}
                      </p>
                    )}
                    
                    <div className="flex space-x-3">
                      <Link href={`/craftsmen/${product.craftsman.id}`}>
                        <Button variant="outline" size="sm">
                          查看師傅檔案
                        </Button>
                      </Link>
                      <Button variant="outline" size="sm">
                        查看更多作品
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Recommended Products */}
        {recommendedProducts.length > 0 && (
          <div className="mt-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">相關推薦</h2>
              <Grid cols={1} mdCols={2} lgCols={4} gap={4}>
                {recommendedProducts.map((recommendedProduct) => (
                  <GridItem key={recommendedProduct.id}>
                    <Link href={`/products/${recommendedProduct.id}`}>
                      <div className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                        <div className="aspect-square bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                          {recommendedProduct.mediaFiles && recommendedProduct.mediaFiles.length > 0 ? (
                            <img 
                              src={recommendedProduct.mediaFiles[0].fileUrl} 
                              alt={recommendedProduct.name['zh-HK'] || recommendedProduct.name['en']}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-center">
                              <div className="text-3xl mb-1">🎨</div>
                              <div className="text-xs text-gray-600">{recommendedProduct.craftCategory}</div>
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-1">
                            {recommendedProduct.name['zh-HK'] || recommendedProduct.name['en']}
                          </h3>
                          <div className="text-lg font-bold text-green-600">
                            HK${recommendedProduct.price}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </GridItem>
                ))}
              </Grid>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}