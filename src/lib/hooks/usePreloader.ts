'use client'

import { useEffect, useState } from 'react'
import { contentPreloader, apiCache } from '@/lib/services/cache.service'

interface UsePreloaderOptions {
  preloadImages?: string[]
  preloadUrls?: string[]
  enabled?: boolean
}

export const usePreloader = (options: UsePreloaderOptions = {}) => {
  const [isPreloading, setIsPreloading] = useState(false)
  const [preloadedCount, setPreloadedCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)

  const { preloadImages = [], preloadUrls = [], enabled = true } = options

  useEffect(() => {
    if (!enabled) return

    const preload = async () => {
      setIsPreloading(true)
      const total = preloadImages.length + preloadUrls.length
      setTotalCount(total)
      setPreloadedCount(0)

      let completed = 0

      // Preload images
      for (const imageSrc of preloadImages) {
        try {
          await contentPreloader.preloadImage(imageSrc)
        } catch (error) {
          console.warn(`Failed to preload image: ${imageSrc}`)
        }
        completed++
        setPreloadedCount(completed)
      }

      // Preload API endpoints
      for (const url of preloadUrls) {
        try {
          if (!apiCache.has(url)) {
            const response = await fetch(url)
            if (response.ok) {
              const data = await response.json()
              apiCache.set(url, data)
            }
          }
        } catch (error) {
          console.warn(`Failed to preload URL: ${url}`)
        }
        completed++
        setPreloadedCount(completed)
      }

      setIsPreloading(false)
    }

    preload()
  }, [preloadImages, preloadUrls, enabled])

  return {
    isPreloading,
    progress: totalCount > 0 ? (preloadedCount / totalCount) * 100 : 0,
    preloadedCount,
    totalCount
  }
}

// Hook for preloading critical content on app start
export const useCriticalPreloader = () => {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const preloadCritical = async () => {
      try {
        await contentPreloader.preloadCriticalContent()
        setIsLoaded(true)
      } catch (error) {
        console.error('Failed to preload critical content:', error)
        setIsLoaded(true) // Still set to true to not block the app
      }
    }

    preloadCritical()
  }, [])

  return { isLoaded }
}