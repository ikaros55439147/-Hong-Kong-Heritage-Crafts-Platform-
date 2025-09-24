'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Navigation, Button, Form, FormField, FormLabel, FormError, Alert, Input, Select, Textarea } from '@/components/ui'
import { LanguageSwitcher } from '@/components/language/LanguageSwitcher'

interface Course {
  id: string
  title: Record<string, string>
  description: Record<string, string>
  craftCategory: string
  maxParticipants: number
  durationHours: number
  price: number
  craftsman: {
    user: {
      firstName: string
      lastName: string
    }
    workshopLocation: string
  }
  _count: {
    bookings: number
  }
}

interface BookingForm {
  participantName: string
  participantEmail: string
  participantPhone: string
  experienceLevel: string
  specialRequests: string
  emergencyContact: string
  emergencyPhone: string
}

export default function CourseBookingPage() {
  const router = useRouter()
  const params = useParams()
  const courseId = params.id as string

  const [course, setCourse] = useState<Course | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState<BookingForm>({
    participantName: '',
    participantEmail: '',
    participantPhone: '',
    experienceLevel: 'beginner',
    specialRequests: '',
    emergencyContact: '',
    emergencyPhone: ''
  })
  const [errors, setErrors] = useState<Partial<BookingForm>>({})

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

  const handleInputChange = (field: keyof BookingForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<BookingForm> = {}

    if (!formData.participantName.trim()) {
      newErrors.participantName = '請輸入參與者姓名'
    }

    if (!formData.participantEmail) {
      newErrors.participantEmail = '請輸入電子郵件'
    } else if (!/\S+@\S+\.\S+/.test(formData.participantEmail)) {
      newErrors.participantEmail = '請輸入有效的電子郵件格式'
    }

    if (!formData.participantPhone.trim()) {
      newErrors.participantPhone = '請輸入聯絡電話'
    }

    if (!formData.emergencyContact.trim()) {
      newErrors.emergencyContact = '請輸入緊急聯絡人'
    }

    if (!formData.emergencyPhone.trim()) {
      newErrors.emergencyPhone = '請輸入緊急聯絡電話'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch(`/api/courses/${courseId}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || '預約失敗')
      }

      // Redirect to booking confirmation
      router.push(`/bookings/${data.id}/confirmation`)
    } catch (error) {
      setError(error instanceof Error ? error.message : '預約時發生錯誤')
    } finally {
      setIsSubmitting(false)
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

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">課程不存在</h2>
          <p className="text-gray-600 mb-4">您要預約的課程可能已被刪除或不存在</p>
          <Link href="/courses">
            <Button>返回課程列表</Button>
          </Link>
        </div>
      </div>
    )
  }

  const availableSpots = course.maxParticipants - course._count.bookings
  const isFullyBooked = availableSpots <= 0

  if (isFullyBooked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">😔</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">課程已滿</h2>
          <p className="text-gray-600 mb-4">很抱歉，此課程已經沒有空位了</p>
          <div className="space-x-4">
            <Link href={`/courses/${courseId}`}>
              <Button variant="outline">查看課程詳情</Button>
            </Link>
            <Link href="/courses">
              <Button>瀏覽其他課程</Button>
            </Link>
          </div>
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="mb-8">
          <ol className="flex items-center space-x-2 text-sm text-gray-500">
            <li><Link href="/" className="hover:text-gray-700">首頁</Link></li>
            <li>/</li>
            <li><Link href="/courses" className="hover:text-gray-700">課程</Link></li>
            <li>/</li>
            <li><Link href={`/courses/${courseId}`} className="hover:text-gray-700">課程詳情</Link></li>
            <li>/</li>
            <li className="text-gray-900">預約課程</li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Course Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">課程摘要</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900">
                    {course.title['zh-HK'] || course.title['en']}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {course.craftsman.user.firstName} {course.craftsman.user.lastName}
                  </p>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">課程時長:</span>
                    <span className="font-medium">{course.durationHours} 小時</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">地點:</span>
                    <span className="font-medium">{course.craftsman.workshopLocation}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">剩餘名額:</span>
                    <span className="font-medium text-green-600">{availableSpots} 位</span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">總費用:</span>
                    <span className="text-2xl font-bold text-blue-600">HK${course.price}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Booking Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">預約課程</h2>

              {error && (
                <Alert variant="error" className="mb-6">
                  {error}
                </Alert>
              )}

              <Form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField>
                    <FormLabel htmlFor="participantName">參與者姓名 *</FormLabel>
                    <Input
                      id="participantName"
                      type="text"
                      value={formData.participantName}
                      onChange={(e) => handleInputChange('participantName', e.target.value)}
                      placeholder="請輸入參與者全名"
                      className={errors.participantName ? 'border-red-500' : ''}
                    />
                    {errors.participantName && <FormError>{errors.participantName}</FormError>}
                  </FormField>

                  <FormField>
                    <FormLabel htmlFor="participantEmail">電子郵件 *</FormLabel>
                    <Input
                      id="participantEmail"
                      type="email"
                      value={formData.participantEmail}
                      onChange={(e) => handleInputChange('participantEmail', e.target.value)}
                      placeholder="請輸入電子郵件"
                      className={errors.participantEmail ? 'border-red-500' : ''}
                    />
                    {errors.participantEmail && <FormError>{errors.participantEmail}</FormError>}
                  </FormField>

                  <FormField>
                    <FormLabel htmlFor="participantPhone">聯絡電話 *</FormLabel>
                    <Input
                      id="participantPhone"
                      type="tel"
                      value={formData.participantPhone}
                      onChange={(e) => handleInputChange('participantPhone', e.target.value)}
                      placeholder="請輸入聯絡電話"
                      className={errors.participantPhone ? 'border-red-500' : ''}
                    />
                    {errors.participantPhone && <FormError>{errors.participantPhone}</FormError>}
                  </FormField>

                  <FormField>
                    <FormLabel htmlFor="experienceLevel">經驗程度</FormLabel>
                    <Select
                      id="experienceLevel"
                      value={formData.experienceLevel}
                      onChange={(e) => handleInputChange('experienceLevel', e.target.value)}
                    >
                      <option value="beginner">初學者</option>
                      <option value="intermediate">中級</option>
                      <option value="advanced">高級</option>
                    </Select>
                  </FormField>

                  <FormField>
                    <FormLabel htmlFor="emergencyContact">緊急聯絡人 *</FormLabel>
                    <Input
                      id="emergencyContact"
                      type="text"
                      value={formData.emergencyContact}
                      onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                      placeholder="請輸入緊急聯絡人姓名"
                      className={errors.emergencyContact ? 'border-red-500' : ''}
                    />
                    {errors.emergencyContact && <FormError>{errors.emergencyContact}</FormError>}
                  </FormField>

                  <FormField>
                    <FormLabel htmlFor="emergencyPhone">緊急聯絡電話 *</FormLabel>
                    <Input
                      id="emergencyPhone"
                      type="tel"
                      value={formData.emergencyPhone}
                      onChange={(e) => handleInputChange('emergencyPhone', e.target.value)}
                      placeholder="請輸入緊急聯絡電話"
                      className={errors.emergencyPhone ? 'border-red-500' : ''}
                    />
                    {errors.emergencyPhone && <FormError>{errors.emergencyPhone}</FormError>}
                  </FormField>
                </div>

                <FormField>
                  <FormLabel htmlFor="specialRequests">特殊需求或備註</FormLabel>
                  <Textarea
                    id="specialRequests"
                    value={formData.specialRequests}
                    onChange={(e) => handleInputChange('specialRequests', e.target.value)}
                    placeholder="如有任何特殊需求、飲食限制或其他需要師傅知道的事項，請在此說明"
                    rows={4}
                  />
                </FormField>

                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <h4 className="font-medium text-gray-900 mb-2">預約須知</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 請於課程開始前15分鐘到達</li>
                    <li>• 如需取消預約，請至少提前24小時通知</li>
                    <li>• 課程費用需於確認預約時支付</li>
                    <li>• 請攜帶身份證明文件</li>
                  </ul>
                </div>

                <div className="flex space-x-4">
                  <Link href={`/courses/${courseId}`} className="flex-1">
                    <Button variant="outline" className="w-full">
                      返回課程詳情
                    </Button>
                  </Link>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? '處理中...' : '確認預約'}
                  </Button>
                </div>
              </Form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}