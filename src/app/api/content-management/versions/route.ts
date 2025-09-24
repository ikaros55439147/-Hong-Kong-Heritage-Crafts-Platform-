import { NextRequest, NextResponse } from 'next/server'
import { contentManagementService } from '@/lib/services/content-management.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { z } from 'zod'

const CreateVersionSchema = z.object({
  entityType: z.string(),
  entityId: z.string().uuid(),
  contentData: z.record(z.any()),
  changeSummary: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const user = await authMiddleware(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = CreateVersionSchema.parse(body)
    
    const version = await contentManagementService.createVersion({
      ...validatedData,
      createdBy: user.id
    })
    
    return NextResponse.json(version)
  } catch (error) {
    console.error('Error creating version:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entityType')
    const entityId = searchParams.get('entityId')

    if (!entityType || !entityId) {
      return NextResponse.json({ error: 'entityType and entityId are required' }, { status: 400 })
    }

    const versions = await contentManagementService.getVersionHistory(entityType, entityId)
    return NextResponse.json(versions)
  } catch (error) {
    console.error('Error fetching versions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}