import { describe, it, expect, vi } from 'vitest'
import { MultilingualContentService, MultilingualContent } from '../multilingual-content.service'
import { SupportedLanguage } from '../../i18n/config'

describe('MultilingualContentService', () => {
  const sampleContent: MultilingualContent = {
    'zh-HK': '香港傳統工藝',
    'zh-CN': '香港传统工艺',
    'en': 'Hong Kong Traditional Crafts'
  }

  describe('createMultilingualContent', () => {
    it('should create multilingual content with default language', () => {
      const content = MultilingualContentService.createMultilingualContent('Test content')
      
      expect(content).toEqual({
        'zh-HK': 'Test content'
      })
    })

    it('should create multilingual content with specified language', () => {
      const content = MultilingualContentService.createMultilingualContent('Test content', 'en')
      
      expect(content).toEqual({
        'en': 'Test content'
      })
    })
  })

  describe('getContent', () => {
    it('should return content in requested language', () => {
      const content = MultilingualContentService.getContent(sampleContent, 'en')
      expect(content).toBe('Hong Kong Traditional Crafts')
    })

    it('should fallback to default language when requested language not available', () => {
      const partialContent = { 'zh-HK': '香港傳統工藝' }
      const content = MultilingualContentService.getContent(partialContent, 'en')
      expect(content).toBe('香港傳統工藝')
    })

    it('should return empty string for null/undefined content', () => {
      expect(MultilingualContentService.getContent(null, 'en')).toBe('')
      expect(MultilingualContentService.getContent(undefined, 'en')).toBe('')
    })

    it('should return empty string when no fallback and content not available', () => {
      const partialContent = { 'en': 'English content' }
      const content = MultilingualContentService.getContent(partialContent, 'zh-CN', false)
      expect(content).toBe('')
    })
  })

  describe('updateContent', () => {
    it('should update content for specific language', () => {
      const updated = MultilingualContentService.updateContent(
        sampleContent, 
        'en', 
        'Updated English content'
      )
      
      expect(updated['en']).toBe('Updated English content')
      expect(updated['zh-HK']).toBe('香港傳統工藝')
    })

    it('should handle null/undefined input', () => {
      const updated = MultilingualContentService.updateContent(null, 'en', 'New content')
      expect(updated).toEqual({ 'en': 'New content' })
    })
  })

  describe('removeContent', () => {
    it('should remove content for specific language', () => {
      const updated = MultilingualContentService.removeContent(sampleContent, 'en')
      
      expect(updated).not.toHaveProperty('en')
      expect(updated).toHaveProperty('zh-HK')
      expect(updated).toHaveProperty('zh-CN')
    })

    it('should handle null/undefined input', () => {
      const result = MultilingualContentService.removeContent(null, 'en')
      expect(result).toEqual({})
    })
  })

  describe('getAvailableLanguages', () => {
    it('should return available languages', () => {
      const languages = MultilingualContentService.getAvailableLanguages(sampleContent)
      expect(languages).toEqual(['zh-HK', 'zh-CN', 'en'])
    })

    it('should filter out invalid language codes', () => {
      const invalidContent = {
        'zh-HK': 'Valid content',
        'invalid': 'Invalid language',
        'en': 'Valid content'
      }
      
      const languages = MultilingualContentService.getAvailableLanguages(invalidContent)
      expect(languages).toEqual(['zh-HK', 'en'])
    })

    it('should return empty array for null/undefined', () => {
      expect(MultilingualContentService.getAvailableLanguages(null)).toEqual([])
      expect(MultilingualContentService.getAvailableLanguages(undefined)).toEqual([])
    })
  })

  describe('hasContent', () => {
    it('should return true when content exists for language', () => {
      expect(MultilingualContentService.hasContent(sampleContent, 'en')).toBe(true)
    })

    it('should return false when content does not exist for language', () => {
      const partialContent = { 'zh-HK': 'Content' }
      expect(MultilingualContentService.hasContent(partialContent, 'en')).toBe(false)
    })

    it('should return false for null/undefined content', () => {
      expect(MultilingualContentService.hasContent(null, 'en')).toBe(false)
      expect(MultilingualContentService.hasContent(undefined, 'en')).toBe(false)
    })
  })

  describe('getMissingLanguages', () => {
    it('should return missing languages', () => {
      const partialContent = { 'zh-HK': 'Content' }
      const missing = MultilingualContentService.getMissingLanguages(partialContent)
      expect(missing).toEqual(['zh-CN', 'en'])
    })

    it('should return all languages for empty content', () => {
      const missing = MultilingualContentService.getMissingLanguages({})
      expect(missing).toEqual(['zh-HK', 'zh-CN', 'en'])
    })

    it('should return empty array when all languages present', () => {
      const missing = MultilingualContentService.getMissingLanguages(sampleContent)
      expect(missing).toEqual([])
    })
  })

  describe('validateContent', () => {
    it('should validate correct multilingual content', () => {
      expect(MultilingualContentService.validateContent(sampleContent)).toBe(true)
    })

    it('should reject invalid content structure', () => {
      expect(MultilingualContentService.validateContent(null)).toBe(false)
      expect(MultilingualContentService.validateContent('string')).toBe(false)
      expect(MultilingualContentService.validateContent(123)).toBe(false)
    })

    it('should reject content with invalid language codes', () => {
      const invalidContent = {
        'invalid-lang': 'Content',
        'zh-HK': 'Valid content'
      }
      expect(MultilingualContentService.validateContent(invalidContent)).toBe(false)
    })

    it('should reject content with non-string values', () => {
      const invalidContent = {
        'zh-HK': 123,
        'en': 'Valid content'
      }
      expect(MultilingualContentService.validateContent(invalidContent)).toBe(false)
    })
  })

  describe('mergeContent', () => {
    it('should merge two multilingual content objects', () => {
      const content1 = { 'zh-HK': 'Content 1', 'en': 'English 1' }
      const content2 = { 'zh-CN': 'Content 2', 'en': 'English 2' }
      
      const merged = MultilingualContentService.mergeContent(content1, content2)
      
      expect(merged).toEqual({
        'zh-HK': 'Content 1',
        'zh-CN': 'Content 2',
        'en': 'English 2' // Second content takes precedence
      })
    })

    it('should prefer first content when specified', () => {
      const content1 = { 'en': 'English 1' }
      const content2 = { 'en': 'English 2' }
      
      const merged = MultilingualContentService.mergeContent(content1, content2, false)
      expect(merged['en']).toBe('English 1')
    })

    it('should handle null/undefined inputs', () => {
      const content = { 'zh-HK': 'Content' }
      
      expect(MultilingualContentService.mergeContent(null, content)).toEqual(content)
      expect(MultilingualContentService.mergeContent(content, null)).toEqual(content)
      expect(MultilingualContentService.mergeContent(null, null)).toEqual({})
    })
  })

  describe('autoTranslate', () => {
    it('should return translated content', async () => {
      const translated = await MultilingualContentService.autoTranslate(
        'Hello world',
        'en',
        'zh-HK'
      )
      
      expect(translated).toContain('[AUTO-TRANSLATED to zh-HK]')
      expect(translated).toContain('Hello world')
    })
  })

  describe('autoTranslateToAllLanguages', () => {
    it('should translate to all missing languages', async () => {
      const partialContent = { 'zh-HK': '香港傳統工藝' }
      
      const translated = await MultilingualContentService.autoTranslateToAllLanguages(partialContent)
      
      expect(translated).toHaveProperty('zh-HK', '香港傳統工藝')
      expect(translated).toHaveProperty('zh-CN')
      expect(translated).toHaveProperty('en')
      expect(translated['zh-CN']).toContain('[AUTO-TRANSLATED to zh-CN]')
      expect(translated['en']).toContain('[AUTO-TRANSLATED to en]')
    })

    it('should throw error when no source content available', async () => {
      await expect(
        MultilingualContentService.autoTranslateToAllLanguages({})
      ).rejects.toThrow('No source content available for translation')
    })
  })

  describe('createSearchableText', () => {
    it('should create searchable text from all languages', () => {
      const searchable = MultilingualContentService.createSearchableText(sampleContent)
      
      expect(searchable).toContain('香港傳統工藝')
      expect(searchable).toContain('香港传统工艺')
      expect(searchable).toContain('Hong Kong Traditional Crafts')
    })

    it('should handle null/undefined content', () => {
      expect(MultilingualContentService.createSearchableText(null)).toBe('')
      expect(MultilingualContentService.createSearchableText(undefined)).toBe('')
    })

    it('should filter out empty content', () => {
      const contentWithEmpty = {
        'zh-HK': '香港傳統工藝',
        'en': '',
        'zh-CN': '   '
      }
      
      const searchable = MultilingualContentService.createSearchableText(contentWithEmpty)
      expect(searchable).toBe('香港傳統工藝')
    })
  })

  describe('formatContentWithLanguage', () => {
    it('should return content with language info', () => {
      const result = MultilingualContentService.formatContentWithLanguage(
        sampleContent,
        'en'
      )
      
      expect(result.content).toBe('Hong Kong Traditional Crafts')
      expect(result.actualLanguage).toBe('en')
      expect(result.isTranslated).toBe(false)
    })

    it('should indicate when content is translated', () => {
      const partialContent = { 'zh-HK': '香港傳統工藝' }
      const result = MultilingualContentService.formatContentWithLanguage(
        partialContent,
        'en'
      )
      
      expect(result.content).toBe('香港傳統工藝')
      expect(result.actualLanguage).toBe('zh-HK')
      expect(result.isTranslated).toBe(true)
    })
  })

  describe('exportForTranslation', () => {
    it('should export content for translation', () => {
      const exported = MultilingualContentService.exportForTranslation(sampleContent, 'zh-HK')
      
      expect(exported.sourceLanguage).toBe('zh-HK')
      expect(exported.sourceContent).toBe('香港傳統工藝')
      expect(exported.targetLanguages).toEqual(['zh-CN', 'en'])
      expect(exported.existingTranslations).toEqual({
        'zh-CN': '香港传统工艺',
        'en': 'Hong Kong Traditional Crafts'
      })
    })
  })

  describe('importTranslations', () => {
    it('should import translations into multilingual content', () => {
      const baseContent = { 'zh-HK': '香港傳統工藝' }
      const translations = {
        'zh-CN': '香港传统工艺',
        'en': 'Hong Kong Traditional Crafts'
      }
      
      const imported = MultilingualContentService.importTranslations(baseContent, translations)
      
      expect(imported).toEqual({
        'zh-HK': '香港傳統工藝',
        'zh-CN': '香港传统工艺',
        'en': 'Hong Kong Traditional Crafts'
      })
    })

    it('should filter out invalid language codes and empty content', () => {
      const baseContent = { 'zh-HK': '香港傳統工藝' }
      const translations = {
        'invalid-lang': 'Invalid',
        'en': 'Valid content',
        'zh-CN': '   ' // Empty content
      }
      
      const imported = MultilingualContentService.importTranslations(baseContent, translations)
      
      expect(imported).toEqual({
        'zh-HK': '香港傳統工藝',
        'en': 'Valid content'
      })
    })
  })
})