'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Navigation, Button, Badge, Grid, GridItem, Tabs, TabsContent, TabsList, TabsTrigger, Input } from '@/components/ui'
import { LanguageSwitcher } from '@/components/language/LanguageSwitcher'

interface Course {
  id: string
  title: Record<string, string>
  description: Record<string, string>
  craftCategory: string
  maxParticipants: number
  durationHours: number
  price: number
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
  _count: {
    bookings: number
  }
  learningMaterials?: Array<{
    id: string
    title: string
    type: string
    fileUrl?: string
    description?: string
    orderIndex: number
  }>
  comments?: Array<{
    id: string
    content: string
    rating: number
    createdAt: string
    user: {
      id: string
      email: string
      firstName?: string
      lastName?: string
    }
  }>
  _count: {
    bookings: number
    comments: number
  }
}

export default function CourseDetailPage() {
  const params = useParams()
  const courseId = params.id as string
  
  const [course, setCourse] = useState<Course | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [newComment, setNewComment] = useState('')
  const [newRating, setNewRating] = useState(5)
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)

  useEffect(() => {
    if (courseId) {
      fetchCourse()
    }
  }, [courseId])

  const fetchCourse = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}`)
      if (response.ok) {
        const data = await response.json()
        setCourse(data)
      } else {
        setError('課程不存在或已被刪除')
      }
    } catch (error) {
      setError('載入課程資訊時發生錯誤')
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

  if (error || !course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">課程不存在</h2>
          <p className="text-gray-600 mb-4">{error || '您要查看的課程可能已被刪除或不存在'}</p>
          <Link href="/courses">
            <Button>返回課程列表</Button>
          </Link>
        </div>
      </div>
    )
  }

  const availableSpots = course.maxParticipants - course._count.bookings
  const isFullyBooked = availableSpots <= 0

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setIsSubmittingComment(true)
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId: courseId,
          content: newComment,
          rating: newRating,
        }),
      })

      if (response.ok) {
        setNewComment('')
        setNewRating(5)
        // Refresh course data to show new comment
        fetchCourse()
      }
    } catch (error) {
      console.error('Failed to submit comment:', error)
    } finally {
      setIsSubmittingComment(false)
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
            <li><Link href="/courses" className="hover:text-gray-700">課程</Link></li>
            <li>/</li>
            <li className="text-gray-900">{course.title['zh-HK'] || course.title['en']}</li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Course Header */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {course.title['zh-HK'] || course.title['en']}
                  </h1>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span className="flex items-center">
                      <span className="w-4 h-4 mr-1">🏷️</span>
                      {course.craftCategory}
                    </span>
                    <span className="flex items-center">
                      <span className="w-4 h-4 mr-1">⏱️</span>
                      {course.durationHours} 小時
                    </span>
                    {course.comments && course.comments.length > 0 && (
                      <span className="flex items-center">
                        <span className="w-4 h-4 mr-1">⭐</span>
                        {(course.comments.reduce((sum, comment) => sum + comment.rating, 0) / course.comments.length).toFixed(1)}
                        ({course.comments.length} 評價)
                      </span>
                    )}
                  </div>
                </div>
                <Badge variant={isFullyBooked ? 'error' : availableSpots <= 3 ? 'warning' : 'success'}>
                  {isFullyBooked ? '已滿' : `${availableSpots}位`}
                </Badge>
              </div>

              <p className="text-gray-700 text-lg leading-relaxed">
                {course.description['zh-HK'] || course.description['en']}
              </p>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="overview">課程概覽</TabsTrigger>
                <TabsTrigger value="materials">
                  教學材料 ({course.learningMaterials?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="comments">
                  學員評價 ({course.comments?.length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">課程詳情</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">課程資訊</h3>
                      <ul className="space-y-2 text-sm text-gray-600">
                        <li className="flex items-center">
                          <span className="w-4 h-4 mr-2">👥</span>
                          最多 {course.maxParticipants} 人
                        </li>
                        <li className="flex items-center">
                          <span className="w-4 h-4 mr-2">⏰</span>
                          {course.durationHours} 小時課程
                        </li>
                        <li className="flex items-center">
                          <span className="w-4 h-4 mr-2">📍</span>
                          {course.craftsman.workshopLocation || '待定'}
                        </li>
                        <li className="flex items-center">
                          <span className="w-4 h-4 mr-2">📅</span>
                          已報名 {course._count.bookings} 人
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">適合對象</h3>
                      <ul className="space-y-1 text-sm text-gray-600">
                        <li>• 對{course.craftCategory}有興趣的初學者</li>
                        <li>• 希望學習傳統工藝的愛好者</li>
                        <li>• 想要體驗香港文化的人士</li>
                        <li>• 追求手工藝術的創作者</li>
                      </ul>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h3 className="font-medium text-gray-900 mb-3">課程特色</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                        <span className="w-8 h-8 mr-3 text-blue-600">🏆</span>
                        <span className="text-sm text-blue-800">認證師傅親自授課</span>
                      </div>
                      <div className="flex items-center p-3 bg-green-50 rounded-lg">
                        <span className="w-8 h-8 mr-3 text-green-600">👥</span>
                        <span className="text-sm text-green-800">小班教學，個別指導</span>
                      </div>
                      <div className="flex items-center p-3 bg-purple-50 rounded-lg">
                        <span className="w-8 h-8 mr-3 text-purple-600">🎨</span>
                        <span className="text-sm text-purple-800">實作為主，理論結合</span>
                      </div>
                      <div className="flex items-center p-3 bg-orange-50 rounded-lg">
                        <span className="w-8 h-8 mr-3 text-orange-600">📜</span>
                        <span className="text-sm text-orange-800">完成可獲結業證書</span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="materials">
                <div className="bg-white rounded-lg shadow-md p-6">
                  {course.learningMaterials && course.learningMaterials.length > 0 ? (
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 mb-4">教學材料</h2>
                      <div className="space-y-4">
                        {course.learningMaterials
                          .sort((a, b) => a.orderIndex - b.orderIndex)
                          .map((material, index) => (
                          <div key={material.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0">
                                  <span className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-lg">
                                    {material.type === 'video' ? '🎥' : 
                                     material.type === 'document' ? '📄' : 
                                     material.type === 'image' ? '🖼️' : '📎'}
                                  </span>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center mb-1">
                                    <span className="text-sm text-gray-500 mr-2">第{index + 1}項</span>
                                    <h3 className="font-medium text-gray-900">{material.title}</h3>
                                  </div>
                                  {material.description && (
                                    <p className="text-sm text-gray-600 mb-2">{material.description}</p>
                                  )}
                                  <div className="flex items-center text-xs text-gray-500">
                                    <span className="capitalize">{material.type}</span>
                                    {material.type === 'video' && <span className="ml-2">• 建議觀看時間：10-15分鐘</span>}
                                  </div>
                                </div>
                              </div>
                              {material.fileUrl && (
                                <Button variant="outline" size="sm">
                                  {material.type === 'video' ? '觀看' : '查看'}
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                        <div className="flex items-start">
                          <span className="w-6 h-6 mr-2 text-yellow-600">💡</span>
                          <div className="text-sm text-yellow-800">
                            <p className="font-medium mb-1">學習建議</p>
                            <p>建議在課程開始前預習相關材料，課程中可隨時參考這些資源。完成課程後，這些材料將持續提供給您複習使用。</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-gray-400 text-6xl mb-4">📚</div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        暫無教學材料
                      </h3>
                      <p className="text-gray-600">
                        師傅將在課程開始前上傳相關教學材料
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="comments">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">學員評價</h2>
                  
                  {/* Add Comment Form */}
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-3">分享您的學習體驗</h3>
                    <form onSubmit={handleSubmitComment}>
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">評分</label>
                        {renderStars(newRating, true, setNewRating)}
                      </div>
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">評價內容</label>
                        <textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          rows={3}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="分享您對這個課程的看法和建議..."
                          required
                        />
                      </div>
                      <Button 
                        type="submit" 
                        size="sm" 
                        disabled={isSubmittingComment || !newComment.trim()}
                      >
                        {isSubmittingComment ? '提交中...' : '提交評價'}
                      </Button>
                    </form>
                  </div>

                  {/* Comments List */}
                  {course.comments && course.comments.length > 0 ? (
                    <div className="space-y-4">
                      {course.comments.map((comment) => (
                        <div key={comment.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-blue-800">
                                  {(comment.user.firstName || comment.user.email.split('@')[0]).charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">
                                  {comment.user.firstName || comment.user.email.split('@')[0]}
                                </div>
                                <div className="flex items-center space-x-2">
                                  {renderStars(comment.rating)}
                                  <span className="text-sm text-gray-500">
                                    {new Date(comment.createdAt).toLocaleDateString('zh-HK')}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <p className="text-gray-700 ml-13">{comment.content}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-gray-400 text-4xl mb-3">💬</div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        暫無學員評價
                      </h3>
                      <p className="text-gray-600">
                        成為第一個分享學習體驗的學員
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Booking Card */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6 sticky top-4">
              <div className="text-center mb-6">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  HK${course.price}
                </div>
                <div className="text-sm text-gray-600">每人費用</div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">課程時長:</span>
                  <span className="font-medium">{course.durationHours} 小時</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">剩餘名額:</span>
                  <span className={`font-medium ${isFullyBooked ? 'text-red-600' : 'text-green-600'}`}>
                    {isFullyBooked ? '已滿' : `${availableSpots} 位`}
                  </span>
                </div>
              </div>

              <Link href={`/courses/${courseId}/book`}>
                <Button className="w-full" disabled={isFullyBooked}>
                  {isFullyBooked ? '課程已滿' : '立即預約'}
                </Button>
              </Link>

              <div className="mt-4 text-xs text-gray-500 text-center">
                預約後將收到確認郵件
              </div>
            </div>

            {/* Instructor Card */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">授課師傅</h3>
              
              <div className="flex items-start space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">👨‍🏫</span>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <h4 className="font-medium text-gray-900">
                      {course.craftsman.user.firstName} {course.craftsman.user.lastName}
                    </h4>
                    {course.craftsman.verificationStatus === 'verified' && (
                      <span className="ml-2 text-blue-600">✓</span>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-3">
                    專長: {course.craftsman.craftSpecialties.join(', ')}
                  </div>
                  
                  {course.craftsman.bio && (
                    <p className="text-sm text-gray-600 line-clamp-3">
                      {course.craftsman.bio['zh-HK'] || course.craftsman.bio['en']}
                    </p>
                  )}
                  
                  <Link href={`/craftsmen/${course.craftsman.id}`} className="mt-3 inline-block">
                    <Button variant="outline" size="sm">
                      查看檔案
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}