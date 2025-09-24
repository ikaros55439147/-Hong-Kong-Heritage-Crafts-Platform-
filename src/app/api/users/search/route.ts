import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, UserRole } from '@prisma/client'
import { UserService } from '@/lib/services/user.service'
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware'
import { requireRole } from '@/lib/auth/permission-middleware'

const prisma = new PrismaClient()
const userService = new UserService(prisma)

// GET /api/users/search - Search users (admin only)
export const GET = withAuth(
  requireRole([UserRole.ADMIN])(async (request: AuthenticatedRequest) => {
    try {
      const { searchParams } = new URL(request.url)
      const query = searchParams.get('q') || ''
      const role = searchParams.get('role') as UserRole | null
      const page = parseInt(searchParams.get('page') || '1')
      const limit = parseInt(searchParams.get('limit') || '20')

      let result

      if (role) {
        // Search by role
        result = await userService.getUsersByRole(role, page, limit)
      } else if (query) {
        // Search by query
        result = await userService.searchUsers(query, page, limit)
      } else {
        // Get all users with pagination
        result = await userService.getUsersByRole(UserRole.LEARNER, page, limit)
        const craftsmanResult = await userService.getUsersByRole(UserRole.CRAFTSMAN, page, limit)
        const adminResult = await userService.getUsersByRole(UserRole.ADMIN, page, limit)
        
        // Combine results (this is a simplified approach)
        result = {
          users: [...result.users, ...craftsmanResult.users, ...adminResult.users],
          total: result.total + craftsmanResult.total + adminResult.total,
          page,
          limit,
          totalPages: Math.ceil((result.total + craftsmanResult.total + adminResult.total) / limit)
        }
      }

      return NextResponse.json({
        success: true,
        data: result
      })

    } catch (error) {
      console.error('Search users error:', error)
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to search users' 
        },
        { status: 500 }
      )
    }
  })
)