import { NextRequest, NextResponse } from 'next/server'
import { translationService } from '@/lib/services/translation.service'
import { SupportedLanguage } from '@/lib/i18n/config'
import { z } from 'zod'

const translateSchema = z.object({
  text: z.string().min(1).max(10000),
  sourceLanguage: z.enum(['zh-HK', 'zh-CN', 'en']),
  targetLanguage: z.enum(['zh-HK', 'zh-CN', 'en']),
  provider: z.string().optional(),
  useCache: z.boolean().optional().default(true),
  forceRefresh: z.boolean().optional().default(false)
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = translateSchema.parse(body)

    const { text, sourceLanguage, targetLanguage, provider, useCache, forceRefresh } = validatedData

    // Don't translate if source and target are the same
    if (sourceLanguage === targetLanguage) {
      return NextResponse.json({
        translatedText: text,
        provider: 'none',
        quality: { score: 1, confidence: 1, needsReview: false, issues: [] },
        fromCache: false
      })
    }

    const result = await translationService.translate(
      text,
      sourceLanguage as SupportedLanguage,
      targetLanguage as SupportedLanguage,
      { provider, useCache, forceRefresh }
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Translation API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Translation failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}