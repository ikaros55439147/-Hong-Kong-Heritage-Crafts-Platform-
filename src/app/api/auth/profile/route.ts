import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { AuthService } from '@/lib/auth/auth.service'
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware'

const prisma = new PrismaClient()
const authService = new AuthService(prisma)

// GET /api/auth/profile - Get current user profile
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
      data: userProfile
    })

  } catch (error) {
    console.error('Get profile error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get user profile' 
      },
      { status: 500 }
    )
  }
})

// PUT /api/auth/profile - Update current user profile
export const PUT = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const userId = request.user!.userId
    const body = await request.json()
    const { preferredLanguage } = body

    // Validate preferredLanguage if provided
    if (preferredLanguage && !['zh-HK', 'zh-CN', 'en'].includes(preferredLanguage)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid preferred language' 
        },
        { status: 400 }
      )
    }

    const updatedProfile = await authService.updateUserProfile(userId, {
      preferredLanguage
    })

    return NextResponse.json({
      success: true,
      data: updatedProfile,
      message: 'Profile updated successfully'
    })

  } catch (error) {
    console.error('Update profile error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update user profile' 
      },
      { status: 500 }
    )
  }
})