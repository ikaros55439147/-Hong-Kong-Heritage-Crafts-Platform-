import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, UserRole } from '@prisma/client'
import { CraftsmanService } from '@/lib/services/craftsman.service'
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware'

const prisma = new PrismaClient()
const craftsmanService = new CraftsmanService(prisma)

// GET /api/craftsmen - Search craftsmen
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || undefined
    const craftCategory = searchParams.get('category') || undefined
    const location = searchParams.get('location') || undefined
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const result = await craftsmanService.searchCraftsmen({
      query,
      craftCategory,
      location,
      page,
      limit
    })

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error) {
    console.error('Search craftsmen error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to search craftsmen' 
      },
      { status: 500 }
    )
  }
}

// POST /api/craftsmen - Create craftsman profile
export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const userId = request.user!.userId
    const body = await request.json()

    const profile = await craftsmanService.createCraftsmanProfile(userId, body)

    return NextResponse.json({
      success: true,
      data: profile,
      message: 'Craftsman profile created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Create craftsman profile error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to create craftsman profile'
    const statusCode = errorMessage.includes('Validation failed') || 
                      errorMessage.includes('already has a craftsman profile') ? 400 : 500
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage
      },
      { status: statusCode }
    )
  }
})