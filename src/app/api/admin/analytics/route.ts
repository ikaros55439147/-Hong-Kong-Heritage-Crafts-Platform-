import { NextRequest, NextResponse } from 'next/server'
import { AnalyticsService } from '@/lib/services/analytics.service'
import { verifyAdminAuth } from '@/lib/auth/admin-middleware'
import { Permission } from '@/lib/auth/permissions'

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request, [Permission.VIEW_ANALYTICS])
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    
    // Parse date range
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    const dateRange = startDate && endDate ? {
      startDate: new Date(startDate),
      endDate: new Date(endDate)
    } : undefined

    const analytics = await AnalyticsService.getPlatformAnalytics(dateRange)

    return NextResponse.json({
      success: true,
      data: analytics
    })
  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { error: 'Failed to get analytics data' },
      { status: 500 }
    )
  }
}