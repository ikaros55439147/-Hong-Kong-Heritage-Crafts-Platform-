import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '../../../lib/auth/middleware'
import { MultilingualContentService } from '../../../lib/services/multilingual-content.service'
import { SupportedLanguage, supportedLanguages } from '../../../lib/i18n/config'

export async function POST(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { 
      content, 
      fromLanguage, 
      toLanguage, 
      autoTranslate = false 
    } = body

    // Validate input
    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    if (!supportedLanguages.includes(fromLanguage) || !supportedLanguages.includes(toLanguage)) {
      return NextResponse.json(
        { error: 'Invalid language codes' },
        { status: 400 }
      )
    }

    if (fromLanguage === toLanguage) {
      return NextResponse.json(
        { error: 'Source and target languages cannot be the same' },
        { status: 400 }
      )
    }

    let translatedContent = content

    if (autoTranslate) {
      try {
        translatedContent = await MultilingualContentService.autoTranslate(
          content,
          fromLanguage,
          toLanguage
        )
      } catch (error) {
        console.error('Auto-translation failed:', error)
        return NextResponse.json(
          { error: 'Auto-translation failed' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      originalContent: content,
      translatedContent,
      fromLanguage,
      toLanguage,
      isAutoTranslated: autoTranslate
    })
  } catch (error) {
    console.error('Translation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { 
      multilingualContent, 
      sourceLanguage,
      autoTranslateAll = false 
    } = body

    // Validate multilingual content
    if (!MultilingualContentService.validateContent(multilingualContent)) {
      return NextResponse.json(
        { error: 'Invalid multilingual content format' },
        { status: 400 }
      )
    }

    let updatedContent = multilingualContent

    if (autoTranslateAll) {
      try {
        updatedContent = await MultilingualContentService.autoTranslateToAllLanguages(
          multilingualContent,
          sourceLanguage
        )
      } catch (error) {
        console.error('Batch auto-translation failed:', error)
        return NextResponse.json(
          { error: 'Batch auto-translation failed' },
          { status: 500 }
        )
      }
    }

    const availableLanguages = MultilingualContentService.getAvailableLanguages(updatedContent)
    const missingLanguages = MultilingualContentService.getMissingLanguages(updatedContent)

    return NextResponse.json({
      content: updatedContent,
      availableLanguages,
      missingLanguages,
      isComplete: missingLanguages.length === 0
    })
  } catch (error) {
    console.error('Translation management API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}