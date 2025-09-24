import { useState, useCallback, useEffect } from 'react'
import { SearchQuery, SearchResponse, ContentCategory } from '../services/content-search.service'

export interface UseSearchOptions {
  initialQuery?: Partial<SearchQuery>
  autoSearch?: boolean
  debounceMs?: number
}

export function useSearch(options: UseSearchOptions = {}) {
  const {
    initialQuery = {},
    autoSearch = false,
    debounceMs = 300,
  } = options

  const [query, setQuery] = useState<SearchQuery>({
    limit: 20,
    offset: 0,
    sortBy: 'relevance',
    sortOrder: 'desc',
    language: 'zh-HK',
    ...initialQuery,
  })
  
  const [results, setResults] = useState<SearchResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<ContentCategory[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])

  // Debounced search function
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)

  const performSearch = useCallback(async (searchQuery: SearchQuery) => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      
      Object.entries(searchQuery).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value))
        }
      })

      const response = await fetch(`/api/search?${params.toString()}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Search failed')
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Search failed')
      }

      setResults(data)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed'
      setError(errorMessage)
      setResults(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const search = useCallback((newQuery?: Partial<SearchQuery>) => {
    const updatedQuery = { ...query, ...newQuery, offset: 0 }
    setQuery(updatedQuery)

    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    const timer = setTimeout(() => {
      performSearch(updatedQuery)
    }, debounceMs)

    setDebounceTimer(timer)
  }, [query, debounceTimer, debounceMs, performSearch])

  const loadMore = useCallback(() => {
    if (!results || isLoading) return

    const nextOffset = (query.offset || 0) + (query.limit || 20)
    const updatedQuery = { ...query, offset: nextOffset }
    setQuery(updatedQuery)
    performSearch(updatedQuery)
  }, [query, results, isLoading, performSearch])

  const clearSearch = useCallback(() => {
    setQuery({
      limit: 20,
      offset: 0,
      sortBy: 'relevance',
      sortOrder: 'desc',
      language: 'zh-HK',
    })
    setResults(null)
    setError(null)
  }, [])

  // Load categories
  const loadCategories = useCallback(async (craftType?: string) => {
    try {
      const params = craftType ? `?craftType=${encodeURIComponent(craftType)}` : ''
      const response = await fetch(`/api/search/categories${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to load categories')
      }

      const data = await response.json()
      
      if (data.success) {
        setCategories(data.categories)
      }
    } catch (err) {
      console.error('Failed to load categories:', err)
    }
  }, [])

  // Load search suggestions
  const loadSuggestions = useCallback(async (searchQuery: string, limit: number = 5) => {
    try {
      const params = new URLSearchParams({
        query: searchQuery,
        limit: String(limit),
      })

      const response = await fetch(`/api/search/suggestions?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Failed to load suggestions')
      }

      const data = await response.json()
      
      if (data.success) {
        setSuggestions(data.suggestions)
      }
    } catch (err) {
      console.error('Failed to load suggestions:', err)
      setSuggestions([])
    }
  }, [])

  // Auto-search on mount if enabled
  useEffect(() => {
    if (autoSearch) {
      performSearch(query)
    }
  }, [autoSearch, performSearch, query])

  // Load categories on mount
  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
    }
  }, [debounceTimer])

  return {
    // State
    query,
    results,
    isLoading,
    error,
    categories,
    suggestions,
    
    // Actions
    search,
    loadMore,
    clearSearch,
    loadCategories,
    loadSuggestions,
    
    // Computed
    hasMore: results ? (results.results.length < results.total) : false,
    totalResults: results?.total || 0,
  }
}