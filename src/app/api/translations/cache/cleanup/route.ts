import { NextResponse } from 'next/server'
import { TranslationCacheManager } from '@/lib/services/translation.service'

export async function POST() {
  try {
    const deletedCount = await TranslationCacheManager.clearExpiredCache()
    
    return NextResponse.json({
      message: 'Cache cleanup completed',
      deletedEntries: deletedCount
    })
  } catch (error) {
    console.error('Cache cleanup API error:', error)
    
    return NextResponse.json(
      { error: 'Cache cleanup failed' },
      { status: 500 }
    )
  }
}