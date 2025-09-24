import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { UserService } from '@/lib/services/user.service'
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware'

const prisma = new PrismaClient()
const userService = new UserService(prisma)

// GET /api/users/preferences - Get current user preferences
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const userId = request.user!.userId
    
    const preferences = await userService.getUserPreferences(userId)

    return NextResponse.json({
      success: true,
      data: preferences
    })

  } catch (error) {
    console.error('Get user preferences error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get user preferences' 
      },
      { status: 500 }
    )
  }
})

// PUT /api/users/preferences - Update current user preferences
export const PUT = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const userId = request.user!.userId
    const body = await request.json()

    const updatedPreferences = await userService.updateUserPreferences(userId, body)

    return NextResponse.json({
      success: true,
      data: updatedPreferences,
      message: 'Preferences updated successfully'
    })

  } catch (error) {
    console.error('Update user preferences error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to update user preferences'
    const statusCode = errorMessage.includes('validation failed') ? 400 : 500
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage
      },
      { status: statusCode }
    )
  }
})