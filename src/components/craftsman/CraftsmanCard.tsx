'use client'

import React from 'react'
import Link from 'next/link'
import { CraftsmanProfileWithUser } from '@/types'
import { VerificationStatus } from '@prisma/client'

interface CraftsmanCardProps {
  craftsman: CraftsmanProfileWithUser & {
    _count?: {
      courses: number
      products: number
    }
  }
  language?: string
}

export function CraftsmanCard({ craftsman, language = 'zh-HK' }: CraftsmanCardProps) {
  const getBioText = (bio: any) => {
    if (!bio || typeof bio !== 'object') return ''
    return bio[language] || bio['zh-HK'] || bio['en'] || ''
  }

  const getVerificationBadge = (status: VerificationStatus) => {
    switch (status) {
      case VerificationStatus.VERIFIED:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            ✓ 已驗證
          </span>
        )
      case VerificationStatus.PENDING:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            ⏳ 審核中
          </span>
        )
      case VerificationStatus.REJECTED:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            ✗ 未通過
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {craftsman.user.email.split('@')[0]}
            </h3>
            {getVerificationBadge(craftsman.verificationStatus)}
          </div>
        </div>

        {/* Craft Specialties */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">專長技藝</h4>
          <div className="flex flex-wrap gap-2">
            {craftsman.craftSpecialties.map((specialty, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {specialty}
              </span>
            ))}
          </div>
        </div>

        {/* Bio */}
        {getBioText(craftsman.bio) && (
          <div className="mb-4">
            <p className="text-sm text-gray-600 line-clamp-3">
              {getBioText(craftsman.bio)}
            </p>
          </div>
        )}

        {/* Experience and Location */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm text-gray-600">
          {craftsman.experienceYears && (
            <div>
              <span className="font-medium">經驗：</span>
              {craftsman.experienceYears} 年
            </div>
          )}
          {craftsman.workshopLocation && (
            <div>
              <span className="font-medium">地點：</span>
              {craftsman.workshopLocation}
            </div>
          )}
        </div>

        {/* Stats */}
        {craftsman._count && (
          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div className="text-center p-2 bg-gray-50 rounded">
              <div className="font-semibold text-gray-900">{craftsman._count.courses}</div>
              <div className="text-gray-600">課程</div>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded">
              <div className="font-semibold text-gray-900">{craftsman._count.products}</div>
              <div className="text-gray-600">作品</div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Link
            href={`/craftsmen/${craftsman.id}`}
            className="flex-1 bg-blue-600 text-white text-center py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            查看詳情
          </Link>
          {craftsman.verificationStatus === VerificationStatus.VERIFIED && (
            <Link
              href={`/craftsmen/${craftsman.id}/contact`}
              className="flex-1 bg-gray-100 text-gray-700 text-center py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              聯絡師傅
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

export default CraftsmanCard