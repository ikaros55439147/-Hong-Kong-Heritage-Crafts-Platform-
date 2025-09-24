'use client'

import React, { useState, useEffect } from 'react'
import { RecommendationSection } from './RecommendationSection'
import { RecommendationResult } from '@/lib/services/user-behavior.service'

export interface RecommendationSectionData {
  title: string
  subtitle?: string
  type: 'personal' | 'trending' | 'similar' | 'category' | 'location'
  items: RecommendationResult[]
  reason: string
}

export interface PersonalizedRecommendationsProps {
  userId?: string
  currentPage?: 'home' | 'craftsman' | 'course' | 'product' | 'search'
  currentEntityId?: string
  currentEntityType?: 'craftsman' | 'course' | 'product' | 'media'
  userLocation?: string
  maxRecommendations?: number
  onItemClick?: (item: RecommendationResult) => void
  className?: string
}

export function PersonalizedRecommendations({
  userId,
  currentPage = 'home',
  currentEntityId,
  currentEntityType,
  userLocation,
  maxRecommendations = 20,
  onItemClick,
  className = '',
}: PersonalizedRecommendationsProps) {
  const [sections, setSections] = useState<RecommendationSectionData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load recommendations
  useEffect(() => {
    loadRecommendations()
  }, [userId, currentPage, currentEntityId, currentEntityType, userLocation])

  const loadRecommendations = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        maxRecommendations: maxRecommendations.toString(),
        ...(userId && { userId }),
        ...(currentPage && { currentPage }),
        ...(currentEntityId && { currentEntityId }),
        ...(currentEntityType && { currentEntityType }),
        ...(userLocation && { userLocation }),
      })

      const response = await fetch(`/api/recommendations?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Failed to load recommendations')
      }

      const data = await response.json()
      
      if (data.success) {
        setSections(data.recommendations)
      } else {
        throw new Error(data.error || 'Failed to load recommendations')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load recommendations'
      setError(errorMessage)
      console.error('Recommendations error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle item click with tracking
  const handleItemClick = async (item: RecommendationResult) => {
    // Track the click
    if (userId) {
      try {
        await fetch('/api/behavior/track', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            eventType: 'click',
            entityType: item.type,
            entityId: item.id,
            metadata: {
              source: 'recommendation',
              reason: item.reason,
              score: item.score,
              currentPage,
            },
          }),
        })
      } catch (error) {
        console.error('Failed to track recommendation click:', error)
      }
    }

    // Navigate to the item
    onItemClick?.(item)
    
    // Default navigation if no custom handler
    if (!onItemClick) {
      window.location.href = item.url
    }
  }

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        {[...Array(3)].map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 animate-pulse">
            <div className="p-6 border-b border-gray-100">
              <div className="h-6 bg-gray-300 rounded w-1/4 mb-2"></div>
              <div className="h-4 bg-gray-300 rounded w-1/2"></div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, itemIndex) => (
                  <div key={itemIndex} className="bg-gray-50 rounded-lg p-4">
                    <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-full mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center space-x-2 text-red-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">載入推薦內容時發生錯誤</span>
        </div>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <button
          onClick={loadRecommendations}
          className="mt-3 text-sm text-red-700 hover:text-red-800 font-medium"
        >
          重新載入
        </button>
      </div>
    )
  }

  if (sections.length === 0) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-8 text-center ${className}`}>
        <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">暫無推薦內容</h3>
        <p className="text-gray-600">
          {userId ? '請多瀏覽一些內容，我們會為您提供個人化推薦' : '登入後可獲得個人化推薦'}
        </p>
      </div>
    )
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {sections.map((section, index) => (
        <RecommendationSection
          key={`${section.type}-${index}`}
          title={section.title}
          subtitle={section.subtitle}
          items={section.items}
          onItemClick={handleItemClick}
        />
      ))}
    </div>
  )
}