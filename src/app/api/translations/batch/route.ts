import { NextRequest, NextResponse } from 'next/server'
import { translationService } from '@/lib/services/translation.service'
import { SupportedLanguage } from '@/lib/i18n/config'
import { z } from 'zod'

const batchTranslateSchema = z.object({
  texts: z.array(z.string().min(1).max(10000)).min(1).max(100),
  sourceLanguage: z.enum(['zh-HK', 'zh-CN', 'en']),
  targetLanguages: z.array(z.enum(['zh-HK', 'zh-CN', 'en'])).min(1),
  provider: z.string().optional(),
  useCache: z.boolean().optional().default(true),
  maxConcurrency: z.number().min(1).max(10).optional().default(5)
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = batchTranslateSchema.parse(body)

    const { texts, sourceLanguage, targetLanguages, provider, useCache, maxConcurrency } = validatedData

    // Filter out target languages that are the same as source
    const filteredTargetLanguages = targetLanguages.filter(lang => lang !== sourceLanguage)

    if (filteredTargetLanguages.length === 0) {
      return NextResponse.json({
        id: `job_${Date.now()}`,
        texts,
        sourceLanguage,
        targetLanguages: [],
        status: 'completed',
        results: texts.reduce((acc, text) => {
          acc[text] = { [sourceLanguage]: text }
          return acc
        }, {} as Record<string, Record<SupportedLanguage, string>>),
        createdAt: new Date(),
        completedAt: new Date()
      })
    }

    const job = await translationService.batchTranslate(
      texts,
      sourceLanguage as SupportedLanguage,
      filteredTargetLanguages as SupportedLanguage[],
      { provider, useCache, maxConcurrency }
    )

    return NextResponse.json(job)
  } catch (error) {
    console.error('Batch translation API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Batch translation failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}