import { NextRequest, NextResponse } from 'next/server'
import { AdminService } from '@/lib/services/admin.service'
import { verifyAdminAuth } from '@/lib/auth/admin-middleware'
import { Permission } from '@/lib/auth/permissions'
import { UserRole } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request, [Permission.READ_USERS])
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    
    // Parse filters
    const filters = {
      role: searchParams.get('role') as UserRole || undefined,
      search: searchParams.get('search') || undefined,
      verificationStatus: searchParams.get('verificationStatus') || undefined,
      dateFrom: searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined,
      dateTo: searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined
    }

    // Parse pagination
    const pagination = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20')
    }

    const result = await AdminService.getUsers(filters, pagination)

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
    console.error('Users API error:', error)
    return NextResponse.json(
      { error: 'Failed to get users' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request, [Permission.WRITE_USERS])
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action, userIds, updates } = body

    if (action === 'bulk_update' && userIds && updates) {
      const result = await AdminService.bulkUpdateUsers(userIds, updates)
      
      if (!result.isValid) {
        return NextResponse.json(
          { error: 'Bulk update failed', details: result.errors },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        data: result.data
      })
    }

    return NextResponse.json(
      { error: 'Invalid action or parameters' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Users bulk operation error:', error)
    return NextResponse.json(
      { error: 'Failed to perform bulk operation' },
      { status: 500 }
    )
  }
}