'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useDebounce } from '@/lib/hooks/useDebounce'

export interface SearchSuggestion {
  text: string
  type: 'query' | 'category' | 'craftType' | 'location'
  count?: number
  highlighted?: string
}

export interface AutoCompleteResult {
  suggestions: SearchSuggestion[]
  popularQueries: string[]
  recentSearches: string[]
}

export interface EnhancedSearchBoxProps {
  placeholder?: string
  onSearch?: (query: string) => void
  onSuggestionSelect?: (suggestion: string) => void
  userId?: string
  showSuggestions?: boolean
  showPopular?: boolean
  showRecent?: boolean
  className?: string
}

export function EnhancedSearchBox({
  placeholder = '搜索工藝、師傅、課程...',
  onSearch,
  onSuggestionSelect,
  userId,
  showSuggestions = true,
  showPopular = true,
  showRecent = true,
  className = '',
}: EnhancedSearchBoxProps) {
  const [inputValue, setInputValue] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [autoComplete, setAutoComplete] = useState<AutoCompleteResult>({
    suggestions: [],
    popularQueries: [],
    recentSearches: []
  })
  const [isLoading, setIsLoading] = useState(false)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const debouncedQuery = useDebounce(inputValue, 300)

  // Load autocomplete suggestions
  const loadAutoComplete = useCallback(async (query: string) => {
    if (!showSuggestions) return

    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        query,
        ...(userId && { userId }),
        limit: '10'
      })

      const response = await fetch(`/api/search/autocomplete?${params.toString()}`)
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setAutoComplete(data)
        }
      }
    } catch (error) {
      console.error('Autocomplete error:', error)
    } finally {
      setIsLoading(false)
    }
  }, [showSuggestions, userId])

  // Load suggestions when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim()) {
      loadAutoComplete(debouncedQuery.trim())
      setShowDropdown(true)
    } else if (showPopular || showRecent) {
      // Show popular/recent when no query
      loadAutoComplete('')
      setShowDropdown(true)
    } else {
      setShowDropdown(false)
    }
    setSelectedIndex(-1)
  }, [debouncedQuery, loadAutoComplete, showPopular, showRecent])

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  // Handle input focus
  const handleInputFocus = () => {
    if (inputValue.trim() || showPopular || showRecent) {
      setShowDropdown(true)
    }
  }

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const query = inputValue.trim()
    if (query) {
      onSearch?.(query)
      setShowDropdown(false)
    }
  }

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion)
    setShowDropdown(false)
    onSuggestionSelect?.(suggestion)
    onSearch?.(suggestion)
  }

  // Get all selectable items
  const getAllItems = () => {
    const items: Array<{ text: string; type: string; section: string }> = []
    
    if (autoComplete.suggestions.length > 0) {
      autoComplete.suggestions.forEach(s => {
        items.push({ text: s.text, type: s.type, section: 'suggestions' })
      })
    }
    
    if (showRecent && autoComplete.recentSearches.length > 0) {
      autoComplete.recentSearches.forEach(r => {
        items.push({ text: r, type: 'recent', section: 'recent' })
      })
    }
    
    if (showPopular && autoComplete.popularQueries.length > 0) {
      autoComplete.popularQueries.forEach(p => {
        items.push({ text: p, type: 'popular', section: 'popular' })
      })
    }
    
    return items
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return

    const allItems = getAllItems()
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < allItems.length - 1 ? prev + 1 : prev
        )
        break
      
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < allItems.length) {
          const selectedItem = allItems[selectedIndex]
          handleSuggestionClick(selectedItem.text)
        } else {
          handleSubmit(e)
        }
        break
      
      case 'Escape':
        setShowDropdown(false)
        setSelectedIndex(-1)
        inputRef.current?.blur()
        break
    }
  }

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Get icon for suggestion type
  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'category':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        )
      case 'craftType':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        )
      case 'location':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )
      case 'recent':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'popular':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        )
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        )
    }
  }

  const allItems = getAllItems()

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full px-4 py-3 pr-12 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
          />
          
          <button
            type="submit"
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {isLoading ? (
              <div className="animate-spin w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full"></div>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
          </button>
        </div>
      </form>

      {/* Dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-96 overflow-y-auto"
        >
          {/* Suggestions */}
          {autoComplete.suggestions.length > 0 && (
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                建議
              </div>
              {autoComplete.suggestions.map((suggestion, index) => {
                const globalIndex = index
                return (
                  <button
                    key={`suggestion-${index}`}
                    onClick={() => handleSuggestionClick(suggestion.text)}
                    className={`w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none rounded-lg transition-colors ${
                      globalIndex === selectedIndex ? 'bg-gray-50' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-gray-400">
                        {getSuggestionIcon(suggestion.type)}
                      </div>
                      <div className="flex-1">
                        <div 
                          className="text-sm text-gray-700"
                          dangerouslySetInnerHTML={{ 
                            __html: suggestion.highlighted || suggestion.text 
                          }}
                        />
                        {suggestion.count && (
                          <div className="text-xs text-gray-500">
                            {suggestion.count} 個結果
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Recent searches */}
          {showRecent && autoComplete.recentSearches.length > 0 && (
            <div className="p-2 border-t border-gray-100">
              <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                最近搜索
              </div>
              {autoComplete.recentSearches.map((search, index) => {
                const globalIndex = autoComplete.suggestions.length + index
                return (
                  <button
                    key={`recent-${index}`}
                    onClick={() => handleSuggestionClick(search)}
                    className={`w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none rounded-lg transition-colors ${
                      globalIndex === selectedIndex ? 'bg-gray-50' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-gray-400">
                        {getSuggestionIcon('recent')}
                      </div>
                      <span className="text-sm text-gray-700">{search}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Popular queries */}
          {showPopular && autoComplete.popularQueries.length > 0 && (
            <div className="p-2 border-t border-gray-100">
              <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                熱門搜索
              </div>
              {autoComplete.popularQueries.map((query, index) => {
                const globalIndex = autoComplete.suggestions.length + autoComplete.recentSearches.length + index
                return (
                  <button
                    key={`popular-${index}`}
                    onClick={() => handleSuggestionClick(query)}
                    className={`w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none rounded-lg transition-colors ${
                      globalIndex === selectedIndex ? 'bg-gray-50' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-gray-400">
                        {getSuggestionIcon('popular')}
                      </div>
                      <span className="text-sm text-gray-700">{query}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* No results */}
          {allItems.length === 0 && !isLoading && (
            <div className="p-4 text-center text-gray-500">
              <div className="text-sm">沒有找到建議</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}