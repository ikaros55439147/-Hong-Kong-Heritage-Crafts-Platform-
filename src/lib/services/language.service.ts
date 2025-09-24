import { SupportedLanguage, defaultLanguage, supportedLanguages } from '../i18n/config'
import i18n from '../i18n/config'

export class LanguageService {
  /**
   * Get current language
   */
  static getCurrentLanguage(): SupportedLanguage {
    const current = i18n.language as SupportedLanguage
    return supportedLanguages.includes(current) ? current : defaultLanguage
  }

  /**
   * Change language
   */
  static async changeLanguage(language: SupportedLanguage): Promise<void> {
    if (!supportedLanguages.includes(language)) {
      throw new Error(`Unsupported language: ${language}`)
    }

    await i18n.changeLanguage(language)
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('i18nextLng', language)
    }
  }

  /**
   * Get user's preferred language from various sources
   */
  static detectUserLanguage(): SupportedLanguage {
    // Check localStorage first
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('i18nextLng') as SupportedLanguage
      if (stored && supportedLanguages.includes(stored)) {
        return stored
      }
    }

    // Check browser language
    if (typeof navigator !== 'undefined') {
      const browserLang = navigator.language
      
      // Direct match
      if (supportedLanguages.includes(browserLang as SupportedLanguage)) {
        return browserLang as SupportedLanguage
      }
      
      // Language code match (e.g., 'zh' matches 'zh-HK')
      const langCode = browserLang.split('-')[0]
      const match = supportedLanguages.find(lang => lang.startsWith(langCode))
      if (match) {
        return match
      }
    }

    return defaultLanguage
  }

  /**
   * Get all supported languages with metadata
   */
  static getSupportedLanguages() {
    return supportedLanguages.map(lang => ({
      code: lang,
      name: this.getLanguageName(lang),
      nativeName: this.getLanguageNativeName(lang)
    }))
  }

  /**
   * Get language name in current language
   */
  static getLanguageName(language: SupportedLanguage): string {
    return i18n.t(`language.${language}`, { lng: this.getCurrentLanguage() })
  }

  /**
   * Get language name in its native form
   */
  static getLanguageNativeName(language: SupportedLanguage): string {
    const names = {
      'zh-HK': '繁體中文',
      'zh-CN': '简体中文',
      'en': 'English'
    }
    return names[language]
  }

  /**
   * Check if language is RTL (Right-to-Left)
   */
  static isRTL(language: SupportedLanguage): boolean {
    // None of our supported languages are RTL, but this is for future extensibility
    const rtlLanguages: SupportedLanguage[] = []
    return rtlLanguages.includes(language)
  }

  /**
   * Get language direction
   */
  static getLanguageDirection(language: SupportedLanguage): 'ltr' | 'rtl' {
    return this.isRTL(language) ? 'rtl' : 'ltr'
  }

  /**
   * Format date according to language locale
   */
  static formatDate(date: Date, language?: SupportedLanguage): string {
    const lang = language || this.getCurrentLanguage()
    const locale = this.getLocaleCode(lang)
    
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date)
  }

  /**
   * Format number according to language locale
   */
  static formatNumber(number: number, language?: SupportedLanguage): string {
    const lang = language || this.getCurrentLanguage()
    const locale = this.getLocaleCode(lang)
    
    return new Intl.NumberFormat(locale).format(number)
  }

  /**
   * Format currency according to language locale
   */
  static formatCurrency(amount: number, currency = 'HKD', language?: SupportedLanguage): string {
    const lang = language || this.getCurrentLanguage()
    const locale = this.getLocaleCode(lang)
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency
    }).format(amount)
  }

  /**
   * Get locale code for Intl APIs
   */
  private static getLocaleCode(language: SupportedLanguage): string {
    const localeMap = {
      'zh-HK': 'zh-HK',
      'zh-CN': 'zh-CN',
      'en': 'en-US'
    }
    return localeMap[language]
  }

  /**
   * Update user language preference in database
   */
  static async updateUserLanguagePreference(
    userId: string, 
    language: SupportedLanguage
  ): Promise<void> {
    try {
      const response = await fetch('/api/users/language-preference', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ language })
      })

      if (!response.ok) {
        throw new Error('Failed to update language preference')
      }

      // Update local language
      await this.changeLanguage(language)
    } catch (error) {
      console.error('Error updating language preference:', error)
      throw error
    }
  }

  /**
   * Get user language preference from database
   */
  static async getUserLanguagePreference(userId: string): Promise<SupportedLanguage> {
    try {
      const response = await fetch('/api/users/language-preference')
      
      if (!response.ok) {
        return this.detectUserLanguage()
      }

      const data = await response.json()
      const language = data.language as SupportedLanguage
      
      return supportedLanguages.includes(language) ? language : this.detectUserLanguage()
    } catch (error) {
      console.error('Error fetching language preference:', error)
      return this.detectUserLanguage()
    }
  }
}

export default LanguageService