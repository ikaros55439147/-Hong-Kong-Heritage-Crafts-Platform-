import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { UserService } from '@/lib/services/user.service'
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware'

const prisma = new PrismaClient()
const userService = new UserService(prisma)

// GET /api/users/profile - Get current user profile with preferences
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const userId = request.user!.userId
    
    const userProfile = await userService.getUserProfile(userId)
    
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
    console.error('Get user profile error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get user profile' 
      },
      { status: 500 }
    )
  }
})

// PUT /api/users/profile - Update current user profile and preferences
export const PUT = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const userId = request.user!.userId
    const body = await request.json()

    const updatedProfile = await userService.updateUserProfile(userId, body)

    return NextResponse.json({
      success: true,
      data: updatedProfile,
      message: 'Profile updated successfully'
    })

  } catch (error) {
    console.error('Update user profile error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to update user profile'
    const statusCode = errorMessage.includes('Validation failed') ? 400 : 500
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage
      },
      { status: statusCode }
    )
  }
})