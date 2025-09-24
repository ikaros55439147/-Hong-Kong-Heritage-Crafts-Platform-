'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Navigation, Button, Input, Select, Grid, GridItem, Badge } from '@/components/ui'
import { LanguageSwitcher } from '@/components/language/LanguageSwitcher'
import { SearchBox } from '@/components/search/SearchBox'

interface Product {
  id: string
  craftsmanId: string
  name: Record<string, string>
  description: Record<string, string>
  price: number
  inventoryQuantity: number
  isCustomizable: boolean
  craftCategory: string
  status: string
  createdAt: string
  craftsman: {
    id: string
    user: {
      firstName: string
      lastName: string
    }
    craftSpecialties: string[]
    workshopLocation: string
    verificationStatus: string
  }
  mediaFiles?: Array<{
    id: string
    fileUrl: string
    fileType: string
  }>
}

interface ProductCardProps {
  product: Product
}

function ProductCard({ product }: ProductCardProps) {
  const isOutOfStock = product.inventoryQuantity <= 0
  const isLowStock = product.inventoryQuantity <= 5 && product.inventoryQuantity > 0

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative">
        <div className="h-64 bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
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
        
        {/* Status badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.isCustomizable && (
            <Badge variant="info" className="text-xs">
              可客製化
            </Badge>
          )}
          {isOutOfStock && (
            <Badge variant="error" className="text-xs">
              售罄
            </Badge>
          )}
          {isLowStock && (
            <Badge variant="warning" className="text-xs">
              存量不多
            </Badge>
          )}
        </div>

        {/* Wishlist button */}
        <button className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:bg-gray-50">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>
      
      <div className="p-4">
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 mb-1">
            {product.name['zh-HK'] || product.name['en'] || '產品名稱'}
          </h3>
          <p className="text-sm text-gray-600">
            by {product.craftsman.user.firstName} {product.craftsman.user.lastName}
            {product.craftsman.verificationStatus === 'verified' && (
              <span className="ml-1 text-blue-600">✓</span>
            )}
          </p>
        </div>

        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {product.description['zh-HK'] || product.description['en'] || '產品描述'}
        </p>

        <div className="flex items-center justify-between mb-3">
          <div className="text-xl font-bold text-blue-600">
            HK${product.price.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500">
            {!isOutOfStock && `庫存: ${product.inventoryQuantity}`}
          </div>
        </div>

        <div className="flex space-x-2">
          <Link href={`/products/${product.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              查看詳情
            </Button>
          </Link>
          <Button 
            size="sm" 
            className="flex-1"
            disabled={isOutOfStock}
            onClick={() => {
              // Add to cart functionality
              console.log('Add to cart:', product.id)
            }}
          >
            {isOutOfStock ? '售罄' : '加入購物車'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [priceRange, setPriceRange] = useState('')
  const [availability, setAvailability] = useState('')
  const [sortBy, setSortBy] = useState('newest')

  const craftCategories = [
    '手雕麻將', '吹糖', '竹編', '打鐵', '陶藝', '木雕', 
    '刺繡', '剪紙', '書法', '印章雕刻', '玉雕', '皮革工藝'
  ]

  const priceRanges = [
    { label: '全部價格', value: '' },
    { label: 'HK$0 - HK$500', value: '0-500' },
    { label: 'HK$500 - HK$1500', value: '500-1500' },
    { label: 'HK$1500 - HK$3000', value: '1500-3000' },
    { label: 'HK$3000 - HK$5000', value: '3000-5000' },
    { label: 'HK$5000+', value: '5000+' }
  ]

  const availabilityOptions = [
    { label: '全部商品', value: '' },
    { label: '有現貨', value: 'in-stock' },
    { label: '可客製化', value: 'customizable' },
    { label: '存量不多', value: 'low-stock' }
  ]

  useEffect(() => {
    fetchProducts()
  }, [])

  useEffect(() => {
    filterAndSortProducts()
  }, [products, searchQuery, selectedCategory, priceRange, availability, sortBy])

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products')
      if (response.ok) {
        const data = await response.json()
        setProducts(data)
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterAndSortProducts = () => {
    let filtered = [...products]

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(product => 
        product.name['zh-HK']?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.name['en']?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description['zh-HK']?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.craftCategory.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `${product.craftsman.user.firstName} ${product.craftsman.user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(product => product.craftCategory === selectedCategory)
    }

    // Filter by price range
    if (priceRange) {
      const [min, max] = priceRange.split('-').map(Number)
      filtered = filtered.filter(product => {
        if (priceRange === '5000+') {
          return product.price >= 5000
        }
        return product.price >= min && product.price <= max
      })
    }

    // Filter by availability
    if (availability) {
      filtered = filtered.filter(product => {
        switch (availability) {
          case 'in-stock':
            return product.inventoryQuantity > 0
          case 'customizable':
            return product.isCustomizable
          case 'low-stock':
            return product.inventoryQuantity <= 5 && product.inventoryQuantity > 0
          default:
            return true
        }
      })
    }

    // Sort products
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case 'price-low':
          return a.price - b.price
        case 'price-high':
          return b.price - a.price
        case 'name':
          return (a.name['zh-HK'] || a.name['en'] || '').localeCompare(
            b.name['zh-HK'] || b.name['en'] || ''
          )
        default:
          return 0
      }
    })

    setFilteredProducts(filtered)
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
              <Link href="/products" className="text-blue-600 font-medium">
                工藝品商店
              </Link>
              <Link href="/about" className="text-gray-700 hover:text-gray-900">
                關於我們
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

      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              傳統工藝品商店
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              購買正宗的香港傳統手工藝品，支持本地工藝師傅
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto">
              <SearchBox
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="搜索產品名稱、工藝類型或師傅姓名..."
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">工藝類型:</label>
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="min-w-[150px]"
              >
                <option value="">全部工藝</option>
                {craftCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">價格範圍:</label>
              <Select
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
                className="min-w-[150px]"
              >
                {priceRanges.map(range => (
                  <option key={range.value} value={range.value}>{range.label}</option>
                ))}
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">供應狀況:</label>
              <Select
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
                className="min-w-[120px]"
              >
                {availabilityOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">排序:</label>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="min-w-[120px]"
              >
                <option value="newest">最新上架</option>
                <option value="oldest">最早上架</option>
                <option value="price-low">價格由低至高</option>
                <option value="price-high">價格由高至低</option>
                <option value="name">產品名稱</option>
              </Select>
            </div>

            <div className="ml-auto">
              <span className="text-sm text-gray-600">
                找到 {filteredProducts.length} 件商品
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">載入中...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🛍️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              沒有找到符合條件的商品
            </h3>
            <p className="text-gray-600">
              請嘗試調整搜索條件或篩選器
            </p>
          </div>
        ) : (
          <Grid cols={1} mdCols={2} lgCols={4} gap={6}>
            {filteredProducts.map((product) => (
              <GridItem key={product.id}>
                <ProductCard product={product} />
              </GridItem>
            ))}
          </Grid>
        )}
      </div>

      {/* Call to Action */}
      <div className="bg-blue-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            想在平台上販售您的作品？
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            成為認證師傅，在我們的平台上展示和販售您的手工藝品
          </p>
          <Link href="/auth/register">
            <Button size="lg">
              申請成為師傅
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}