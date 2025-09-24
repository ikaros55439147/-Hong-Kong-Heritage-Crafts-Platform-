import { NextRequest, NextResponse } from 'next/server'
import { contentManagementService } from '@/lib/services/content-management.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { z } from 'zod'

const CreateTagSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  category: z.string().optional()
})

const TagContentSchema = z.object({
  entityType: z.string(),
  entityId: z.string().uuid(),
  tagIds: z.array(z.string().uuid())
})

export async function POST(request: NextRequest) {
  try {
    const user = await authMiddleware(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Check if this is a tag creation or content tagging request
    if (body.entityType && body.entityId && body.tagIds) {
      // Tag content
      const validatedData = TagContentSchema.parse(body)
      const associations = await contentManagementService.tagContent(
        validatedData.entityType,
        validatedData.entityId,
        validatedData.tagIds,
        user.id
      )
      return NextResponse.json(associations)
    } else {
      // Create tag
      const validatedData = CreateTagSchema.parse(body)
      const tag = await contentManagementService.createTag(validatedData)
      return NextResponse.json(tag)
    }
  } catch (error) {
    console.error('Error with tag operation:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    const tags = await contentManagementService.getTags(category || undefined)
    return NextResponse.json(tags)
  } catch (error) {
    console.error('Error fetching tags:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}