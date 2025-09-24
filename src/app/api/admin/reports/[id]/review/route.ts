import { NextRequest, NextResponse } from 'next/server'
import { AdminService } from '@/lib/services/admin.service'
import { verifyAdminAuth } from '@/lib/auth/admin-middleware'
import { Permission } from '@/lib/auth/permissions'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request, [Permission.MODERATE_CONTENT])
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      )
    }

    const reportId = params.id
    const body = await request.json()
    const { action, notes } = body

    if (!['approve', 'dismiss', 'remove_content'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be approve, dismiss, or remove_content' },
        { status: 400 }
      )
    }

    const result = await AdminService.reviewReport(
      reportId,
      authResult.user.id,
      action,
      notes
    )

    if (!result.isValid) {
      return NextResponse.json(
        { error: 'Failed to review report', details: result.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: `Report ${action}d successfully`
    })
  } catch (error) {
    console.error('Review report error:', error)
    return NextResponse.json(
      { error: 'Failed to review report' },
      { status: 500 }
    )
  }
}