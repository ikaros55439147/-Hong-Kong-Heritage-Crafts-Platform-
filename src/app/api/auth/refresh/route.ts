import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { AuthService } from '@/lib/auth/auth.service'

const prisma = new PrismaClient()
const authService = new AuthService(prisma)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { refreshToken } = body

    if (!refreshToken) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Refresh token is required' 
        },
        { status: 400 }
      )
    }

    // Refresh access token
    const result = await authService.refreshToken(refreshToken)

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Token refreshed successfully'
    })

  } catch (error) {
    console.error('Token refresh error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Token refresh failed'
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage 
      },
      { status: 401 }
    )
  }
}