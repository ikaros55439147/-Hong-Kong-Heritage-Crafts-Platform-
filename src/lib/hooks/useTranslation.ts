import { useState, useCallback } from 'react'
import { SupportedLanguage } from '@/lib/i18n/config'

interface TranslationResult {
  translatedText: string
  provider: string
  quality: {
    score: number
    confidence: number
    needsReview: boolean
    issues: string[]
  }
  fromCache: boolean
}

interface TranslationJob {
  id: string
  texts: string[]
  sourceLanguage: SupportedLanguage
  targetLanguages: SupportedLanguage[]
  status: 'pending' | 'processing' | 'completed' | 'failed'
  results: Record<string, Record<SupportedLanguage, string>>
  createdAt: Date
  completedAt?: Date
  error?: string
}

export function useTranslation() {
  const [isTranslating, setIsTranslating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const translate = useCallback(async (
    text: string,
    sourceLanguage: SupportedLanguage,
    targetLanguage: SupportedLanguage,
    options: {
      provider?: string
      useCache?: boolean
      forceRefresh?: boolean
    } = {}
  ): Promise<TranslationResult | null> => {
    setIsTranslating(true)
    setError(null)

    try {
      const response = await fetch('/api/translations/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          sourceLanguage,
          targetLanguage,
          ...options
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Translation failed')
      }

      const result = await response.json()
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Translation failed'
      setError(errorMessage)
      console.error('Translation error:', err)
      return null
    } finally {
      setIsTranslating(false)
    }
  }, [])

  const batchTranslate = useCallback(async (
    texts: string[],
    sourceLanguage: SupportedLanguage,
    targetLanguages: SupportedLanguage[],
    options: {
      provider?: string
      useCache?: boolean
      maxConcurrency?: number
    } = {}
  ): Promise<TranslationJob | null> => {
    setIsTranslating(true)
    setError(null)

    try {
      const response = await fetch('/api/translations/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          texts,
          sourceLanguage,
          targetLanguages,
          ...options
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Batch translation failed')
      }

      const result = await response.json()
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Batch translation failed'
      setError(errorMessage)
      console.error('Batch translation error:', err)
      return null
    } finally {
      setIsTranslating(false)
    }
  }, [])

  const translateMultilingual = useCallback(async (
    content: Record<string, string>,
    targetLanguages: SupportedLanguage[],
    sourceLanguage?: SupportedLanguage
  ): Promise<Record<string, string> | null> => {
    setIsTranslating(true)
    setError(null)

    try {
      const response = await fetch('/api/translations/multilingual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          targetLanguages,
          sourceLanguage
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Multilingual translation failed')
      }

      const result = await response.json()
      return result.content
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Multilingual translation failed'
      setError(errorMessage)
      console.error('Multilingual translation error:', err)
      return null
    } finally {
      setIsTranslating(false)
    }
  }, [])

  const getProviders = useCallback(async () => {
    try {
      const response = await fetch('/api/translations/providers')
      
      if (!response.ok) {
        throw new Error('Failed to get providers')
      }

      return await response.json()
    } catch (err) {
      console.error('Get providers error:', err)
      return null
    }
  }, [])

  const clearCache = useCallback(async () => {
    try {
      const response = await fetch('/api/translations/cache/cleanup', {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error('Failed to clear cache')
      }

      return await response.json()
    } catch (err) {
      console.error('Clear cache error:', err)
      return null
    }
  }, [])

  return {
    translate,
    batchTranslate,
    translateMultilingual,
    getProviders,
    clearCache,
    isTranslating,
    error
  }
}