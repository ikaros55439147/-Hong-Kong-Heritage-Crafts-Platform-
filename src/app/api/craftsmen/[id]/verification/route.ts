import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, UserRole, VerificationStatus } from '@prisma/client'
import { CraftsmanService } from '@/lib/services/craftsman.service'
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware'
import { requireRole } from '@/lib/auth/permission-middleware'

const prisma = new PrismaClient()
const craftsmanService = new CraftsmanService(prisma)

// PUT /api/craftsmen/[id]/verification - Update verification status (admin only)
export const PUT = withAuth(
  requireRole([UserRole.ADMIN])(async (
    request: AuthenticatedRequest,
    { params }: { params: { id: string } }
  ) => {
    try {
      const adminUserId = request.user!.userId
      const body = await request.json()
      const { status, notes } = body

      // Validate status
      if (!Object.values(VerificationStatus).includes(status)) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid verification status' 
          },
          { status: 400 }
        )
      }

      const updatedProfile = await craftsmanService.updateVerificationStatus(
        params.id,
        status,
        adminUserId,
        notes
      )

      return NextResponse.json({
        success: true,
        data: updatedProfile,
        message: 'Verification status updated successfully'
      })

    } catch (error) {
      console.error('Update verification status error:', error)
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to update verification status'
      let statusCode = 500
      
      if (errorMessage.includes('not found')) {
        statusCode = 404
      } else if (errorMessage.includes('permissions required')) {
        statusCode = 403
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: errorMessage
        },
        { status: statusCode }
      )
    }
  })
)