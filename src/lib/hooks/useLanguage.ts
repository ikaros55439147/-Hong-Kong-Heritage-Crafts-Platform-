'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { SupportedLanguage } from '../i18n/config'
import { LanguageService } from '../services/language.service'

export interface UseLanguageReturn {
  currentLanguage: SupportedLanguage
  supportedLanguages: Array<{
    code: SupportedLanguage
    name: string
    nativeName: string
  }>
  changeLanguage: (language: SupportedLanguage) => Promise<void>
  isChanging: boolean
  error: string | null
  t: (key: string, options?: any) => string
  formatDate: (date: Date) => string
  formatNumber: (number: number) => string
  formatCurrency: (amount: number, currency?: string) => string
}

export function useLanguage(): UseLanguageReturn {
  const { t, i18n } = useTranslation()
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>('zh-HK')
  const [isChanging, setIsChanging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Update current language when i18n language changes
  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      setCurrentLanguage(lng as SupportedLanguage)
    }

    i18n.on('languageChanged', handleLanguageChange)
    
    return () => {
      i18n.off('languageChanged', handleLanguageChange)
    }
  }, [i18n])

  // Initialize language on mount
  useEffect(() => {
    const initializeLanguage = async () => {
      try {
        setIsInitialized(true)
        const detectedLanguage = LanguageService.detectUserLanguage()
        setCurrentLanguage(detectedLanguage)
        if (detectedLanguage !== i18n.language) {
          await i18n.changeLanguage(detectedLanguage)
        }
      } catch (err) {
        console.error('Failed to initialize language:', err)
      }
    }

    if (!isInitialized) {
      initializeLanguage()
    }
  }, [i18n, isInitialized])

  const changeLanguage = useCallback(async (language: SupportedLanguage) => {
    if (language === currentLanguage) return

    setIsChanging(true)
    setError(null)

    try {
      await LanguageService.changeLanguage(language)
      setCurrentLanguage(language)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to change language'
      setError(errorMessage)
      console.error('Language change error:', err)
    } finally {
      setIsChanging(false)
    }
  }, [currentLanguage])

  const formatDate = useCallback((date: Date) => {
    return LanguageService.formatDate(date, currentLanguage)
  }, [currentLanguage])

  const formatNumber = useCallback((number: number) => {
    return LanguageService.formatNumber(number, currentLanguage)
  }, [currentLanguage])

  const formatCurrency = useCallback((amount: number, currency = 'HKD') => {
    return LanguageService.formatCurrency(amount, currency, currentLanguage)
  }, [currentLanguage])

  return {
    currentLanguage,
    supportedLanguages: LanguageService.getSupportedLanguages(),
    changeLanguage,
    isChanging,
    error,
    t,
    formatDate,
    formatNumber,
    formatCurrency
  }
}

export default useLanguage