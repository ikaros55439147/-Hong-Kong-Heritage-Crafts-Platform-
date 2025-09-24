'use client'

import React, { useState, useEffect } from 'react'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { SupportedLanguage, languageConfig } from '@/lib/i18n/config'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { Loading } from '@/components/ui/Loading'

interface TranslationManagerProps {
  content: Record<string, string>
  onContentUpdate: (content: Record<string, string>) => void
  sourceLanguage?: SupportedLanguage
  className?: string
}

export function TranslationManager({
  content,
  onContentUpdate,
  sourceLanguage = 'zh-HK',
  className = ''
}: TranslationManagerProps) {
  const { translate, batchTranslate, getProviders, isTranslating, error } = useTranslation()
  const [providers, setProviders] = useState<any>(null)
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [editingContent, setEditingContent] = useState<Record<string, string>>(content)
  const [translationQuality, setTranslationQuality] = useState<Record<string, any>>({})

  useEffect(() => {
    loadProviders()
  }, [])

  useEffect(() => {
    setEditingContent(content)
  }, [content])

  const loadProviders = async () => {
    const providerData = await getProviders()
    if (providerData) {
      setProviders(providerData)
      setSelectedProvider(providerData.defaultProvider)
    }
  }

  const handleTranslateToLanguage = async (targetLanguage: SupportedLanguage) => {
    const sourceText = editingContent[sourceLanguage]
    if (!sourceText) {
      return
    }

    const result = await translate(sourceText, sourceLanguage, targetLanguage, {
      provider: selectedProvider
    })

    if (result) {
      const updated = {
        ...editingContent,
        [targetLanguage]: result.translatedText
      }
      setEditingContent(updated)
      setTranslationQuality({
        ...translationQuality,
        [targetLanguage]: result.quality
      })
    }
  }

  const handleTranslateAll = async () => {
    const sourceText = editingContent[sourceLanguage]
    if (!sourceText) {
      return
    }

    const targetLanguages = Object.keys(languageConfig)
      .filter(lang => lang !== sourceLanguage && !editingContent[lang]) as SupportedLanguage[]

    if (targetLanguages.length === 0) {
      return
    }

    const job = await batchTranslate([sourceText], sourceLanguage, targetLanguages, {
      provider: selectedProvider
    })

    if (job && job.status === 'completed') {
      const updated = { ...editingContent }
      const qualities = { ...translationQuality }

      targetLanguages.forEach(lang => {
        if (job.results[sourceText] && job.results[sourceText][lang]) {
          updated[lang] = job.results[sourceText][lang]
          // Note: Batch translation doesn't return quality info in this implementation
          qualities[lang] = { score: 0.8, confidence: 0.8, needsReview: true, issues: [] }
        }
      })

      setEditingContent(updated)
      setTranslationQuality(qualities)
    }
  }

  const handleContentChange = (language: SupportedLanguage, value: string) => {
    setEditingContent({
      ...editingContent,
      [language]: value
    })
  }

  const handleSave = () => {
    onContentUpdate(editingContent)
  }

  const getQualityIndicator = (language: SupportedLanguage) => {
    const quality = translationQuality[language]
    if (!quality) return null

    const { score, needsReview, issues } = quality
    const color = score >= 0.8 ? 'green' : score >= 0.6 ? 'yellow' : 'red'
    
    return (
      <div className={`text-xs mt-1 text-${color}-600`}>
        Quality: {Math.round(score * 100)}%
        {needsReview && ' (Needs Review)'}
        {issues.length > 0 && (
          <div className="text-xs text-gray-500">
            Issues: {issues.join(', ')}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {error && (
        <Alert type="error">
          Translation Error: {error}
        </Alert>
      )}

      {providers && (
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Translation Provider:</label>
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="px-3 py-1 border rounded-md"
          >
            {providers.providers.map((provider: string) => (
              <option key={provider} value={provider}>
                {provider}
              </option>
            ))}
          </select>
          <Button
            onClick={handleTranslateAll}
            disabled={isTranslating || !editingContent[sourceLanguage]}
            size="sm"
          >
            {isTranslating ? <Loading size="sm" /> : 'Translate All Missing'}
          </Button>
        </div>
      )}

      <div className="space-y-4">
        {Object.entries(languageConfig).map(([lang, config]) => {
          const language = lang as SupportedLanguage
          const isSource = language === sourceLanguage
          
          return (
            <div key={language} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="font-medium flex items-center gap-2">
                  <span>{config.flag}</span>
                  <span>{config.name}</span>
                  {isSource && <span className="text-xs bg-blue-100 px-2 py-1 rounded">Source</span>}
                </label>
                {!isSource && editingContent[sourceLanguage] && (
                  <Button
                    onClick={() => handleTranslateToLanguage(language)}
                    disabled={isTranslating}
                    size="sm"
                    variant="outline"
                  >
                    {isTranslating ? <Loading size="sm" /> : 'Translate'}
                  </Button>
                )}
              </div>
              
              <textarea
                value={editingContent[language] || ''}
                onChange={(e) => handleContentChange(language, e.target.value)}
                placeholder={`Enter content in ${config.name}...`}
                className="w-full p-3 border rounded-md resize-vertical min-h-[100px]"
                disabled={isTranslating}
              />
              
              {getQualityIndicator(language)}
            </div>
          )
        })}
      </div>

      <div className="flex justify-end gap-2">
        <Button
          onClick={handleSave}
          disabled={isTranslating}
        >
          Save Changes
        </Button>
      </div>
    </div>
  )
}