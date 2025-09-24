import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { 
  TranslationService, 
  GoogleTranslateProvider, 
  DeepLProvider,
  TranslationQualityAssessment,
  TranslationCacheManager
} from '../translation.service'
import { SupportedLanguage } from '@/lib/i18n/config'

// Mock fetch
global.fetch = vi.fn()

// Mock prisma
const mockPrisma = {
  translationCache: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    findMany: vi.fn(),
    groupBy: vi.fn()
  }
}

vi.mock('@/lib/database', () => ({
  prisma: mockPrisma
}))

describe('GoogleTranslateProvider', () => {
  let provider: GoogleTranslateProvider

  beforeEach(() => {
    provider = new GoogleTranslateProvider('test-api-key')
    vi.clearAllMocks()
  })

  it('should translate text successfully', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        data: {
          translations: [{ translatedText: 'Hello World' }]
        }
      })
    }
    
    vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

    const result = await provider.translate('你好世界', 'zh-HK', 'en')
    
    expect(result).toBe('Hello World')
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('translation.googleapis.com'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"q":"你好世界"')
      })
    )
  })

  it('should handle API errors', async () => {
    const mockResponse = {
      ok: false,
      statusText: 'API Error'
    }
    
    vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

    await expect(provider.translate('test', 'zh-HK', 'en')).rejects.toThrow('Google Translate API error: API Error')
  })

  it('should batch translate multiple texts', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        data: {
          translations: [
            { translatedText: 'Hello' },
            { translatedText: 'World' }
          ]
        }
      })
    }
    
    vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

    const result = await provider.batchTranslate(['你好', '世界'], 'zh-HK', 'en')
    
    expect(result).toEqual(['Hello', 'World'])
  })

  it('should detect language', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        data: {
          detections: [[{ language: 'zh-TW' }]]
        }
      })
    }
    
    vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

    const result = await provider.detectLanguage('你好世界')
    
    expect(result).toBe('zh-HK')
  })
})

describe('DeepLProvider', () => {
  let provider: DeepLProvider

  beforeEach(() => {
    provider = new DeepLProvider('test-api-key', false)
    vi.clearAllMocks()
  })

  it('should translate text successfully', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        translations: [{ text: 'Hello World' }]
      })
    }
    
    vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

    const result = await provider.translate('你好世界', 'zh-HK', 'en')
    
    expect(result).toBe('Hello World')
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('api-free.deepl.com'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'DeepL-Auth-Key test-api-key'
        })
      })
    )
  })

  it('should use pro endpoint when configured', () => {
    const proProvider = new DeepLProvider('test-api-key', true)
    expect(proProvider.name).toBe('deepl')
  })
})

describe('TranslationQualityAssessment', () => {
  it('should assess high quality translation', () => {
    const quality = TranslationQualityAssessment.assessQuality(
      'Hello world',
      'Bonjour le monde',
      'en',
      'zh-HK'
    )

    expect(quality.score).toBeGreaterThan(0.5)
    expect(quality.needsReview).toBe(false)
    expect(quality.issues).toHaveLength(0)
  })

  it('should detect empty translation', () => {
    const quality = TranslationQualityAssessment.assessQuality(
      'Hello world',
      '',
      'en',
      'zh-HK'
    )

    expect(quality.score).toBe(0)
    expect(quality.needsReview).toBe(true)
    expect(quality.issues).toContain('Empty translation')
  })

  it('should detect untranslated text', () => {
    const quality = TranslationQualityAssessment.assessQuality(
      'Hello world',
      'Hello world',
      'en',
      'zh-HK'
    )

    expect(quality.score).toBeLessThan(1)
    expect(quality.needsReview).toBe(true)
    expect(quality.issues).toContain('Text appears untranslated')
  })

  it('should detect unusual length ratio', () => {
    const quality = TranslationQualityAssessment.assessQuality(
      'Hello world this is a very long sentence with many words',
      'Hi',
      'en',
      'zh-HK'
    )

    expect(quality.score).toBeLessThan(1)
    expect(quality.issues).toContain('Unusual length ratio')
  })

  it('should detect missing Chinese characters in Chinese translation', () => {
    const quality = TranslationQualityAssessment.assessQuality(
      'Hello world',
      'Hello world',
      'en',
      'zh-HK'
    )

    expect(quality.issues).toContain('No Chinese characters in Chinese translation')
  })

  it('should recommend human review for low quality', () => {
    const lowQuality = { score: 0.5, confidence: 0.6, needsReview: true, issues: ['test'] }
    expect(TranslationQualityAssessment.shouldUseHumanReview(lowQuality)).toBe(true)

    const highQuality = { score: 0.9, confidence: 0.9, needsReview: false, issues: [] }
    expect(TranslationQualityAssessment.shouldUseHumanReview(highQuality)).toBe(false)
  })
})

