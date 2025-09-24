'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Navigation, Button } from '@/components/ui'
import { LanguageSwitcher } from '@/components/language/LanguageSwitcher'
import { CraftsmanForm } from '@/components/craftsman/CraftsmanForm'
import { ExtendedCraftsmanProfileData } from '@/lib/services/craftsman.service'

interface CraftsmanData {
  id: string
  userId: string
  craftSpecialties: string[]
  bio: Record<string, string>
  experienceYears: number
  workshopLocation: string
  contactInfo: any
  verificationStatus: string
  user: {
    id: string
    email: string
    firstName?: string
    lastName?: string
  }
}

export default function EditCraftsmanProfilePage() {
  const params = useParams()
  const router = useRouter()
  const craftsmanId = params.id as string
  
  const [craftsman, setCraftsman] = useState<CraftsmanData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

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
        setError('師傅檔案不存在或您沒有編輯權限')
      }
    } catch (error) {
      setError('載入師傅檔案時發生錯誤')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (formData: ExtendedCraftsmanProfileData) => {
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/craftsmen/${craftsmanId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        router.push(`/craftsmen/${craftsmanId}`)
      } else {
        const errorData = await response.json()
        setError(errorData.message || '更新檔案時發生錯誤')
      }
    } catch (error) {
      setError('更新檔案時發生錯誤')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    router.push(`/craftsmen/${craftsmanId}`)
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">無法編輯檔案</h2>
          <p className="text-gray-600 mb-4">{error || '您沒有編輯此檔案的權限'}</p>
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
        {/* Breadcrumb */}
        <nav className="mb-8">
          <ol className="flex items-center space-x-2 text-sm text-gray-500">
            <li><Link href="/" className="hover:text-gray-700">首頁</Link></li>
            <li>/</li>
            <li><Link href="/craftsmen" className="hover:text-gray-700">師傅檔案</Link></li>
            <li>/</li>
            <li><Link href={`/craftsmen/${craftsmanId}`} className="hover:text-gray-700">
              {craftsman.user.firstName || craftsman.user.email.split('@')[0]}師傅
            </Link></li>
            <li>/</li>
            <li className="text-gray-900">編輯檔案</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                編輯師傅檔案
              </h1>
              <p className="text-gray-600">
                更新您的個人資料、專長技藝和聯絡方式
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {craftsman.verificationStatus === 'VERIFIED' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  已驗證師傅
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <CraftsmanForm
            initialData={{
              craftSpecialties: craftsman.craftSpecialties,
              bio: craftsman.bio,
              experienceYears: craftsman.experienceYears,
              workshopLocation: craftsman.workshopLocation,
              contactInfo: craftsman.contactInfo
            }}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isSubmitting}
            isEdit={true}
          />
        </div>

        {/* Help Section */}
        <div className="bg-blue-50 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            💡 檔案編輯提示
          </h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• 完整的檔案資料有助於學習者了解您的專業背景</li>
            <li>• 多語言介紹可以吸引更多不同背景的學習者</li>
            <li>• 準確的聯絡方式讓學習者能夠輕鬆與您聯繫</li>
            <li>• 定期更新檔案內容可以提高您的曝光度</li>
            <li>• 已驗證的師傅檔案會獲得更高的信任度</li>
          </ul>
        </div>
      </div>
    </div>
  )
}