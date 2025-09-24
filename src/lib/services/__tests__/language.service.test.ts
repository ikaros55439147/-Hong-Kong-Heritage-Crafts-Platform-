import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock i18n
vi.mock('../../i18n/config', () => ({
  supportedLanguages: ['zh-HK', 'zh-CN', 'en'],
  defaultLanguage: 'zh-HK',
  languageConfig: {
    'zh-HK': { name: '繁體中文', nativeName: '繁體中文', flag: '🇭🇰' },
    'zh-CN': { name: '简体中文', nativeName: '简体中文', flag: '🇨🇳' },
    'en': { name: 'English', nativeName: 'English', flag: '🇺🇸' }
  },
  default: {
    language: 'zh-HK',
    changeLanguage: vi.fn(),
    t: vi.fn((key: string) => key)
  }
}))

import { LanguageService } from '../language.service'
import { SupportedLanguage, defaultLanguage } from '../../i18n/config'
import i18n from '../../i18n/config'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock navigator
Object.defineProperty(window, 'navigator', {
  value: {
    language: 'zh-HK'
  },
  writable: true
})

describe('LanguageService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getCurrentLanguage', () => {
    it('should return current language from i18n', () => {
      const language = LanguageService.getCurrentLanguage()
      expect(language).toBe('zh-HK')
    })

    it('should return default language if current is not supported', () => {
      // Mock unsupported language
      vi.mocked(i18n).language = 'fr'
      
      const language = LanguageService.getCurrentLanguage()
      expect(language).toBe(defaultLanguage)
    })
  })

  describe('changeLanguage', () => {
    it('should change language successfully', async () => {
      vi.mocked(i18n.changeLanguage).mockResolvedValue(undefined)

      await LanguageService.changeLanguage('en')

      expect(i18n.changeLanguage).toHaveBeenCalledWith('en')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('i18nextLng', 'en')
    })

    it('should throw error for unsupported language', async () => {
      await expect(
        LanguageService.changeLanguage('fr' as SupportedLanguage)
      ).rejects.toThrow('Unsupported language: fr')
    })
  })

  describe('detectUserLanguage', () => {
    it('should return stored language from localStorage', () => {
      localStorageMock.getItem.mockReturnValue('zh-CN')
      
      const language = LanguageService.detectUserLanguage()
      expect(language).toBe('zh-CN')
    })

    it('should return browser language if no stored preference', () => {
      localStorageMock.getItem.mockReturnValue(null)
      Object.defineProperty(window, 'navigator', {
        value: { language: 'en-US' },
        writable: true
      })
      
      const language = LanguageService.detectUserLanguage()
      expect(language).toBe('en')
    })

    it('should return default language if no match found', () => {
      localStorageMock.getItem.mockReturnValue(null)
      Object.defineProperty(window, 'navigator', {
        value: { language: 'fr-FR' },
        writable: true
      })
      
      const language = LanguageService.detectUserLanguage()
      expect(language).toBe(defaultLanguage)
    })
  })

  describe('getSupportedLanguages', () => {
    it('should return all supported languages with metadata', () => {
      const languages = LanguageService.getSupportedLanguages()
      
      expect(languages).toHaveLength(3)
      expect(languages[0]).toHaveProperty('code')
      expect(languages[0]).toHaveProperty('name')
      expect(languages[0]).toHaveProperty('nativeName')
    })
  })

  describe('getLanguageName', () => {
    it('should return language name in current language', () => {
      vi.mocked(i18n.t).mockReturnValue('繁體中文')
      
      const name = LanguageService.getLanguageName('zh-HK')
      expect(i18n.t).toHaveBeenCalledWith('language.zh-HK', { lng: 'zh-HK' })
    })
  })

  describe('getLanguageNativeName', () => {
    it('should return native language name', () => {
      expect(LanguageService.getLanguageNativeName('zh-HK')).toBe('繁體中文')
      expect(LanguageService.getLanguageNativeName('zh-CN')).toBe('简体中文')
      expect(LanguageService.getLanguageNativeName('en')).toBe('English')
    })
  })

  describe('isRTL', () => {
    it('should return false for all supported languages', () => {
      expect(LanguageService.isRTL('zh-HK')).toBe(false)
      expect(LanguageService.isRTL('zh-CN')).toBe(false)
      expect(LanguageService.isRTL('en')).toBe(false)
    })
  })

  describe('getLanguageDirection', () => {
    it('should return ltr for all supported languages', () => {
      expect(LanguageService.getLanguageDirection('zh-HK')).toBe('ltr')
      expect(LanguageService.getLanguageDirection('zh-CN')).toBe('ltr')
      expect(LanguageService.getLanguageDirection('en')).toBe('ltr')
    })
  })

  describe('formatDate', () => {
    it('should format date according to language locale', () => {
      const date = new Date('2024-01-15')
      
      const formatted = LanguageService.formatDate(date, 'en')
      expect(typeof formatted).toBe('string')
      expect(formatted).toContain('2024')
    })
  })

  describe('formatNumber', () => {
    it('should format number according to language locale', () => {
      const number = 1234.56
      
      const formatted = LanguageService.formatNumber(number, 'en')
      expect(typeof formatted).toBe('string')
      expect(formatted).toContain('1,234')
    })
  })

  describe('formatCurrency', () => {
    it('should format currency according to language locale', () => {
      const amount = 1234.56
      
      const formatted = LanguageService.formatCurrency(amount, 'HKD', 'en')
      expect(typeof formatted).toBe('string')
      expect(formatted).toContain('HK$')
    })
  })

  describe('updateUserLanguagePreference', () => {
    it('should update user language preference via API', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ language: 'en' })
      })
      global.fetch = mockFetch

      vi.mocked(i18n.changeLanguage).mockResolvedValue(undefined)

      await LanguageService.updateUserLanguagePreference('user-id', 'en')

      expect(mockFetch).toHaveBeenCalledWith('/api/users/language-preference', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: 'en' })
      })
      expect(i18n.changeLanguage).toHaveBeenCalledWith('en')
    })

    it('should throw error if API request fails', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500
      })
      global.fetch = mockFetch

      await expect(
        LanguageService.updateUserLanguagePreference('user-id', 'en')
      ).rejects.toThrow('Failed to update language preference')
    })
  })

  describe('getUserLanguagePreference', () => {
    it('should get user language preference from API', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ language: 'zh-CN' })
      })
      global.fetch = mockFetch

      const language = await LanguageService.getUserLanguagePreference('user-id')
      expect(language).toBe('zh-CN')
    })

    it('should return detected language if API fails', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404
      })
      global.fetch = mockFetch

      localStorageMock.getItem.mockReturnValue('zh-HK')

      const language = await LanguageService.getUserLanguagePreference('user-id')
      expect(language).toBe('zh-HK')
    })
  })
})