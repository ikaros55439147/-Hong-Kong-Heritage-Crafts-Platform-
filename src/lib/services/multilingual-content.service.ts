import { SupportedLanguage, defaultLanguage, supportedLanguages } from '../i18n/config'

export interface MultilingualContent {
  [key: string]: string
}

export interface ContentTranslation {
  language: SupportedLanguage
  content: string
  isAutoTranslated?: boolean
  translatedAt?: Date
  translatedBy?: string
}

export class MultilingualContentService {
  /**
   * Create multilingual content object
   */
  static createMultilingualContent(
    content: string, 
    language: SupportedLanguage = defaultLanguage
  ): MultilingualContent {
    const multilingualContent: MultilingualContent = {}
    
    // Set the provided content for the specified language
    multilingualContent[language] = content
    
    return multilingualContent
  }

  /**
   * Get content in specific language with fallback
   */
  static getContent(
    multilingualContent: MultilingualContent | null | undefined,
    language: SupportedLanguage = defaultLanguage,
    fallbackToDefault = true
  ): string {
    if (!multilingualContent || typeof multilingualContent !== 'object') {
      return ''
    }

    // Try to get content in requested language
    if (multilingualContent[language]) {
      return multilingualContent[language]
    }

    // Fallback to default language
    if (fallbackToDefault && language !== defaultLanguage && multilingualContent[defaultLanguage]) {
      return multilingualContent[defaultLanguage]
    }

    // Fallback to any available language only if fallbackToDefault is true
    if (fallbackToDefault) {
      const availableLanguages = Object.keys(multilingualContent)
      if (availableLanguages.length > 0) {
        return multilingualContent[availableLanguages[0]]
      }
    }

    return ''
  }

  /**
   * Update content for specific language
   */
  static updateContent(
    multilingualContent: MultilingualContent | null | undefined,
    language: SupportedLanguage,
    content: string
  ): MultilingualContent {
    const updated = { ...(multilingualContent || {}) }
    updated[language] = content
    return updated
  }

  /**
   * Remove content for specific language
   */
  static removeContent(
    multilingualContent: MultilingualContent | null | undefined,
    language: SupportedLanguage
  ): MultilingualContent {
    if (!multilingualContent) return {}
    
    const updated = { ...multilingualContent }
    delete updated[language]
    return updated
  }

  /**
   * Get available languages for content
   */
  static getAvailableLanguages(
    multilingualContent: MultilingualContent | null | undefined
  ): SupportedLanguage[] {
    if (!multilingualContent) return []
    
    return Object.keys(multilingualContent)
      .filter(lang => supportedLanguages.includes(lang as SupportedLanguage))
      .map(lang => lang as SupportedLanguage)
  }

  /**
   * Check if content exists for language
   */
  static hasContent(
    multilingualContent: MultilingualContent | null | undefined,
    language: SupportedLanguage
  ): boolean {
    return !!(multilingualContent && multilingualContent[language])
  }

  /**
   * Get missing languages for content
   */
  static getMissingLanguages(
    multilingualContent: MultilingualContent | null | undefined
  ): SupportedLanguage[] {
    const available = this.getAvailableLanguages(multilingualContent)
    return supportedLanguages.filter(lang => !available.includes(lang))
  }

  /**
   * Validate multilingual content structure
   */
  static validateContent(content: any): content is MultilingualContent {
    if (!content || typeof content !== 'object') {
      return false
    }

    // Check if all keys are valid language codes
    const keys = Object.keys(content)
    return keys.every(key => 
      supportedLanguages.includes(key as SupportedLanguage) &&
      typeof content[key] === 'string'
    )
  }

  /**
   * Merge multilingual content objects
   */
  static mergeContent(
    content1: MultilingualContent | null | undefined,
    content2: MultilingualContent | null | undefined,
    preferSecond = true
  ): MultilingualContent {
    const merged = { ...(content1 || {}) }
    
    if (content2) {
      Object.entries(content2).forEach(([lang, text]) => {
        if (preferSecond || !merged[lang]) {
          merged[lang] = text
        }
      })
    }
    
    return merged
  }

