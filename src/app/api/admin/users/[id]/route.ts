import { NextRequest, NextResponse } from 'next/server'
import { AdminService } from '@/lib/services/admin.service'
import { verifyAdminAuth } from '@/lib/auth/admin-middleware'
import { Permission } from '@/lib/auth/permissions'
import { UserRole } from '@prisma/client'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request, [Permission.WRITE_USERS])
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      )
    }

    const userId = params.id
    const body = await request.json()
    
    const updates = {
      role: body.role as UserRole,
      verificationStatus: body.verificationStatus
    }

    const result = await AdminService.updateUser(userId, updates)

    if (!result.isValid) {
      return NextResponse.json(
        { error: 'Failed to update user', details: result.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data
    })
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request, [Permission.DELETE_USERS])
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      )
    }

    const userId = params.id
    const result = await AdminService.deleteUser(userId)

    if (!result.isValid) {
      return NextResponse.json(
        { error: 'Failed to delete user', details: result.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}