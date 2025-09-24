import { NextRequest, NextResponse } from 'next/server'
import { userBehaviorService } from '@/lib/services/user-behavior.service'
import { z } from 'zod'

const trackEventSchema = z.object({
  userId: z.string(),
  eventType: z.enum(['view', 'search', 'click', 'purchase', 'bookmark', 'share']),
  entityType: z.enum(['craftsman', 'course', 'product', 'media']),
  entityId: z.string(),
  metadata: z.record(z.any()).optional(),
  sessionId: z.string().optional(),
})

const trackClickSchema = z.object({
  userId: z.string(),
  resultId: z.string(),
  resultType: z.enum(['craftsman', 'course', 'product', 'media']),
  searchQuery: z.string().optional(),
  position: z.number().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Check if this is a search result click tracking
    if (body.action === 'click') {
      const clickData = trackClickSchema.parse(body)
      
      await userBehaviorService.trackEvent({
        userId: clickData.userId,
        eventType: 'click',
        entityType: clickData.resultType,
        entityId: clickData.resultId,
        metadata: {
          source: 'search',
          searchQuery: clickData.searchQuery,
          position: clickData.position,
        }
      })
    } else {
      // Regular event tracking
      const eventData = trackEventSchema.parse(body)
      
      await userBehaviorService.trackEvent({
        userId: eventData.userId,
        eventType: eventData.eventType,
        entityType: eventData.entityType,
        entityId: eventData.entityId,
        metadata: eventData.metadata,
        sessionId: eventData.sessionId,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Event tracked successfully',
    })

  } catch (error) {
    console.error('Behavior tracking error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}