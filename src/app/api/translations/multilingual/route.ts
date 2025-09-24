import { NextRequest, NextResponse } from 'next/server'
import { translationService } from '@/lib/services/translation.service'
import { SupportedLanguage } from '@/lib/i18n/config'
import { z } from 'zod'

const multilingualTranslateSchema = z.object({
  content: z.record(z.string()),
  targetLanguages: z.array(z.enum(['zh-HK', 'zh-CN', 'en'])).min(1),
  sourceLanguage: z.enum(['zh-HK', 'zh-CN', 'en']).optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = multilingualTranslateSchema.parse(body)

    const { content, targetLanguages, sourceLanguage } = validatedData

    const result = await translationService.translateMultilingualContent(
      content,
      targetLanguages as SupportedLanguage[],
      sourceLanguage as SupportedLanguage | undefined
    )

    return NextResponse.json({ content: result })
  } catch (error) {
    console.error('Multilingual translation API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Multilingual translation failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}