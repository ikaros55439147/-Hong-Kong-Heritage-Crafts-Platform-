'use client'

import React from 'react'
import { CraftsmanProfileWithUser } from '@/types'
import { VerificationStatus } from '@prisma/client'

interface CraftsmanProfileProps {
  craftsman: CraftsmanProfileWithUser & {
    courses?: any[]
    products?: any[]
  }
  language?: string
  isOwner?: boolean
  onEdit?: () => void
}

export function CraftsmanProfile({ 
  craftsman, 
  language = 'zh-HK', 
  isOwner = false,
  onEdit 
}: CraftsmanProfileProps) {
  const getBioText = (bio: any) => {
    if (!bio || typeof bio !== 'object') return ''
    return bio[language] || bio['zh-HK'] || bio['en'] || ''
  }

  const getVerificationBadge = (status: VerificationStatus) => {
    switch (status) {
      case VerificationStatus.VERIFIED:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            已驗證師傅
          </span>
        )
      case VerificationStatus.PENDING:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            審核中
          </span>
        )
      case VerificationStatus.REJECTED:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            審核未通過
          </span>
        )
      default:
        return null
    }
  }

  const formatContactInfo = (contactInfo: any) => {
    if (!contactInfo || typeof contactInfo !== 'object') return []
    
    const contacts = []
    if (contactInfo.phone) contacts.push({ label: '電話', value: contactInfo.phone })
    if (contactInfo.email) contacts.push({ label: '電郵', value: contactInfo.email })
    if (contactInfo.whatsapp) contacts.push({ label: 'WhatsApp', value: contactInfo.whatsapp })
    if (contactInfo.wechat) contacts.push({ label: '微信', value: contactInfo.wechat })
    if (contactInfo.website) contacts.push({ label: '網站', value: contactInfo.website })
    
    return contacts
  }

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8 text-white">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">
              {craftsman.user.email.split('@')[0]}師傅
            </h1>
            <div className="mb-4">
              {getVerificationBadge(craftsman.verificationStatus)}
            </div>
            {craftsman.workshopLocation && (
              <p className="text-blue-100 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                {craftsman.workshopLocation}
              </p>
            )}
          </div>
          {isOwner && onEdit && (
            <button
              onClick={onEdit}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              編輯檔案
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        {/* Craft Specialties */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">專長技藝</h2>
          <div className="flex flex-wrap gap-3">
            {craftsman.craftSpecialties.map((specialty, index) => (
              <span
                key={index}
                className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
              >
                {specialty}
              </span>
            ))}
          </div>
        </div>

        {/* Bio */}
        {getBioText(craftsman.bio) && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">師傅介紹</h2>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-700 leading-relaxed">
                {getBioText(craftsman.bio)}
              </p>
            </div>
          </div>
        )}

        {/* Experience */}
        {craftsman.experienceYears && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">經驗資歷</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-6 h-6 text-blue-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-lg font-medium text-gray-900">
                  {craftsman.experienceYears} 年專業經驗
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Contact Information */}
        {craftsman.verificationStatus === VerificationStatus.VERIFIED && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">聯絡方式</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formatContactInfo(craftsman.contactInfo).map((contact, index) => (
                <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-700 w-20">{contact.label}：</span>
                  <span className="text-gray-900">{contact.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Courses and Products */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Courses */}
          {craftsman.courses && craftsman.courses.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">最新課程</h2>
              <div className="space-y-3">
                {craftsman.courses.slice(0, 3).map((course, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-1">
                      {course.title?.['zh-HK'] || course.title?.en || '課程'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {course.description?.['zh-HK'] || course.description?.en || ''}
                    </p>
                    {course.price && (
                      <p className="text-sm font-medium text-blue-600 mt-2">
                        HK$ {course.price}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Products */}
          {craftsman.products && craftsman.products.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">精選作品</h2>
              <div className="space-y-3">
                {craftsman.products.slice(0, 3).map((product, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-1">
                      {product.name?.['zh-HK'] || product.name?.en || '作品'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {product.description?.['zh-HK'] || product.description?.en || ''}
                    </p>
                    <p className="text-sm font-medium text-green-600 mt-2">
                      HK$ {product.price}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Join Date */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            加入時間：{new Date(craftsman.createdAt).toLocaleDateString('zh-HK')}
          </p>
        </div>
      </div>
    </div>
  )
}

export default CraftsmanProfile