import { NextRequest, NextResponse } from 'next/server'
import { contentManagementService } from '@/lib/services/content-management.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { z } from 'zod'

const CreateScheduleSchema = z.object({
  entityType: z.string(),
  entityId: z.string().uuid(),
  actionType: z.enum(['publish', 'unpublish', 'update']),
  scheduledAt: z.string().transform(str => new Date(str)),
  contentData: z.record(z.any()).optional()
})

export async function POST(request: NextRequest) {
  try {
    const user = await authMiddleware(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = CreateScheduleSchema.parse(body)
    
    const schedule = await contentManagementService.scheduleContent({
      ...validatedData,
      createdBy: user.id
    })
    
    return NextResponse.json(schedule)
  } catch (error) {
    console.error('Error creating schedule:', error)
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

    let schedules
    if (entityType && entityId) {
      // Get schedules for specific entity - this would need to be implemented in the service
      schedules = []
    } else {
      schedules = await contentManagementService.getPendingSchedules()
    }
    
    return NextResponse.json(schedules)
  } catch (error) {
    console.error('Error fetching schedules:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}