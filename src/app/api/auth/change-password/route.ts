import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { AuthService } from '@/lib/auth/auth.service'
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware'

const prisma = new PrismaClient()
const authService = new AuthService(prisma)

export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const userId = request.user!.userId
    const body = await request.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Current password and new password are required' 
        },
        { status: 400 }
      )
    }

    await authService.changePassword(userId, currentPassword, newPassword)

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully'
    })

  } catch (error) {
    console.error('Change password error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to change password'
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage 
      },
      { status: 400 }
    )
  }
})