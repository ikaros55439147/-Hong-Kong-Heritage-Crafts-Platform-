import { NextRequest, NextResponse } from 'next/server'
import { commentService } from '@/lib/services/comment.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { ApiResponse } from '@/types'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authMiddleware(request)
    if (!authResult.success || !authResult.user || authResult.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const reportId = params.id
    const { action } = await request.json()

    if (!action || !['approve', 'dismiss', 'hide_comment'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      )
    }

    const report = await commentService.reviewReport(
      reportId,
      authResult.user.id,
      action
    )

    const response: ApiResponse = {
      success: true,
      data: report,
      message: `Report ${action}d successfully`
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Review report error:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to review report'
    }

    return NextResponse.json(response, { status: 400 })
  }
}