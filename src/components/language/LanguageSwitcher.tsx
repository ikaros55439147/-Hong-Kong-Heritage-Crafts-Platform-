'use client'

import React, { useState } from 'react'
import { useLanguage } from '../../lib/hooks/useLanguage'
import { SupportedLanguage } from '../../lib/i18n/config'

interface LanguageSwitcherProps {
  variant?: 'dropdown' | 'buttons'
  className?: string
  showFlags?: boolean
}

export function LanguageSwitcher({ 
  variant = 'dropdown', 
  className = '',
  showFlags = true 
}: LanguageSwitcherProps) {
  const { 
    currentLanguage, 
    supportedLanguages, 
    changeLanguage, 
    isChanging, 
    error
  } = useLanguage()
  
  const [isOpen, setIsOpen] = useState(false)

  const handleLanguageChange = async (language: SupportedLanguage) => {
    await changeLanguage(language)
    setIsOpen(false)
  }

  const getFlag = (language: SupportedLanguage) => {
    const flags = {
      'zh-HK': '🇭🇰',
      'zh-CN': '🇨🇳',
      'en': '🇺🇸'
    }
    return flags[language]
  }

  if (variant === 'buttons') {
    return (
      <div className={`flex gap-2 ${className}`}>
        {supportedLanguages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            disabled={isChanging}
            className={`
              px-3 py-2 rounded-md text-sm font-medium transition-colors
              ${currentLanguage === lang.code
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
              ${isChanging ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {showFlags && (
              <span className="mr-2">{getFlag(lang.code)}</span>
            )}
            {lang.nativeName}
          </button>
        ))}
        {error && (
          <div className="text-red-500 text-sm mt-1">{error}</div>
        )}
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isChanging}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-md border border-gray-300 
          bg-white text-gray-700 hover:bg-gray-50 transition-colors
          ${isChanging ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        aria-label="切換語言"
      >
        {showFlags && (
          <span>{getFlag(currentLanguage)}</span>
        )}
        <span className="text-sm">
          {supportedLanguages.find(lang => lang.code === currentLanguage)?.nativeName}
        </span>
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
            <div className="py-1">
              {supportedLanguages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  disabled={isChanging}
                  className={`
                    w-full text-left px-4 py-2 text-sm transition-colors
                    ${currentLanguage === lang.code
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                    }
                    ${isChanging ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <div className="flex items-center gap-3">
                    {showFlags && (
                      <span>{getFlag(lang.code)}</span>
                    )}
                    <div>
                      <div className="font-medium">{lang.nativeName}</div>
                      <div className="text-xs text-gray-500">{lang.name}</div>
                    </div>
                    {currentLanguage === lang.code && (
                      <svg className="w-4 h-4 ml-auto text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {error && (
        <div className="absolute top-full left-0 mt-1 text-red-500 text-sm">
          {error}
        </div>
      )}
    </div>
  )
}

export default LanguageSwitcher