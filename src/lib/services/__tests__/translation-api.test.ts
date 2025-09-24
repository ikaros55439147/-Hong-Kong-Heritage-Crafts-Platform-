import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock the translation service
vi.mock('../translation.service', () => ({
  translationService: {
    translate: vi.fn(),
    batchTranslate: vi.fn(),
    translateMultilingualContent: vi.fn(),
    getAvailableProviders: vi.fn(),
    getProviderUsage: vi.fn()
  },
  TranslationCacheManager: {
    clearExpiredCache: vi.fn()
  }
}))

describe('Translation API Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/translations/translate', () => {
    it('should validate request data', async () => {
      const { POST } = await import('@/app/api/translations/translate/route')
      
      const request = new NextRequest('http://localhost/api/translations/translate', {
        method: 'POST',
        body: JSON.stringify({
          text: '', // Invalid: empty text
          sourceLanguage: 'zh-HK',
          targetLanguage: 'en'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request data')
    })

    it('should handle same source and target language', async () => {
      const { POST } = await import('@/app/api/translations/translate/route')
      
      const request = new NextRequest('http://localhost/api/translations/translate', {
        method: 'POST',
        body: JSON.stringify({
          text: 'Hello world',
          sourceLanguage: 'en',
          targetLanguage: 'en'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.translatedText).toBe('Hello world')
      expect(data.provider).toBe('none')
    })

    it('should call translation service for different languages', async () => {
      const { translationService } = await import('../translation.service')
      const mockResult = {
        translatedText: '你好世界',
        provider: 'google-translate',
        quality: { score: 0.9, confidence: 0.9, needsReview: false, issues: [] },
        fromCache: false
      }
      
      vi.mocked(translationService.translate).mockResolvedValueOnce(mockResult)

      const { POST } = await import('@/app/api/translations/translate/route')
      
      const request = new NextRequest('http://localhost/api/translations/translate', {
        method: 'POST',
        body: JSON.stringify({
          text: 'Hello world',
          sourceLanguage: 'en',
          targetLanguage: 'zh-HK'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockResult)
      expect(translationService.translate).toHaveBeenCalledWith(
        'Hello world',
        'en',
        'zh-HK',
        { provider: undefined, useCache: true, forceRefresh: false }
      )
    })
  })

  describe('POST /api/translations/batch', () => {
    it('should validate batch request data', async () => {
      const { POST } = await import('@/app/api/translations/batch/route')
      
      const request = new NextRequest('http://localhost/api/translations/batch', {
        method: 'POST',
        body: JSON.stringify({
          texts: [], // Invalid: empty array
          sourceLanguage: 'zh-HK',
          targetLanguages: ['en']
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request data')
    })

    it('should handle batch translation', async () => {
      const { translationService } = await import('../translation.service')
      const mockJob = {
        id: 'job_123',
        texts: ['Hello', 'World'],
        sourceLanguage: 'en' as const,
        targetLanguages: ['zh-HK' as const],
        status: 'completed' as const,
        results: {
          'Hello': { 'zh-HK': '你好' },
          'World': { 'zh-HK': '世界' }
        },
        createdAt: new Date(),
        completedAt: new Date()
      }
      
      vi.mocked(translationService.batchTranslate).mockResolvedValueOnce(mockJob)

      const { POST } = await import('@/app/api/translations/batch/route')
      
      const request = new NextRequest('http://localhost/api/translations/batch', {
        method: 'POST',
        body: JSON.stringify({
          texts: ['Hello', 'World'],
          sourceLanguage: 'en',
          targetLanguages: ['zh-HK']
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockJob)
    })
  })

  describe('POST /api/translations/multilingual', () => {
    it('should handle multilingual content translation', async () => {
      const { translationService } = await import('../translation.service')
      const mockResult = {
        'zh-HK': '你好世界',
        'en': 'Hello World'
      }
      
      vi.mocked(translationService.translateMultilingualContent).mockResolvedValueOnce(mockResult)

      const { POST } = await import('@/app/api/translations/multilingual/route')
      
      const request = new NextRequest('http://localhost/api/translations/multilingual', {
        method: 'POST',
        body: JSON.stringify({
          content: { 'zh-HK': '你好世界' },
          targetLanguages: ['en']
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.content).toEqual(mockResult)
    })
  })

  describe('GET /api/translations/providers', () => {
    it('should return available providers', async () => {
      const { translationService } = await import('../translation.service')
      
      vi.mocked(translationService.getAvailableProviders).mockReturnValueOnce(['google-translate', 'deepl'])
      vi.mocked(translationService.getProviderUsage).mockResolvedValueOnce({
        'google-translate': 10,
        'deepl': 15
      })

      const { GET } = await import('@/app/api/translations/providers/route')
      
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.providers).toEqual(['google-translate', 'deepl'])
      expect(data.usage).toEqual({ 'google-translate': 10, 'deepl': 15 })
      expect(data.defaultProvider).toBe('deepl')
    })
  })

  describe('POST /api/translations/cache/cleanup', () => {
    it('should cleanup translation cache', async () => {
      const { TranslationCacheManager } = await import('../translation.service')
      
      vi.mocked(TranslationCacheManager.clearExpiredCache).mockResolvedValueOnce(5)

      const { POST } = await import('@/app/api/translations/cache/cleanup/route')
      
      const response = await POST()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Cache cleanup completed')
      expect(data.deletedEntries).toBe(5)
    })
  })
})