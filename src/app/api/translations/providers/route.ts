import { NextResponse } from 'next/server'
import { translationService } from '@/lib/services/translation.service'

export async function GET() {
  try {
    const providers = translationService.getAvailableProviders()
    const usage = await translationService.getProviderUsage()

    return NextResponse.json({
      providers,
      usage,
      defaultProvider: providers.includes('deepl') ? 'deepl' : 'google-translate'
    })
  } catch (error) {
    console.error('Providers API error:', error)
    
    return NextResponse.json(
      { error: 'Failed to get provider information' },
      { status: 500 }
    )
  }
}