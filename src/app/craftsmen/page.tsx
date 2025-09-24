'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Navigation, Button, Input, Select, Grid, GridItem } from '@/components/ui'
import { LanguageSwitcher } from '@/components/language/LanguageSwitcher'
import { CraftsmanCard } from '@/components/craftsman/CraftsmanCard'
import { SearchBox } from '@/components/search/SearchBox'

interface Craftsman {
  id: string
  userId: string
  craftSpecialties: string[]
  bio: Record<string, string>
  experienceYears: number
  workshopLocation: string
  verificationStatus: string
  user: {
    firstName: string
    lastName: string
    email: string
  }
  _count: {
    courses: number
    products: number
  }
}

export default function CraftsmenPage() {
  const [craftsmen, setCraftsmen] = useState<Craftsman[]>([])
  const [filteredCraftsmen, setFilteredCraftsmen] = useState<Craftsman[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCraft, setSelectedCraft] = useState('')
  const [selectedLocation, setSelectedLocation] = useState('')
  const [sortBy, setSortBy] = useState('name')

  const craftCategories = [
    '手雕麻將', '吹糖', '竹編', '打鐵', '陶藝', '木雕', 
    '刺繡', '剪紙', '書法', '印章雕刻', '玉雕', '皮革工藝'
  ]

  const locations = [
    '中環', '灣仔', '銅鑼灣', '尖沙咀', '旺角', '深水埗',
    '荃灣', '沙田', '大埔', '元朗', '屯門', '將軍澳'
  ]

  useEffect(() => {
    fetchCraftsmen()
  }, [])

  useEffect(() => {
    filterAndSortCraftsmen()
  }, [craftsmen, searchQuery, selectedCraft, selectedLocation, sortBy])

  const fetchCraftsmen = async () => {
    try {
      const response = await fetch('/api/craftsmen')
      if (response.ok) {
        const data = await response.json()
        setCraftsmen(data)
      }
    } catch (error) {
      console.error('Failed to fetch craftsmen:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterAndSortCraftsmen = () => {
    let filtered = [...craftsmen]

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(craftsman => 
        craftsman.user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        craftsman.user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        craftsman.craftSpecialties.some(specialty => 
          specialty.toLowerCase().includes(searchQuery.toLowerCase())
        ) ||
        craftsman.bio['zh-HK']?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filter by craft specialty
    if (selectedCraft) {
      filtered = filtered.filter(craftsman =>
        craftsman.craftSpecialties.includes(selectedCraft)
      )
    }

    // Filter by location
    if (selectedLocation) {
      filtered = filtered.filter(craftsman =>
        craftsman.workshopLocation?.includes(selectedLocation)
      )
    }

    // Sort craftsmen
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return `${a.user.firstName} ${a.user.lastName}`.localeCompare(
            `${b.user.firstName} ${b.user.lastName}`
          )
        case 'experience':
          return (b.experienceYears || 0) - (a.experienceYears || 0)
        case 'courses':
          return b._count.courses - a._count.courses
        case 'products':
          return b._count.products - a._count.products
        default:
          return 0
      }
    })

    setFilteredCraftsmen(filtered)
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
              <Link href="/about" className="text-gray-700 hover:text-gray-900">
                關於我們
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

      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              認證工藝師傅
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              探索香港傳統工藝的專業師傅，學習正宗的手工技藝
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto">
              <SearchBox
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="搜索師傅姓名或工藝類型..."
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
                value={selectedCraft}
                onChange={(e) => setSelectedCraft(e.target.value)}
                className="min-w-[150px]"
              >
                <option value="">全部工藝</option>
                {craftCategories.map(craft => (
                  <option key={craft} value={craft}>{craft}</option>
                ))}
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">地區:</label>
              <Select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="min-w-[120px]"
              >
                <option value="">全部地區</option>
                {locations.map(location => (
                  <option key={location} value={location}>{location}</option>
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
                <option value="name">姓名</option>
                <option value="experience">經驗年數</option>
                <option value="courses">課程數量</option>
                <option value="products">作品數量</option>
              </Select>
            </div>

            <div className="ml-auto">
              <span className="text-sm text-gray-600">
                找到 {filteredCraftsmen.length} 位師傅
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Craftsmen Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">載入中...</p>
          </div>
        ) : filteredCraftsmen.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🔍</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              沒有找到符合條件的師傅
            </h3>
            <p className="text-gray-600">
              請嘗試調整搜索條件或篩選器
            </p>
          </div>
        ) : (
          <Grid cols={1} mdCols={2} lgCols={3} gap={6}>
            {filteredCraftsmen.map((craftsman) => (
              <GridItem key={craftsman.id}>
                <CraftsmanCard craftsman={craftsman} />
              </GridItem>
            ))}
          </Grid>
        )}
      </div>

      {/* Call to Action */}
      <div className="bg-blue-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            想成為認證師傅？
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            加入我們的平台，分享您的技藝，傳承傳統工藝文化
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