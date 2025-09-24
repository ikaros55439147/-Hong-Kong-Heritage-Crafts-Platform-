'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useLanguage } from './useLanguage'
import { SearchQuery, SearchResponse } from '../services/multilingual-search.service'
import { SupportedLanguage } from '../i18n/config'

export interface UseMultilingualSearchOptions {
  initialQuery?: string
  entityTypes?: Array<'course' | 'product' | 'craftsman' | 'event'>
  categories?: string[]
  tags?: string[]
  limit?: number
  autoSearch?: boolean
  debounceMs?: number
}

export interface UseMultilingualSearchReturn {
  // Search state
  query: string
  results: SearchResponse | null
  isLoading: boolean
  error: string | null
  
  // Search actions
  setQuery: (query: string) => void
  search: (customQuery?: Partial<SearchQuery>) => Promise<void>
  clearResults: () => void
  
  // Pagination
  loadMore: () => Promise<void>
  hasMore: boolean
  
  // Filters
  filters: {
    entityTypes: Array<'course' | 'product' | 'craftsman' | 'event'> | undefined
    categories: string[] | undefined
    tags: string[] | undefined
  }
  setFilters: (filters: Partial<UseMultilingualSearchOptions>) => void
  
  // Language
  searchLanguage: SupportedLanguage
  setSearchLanguage: (language: SupportedLanguage) => void
}

export function useMultilingualSearch(
  options: UseMultilingualSearchOptions = {}
): UseMultilingualSearchReturn {
  const { currentLanguage } = useLanguage()
  const {
    initialQuery = '',
    entityTypes,
    categories,
    tags,
    limit = 20,
    autoSearch = false,
    debounceMs = 300
  } = options

  // State
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<SearchResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchLanguage, setSearchLanguage] = useState<SupportedLanguage>(currentLanguage)
  const [filters, setFiltersState] = useState({
    entityTypes,
    categories,
    tags
  })

  // Debounced query
  const [debouncedQuery, setDebouncedQuery] = useState(query)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [query, debounceMs])

  // Auto search when debounced query changes
  useEffect(() => {
    if (autoSearch && debouncedQuery.trim()) {
      search()
    }
  }, [debouncedQuery, searchLanguage, filters, autoSearch])

  // Update search language when current language changes
  useEffect(() => {
    setSearchLanguage(currentLanguage)
  }, [currentLanguage])

  // Search function
  const search = useCallback(async (customQuery?: Partial<SearchQuery>) => {
    const searchQuery = query.trim()
    if (!searchQuery && !customQuery?.query) {
      setResults(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const searchParams: SearchQuery = {
        query: searchQuery,
        language: searchLanguage,
        entityTypes: filters.entityTypes,
        categories: filters.categories,
        tags: filters.tags,
        limit,
        offset: 0,
        ...customQuery
      }

      const response = await fetch('/api/search/multilingual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(searchParams)
      })

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`)
      }

      const data: SearchResponse = await response.json()
      setResults(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed'
      setError(errorMessage)
      console.error('Search error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [query, searchLanguage, filters, limit])

  // Load more results
  const loadMore = useCallback(async () => {
    if (!results || isLoading) return

    const currentOffset = results.results.length
    
    setIsLoading(true)
    setError(null)

    try {
      const searchParams: SearchQuery = {
        query: query.trim(),
        language: searchLanguage,
        entityTypes: filters.entityTypes,
        categories: filters.categories,
        tags: filters.tags,
        limit,
        offset: currentOffset
      }

      const response = await fetch('/api/search/multilingual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(searchParams)
      })

      if (!response.ok) {
        throw new Error(`Load more failed: ${response.statusText}`)
      }

      const data: SearchResponse = await response.json()
      
      // Append new results to existing ones
      setResults(prevResults => {
        if (!prevResults) return data
        
        return {
          ...data,
          results: [...prevResults.results, ...data.results]
        }
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Load more failed'
      setError(errorMessage)
      console.error('Load more error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [results, query, searchLanguage, filters, limit, isLoading])

  // Check if there are more results to load
  const hasMore = useMemo(() => {
    if (!results) return false
    return results.results.length < results.total
  }, [results])

  // Clear results
  const clearResults = useCallback(() => {
    setResults(null)
    setError(null)
  }, [])

  // Set filters
  const setFilters = useCallback((newFilters: Partial<UseMultilingualSearchOptions>) => {
    setFiltersState(prevFilters => ({
      entityTypes: newFilters.entityTypes ?? prevFilters.entityTypes,
      categories: newFilters.categories ?? prevFilters.categories,
      tags: newFilters.tags ?? prevFilters.tags
    }))
    
    // Clear results when filters change
    setResults(null)
  }, [])

  return {
    // Search state
    query,
    results,
    isLoading,
    error,
    
    // Search actions
    setQuery,
    search,
    clearResults,
    
    // Pagination
    loadMore,
    hasMore,
    
    // Filters
    filters,
    setFilters,
    
    // Language
    searchLanguage,
    setSearchLanguage
  }
}

export default useMultilingualSearch