'use client'

import React, { useState, useEffect } from 'react'
import { useLanguage } from '../../lib/hooks/useLanguage'
import { MultilingualContentService, MultilingualContent } from '../../lib/services/multilingual-content.service'
import { SupportedLanguage, supportedLanguages, languageConfig } from '../../lib/i18n/config'

interface MultilingualEditorProps {
  value: MultilingualContent
  onChange: (content: MultilingualContent) => void
  label?: string
  placeholder?: string
  required?: boolean
  multiline?: boolean
  rows?: number
  className?: string
  showAutoTranslate?: boolean
}

export function MultilingualEditor({
  value,
  onChange,
  label,
  placeholder,
  required = false,
  multiline = false,
  rows = 3,
  className = '',
  showAutoTranslate = true
}: MultilingualEditorProps) {
  const { currentLanguage, t } = useLanguage()
  const [activeLanguage, setActiveLanguage] = useState<SupportedLanguage>(currentLanguage)
  const [isTranslating, setIsTranslating] = useState(false)
  const [translationError, setTranslationError] = useState<string | null>(null)

  const availableLanguages = MultilingualContentService.getAvailableLanguages(value)
  const missingLanguages = MultilingualContentService.getMissingLanguages(value)

  // Update active language if current language changes
  useEffect(() => {
    if (MultilingualContentService.hasContent(value, currentLanguage)) {
      setActiveLanguage(currentLanguage)
    }
  }, [currentLanguage, value])

  const handleContentChange = (language: SupportedLanguage, content: string) => {
    const updated = MultilingualContentService.updateContent(value, language, content)
    onChange(updated)
  }

  const handleAutoTranslate = async (targetLanguage: SupportedLanguage) => {
    const sourceLanguage = availableLanguages[0]
    if (!sourceLanguage) return

    const sourceContent = MultilingualContentService.getContent(value, sourceLanguage)
    if (!sourceContent.trim()) return

    setIsTranslating(true)
    setTranslationError(null)

    try {
      const response = await fetch('/api/translations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: sourceContent,
          fromLanguage: sourceLanguage,
          toLanguage: targetLanguage,
          autoTranslate: true
        })
      })

      if (!response.ok) {
        throw new Error('Translation failed')
      }

      const result = await response.json()
      handleContentChange(targetLanguage, result.translatedContent)
    } catch (error) {
      setTranslationError(error instanceof Error ? error.message : 'Translation failed')
    } finally {
      setIsTranslating(false)
    }
  }

  const handleAutoTranslateAll = async () => {
    if (availableLanguages.length === 0) return

    setIsTranslating(true)
    setTranslationError(null)

    try {
      const response = await fetch('/api/translations', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          multilingualContent: value,
          sourceLanguage: availableLanguages[0],
          autoTranslateAll: true
        })
      })

      if (!response.ok) {
        throw new Error('Batch translation failed')
      }

      const result = await response.json()
      onChange(result.content)
    } catch (error) {
      setTranslationError(error instanceof Error ? error.message : 'Batch translation failed')
    } finally {
      setIsTranslating(false)
    }
  }

  const currentContent = MultilingualContentService.getContent(value, activeLanguage, false)
  const hasContent = MultilingualContentService.hasContent(value, activeLanguage)

  return (
    <div className={`space-y-4 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Language Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {supportedLanguages.map((language) => {
            const hasContentForLang = MultilingualContentService.hasContent(value, language)
            const isActive = activeLanguage === language
            
            return (
              <button
                key={language}
                onClick={() => setActiveLanguage(language)}
                className={`
                  py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                  ${isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  <span>{languageConfig[language].flag}</span>
                  <span>{languageConfig[language].nativeName}</span>
                  {hasContentForLang && (
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                  )}
                  {!hasContentForLang && (
                    <div className="w-2 h-2 bg-gray-300 rounded-full" />
                  )}
                </div>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Content Editor */}
      <div className="space-y-3">
        {multiline ? (
          <textarea
            value={currentContent}
            onChange={(e) => handleContentChange(activeLanguage, e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        ) : (
          <input
            type="text"
            value={currentContent}
            onChange={(e) => handleContentChange(activeLanguage, e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        )}

        {/* Translation Actions */}
        {showAutoTranslate && (
          <div className="flex items-center gap-3">
            {!hasContent && availableLanguages.length > 0 && (
              <button
                onClick={() => handleAutoTranslate(activeLanguage)}
                disabled={isTranslating}
                className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isTranslating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t('common.loading')}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                    Auto Translate
                  </>
                )}
              </button>
            )}

            {missingLanguages.length > 0 && availableLanguages.length > 0 && (
              <button
                onClick={handleAutoTranslateAll}
                disabled={isTranslating}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isTranslating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Translating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                    Translate All ({missingLanguages.length})
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Translation Error */}
        {translationError && (
          <div className="text-red-600 text-sm">
            {translationError}
          </div>
        )}

        {/* Content Status */}
        <div className="text-sm text-gray-500">
          <div className="flex items-center gap-4">
            <span>
              Available: {availableLanguages.length}/{supportedLanguages.length} languages
            </span>
            {missingLanguages.length > 0 && (
              <span className="text-orange-600">
                Missing: {missingLanguages.map(lang => languageConfig[lang].nativeName).join(', ')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MultilingualEditor