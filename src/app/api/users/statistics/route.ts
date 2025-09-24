import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, UserRole } from '@prisma/client'
import { UserService } from '@/lib/services/user.service'
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware'
import { requireRole } from '@/lib/auth/permission-middleware'

const prisma = new PrismaClient()
const userService = new UserService(prisma)

// GET /api/users/statistics - Get user statistics (admin only)
export const GET = withAuth(
  requireRole([UserRole.ADMIN])(async (request: AuthenticatedRequest) => {
    try {
      const statistics = await userService.getUserStatistics()

      return NextResponse.json({
        success: true,
        data: statistics
      })

    } catch (error) {
      console.error('Get user statistics error:', error)
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to get user statistics' 
        },
        { status: 500 }
      )
    }
  })
)