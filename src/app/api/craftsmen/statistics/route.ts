import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, UserRole } from '@prisma/client'
import { CraftsmanService } from '@/lib/services/craftsman.service'
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware'
import { requireRole } from '@/lib/auth/permission-middleware'

const prisma = new PrismaClient()
const craftsmanService = new CraftsmanService(prisma)

// GET /api/craftsmen/statistics - Get craftsmen statistics (admin only)
export const GET = withAuth(
  requireRole([UserRole.ADMIN])(async (request: AuthenticatedRequest) => {
    try {
      const statistics = await craftsmanService.getCraftsmenStatistics()

      return NextResponse.json({
        success: true,
        data: statistics
      })

    } catch (error) {
      console.error('Get craftsmen statistics error:', error)
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to get craftsmen statistics' 
        },
        { status: 500 }
      )
    }
  })
)