import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { CraftsmanService } from '@/lib/services/craftsman.service'
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware'

const prisma = new PrismaClient()
const craftsmanService = new CraftsmanService(prisma)

// GET /api/craftsmen/me - Get current user's craftsman profile
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const userId = request.user!.userId
    
    const profile = await craftsmanService.getCraftsmanProfileByUserId(userId)
    
    if (!profile) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Craftsman profile not found' 
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: profile
    })

  } catch (error) {
    console.error('Get my craftsman profile error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get craftsman profile' 
      },
      { status: 500 }
    )
  }
})