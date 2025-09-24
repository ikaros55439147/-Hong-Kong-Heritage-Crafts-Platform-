import { SupportedLanguage, supportedLanguages } from '../i18n/config'
import { MultilingualContent } from './multilingual-content.service'
import { prisma } from '../database'
import { Translation } from 'react-i18next'
import { Main } from 'next/document'
import { Translation } from 'react-i18next'
import { Translation } from 'react-i18next'
import { Translation } from 'react-i18next'

export interface TranslationProvider {
  name: string
  translate(text: string, from: SupportedLanguage, to: SupportedLanguage): Promise<string>
  batchTranslate?(texts: string[], from: SupportedLanguage, to: SupportedLanguage): Promise<string[]>
  detectLanguage?(text: string): Promise<SupportedLanguage>
  getSupportedLanguages(): SupportedLanguage[]
}

export interface TranslationQuality {
  score: number // 0-1, where 1 is perfect
  confidence: number // 0-1, provider confidence
  needsReview: boolean
  issues: string[]
}

export interface TranslationCache {
  id: string
  sourceText: string
  sourceLanguage: SupportedLanguage
  targetLanguage: SupportedLanguage
  translatedText: string
  provider: string
  quality?: TranslationQuality
  createdAt: Date
  lastUsed: Date
  useCount: number
}

