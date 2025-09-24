import { NextRequest, NextResponse } from 'next/server'
import { contentManagementService } from '@/lib/services/content-management.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { z } from 'zod'

const AutoTagSchema = z.object({
  entityType: z.string(),
  entityId: z.string().uuid(),
  contentData: z.record(z.any())
})

export async function POST(request: NextRequest) {
  try {
    const user = await authMiddleware(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = AutoTagSchema.parse(body)
    
    const autoTags = await contentManagementService.autoTagContent(
      validatedData.entityType,
      validatedData.entityId,
      validatedData.contentData
    )
    
    return NextResponse.json(autoTags)
  } catch (error) {
    console.error('Error auto-tagging content:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}