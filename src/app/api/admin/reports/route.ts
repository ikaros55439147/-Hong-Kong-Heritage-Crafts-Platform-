import { NextRequest, NextResponse } from 'next/server'
import { AdminService } from '@/lib/services/admin.service'
import { verifyAdminAuth } from '@/lib/auth/admin-middleware'
import { Permission } from '@/lib/auth/permissions'
import { ReportStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request, [Permission.MODERATE_CONTENT])
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    
    // Parse filters
    const filters = {
      entityType: searchParams.get('entityType') || undefined,
      status: searchParams.get('status') as ReportStatus || undefined,
      reportedBy: searchParams.get('reportedBy') || undefined,
      dateFrom: searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined,
      dateTo: searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined
    }

    // Parse pagination
    const pagination = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20')
    }

    const result = await AdminService.getReports(filters, pagination)

    if (!result.isValid) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: result.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data
    })
  } catch (error) {
    console.error('Reports API error:', error)
    return NextResponse.json(
      { error: 'Failed to get reports' },
      { status: 500 }
    )
  }
}