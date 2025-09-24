import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { AuthService } from '@/lib/auth/auth.service'
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware'

const prisma = new PrismaClient()
const authService = new AuthService(prisma)

// GET /api/users/me - Get current user information (protected route)
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const userId = request.user!.userId
    
    const userProfile = await authService.getUserProfile(userId)
    
    if (!userProfile) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'User not found' 
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        user: userProfile,
        permissions: {
          role: userProfile.role,
          // You can add more permission checks here
        }
      }
    })

  } catch (error) {
    console.error('Get current user error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get user information' 
      },
      { status: 500 }
    )
  }
})