import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/auth/middleware'
import { ApiResponse } from '@/types'
import { EntityType } from '@prisma/client'
import { prisma } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { entityType, entityId, platform, message } = await request.json()

    if (!entityType || !entityId || !platform) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate entity exists
    let entity = null
    let shareUrl = ''
    let shareTitle = ''
    let shareDescription = ''

    switch (entityType as EntityType) {
      case 'COURSE':
        entity = await prisma.course.findUnique({
          where: { id: entityId },
          include: { craftsman: { include: { user: true } } }
        })
        if (entity) {
          shareUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/courses/${entityId}`
          shareTitle = typeof entity.title === 'object' 
            ? (entity.title as any)['zh-HK'] || (entity.title as any)['en'] 
            : entity.title
          shareDescription = typeof entity.description === 'object'
            ? (entity.description as any)['zh-HK'] || (entity.description as any)['en']
            : entity.description as string
        }
        break
      
      case 'PRODUCT':
        entity = await prisma.product.findUnique({
          where: { id: entityId },
          include: { craftsman: { include: { user: true } } }
        })
        if (entity) {
          shareUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/products/${entityId}`
          shareTitle = typeof entity.name === 'object'
            ? (entity.name as any)['zh-HK'] || (entity.name as any)['en']
            : entity.name
          shareDescription = typeof entity.description === 'object'
            ? (entity.description as any)['zh-HK'] || (entity.description as any)['en']
            : entity.description as string
        }
        break
      
      case 'CRAFTSMAN_PROFILE':
        entity = await prisma.craftsmanProfile.findUnique({
          where: { id: entityId },
          include: { user: true }
        })
        if (entity) {
          shareUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/craftsmen/${entityId}`
          shareTitle = `${entity.user.email}'s Profile`
          shareDescription = typeof entity.bio === 'object'
            ? (entity.bio as any)['zh-HK'] || (entity.bio as any)['en']
            : entity.bio as string
        }
        break
      
      case 'EVENT':
        entity = await prisma.event.findUnique({
          where: { id: entityId },
          include: { organizer: true }
        })
        if (entity) {
          shareUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/events/${entityId}`
          shareTitle = typeof entity.title === 'object'
            ? (entity.title as any)['zh-HK'] || (entity.title as any)['en']
            : entity.title
          shareDescription = typeof entity.description === 'object'
            ? (entity.description as any)['zh-HK'] || (entity.description as any)['en']
            : entity.description as string
        }
        break
      
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid entity type' },
          { status: 400 }
        )
    }

    if (!entity) {
      return NextResponse.json(
        { success: false, error: 'Entity not found' },
        { status: 404 }
      )
    }

    // Generate share data based on platform
    let shareData: any = {
      url: shareUrl,
      title: shareTitle,
      description: shareDescription
    }

    switch (platform) {
      case 'facebook':
        shareData.facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
        break
      
      case 'twitter':
        const twitterText = message || `${shareTitle} - ${shareDescription}`
        shareData.twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterText)}&url=${encodeURIComponent(shareUrl)}`
        break
      
      case 'whatsapp':
        const whatsappText = message || `${shareTitle}\n${shareDescription}\n${shareUrl}`
        shareData.whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`
        break
      
      case 'email':
        const emailSubject = `Check out: ${shareTitle}`
        const emailBody = message || `${shareDescription}\n\nView more: ${shareUrl}`
        shareData.emailUrl = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`
        break
      
      case 'copy':
        // Just return the URL for copying
        shareData.copyUrl = shareUrl
        break
      
      default:
        return NextResponse.json(
          { success: false, error: 'Unsupported platform' },
          { status: 400 }
        )
    }

    // Log the share action (for analytics)
    try {
      await prisma.userInteraction.create({
        data: {
          userId: authResult.user.id,
          entityType,
          entityId,
          interactionType: 'SHARE',
          metadata: {
            platform,
            message: message || null
          }
        }
      })
    } catch (error) {
      console.warn('Failed to log share interaction:', error)
    }

    const response: ApiResponse = {
      success: true,
      data: shareData,
      message: 'Share data generated successfully'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Share content error:', error)
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to generate share data'
    }

    return NextResponse.json(response, { status: 500 })
  }
}