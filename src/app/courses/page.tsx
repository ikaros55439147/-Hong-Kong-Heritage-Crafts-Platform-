'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Navigation, Button, Input, Select, Grid, GridItem, Badge } from '@/components/ui'
import { LanguageSwitcher } from '@/components/language/LanguageSwitcher'
import { SearchBox } from '@/components/search/SearchBox'

interface Course {
  id: string
  craftsmanId: string
  title: Record<string, string>
  description: Record<string, string>
  craftCategory: string
  maxParticipants: number
  durationHours: number
  price: number
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
  _count: {
    bookings: number
  }
}

interface CourseCardProps {
  course: Course
}

function CourseCard({ course }: CourseCardProps) {
  const availableSpots = course.maxParticipants - course._count.bookings
  const isFullyBooked = availableSpots <= 0

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <div className="h-48 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-2">🎨</div>
          <div className="text-sm text-gray-600">{course.craftCategory}</div>
        </div>
      </div>
      
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-xl font-semibold text-gray-900 line-clamp-2">
            {course.title['zh-HK'] || course.title['en'] || '課程標題'}
          </h3>
          <Badge variant={isFullyBooked ? 'error' : availableSpots <= 3 ? 'warning' : 'success'}>
            {isFullyBooked ? '已滿' : `${availableSpots}位`}
          </Badge>
        </div>

        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
          {course.description['zh-HK'] || course.description['en'] || '課程描述'}
        </p>

        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-600">
            <span className="w-4 h-4 mr-2">👨‍🏫</span>
            <span>
              {course.craftsman.user.firstName} {course.craftsman.user.lastName}
              {course.craftsman.verificationStatus === 'verified' && (
                <span className="ml-1 text-blue-600">✓</span>
              )}
            </span>
          </div>
          
          <div className="flex items-center text-sm text-gray-600">
            <span className="w-4 h-4 mr-2">⏱️</span>
            <span>{course.durationHours} 小時</span>
          </div>
          
          <div className="flex items-center text-sm text-gray-600">
            <span className="w-4 h-4 mr-2">📍</span>
            <span>{course.craftsman.workshopLocation || '待定'}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold text-blue-600">
            HK${course.price}
          </div>
          <div className="flex space-x-2">
            <Link href={`/courses/${course.id}`}>
              <Button variant="outline" size="sm">
                詳情
              </Button>
            </Link>
            <Link href={`/courses/${course.id}/book`}>
              <Button size="sm" disabled={isFullyBooked}>
                {isFullyBooked ? '已滿' : '預約'}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [priceRange, setPriceRange] = useState('')
  const [sortBy, setSortBy] = useState('newest')

  const craftCategories = [
    '手雕麻將', '吹糖', '竹編', '打鐵', '陶藝', '木雕', 
    '刺繡', '剪紙', '書法', '印章雕刻', '玉雕', '皮革工藝'
  ]

  const priceRanges = [
    { label: '全部價格', value: '' },
    { label: 'HK$0 - HK$500', value: '0-500' },
    { label: 'HK$500 - HK$1000', value: '500-1000' },
    { label: 'HK$1000 - HK$2000', value: '1000-2000' },
    { label: 'HK$2000+', value: '2000+' }
  ]

  useEffect(() => {
    fetchCourses()
  }, [])

  useEffect(() => {
    filterAndSortCourses()
  }, [courses, searchQuery, selectedCategory, priceRange, sortBy])

  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/courses')
      if (response.ok) {
        const data = await response.json()
        setCourses(data)
      }
    } catch (error) {
      console.error('Failed to fetch courses:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterAndSortCourses = () => {
    let filtered = [...courses]

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(course => 
        course.title['zh-HK']?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.title['en']?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.description['zh-HK']?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.craftCategory.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `${course.craftsman.user.firstName} ${course.craftsman.user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(course => course.craftCategory === selectedCategory)
    }

    // Filter by price range
    if (priceRange) {
      const [min, max] = priceRange.split('-').map(Number)
      filtered = filtered.filter(course => {
        if (priceRange === '2000+') {
          return course.price >= 2000
        }
        return course.price >= min && course.price <= max
      })
    }

    // Sort courses
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
        case 'duration':
          return a.durationHours - b.durationHours
        case 'popularity':
          return b._count.bookings - a._count.bookings
        default:
          return 0
      }
    })

    setFilteredCourses(filtered)
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
              <Link href="/courses" className="text-blue-600 font-medium">
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
              傳統工藝課程
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              跟隨專業師傅學習正宗的香港傳統手工藝技術
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto">
              <SearchBox
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="搜索課程名稱、工藝類型或師傅姓名..."
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
              <label className="text-sm font-medium text-gray-700">排序:</label>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="min-w-[120px]"
              >
                <option value="newest">最新課程</option>
                <option value="oldest">最早課程</option>
                <option value="price-low">價格由低至高</option>
                <option value="price-high">價格由高至低</option>
                <option value="duration">課程時長</option>
                <option value="popularity">最受歡迎</option>
              </Select>
            </div>

            <div className="ml-auto">
              <span className="text-sm text-gray-600">
                找到 {filteredCourses.length} 個課程
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Courses Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">載入中...</p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📚</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              沒有找到符合條件的課程
            </h3>
            <p className="text-gray-600">
              請嘗試調整搜索條件或篩選器
            </p>
          </div>
        ) : (
          <Grid cols={1} mdCols={2} lgCols={3} gap={6}>
            {filteredCourses.map((course) => (
              <GridItem key={course.id}>
                <CourseCard course={course} />
              </GridItem>
            ))}
          </Grid>
        )}
      </div>

      {/* Call to Action */}
      <div className="bg-blue-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            想開設自己的課程？
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            成為認證師傅，分享您的技藝知識，培養下一代工藝傳承者
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