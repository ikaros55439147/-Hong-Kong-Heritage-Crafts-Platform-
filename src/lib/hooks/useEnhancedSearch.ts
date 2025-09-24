import { useState, useCallback, useEffect } from 'react'
import { useDebounce } from './useDebounce'

export interface EnhancedSearchQuery {
  query?: string
  category?: string
  craftType?: string
  language?: string
  fileType?: string
  userId?: string
  limit?: number
  offset?: number
  sortBy?: 'relevance' | 'date' | 'popularity'
  sortOrder?: 'asc' | 'desc'
  includeRecommendations?: boolean
  personalizeResults?: boolean
  trackSearch?: boolean
}

export interface SearchResult {
  id: string
  type: 'craftsman' | 'course' | 'product' | 'media'
  title: string
  description?: string
  category: string
  craftType?: string
  imageUrl?: string
  url: string
  relevanceScore?: number
  createdAt: Date
  metadata?: Record<string, any>
}

export interface SearchResponse {
  results: SearchResult[]
  total: number
  facets: {
    categories: Array<{ name: string; count: number }>
    craftTypes: Array<{ name: string; count: number }>
    fileTypes: Array<{ name: string; count: number }>
  }
  query: EnhancedSearchQuery
  recommendations?: SearchResult[]
  personalizedResults?: boolean
}

export interface UseEnhancedSearchOptions {
  initialQuery?: Partial<EnhancedSearchQuery>
  autoSearch?: boolean
  debounceMs?: number
  trackBehavior?: boolean
}

export function useEnhancedSearch(options: UseEnhancedSearchOptions = {}) {
  const {
    initialQuery = {},
    autoSearch = false,
    debounceMs = 300,
    trackBehavior = true,
  } = options

  const [query, setQuery] = useState<EnhancedSearchQuery>({
    limit: 20,
    offset: 0,
    sortBy: 'relevance',
    sortOrder: 'desc',
    language: 'zh-HK',
    includeRecommendations: false,
    personalizeResults: true,
    trackSearch: trackBehavior,
    ...initialQuery,
  })
  
  const [results, setResults] = useState<SearchResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const debouncedQuery = useDebounce(query.query || '', debounceMs)

  // Perform search function
  const performSearch = useCallback(async (searchQuery: EnhancedSearchQuery) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/search/enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchQuery),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Search failed')
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Search failed')
      }

      // If this is a load more operation, append results
      if (searchQuery.offset && searchQuery.offset > 0 && results) {
        setResults(prev => prev ? {
          ...data,
          results: [...prev.results, ...data.results]
        } : data)
      } else {
        setResults(data)
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed'
      setError(errorMessage)
      
      // Don't clear results on error for load more operations
      if (!searchQuery.offset || searchQuery.offset === 0) {
        setResults(null)
      }
    } finally {
      setIsLoading(false)
    }
  }, [results])

  // Search function with debouncing
  const search = useCallback((newQuery?: Partial<EnhancedSearchQuery>) => {
    const updatedQuery = { ...query, ...newQuery, offset: 0 }
    setQuery(updatedQuery)
    
    // Immediate search for non-text changes
    if (newQuery && Object.keys(newQuery).some(key => key !== 'query')) {
      performSearch(updatedQuery)
    }
  }, [query, performSearch])

  // Load more results
  const loadMore = useCallback(() => {
    if (!results || isLoading) return

    const nextOffset = (query.offset || 0) + (query.limit || 20)
    const updatedQuery = { ...query, offset: nextOffset }
    setQuery(updatedQuery)
    performSearch(updatedQuery)
  }, [query, results, isLoading, performSearch])

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery({
      limit: 20,
      offset: 0,
      sortBy: 'relevance',
      sortOrder: 'desc',
      language: 'zh-HK',
      includeRecommendations: false,
      personalizeResults: true,
      trackSearch: trackBehavior,
    })
    setResults(null)
    setError(null)
  }, [trackBehavior])

  // Track result click
  const trackResultClick = useCallback(async (
    resultId: string,
    resultType: 'craftsman' | 'course' | 'product' | 'media',
    position?: number
  ) => {
    if (!trackBehavior || !query.userId) return

    try {
      await fetch('/api/behavior/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'click',
          userId: query.userId,
          resultId,
          resultType,
          searchQuery: query.query,
          position,
        }),
      })
    } catch (error) {
      console.error('Failed to track result click:', error)
    }
  }, [trackBehavior, query.userId, query.query])

  // Auto-search on debounced query change
  useEffect(() => {
    if (autoSearch && debouncedQuery !== (initialQuery.query || '')) {
      const updatedQuery = { ...query, query: debouncedQuery, offset: 0 }
      setQuery(updatedQuery)
      performSearch(updatedQuery)
    }
  }, [debouncedQuery, autoSearch, initialQuery.query, query, performSearch])

  // Auto-search on mount if enabled and query exists
  useEffect(() => {
    if (autoSearch && query.query) {
      performSearch(query)
    }
  }, []) // Only run on mount

  return {
    // State
    query,
    results,
    isLoading,
    error,
    
    // Actions
    search,
    loadMore,
    clearSearch,
    trackResultClick,
    
    // Computed
    hasMore: results ? (results.results.length < results.total) : false,
    totalResults: results?.total || 0,
    hasRecommendations: results?.recommendations && results.recommendations.length > 0,
    isPersonalized: results?.personalizedResults || false,
  }
}

// Hook for search analytics
export function useSearchAnalytics() {
  const [analytics, setAnalytics] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadAnalytics = useCallback(async (startDate?: Date, endDate?: Date) => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate.toISOString())
      if (endDate) params.append('endDate', endDate.toISOString())

      const response = await fetch(`/api/search/analytics?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Failed to load analytics')
      }

      const data = await response.json()
      
      if (data.success) {
        setAnalytics(data.analytics)
      } else {
        throw new Error(data.error || 'Failed to load analytics')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load analytics'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    analytics,
    isLoading,
    error,
    loadAnalytics,
  }
}