export interface TranslationJob {
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

// Google Translate Provider
export class GoogleTranslateProvider implements TranslationProvider {
  name = 'google-translate'
  private apiKey: string
  private baseUrl = 'https://translation.googleapis.com/language/translate/v2'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async translate(text: string, from: SupportedLanguage, to: SupportedLanguage): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          source: this.mapLanguageCode(from),
          target: this.mapLanguageCode(to),
          format: 'text'
        })
      })

      if (!response.ok) {
        throw new Error(`Google Translate API error: ${response.statusText}`)
      }

      const data = await response.json()
      return data.data.translations[0].translatedText
    } catch (error) {
      console.error('Google Translate error:', error)
      throw error
    }
  }

  async batchTranslate(texts: string[], from: SupportedLanguage, to: SupportedLanguage): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: texts,
          source: this.mapLanguageCode(from),
          target: this.mapLanguageCode(to),
          format: 'text'
        })
      })

      if (!response.ok) {
        throw new Error(`Google Translate API error: ${response.statusText}`)
      }

      const data = await response.json()
      return data.data.translations.map((t: any) => t.translatedText)
    } catch (error) {
      console.error('Google Translate batch error:', error)
      throw error
    }
  }

  async detectLanguage(text: string): Promise<SupportedLanguage> {
    try {
      const response = await fetch(`https://translation.googleapis.com/language/translate/v2/detect?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ q: text })
      })

      if (!response.ok) {
        throw new Error(`Google Translate API error: ${response.statusText}`)
      }

      const data = await response.json()
      const detectedLang = data.data.detections[0][0].language
      return this.unmapLanguageCode(detectedLang)
    } catch (error) {
      console.error('Google Translate detect error:', error)
      return 'en' // fallback
    }
  }

  getSupportedLanguages(): SupportedLanguage[] {
    return supportedLanguages
  }

  private mapLanguageCode(lang: SupportedLanguage): string {
    const mapping: Record<SupportedLanguage, string> = {
      'zh-HK': 'zh-TW',
      'zh-CN': 'zh-CN', 
      'en': 'en'
    }
    return mapping[lang] || lang
  }

  private unmapLanguageCode(code: string): SupportedLanguage {
    const mapping: Record<string, SupportedLanguage> = {
      'zh-TW': 'zh-HK',
      'zh-CN': 'zh-CN',
      'en': 'en'
    }
    return mapping[code] || 'en'
  }
}

// DeepL Provider
export class DeepLProvider implements TranslationProvider {
  name = 'deepl'
  private apiKey: string
  private baseUrl: string

  constructor(apiKey: string, isPro = false) {
    this.apiKey = apiKey
    this.baseUrl = isPro 
      ? 'https://api.deepl.com/v2' 
      : 'https://api-free.deepl.com/v2'
  }

  async translate(text: string, from: SupportedLanguage, to: SupportedLanguage): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/translate`, {
        method: 'POST',
        headers: {
          'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          text,
          source_lang: this.mapLanguageCode(from),
          target_lang: this.mapLanguageCode(to)
        })
      })

      if (!response.ok) {
        throw new Error(`DeepL API error: ${response.statusText}`)
      }

      const data = await response.json()
      return data.translations[0].text
    } catch (error) {
      console.error('DeepL error:', error)
      throw error
    }
  }

  async batchTranslate(texts: string[], from: SupportedLanguage, to: SupportedLanguage): Promise<string[]> {
    try {
      const formData = new URLSearchParams()
      texts.forEach(text => formData.append('text', text))
      formData.append('source_lang', this.mapLanguageCode(from))
      formData.append('target_lang', this.mapLanguageCode(to))

      const response = await fetch(`${this.baseUrl}/translate`, {
        method: 'POST',
        headers: {
          'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error(`DeepL API error: ${response.statusText}`)
      }

      const data = await response.json()
      return data.translations.map((t: any) => t.text)
    } catch (error) {
      console.error('DeepL batch error:', error)
      throw error
    }
  }

  getSupportedLanguages(): SupportedLanguage[] {
    return supportedLanguages
  }

  private mapLanguageCode(lang: SupportedLanguage): string {
    const mapping: Record<SupportedLanguage, string> = {
      'zh-HK': 'ZH',
      'zh-CN': 'ZH', 
      'en': 'EN'
    }
    return mapping[lang] || lang
  }
}

// Translation Quality Assessment
export class TranslationQualityAssessment {
  static assessQuality(
    sourceText: string,
    translatedText: string,
    sourceLanguage: SupportedLanguage,
    targetLanguage: SupportedLanguage
  ): TranslationQuality {
    const issues: string[] = []
    let score = 1.0
    let confidence = 0.8

    // Basic quality checks
    if (!translatedText || translatedText.trim().length === 0) {
      issues.push('Empty translation')
      score = 0
      confidence = 0
    }

    // Length ratio check (translations shouldn't be too different in length)
    const lengthRatio = translatedText.length / sourceText.length
    if (lengthRatio < 0.3 || lengthRatio > 3.0) {
      issues.push('Unusual length ratio')
      score -= 0.2
    }

    // Check for untranslated text (same as source)
    if (sourceText === translatedText && sourceLanguage !== targetLanguage) {
      issues.push('Text appears untranslated')
      score -= 0.3
    }

    // Check for common translation artifacts
    if (translatedText.includes('[AUTO-TRANSLATED')) {
      issues.push('Contains translation artifacts')
      score -= 0.1
    }

    // Check for HTML/markup preservation
    const sourceHtmlTags = (sourceText.match(/<[^>]+>/g) || []).length
    const translatedHtmlTags = (translatedText.match(/<[^>]+>/g) || []).length
    if (sourceHtmlTags !== translatedHtmlTags) {
      issues.push('HTML markup not preserved')
      score -= 0.1
    }

    // Language-specific checks
    if (targetLanguage.startsWith('zh') && !/[\u4e00-\u9fff]/.test(translatedText)) {
      issues.push('No Chinese characters in Chinese translation')
      score -= 0.3
    }

    score = Math.max(0, Math.min(1, score))
    const needsReview = score < 0.7 || issues.length > 0

    return {
      score,
      confidence,
      needsReview,
      issues
    }
  }

  static shouldUseHumanReview(quality: TranslationQuality): boolean {
    return quality.needsReview || quality.score < 0.6
  }
}

// Translation Cache Manager
export class TranslationCacheManager {
  private static readonly CACHE_EXPIRY_DAYS = 30
  private static readonly MAX_CACHE_SIZE = 10000

  static async getCachedTranslation(
    sourceText: string,
    sourceLanguage: SupportedLanguage,
    targetLanguage: SupportedLanguage
  ): Promise<TranslationCache | null> {
    try {
      const cached = await prisma.translationCache.findFirst({
        where: {
          sourceText,
          sourceLanguage,
          targetLanguage,
          createdAt: {
            gte: new Date(Date.now() - this.CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
          }
        }
      })

      if (cached) {
        // Update usage statistics
        await prisma.translationCache.update({
          where: { id: cached.id },
          data: {
            lastUsed: new Date(),
            useCount: { increment: 1 }
          }
        })

        return cached as TranslationCache
      }

      return null
    } catch (error) {
      console.error('Cache retrieval error:', error)
      return null
    }
  }

  static async cacheTranslation(
    sourceText: string,
    sourceLanguage: SupportedLanguage,
    targetLanguage: SupportedLanguage,
    translatedText: string,
    provider: string,
    quality?: TranslationQuality
  ): Promise<void> {
    try {
      // Clean up old cache entries if we're at the limit
      await this.cleanupCache()

      await prisma.translationCache.create({
        data: {
          sourceText,
          sourceLanguage,
          targetLanguage,
          translatedText,
          provider,
          quality: quality ? JSON.stringify(quality) : null,
          createdAt: new Date(),
          lastUsed: new Date(),
          useCount: 1
        }
      })
    } catch (error) {
      console.error('Cache storage error:', error)
    }
  }

  private static async cleanupCache(): Promise<void> {
    try {
      const count = await prisma.translationCache.count()
      
      if (count >= this.MAX_CACHE_SIZE) {
        // Delete oldest, least used entries
        const toDelete = await prisma.translationCache.findMany({
          orderBy: [
            { useCount: 'asc' },
            { lastUsed: 'asc' }
          ],
          take: Math.floor(this.MAX_CACHE_SIZE * 0.1), // Remove 10%
          select: { id: true }
        })

        await prisma.translationCache.deleteMany({
          where: {
            id: { in: toDelete.map(item => item.id) }
          }
        })
      }
    } catch (error) {
      console.error('Cache cleanup error:', error)
    }
  }

  static async clearExpiredCache(): Promise<number> {
    try {
      const result = await prisma.translationCache.deleteMany({
        where: {
          createdAt: {
            lt: new Date(Date.now() - this.CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
          }
        }
      })
      return result.count
    } catch (error) {
      console.error('Cache cleanup error:', error)
      return 0
    }
  }
}

// Main Translation Service
export class TranslationService {
  private providers: Map<string, TranslationProvider> = new Map()
  private defaultProvider: string = 'google-translate'

  constructor() {
    this.initializeProviders()
  }

  private initializeProviders(): void {
    // Initialize Google Translate if API key is available
    const googleApiKey = process.env.GOOGLE_TRANSLATE_API_KEY
    if (googleApiKey) {
      this.providers.set('google-translate', new GoogleTranslateProvider(googleApiKey))
    }

    // Initialize DeepL if API key is available
    const deeplApiKey = process.env.DEEPL_API_KEY
    const deeplIsPro = process.env.DEEPL_IS_PRO === 'true'
    if (deeplApiKey) {
      this.providers.set('deepl', new DeepLProvider(deeplApiKey, deeplIsPro))
      // Prefer DeepL if available (generally higher quality)
      this.defaultProvider = 'deepl'
    }
  }

  async translate(
    text: string,
    sourceLanguage: SupportedLanguage,
    targetLanguage: SupportedLanguage,
    options: {
      provider?: string
      useCache?: boolean
      forceRefresh?: boolean
    } = {}
  ): Promise<{
    translatedText: string
    provider: string
    quality: TranslationQuality
    fromCache: boolean
  }> {
    const { provider = this.defaultProvider, useCache = true, forceRefresh = false } = options

    // Check cache first
    if (useCache && !forceRefresh) {
      const cached = await TranslationCacheManager.getCachedTranslation(
        text, sourceLanguage, targetLanguage
      )
      
      if (cached) {
        return {
          translatedText: cached.translatedText,
          provider: cached.provider,
          quality: cached.quality ? JSON.parse(cached.quality as string) : { score: 0.8, confidence: 0.8, needsReview: false, issues: [] },
          fromCache: true
        }
      }
    }

    // Get translation from provider
    const translationProvider = this.providers.get(provider)
    if (!translationProvider) {
      throw new Error(`Translation provider '${provider}' not available`)
    }

    const translatedText = await translationProvider.translate(text, sourceLanguage, targetLanguage)
    
    // Assess quality
    const quality = TranslationQualityAssessment.assessQuality(
      text, translatedText, sourceLanguage, targetLanguage
    )

    // Cache the result
    if (useCache) {
      await TranslationCacheManager.cacheTranslation(
        text, sourceLanguage, targetLanguage, translatedText, provider, quality
      )
    }

    return {
      translatedText,
      provider,
      quality,
      fromCache: false
    }
  }

  async batchTranslate(
    texts: string[],
    sourceLanguage: SupportedLanguage,
    targetLanguages: SupportedLanguage[],
    options: {
      provider?: string
      useCache?: boolean
      maxConcurrency?: number
    } = {}
  ): Promise<TranslationJob> {
    const { provider = this.defaultProvider, useCache = true, maxConcurrency = 5 } = options
    
    const job: TranslationJob = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      texts,
      sourceLanguage,
      targetLanguages,
      status: 'processing',
      results: {},
      createdAt: new Date()
    }

    try {
      // Initialize results structure
      texts.forEach(text => {
        job.results[text] = {}
      })

      // Process translations with concurrency control
      const semaphore = new Array(maxConcurrency).fill(null)
      
      for (const targetLanguage of targetLanguages) {
        const promises = texts.map(async (text, index) => {
          // Wait for available slot
          await new Promise(resolve => {
            const checkSlot = () => {
              const freeIndex = semaphore.findIndex(slot => slot === null)
              if (freeIndex !== -1) {
                semaphore[freeIndex] = index
                resolve(freeIndex)
              } else {
                setTimeout(checkSlot, 100)
              }
            }
            checkSlot()
          })

          try {
            const result = await this.translate(text, sourceLanguage, targetLanguage, {
              provider,
              useCache
            })
            job.results[text][targetLanguage] = result.translatedText
          } catch (error) {
            console.error(`Translation failed for text "${text}" to ${targetLanguage}:`, error)
            job.results[text][targetLanguage] = text // fallback to original
          } finally {
            // Release slot
            const slotIndex = semaphore.indexOf(index)
            if (slotIndex !== -1) {
              semaphore[slotIndex] = null
            }
          }
        })

        await Promise.all(promises)
      }

      job.status = 'completed'
      job.completedAt = new Date()
    } catch (error) {
      job.status = 'failed'
      job.error = error instanceof Error ? error.message : 'Unknown error'
    }

    return job
  }

  async translateMultilingualContent(
    content: MultilingualContent,
    targetLanguages: SupportedLanguage[],
    sourceLanguage?: SupportedLanguage
  ): Promise<MultilingualContent> {
    // Determine source language
    const availableLanguages = Object.keys(content) as SupportedLanguage[]
    const source = sourceLanguage || availableLanguages[0]
    
    if (!source || !content[source]) {
      throw new Error('No source content available for translation')
    }

    const sourceText = content[source]
    const updated = { ...content }

    // Translate to each target language
    for (const targetLanguage of targetLanguages) {
      if (targetLanguage !== source && !content[targetLanguage]) {
        try {
          const result = await this.translate(sourceText, source, targetLanguage)
          updated[targetLanguage] = result.translatedText
        } catch (error) {
          console.error(`Failed to translate to ${targetLanguage}:`, error)
        }
      }
    }

    return updated
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys())
  }

  async getProviderUsage(): Promise<Record<string, number>> {
    try {
      const usage = await prisma.translationCache.groupBy({
        by: ['provider'],
        _count: { provider: true }
      })

      const result: Record<string, number> = {}
      usage.forEach(item => {
        result[item.provider] = item._count.provider
      })

      return result
    } catch (error) {
      console.error('Error getting provider usage:', error)
      return {}
    }
  }
}

// Export singleton instance
export const translationService = new TranslationService()
export default translationService