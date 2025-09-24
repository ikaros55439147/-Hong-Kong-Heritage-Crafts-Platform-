/**
 * Comprehensive API endpoint tests
 * Tests all major API routes for functionality, validation, and error handling
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { setupTestEnvironment, cleanupTestEnvironment, createMockUser, createMockCraftsman, createMockCourse, createMockProduct } from '@/lib/test-utils'

// Mock Prisma client
vi.mock('@/lib/database', () => ({
  prisma: {
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    craftsmanProfile: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    course: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    product: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

// Mock authentication
vi.mock('@/lib/auth/middleware', () => ({
  authenticateRequest: vi.fn(),
  requireAuth: vi.fn(),
}))

describe('API Endpoints', () => {
  beforeEach(() => {
    setupTestEnvironment()
  })

  afterEach(() => {
    cleanupTestEnvironment()
  })

  describe('Authentication Endpoints', () => {
    test('POST /api/auth/register should create new user', async () => {
      const mockUser = createMockUser()
      const { prisma } = await import('@/lib/database')
      
      vi.mocked(prisma.user.create).mockResolvedValue(mockUser)
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          role: 'learner'
        }),
      })

      // Import and test the actual route handler
      const { POST } = await import('@/app/api/auth/register/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.user.email).toBe('test@example.com')
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'test@example.com',
          role: 'learner'
        })
      })
    })

    test('POST /api/auth/login should authenticate user', async () => {
      const mockUser = createMockUser()
      const { prisma } = await import('@/lib/database')
      
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...mockUser,
        passwordHash: '$2b$10$hashedpassword'
      })

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123'
        }),
      })

      const { POST } = await import('@/app/api/auth/login/route')
      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    test('should reject invalid credentials', async () => {
      const { prisma } = await import('@/lib/database')
      
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid@example.com',
          password: 'wrongpassword'
        }),
      })

      const { POST } = await import('@/app/api/auth/login/route')
      const response = await POST(request)

      expect(response.status).toBe(401)
    })
  })

  describe('User Management Endpoints', () => {
    test('GET /api/users/profile should return user profile', async () => {
      const mockUser = createMockUser()
      const { authenticateRequest } = await import('@/lib/auth/middleware')
      
      vi.mocked(authenticateRequest).mockResolvedValue({ user: mockUser })

      const request = new NextRequest('http://localhost/api/users/profile', {
        headers: { Authorization: 'Bearer valid-token' }
      })

      const { GET } = await import('@/app/api/users/profile/route')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user.id).toBe(mockUser.id)
    })

    test('PUT /api/users/profile should update user profile', async () => {
      const mockUser = createMockUser()
      const { authenticateRequest } = await import('@/lib/auth/middleware')
      const { prisma } = await import('@/lib/database')
      
      vi.mocked(authenticateRequest).mockResolvedValue({ user: mockUser })
      vi.mocked(prisma.user.update).mockResolvedValue({
        ...mockUser,
        preferredLanguage: 'en'
      })

      const request = new NextRequest('http://localhost/api/users/profile', {
        method: 'PUT',
        headers: { Authorization: 'Bearer valid-token' },
        body: JSON.stringify({
          preferredLanguage: 'en'
        }),
      })

      const { PUT } = await import('@/app/api/users/profile/route')
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user.preferredLanguage).toBe('en')
    })
  })

  describe('Craftsman Endpoints', () => {
    test('POST /api/craftsmen should create craftsman profile', async () => {
      const mockUser = createMockUser({ role: 'craftsman' })
      const mockCraftsman = createMockCraftsman()
      const { authenticateRequest } = await import('@/lib/auth/middleware')
      const { prisma } = await import('@/lib/database')
      
      vi.mocked(authenticateRequest).mockResolvedValue({ user: mockUser })
      vi.mocked(prisma.craftsmanProfile.create).mockResolvedValue(mockCraftsman)

      const request = new NextRequest('http://localhost/api/craftsmen', {
        method: 'POST',
        headers: { Authorization: 'Bearer valid-token' },
        body: JSON.stringify({
          craftSpecialties: ['手雕麻將'],
          bio: { 'zh-HK': '資深師傅' },
          experienceYears: 20
        }),
      })

      const { POST } = await import('@/app/api/craftsmen/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.craftsman.craftSpecialties).toContain('手雕麻將')
    })

    test('GET /api/craftsmen should return craftsmen list', async () => {
      const mockCraftsmen = [createMockCraftsman()]
      const { prisma } = await import('@/lib/database')
      
      vi.mocked(prisma.craftsmanProfile.findMany).mockResolvedValue(mockCraftsmen)

      const request = new NextRequest('http://localhost/api/craftsmen')

      const { GET } = await import('@/app/api/craftsmen/route')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.craftsmen).toHaveLength(1)
    })
  })

  describe('Course Endpoints', () => {
    test('POST /api/courses should create new course', async () => {
      const mockUser = createMockUser({ role: 'craftsman' })
      const mockCourse = createMockCourse()
      const { authenticateRequest } = await import('@/lib/auth/middleware')
      const { prisma } = await import('@/lib/database')
      
      vi.mocked(authenticateRequest).mockResolvedValue({ user: mockUser })
      vi.mocked(prisma.course.create).mockResolvedValue(mockCourse)

      const request = new NextRequest('http://localhost/api/courses', {
        method: 'POST',
        headers: { Authorization: 'Bearer valid-token' },
        body: JSON.stringify({
          title: { 'zh-HK': '手雕麻將入門課程' },
          description: { 'zh-HK': '學習傳統手雕麻將技藝' },
          craftCategory: '手雕麻將',
          maxParticipants: 8,
          price: 500
        }),
      })

      const { POST } = await import('@/app/api/courses/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.course.craftCategory).toBe('手雕麻將')
    })

    test('GET /api/courses should return courses with filters', async () => {
      const mockCourses = [createMockCourse()]
      const { prisma } = await import('@/lib/database')
      
      vi.mocked(prisma.course.findMany).mockResolvedValue(mockCourses)

      const request = new NextRequest('http://localhost/api/courses?category=手雕麻將')

      const { GET } = await import('@/app/api/courses/route')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.courses).toHaveLength(1)
    })
  })

  describe('Product Endpoints', () => {
    test('POST /api/products should create new product', async () => {
      const mockUser = createMockUser({ role: 'craftsman' })
      const mockProduct = createMockProduct()
      const { authenticateRequest } = await import('@/lib/auth/middleware')
      const { prisma } = await import('@/lib/database')
      
      vi.mocked(authenticateRequest).mockResolvedValue({ user: mockUser })
      vi.mocked(prisma.product.create).mockResolvedValue(mockProduct)

      const request = new NextRequest('http://localhost/api/products', {
        method: 'POST',
        headers: { Authorization: 'Bearer valid-token' },
        body: JSON.stringify({
          name: { 'zh-HK': '手工麻將' },
          description: { 'zh-HK': '純手工雕刻麻將' },
          price: 2000,
          inventoryQuantity: 5,
          craftCategory: '手雕麻將'
        }),
      })

      const { POST } = await import('@/app/api/products/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.product.price).toBe(2000)
    })

    test('GET /api/products should return products list', async () => {
      const mockProducts = [createMockProduct()]
      const { prisma } = await import('@/lib/database')
      
      vi.mocked(prisma.product.findMany).mockResolvedValue(mockProducts)

      const request = new NextRequest('http://localhost/api/products')

      const { GET } = await import('@/app/api/products/route')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.products).toHaveLength(1)
    })
  })

  describe('Error Handling', () => {
    test('should handle validation errors', async () => {
      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid-email',
          password: '123' // Too short
        }),
      })

      const { POST } = await import('@/app/api/auth/register/route')
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    test('should handle database errors', async () => {
      const { prisma } = await import('@/lib/database')
      
      vi.mocked(prisma.user.create).mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          role: 'learner'
        }),
      })

      const { POST } = await import('@/app/api/auth/register/route')
      const response = await POST(request)

      expect(response.status).toBe(500)
    })

    test('should handle unauthorized access', async () => {
      const { authenticateRequest } = await import('@/lib/auth/middleware')
      
      vi.mocked(authenticateRequest).mockRejectedValue(new Error('Unauthorized'))

      const request = new NextRequest('http://localhost/api/users/profile')

      const { GET } = await import('@/app/api/users/profile/route')
      const response = await GET(request)

      expect(response.status).toBe(401)
    })
  })

  describe('Rate Limiting', () => {
    test('should handle rate limiting', async () => {
      // Simulate multiple rapid requests
      const requests = Array(10).fill(null).map(() => 
        new NextRequest('http://localhost/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123'
          }),
        })
      )

      const { POST } = await import('@/app/api/auth/login/route')
      
      // Make multiple requests rapidly
      const responses = await Promise.all(
        requests.map(request => POST(request))
      )

      // At least some should be rate limited (429)
      const rateLimitedResponses = responses.filter(r => r.status === 429)
      expect(rateLimitedResponses.length).toBeGreaterThan(0)
    })
  })
})