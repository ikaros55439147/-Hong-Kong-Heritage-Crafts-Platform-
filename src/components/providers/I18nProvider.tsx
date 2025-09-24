'use client'

import React, { useEffect, useState } from 'react'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../lib/i18n/config'
import { LanguageService } from '../../lib/services/language.service'

interface I18nProviderProps {
  children: React.ReactNode
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const initializeI18n = async () => {
      try {
        // Detect and set initial language
        const detectedLanguage = LanguageService.detectUserLanguage()
        
        // Initialize i18n if not already initialized
        if (!i18n.isInitialized) {
          await i18n.init()
        }
        
        // Change to detected language
        await i18n.changeLanguage(detectedLanguage)
        
        setIsInitialized(true)
      } catch (error) {
        console.error('Failed to initialize i18n:', error)
        setIsInitialized(true) // Still render even if initialization fails
      }
    }

    initializeI18n()
  }, [])

  // Show loading state while initializing
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <I18nextProvider i18n={i18n}>
      {children}
    </I18nextProvider>
  )
}

export default I18nProvider