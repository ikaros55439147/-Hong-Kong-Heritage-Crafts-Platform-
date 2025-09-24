'use client'

import React from 'react'
import { useLanguage } from '../../lib/hooks/useLanguage'
import { MultilingualContentService, MultilingualContent } from '../../lib/services/multilingual-content.service'
import { SupportedLanguage } from '../../lib/i18n/config'

interface MultilingualTextProps {
  content: MultilingualContent | null | undefined
  fallbackLanguage?: SupportedLanguage
  showLanguageIndicator?: boolean
  className?: string
  as?: keyof JSX.IntrinsicElements
  maxLength?: number
  showFallbackWarning?: boolean
}

export function MultilingualText({
  content,
  fallbackLanguage,
  showLanguageIndicator = false,
  className = '',
  as: Component = 'span',
  maxLength,
  showFallbackWarning = false
}: MultilingualTextProps) {
  const { currentLanguage, t } = useLanguage()

  if (!content) {
    return null
  }

  const result = MultilingualContentService.formatContentWithLanguage(
    content,
    currentLanguage,
    true
  )

  let displayText = result.content

  // Truncate if maxLength is specified
  if (maxLength && displayText.length > maxLength) {
    displayText = displayText.substring(0, maxLength) + '...'
  }

  // If no content available, show placeholder
  if (!displayText) {
    return (
      <Component className={`${className} text-gray-400 italic`}>
        {t('common.noContentAvailable')}
      </Component>
    )
  }

  return (
    <div className="inline">
      <Component className={className}>
        {displayText}
      </Component>
      
      {/* Language indicator */}
      {showLanguageIndicator && result.isTranslated && (
        <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
          {result.actualLanguage.toUpperCase()}
        </span>
      )}
      
      {/* Fallback warning */}
      {showFallbackWarning && result.isTranslated && (
        <div className="text-xs text-orange-600 mt-1">
          {t('multilingual.contentNotAvailableInLanguage', {
            language: t(`language.${currentLanguage}`),
            fallbackLanguage: t(`language.${result.actualLanguage}`)
          })}
        </div>
      )}
    </div>
  )
}

export default MultilingualText