describe('TranslationCacheManager', () => {

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should retrieve cached translation', async () => {
    const mockCached = {
      id: 'test-id',
      sourceText: 'Hello',
      sourceLanguage: 'en',
      targetLanguage: 'zh-HK',
      translatedText: '你好',
      provider: 'google-translate',
      createdAt: new Date(),
      lastUsed: new Date(),
      useCount: 1
    }

    mockPrisma.translationCache.findFirst.mockResolvedValueOnce(mockCached)
    mockPrisma.translationCache.update.mockResolvedValueOnce(mockCached)

    const result = await TranslationCacheManager.getCachedTranslation('Hello', 'en', 'zh-HK')

    expect(result).toEqual(mockCached)
    expect(mockPrisma.translationCache.update).toHaveBeenCalledWith({
      where: { id: 'test-id' },
      data: {
        lastUsed: expect.any(Date),
        useCount: { increment: 1 }
      }
    })
  })

  it('should cache new translation', async () => {
    mockPrisma.translationCache.count.mockResolvedValueOnce(100)
    mockPrisma.translationCache.create.mockResolvedValueOnce({})

    await TranslationCacheManager.cacheTranslation(
      'Hello',
      'en',
      'zh-HK',
      '你好',
      'google-translate',
      { score: 0.9, confidence: 0.9, needsReview: false, issues: [] }
    )

    expect(mockPrisma.translationCache.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sourceText: 'Hello',
        sourceLanguage: 'en',
        targetLanguage: 'zh-HK',
        translatedText: '你好',
        provider: 'google-translate'
      })
    })
  })

  it('should cleanup old cache entries', async () => {
    const deletedCount = 5
    mockPrisma.translationCache.deleteMany.mockResolvedValueOnce({ count: deletedCount })

    const result = await TranslationCacheManager.clearExpiredCache()

    expect(result).toBe(deletedCount)
    expect(mockPrisma.translationCache.deleteMany).toHaveBeenCalledWith({
      where: {
        createdAt: {
          lt: expect.any(Date)
        }
      }
    })
  })
})

describe('TranslationService', () => {
  let service: TranslationService

  beforeEach(() => {
    // Mock environment variables
    process.env.GOOGLE_TRANSLATE_API_KEY = 'test-google-key'
    process.env.DEEPL_API_KEY = 'test-deepl-key'
    
    service = new TranslationService()
    vi.clearAllMocks()
  })

  afterEach(() => {
    delete process.env.GOOGLE_TRANSLATE_API_KEY
    delete process.env.DEEPL_API_KEY
  })

  it('should translate with cache hit', async () => {
    const mockCached = {
      translatedText: '你好',
      provider: 'google-translate',
      quality: JSON.stringify({ score: 0.9, confidence: 0.9, needsReview: false, issues: [] })
    }

    mockPrisma.translationCache.findFirst.mockResolvedValueOnce(mockCached)
    mockPrisma.translationCache.update.mockResolvedValueOnce({})

    const result = await service.translate('Hello', 'en', 'zh-HK')

    expect(result.translatedText).toBe('你好')
    expect(result.fromCache).toBe(true)
  })

  it('should translate with cache miss', async () => {
    mockPrisma.translationCache.findFirst.mockResolvedValueOnce(null)
    mockPrisma.translationCache.count.mockResolvedValueOnce(100)
    mockPrisma.translationCache.create.mockResolvedValueOnce({})

    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        translations: [{ text: '你好' }]
      })
    }
    
    vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

    const result = await service.translate('Hello', 'en', 'zh-HK')

    expect(result.translatedText).toBe('你好')
    expect(result.fromCache).toBe(false)
    expect(result.provider).toBe('deepl') // DeepL is preferred when available
  })

  it('should handle batch translation', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        translations: [
          { text: '你好' },
          { text: '世界' }
        ]
      })
    }
    
    vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)
    mockPrisma.translationCache.findFirst.mockResolvedValue(null)
    mockPrisma.translationCache.count.mockResolvedValue(100)
    mockPrisma.translationCache.create.mockResolvedValue({})

    const job = await service.batchTranslate(
      ['Hello', 'World'],
      'en',
      ['zh-HK']
    )

    expect(job.status).toBe('completed')
    expect(job.results['Hello']['zh-HK']).toBe('你好')
    expect(job.results['World']['zh-HK']).toBe('世界')
  })

  it('should translate multilingual content', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        translations: [{ text: 'Hello World' }]
      })
    }
    
    vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)
    mockPrisma.translationCache.findFirst.mockResolvedValue(null)
    mockPrisma.translationCache.count.mockResolvedValue(100)
    mockPrisma.translationCache.create.mockResolvedValue({})

    const content = { 'zh-HK': '你好世界' }
    const result = await service.translateMultilingualContent(content, ['en'])

    expect(result['zh-HK']).toBe('你好世界')
    expect(result['en']).toBe('Hello World')
  })

  it('should get available providers', () => {
    const providers = service.getAvailableProviders()
    expect(providers).toContain('google-translate')
    expect(providers).toContain('deepl')
  })

  it('should get provider usage statistics', async () => {
    const mockUsage = [
      { provider: 'google-translate', _count: { provider: 10 } },
      { provider: 'deepl', _count: { provider: 15 } }
    ]

    mockPrisma.translationCache.groupBy.mockResolvedValueOnce(mockUsage)

    const usage = await service.getProviderUsage()

    expect(usage['google-translate']).toBe(10)
    expect(usage['deepl']).toBe(15)
  })
})