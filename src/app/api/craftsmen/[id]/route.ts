import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, UserRole } from '@prisma/client'
import { CraftsmanService } from '@/lib/services/craftsman.service'
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware'

const prisma = new PrismaClient()
const craftsmanService = new CraftsmanService(prisma)

// GET /api/craftsmen/[id] - Get craftsman profile by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const profile = await craftsmanService.getCraftsmanProfile(params.id)
    
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
    console.error('Get craftsman profile error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get craftsman profile' 
      },
      { status: 500 }
    )
  }
}

// PUT /api/craftsmen/[id] - Update craftsman profile
export const PUT = withAuth(async (
  request: AuthenticatedRequest,
  { params }: { params: { id: string } }
) => {
  try {
    const userId = request.user!.userId
    const body = await request.json()

    const updatedProfile = await craftsmanService.updateCraftsmanProfile(
      params.id, 
      body, 
      userId
    )

    return NextResponse.json({
      success: true,
      data: updatedProfile,
      message: 'Craftsman profile updated successfully'
    })

  } catch (error) {
    console.error('Update craftsman profile error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to update craftsman profile'
    let statusCode = 500
    
    if (errorMessage.includes('Validation failed')) {
      statusCode = 400
    } else if (errorMessage.includes('not found')) {
      statusCode = 404
    } else if (errorMessage.includes('Permission denied')) {
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

// DELETE /api/craftsmen/[id] - Delete craftsman profile
export const DELETE = withAuth(async (
  request: AuthenticatedRequest,
  { params }: { params: { id: string } }
) => {
  try {
    const userId = request.user!.userId

    await craftsmanService.deleteCraftsmanProfile(params.id, userId)

    return NextResponse.json({
      success: true,
      message: 'Craftsman profile deleted successfully'
    })

  } catch (error) {
    console.error('Delete craftsman profile error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete craftsman profile'
    let statusCode = 500
    
    if (errorMessage.includes('not found')) {
      statusCode = 404
    } else if (errorMessage.includes('Permission denied')) {
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