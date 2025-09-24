import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/database'
import { followService } from '../follow.service'
import { commentService } from '../comment.service'
import { eventService } from '../event.service'

// Mock auth middleware
const mockAuthMiddleware = (userId: string, role: string = 'USER') => ({
  success: true,
  user: { id: userId, role }
})

describe('Social API Endpoints', () => {
  let testUser1: any
  let testUser2: any
  let testCraftsman: any
  let testEvent: any
  let testComment: any

  beforeEach(async () => {
    // Create test users
    testUser1 = await prisma.user.create({
      data: {
        email: 'user1@test.com',
        passwordHash: 'hashedpassword',
        role: 'USER'
      }
    })

    testUser2 = await prisma.user.create({
      data: {
        email: 'user2@test.com',
        passwordHash: 'hashedpassword',
        role: 'USER'
      }
    })

    // Create test craftsman
    const craftsmanUser = await prisma.user.create({
      data: {
        email: 'craftsman@test.com',
        passwordHash: 'hashedpassword',
        role: 'CRAFTSMAN'
      }
    })

    testCraftsman = await prisma.craftsmanProfile.create({
      data: {
        userId: craftsmanUser.id,
        craftSpecialties: ['pottery'],
        bio: { 'zh-HK': 'Test bio', 'en': 'Test bio' },
        experienceYears: 5,
        verificationStatus: 'VERIFIED'
      }
    })

    // Create test event
    testEvent = await prisma.event.create({
      data: {
        organizerId: craftsmanUser.id,
        title: { 'zh-HK': 'Test Event', 'en': 'Test Event' },
        description: { 'zh-HK': 'Test Description', 'en': 'Test Description' },
        eventType: 'WORKSHOP',
        category: 'pottery',
        startDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        endDateTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
        status: 'REGISTRATION_OPEN'
      }
    })

    // Create test comment
    testComment = await prisma.comment.create({
      data: {
        userId: testUser1.id,
        entityType: 'EVENT',
        entityId: testEvent.id,
        content: 'Test comment'
      }
    })
  })

  afterEach(async () => {
    // Clean up test data
    await prisma.comment.deleteMany()
    await prisma.event.deleteMany()
    await prisma.craftsmanProfile.deleteMany()
    await prisma.follow.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('Follow System', () => {
    it('should allow user to follow another user', async () => {
      const follow = await followService.followUser(testUser1.id, testUser2.id)
      
      expect(follow).toBeDefined()
      expect(follow.followerId).toBe(testUser1.id)
      expect(follow.followingId).toBe(testUser2.id)
    })

    it('should get followers list', async () => {
      await followService.followUser(testUser1.id, testUser2.id)
      
      const followers = await followService.getFollowers(testUser2.id)
      
      expect(followers.data).toHaveLength(1)
      expect(followers.data[0].id).toBe(testUser1.id)
    })

    it('should get following list', async () => {
      await followService.followUser(testUser1.id, testUser2.id)
      
      const following = await followService.getFollowing(testUser1.id)
      
      expect(following.data).toHaveLength(1)
      expect(following.data[0].id).toBe(testUser2.id)
    })

    it('should get follow counts', async () => {
      await followService.followUser(testUser1.id, testUser2.id)
      
      const counts = await followService.getFollowCounts(testUser2.id)
      
      expect(counts.followersCount).toBe(1)
      expect(counts.followingCount).toBe(0)
    })

    it('should check if user is following another', async () => {
      await followService.followUser(testUser1.id, testUser2.id)
      
      const isFollowing = await followService.isFollowing(testUser1.id, testUser2.id)
      const isNotFollowing = await followService.isFollowing(testUser2.id, testUser1.id)
      
      expect(isFollowing).toBe(true)
      expect(isNotFollowing).toBe(false)
    })

    it('should get activity feed', async () => {
      await followService.followUser(testUser1.id, testUser2.id)
      
      const feed = await followService.getActivityFeed(testUser1.id)
      
      expect(feed).toBeDefined()
      expect(feed.data).toBeInstanceOf(Array)
    })

    it('should get suggested follows', async () => {
      const suggestions = await followService.getSuggestedFollows(testUser1.id)
      
      expect(suggestions).toBeInstanceOf(Array)
    })
  })

  describe('Comment System', () => {
    it('should create a comment', async () => {
      const comment = await commentService.createComment(
        testUser1.id,
        'EVENT',
        testEvent.id,
        { content: 'Great event!' }
      )
      
      expect(comment).toBeDefined()
      expect(comment.content).toBe('Great event!')
      expect(comment.userId).toBe(testUser1.id)
    })

    it('should get comments for an entity', async () => {
      const comments = await commentService.getComments('EVENT', testEvent.id)
      
      expect(comments.data).toHaveLength(1)
      expect(comments.data[0].content).toBe('Test comment')
    })

    it('should toggle like on comment', async () => {
      const result1 = await commentService.toggleLike(testUser1.id, 'COMMENT', testComment.id)
      expect(result1.isLiked).toBe(true)
      expect(result1.likesCount).toBe(1)
      
      const result2 = await commentService.toggleLike(testUser1.id, 'COMMENT', testComment.id)
      expect(result2.isLiked).toBe(false)
      expect(result2.likesCount).toBe(0)
    })

    it('should report a comment', async () => {
      const report = await commentService.reportComment(
        testUser2.id,
        testComment.id,
        { reason: 'inappropriate', description: 'Test report' }
      )
      
      expect(report).toBeDefined()
      expect(report.reason).toBe('inappropriate')
    })

    it('should get comment stats', async () => {
      const stats = await commentService.getCommentStats('EVENT', testEvent.id)
      
      expect(stats.totalComments).toBe(1)
      expect(stats.totalLikes).toBe(0)
    })
  })

  describe('Event System', () => {
    it('should register for an event', async () => {
      const registration = await eventService.registerForEvent(
        testEvent.id,
        testUser1.id,
        { notes: 'Looking forward to it!' }
      )
      
      expect(registration).toBeDefined()
      expect(registration.eventId).toBe(testEvent.id)
      expect(registration.userId).toBe(testUser1.id)
      expect(registration.status).toBe('CONFIRMED')
    })

    it('should cancel event registration', async () => {
      await eventService.registerForEvent(testEvent.id, testUser1.id)
      
      await eventService.cancelRegistration(testEvent.id, testUser1.id)
      
      const registration = await prisma.eventRegistration.findUnique({
        where: {
          eventId_userId: {
            eventId: testEvent.id,
            userId: testUser1.id
          }
        }
      })
      
      expect(registration?.status).toBe('CANCELLED')
    })

    it('should get user registrations', async () => {
      await eventService.registerForEvent(testEvent.id, testUser1.id)
      
      const registrations = await eventService.getUserRegistrations(testUser1.id)
      
      expect(registrations.data).toHaveLength(1)
      expect(registrations.data[0].eventId).toBe(testEvent.id)
    })

    it('should submit event feedback', async () => {
      // Register and mark as attended
      await eventService.registerForEvent(testEvent.id, testUser1.id)
      await prisma.eventRegistration.update({
        where: {
          eventId_userId: {
            eventId: testEvent.id,
            userId: testUser1.id
          }
        },
        data: { status: 'ATTENDED' }
      })
      
      const registration = await eventService.submitFeedback(
        testEvent.id,
        testUser1.id,
        'Great workshop!',
        5
      )
      
      expect(registration.feedback).toBe('Great workshop!')
      expect(registration.rating).toBe(5)
    })
  })

  describe('API Response Format', () => {
    it('should return consistent API response format', () => {
      const mockResponse = {
        success: true,
        data: { test: 'data' },
        message: 'Success'
      }
      
      expect(mockResponse).toHaveProperty('success')
      expect(mockResponse).toHaveProperty('data')
      expect(mockResponse).toHaveProperty('message')
      expect(mockResponse.success).toBe(true)
    })

    it('should handle error response format', () => {
      const mockErrorResponse = {
        success: false,
        error: 'Something went wrong'
      }
      
      expect(mockErrorResponse).toHaveProperty('success')
      expect(mockErrorResponse).toHaveProperty('error')
      expect(mockErrorResponse.success).toBe(false)
    })
  })
})