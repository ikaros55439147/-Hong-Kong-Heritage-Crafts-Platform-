import { NextRequest, NextResponse } from 'next/server'
import { followService } from '@/lib/services/follow.service'
import { authMiddleware } from '@/lib/auth/middleware'
import { ApiResponse } from '@/types'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authMiddleware(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const followingId = params.id
    const followerId = authResult.user.id

    const follow = await followService.followUser(followerId, followingId)

    const response: ApiResponse = {
      success: true,
      data: follow,
      message: 'Successfully followed user'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Follow user error:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to follow user'
    }

    return NextResponse.json(response, { status: 400 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authMiddleware(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const followingId = params.id
    const followerId = authResult.user.id

    await followService.unfollowUser(followerId, followingId)

    const response: ApiResponse = {
      success: true,
      message: 'Successfully unfollowed user'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Unfollow user error:', error)
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to unfollow user'
    }

    return NextResponse.json(response, { status: 400 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authMiddleware(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const followingId = params.id
    const followerId = authResult.user.id

    const isFollowing = await followService.isFollowing(followerId, followingId)

    const response: ApiResponse = {
      success: true,
      data: { isFollowing }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Check follow status error:', error)
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to check follow status'
    }

    return NextResponse.json(response, { status: 500 })
  }
}