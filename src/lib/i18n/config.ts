import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import resourcesToBackend from 'i18next-resources-to-backend'

// Supported languages
export const supportedLanguages = ['zh-HK', 'zh-CN', 'en'] as const
export type SupportedLanguage = typeof supportedLanguages[number]

// Default language
export const defaultLanguage: SupportedLanguage = 'zh-HK'

// Language configuration
export const languageConfig = {
  'zh-HK': {
    name: '繁體中文',
    nativeName: '繁體中文',
    flag: '🇭🇰'
  },
  'zh-CN': {
    name: '简体中文', 
    nativeName: '简体中文',
    flag: '🇨🇳'
  },
  'en': {
    name: 'English',
    nativeName: 'English', 
    flag: '🇺🇸'
  }
} as const

// Initialize i18next
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .use(
    resourcesToBackend((language: string, namespace: string) => 
      import(`./locales/${language}/${namespace}.json`)
    )
  )
  .init({
    lng: defaultLanguage,
    fallbackLng: defaultLanguage,
    supportedLngs: [...supportedLanguages],
    
    // Namespace configuration
    defaultNS: 'common',
    ns: ['common', 'auth', 'courses', 'products', 'craftsmen', 'errors'],
    
    // Detection options
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng'
    },
    
    // Interpolation options
    interpolation: {
      escapeValue: false // React already escapes values
    },
    
    // Development options
    debug: process.env.NODE_ENV === 'development',
    
    // React options
    react: {
      useSuspense: false
    }
  })

export default i18n