  /**
   * Auto-translate content using external service
   * This is a placeholder for integration with translation services
   */
  static async autoTranslate(
    content: string,
    fromLanguage: SupportedLanguage,
    toLanguage: SupportedLanguage
  ): Promise<string> {
    // TODO: Integrate with translation service (Google Translate, DeepL, etc.)
    // For now, return a placeholder
    console.log(`Auto-translating from ${fromLanguage} to ${toLanguage}: ${content}`)
    
    // Simulate translation delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    return `[AUTO-TRANSLATED to ${toLanguage}] ${content}`
  }

  /**
   * Batch auto-translate content to all missing languages
   */
  static async autoTranslateToAllLanguages(
    multilingualContent: MultilingualContent,
    sourceLanguage?: SupportedLanguage
  ): Promise<MultilingualContent> {
    const availableLanguages = this.getAvailableLanguages(multilingualContent)
    
    // Determine source language
    const source = sourceLanguage || 
      (availableLanguages.includes(defaultLanguage) ? defaultLanguage : availableLanguages[0])
    
    if (!source || !multilingualContent[source]) {
      throw new Error('No source content available for translation')
    }

    const sourceContent = multilingualContent[source]
    const missingLanguages = this.getMissingLanguages(multilingualContent)
    const updated = { ...multilingualContent }

    // Translate to each missing language
    for (const targetLanguage of missingLanguages) {
      try {
        const translated = await this.autoTranslate(sourceContent, source, targetLanguage)
        updated[targetLanguage] = translated
      } catch (error) {
        console.error(`Failed to translate to ${targetLanguage}:`, error)
      }
    }

    return updated
  }

  /**
   * Create search-friendly text from multilingual content
   */
  static createSearchableText(
    multilingualContent: MultilingualContent | null | undefined
  ): string {
    if (!multilingualContent) return ''
    
    const allContent = Object.values(multilingualContent)
      .filter(content => content && content.trim())
      .join(' ')
    
    return allContent
  }

  /**
   * Format content for display with language indicator
   */
  static formatContentWithLanguage(
    multilingualContent: MultilingualContent | null | undefined,
    requestedLanguage: SupportedLanguage,
    showLanguageIndicator = false
  ): { content: string; actualLanguage: SupportedLanguage; isTranslated: boolean } {
    const content = this.getContent(multilingualContent, requestedLanguage)
    
    // Determine actual language used
    let actualLanguage = requestedLanguage
    let isTranslated = false
    
    if (multilingualContent) {
      if (!multilingualContent[requestedLanguage]) {
        // Content was not available in requested language
        if (multilingualContent[defaultLanguage]) {
          actualLanguage = defaultLanguage
          isTranslated = true
        } else {
          // Using first available language
          const available = this.getAvailableLanguages(multilingualContent)
          if (available.length > 0) {
            actualLanguage = available[0]
            isTranslated = true
          }
        }
      }
    }

    return {
      content,
      actualLanguage,
      isTranslated
    }
  }

  /**
   * Export multilingual content for translation management
   */
  static exportForTranslation(
    multilingualContent: MultilingualContent,
    sourceLanguage: SupportedLanguage = defaultLanguage
  ): {
    sourceLanguage: SupportedLanguage
    sourceContent: string
    targetLanguages: SupportedLanguage[]
    existingTranslations: Record<SupportedLanguage, string>
  } {
    const sourceContent = multilingualContent[sourceLanguage] || ''
    const availableLanguages = this.getAvailableLanguages(multilingualContent)
    const targetLanguages = supportedLanguages.filter(lang => lang !== sourceLanguage)
    
    const existingTranslations: Record<SupportedLanguage, string> = {}
    targetLanguages.forEach(lang => {
      if (multilingualContent[lang]) {
        existingTranslations[lang] = multilingualContent[lang]
      }
    })

    return {
      sourceLanguage,
      sourceContent,
      targetLanguages,
      existingTranslations
    }
  }

  /**
   * Import translations back into multilingual content
   */
  static importTranslations(
    multilingualContent: MultilingualContent,
    translations: Record<SupportedLanguage, string>
  ): MultilingualContent {
    const updated = { ...multilingualContent }
    
    Object.entries(translations).forEach(([lang, content]) => {
      if (supportedLanguages.includes(lang as SupportedLanguage) && content.trim()) {
        updated[lang] = content
      }
    })
    
    return updated
  }
}

export default MultilingualContentService