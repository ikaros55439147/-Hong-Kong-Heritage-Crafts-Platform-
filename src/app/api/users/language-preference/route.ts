import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/database'
import { authMiddleware } from '../../../../lib/auth/middleware'
import { supportedLanguages, SupportedLanguage } from '../../../../lib/i18n/config'

export async function GET(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: authResult.user.id },
      select: { preferredLanguage: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      language: user.preferredLanguage || 'zh-HK'
    })
  } catch (error) {
    console.error('Error fetching language preference:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { language } = body

    // Validate language
    if (!language || !supportedLanguages.includes(language as SupportedLanguage)) {
      return NextResponse.json(
        { error: 'Invalid language' },
        { status: 400 }
      )
    }

    // Update user language preference
    const updatedUser = await prisma.user.update({
      where: { id: authResult.user.id },
      data: { preferredLanguage: language },
      select: { preferredLanguage: true }
    })

    return NextResponse.json({
      language: updatedUser.preferredLanguage,
      message: 'Language preference updated successfully'
    })
  } catch (error) {
    console.error('Error updating language preference:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}