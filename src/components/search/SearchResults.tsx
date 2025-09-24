'use client'

import React from 'react'
import { SearchResult } from '@/lib/services/content-search.service'

export interface SearchResultsProps {
  results: SearchResult[]
  isLoading?: boolean
  onResultClick?: (result: SearchResult) => void
  className?: string
}

export function SearchResults({
  results,
  isLoading = false,
  onResultClick,
  className = '',
}: SearchResultsProps) {
  const getResultIcon = (type: SearchResult['type']) => {
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
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )
    }
  }

  const getTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'craftsman':
        return '師傅'
      case 'course':
        return '課程'
      case 'product':
        return '產品'
      case 'media':
        return '媒體'
      default:
        return '內容'
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('zh-HK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(date))
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('zh-HK', {
      style: 'currency',
      currency: 'HKD',
    }).format(price)
  }

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[...Array(3)].map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="flex space-x-4 p-4 border border-gray-200 rounded-lg">
              <div className="w-16 h-16 bg-gray-300 rounded"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                <div className="h-3 bg-gray-300 rounded w-1/4"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">沒有找到結果</h3>
        <p className="mt-1 text-sm text-gray-500">請嘗試不同的搜索關鍵字</p>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {results.map((result) => (
        <div
          key={`${result.type}-${result.id}`}
          onClick={() => onResultClick?.(result)}
          className="flex space-x-4 p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm cursor-pointer transition-all duration-200"
        >
          {/* Image or icon */}
          <div className="flex-shrink-0">
            {result.imageUrl ? (
              <img
                src={result.imageUrl}
                alt={result.title}
                className="w-16 h-16 object-cover rounded"
              />
            ) : (
              <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center text-gray-400">
                {getResultIcon(result.type)}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {getTypeLabel(result.type)}
              </span>
              {result.craftType && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {result.craftType}
                </span>
              )}
            </div>

            <h3 className="text-lg font-medium text-gray-900 truncate">
              {result.title}
            </h3>

            {result.description && (
              <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                {result.description}
              </p>
            )}

            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <span>{formatDate(result.createdAt)}</span>
                
                {result.metadata?.price && (
                  <span className="font-medium text-green-600">
                    {formatPrice(result.metadata.price)}
                  </span>
                )}
                
                {result.metadata?.duration && (
                  <span>{result.metadata.duration}小時</span>
                )}
                
                {result.metadata?.fileSize && (
                  <span>
                    {(result.metadata.fileSize / 1024 / 1024).toFixed(1)}MB
                  </span>
                )}
              </div>

              {result.relevanceScore && (
                <div className="text-xs text-gray-400">
                  相關度: {Math.round(result.relevanceScore * 100)}%
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}