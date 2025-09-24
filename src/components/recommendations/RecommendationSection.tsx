'use client'

import React from 'react'
import { RecommendationResult } from '@/lib/services/user-behavior.service'

export interface RecommendationSectionProps {
  title: string
  subtitle?: string
  items: RecommendationResult[]
  onItemClick?: (item: RecommendationResult) => void
  onViewAll?: () => void
  className?: string
}

export function RecommendationSection({
  title,
  subtitle,
  items,
  onItemClick,
  onViewAll,
  className = '',
}: RecommendationSectionProps) {
  const getTypeIcon = (type: RecommendationResult['type']) => {
    switch (type) {
      case 'craftsman':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        )
      case 'course':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        )
      case 'product':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        )
      case 'media':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )
    }
  }

  const getTypeLabel = (type: RecommendationResult['type']) => {
    switch (type) {
      case 'craftsman':
        return '師傅'
      case 'course':
        return '課程'
      case 'product':
        return '產品'
      case 'media':
        return '媒體'
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('zh-HK', {
      style: 'currency',
      currency: 'HKD',
    }).format(price)
  }

  if (items.length === 0) {
    return null
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {subtitle && (
              <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
            )}
          </div>
          {onViewAll && (
            <button
              onClick={onViewAll}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              查看全部
            </button>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item, index) => (
            <div
              key={`${item.type}-${item.id}`}
              onClick={() => onItemClick?.(item)}
              className="group cursor-pointer bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
            >
              {/* Item header */}
              <div className="flex items-center space-x-2 mb-3">
                <div className="text-gray-400">
                  {getTypeIcon(item.type)}
                </div>
                <span className="text-xs font-medium text-gray-500 uppercase">
                  {getTypeLabel(item.type)}
                </span>
                {item.metadata?.craftType && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    {item.metadata.craftType}
                  </span>
                )}
              </div>

              {/* Item content */}
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                  {item.title}
                </h4>
                
                {item.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {item.description}
                  </p>
                )}

                {/* Metadata */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center space-x-2">
                    {item.metadata?.price && (
                      <span className="font-medium text-green-600">
                        {formatPrice(item.metadata.price)}
                      </span>
                    )}
                    {item.metadata?.duration && (
                      <span>{item.metadata.duration}小時</span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <span className="text-yellow-500">★</span>
                    <span>{Math.round(item.score * 100)}%</span>
                  </div>
                </div>

                {/* Recommendation reason */}
                {item.reason && (
                  <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    {item.reason}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}