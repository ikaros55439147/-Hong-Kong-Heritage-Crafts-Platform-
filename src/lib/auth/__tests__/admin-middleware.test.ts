import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { verifyAdminAuth, createAdminMiddleware } from '../admin-middleware'
import { Permission } from '../permissions'
import { UserRole } from '@prisma/client'

// Mock JWT verification
vi.mock('../jwt', () => ({
  verifyToken: vi.fn()
}))

import { verifyToken } from '../jwt'

describe('Admin Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('verifyAdminAuth', () => {
    it('should return error for missing authorization header', async () => {
      const request = new NextRequest('http://localhost/api/admin/dashboard')
      
      const result = await verifyAdminAuth(request)
      
      expect(result.error).toBe('Missing or invalid authorization header')
      expect(result.user).toBeUndefined()
    })

    it('should return error for invalid authorization format', async () => {
      const request = new NextRequest('http://localhost/api/admin/dashboard', {
        headers: { authorization: 'InvalidFormat token123' }
      })
      
      const result = await verifyAdminAuth(request)
      
      expect(result.error).toBe('Missing or invalid authorization header')
    })

    it('should return error for invalid token', async () => {
      const mockVerifyToken = verifyToken as any
      mockVerifyToken.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/admin/dashboard', {
        headers: { authorization: 'Bearer invalid-token' }
      })
      
      const result = await verifyAdminAuth(request)
      
      expect(result.error).toBe('Invalid token')
    })

    it('should return error for non-admin user', async () => {
      const mockVerifyToken = verifyToken as any
      mockVerifyToken.mockResolvedValue({
        userId: 'user123',
        email: 'user@example.com',
        role: UserRole.LEARNER
      })

      const request = new NextRequest('http://localhost/api/admin/dashboard', {
        headers: { authorization: 'Bearer valid-token' }
      })
      
      const result = await verifyAdminAuth(request)
      
      expect(result.error).toBe('Admin access required')
    })

    it('should return user for valid admin token', async () => {
      const mockVerifyToken = verifyToken as any
      mockVerifyToken.mockResolvedValue({
        userId: 'admin123',
        email: 'admin@example.com',
        role: UserRole.ADMIN
      })

      const request = new NextRequest('http://localhost/api/admin/dashboard', {
        headers: { authorization: 'Bearer valid-admin-token' }
      })
      
      const result = await verifyAdminAuth(request)
      
      expect(result.error).toBeUndefined()
      expect(result.user).toEqual({
        id: 'admin123',
        email: 'admin@example.com',
        role: UserRole.ADMIN
      })
    })

    it('should check specific permissions when provided', async () => {
      const mockVerifyToken = verifyToken as any
      mockVerifyToken.mockResolvedValue({
        userId: 'admin123',
        email: 'admin@example.com',
        role: UserRole.ADMIN
      })

      const request = new NextRequest('http://localhost/api/admin/users', {
        headers: { authorization: 'Bearer valid-admin-token' }
      })
      
      const result = await verifyAdminAuth(request, [Permission.READ_USERS])
      
      expect(result.error).toBeUndefined()
      expect(result.user).toBeDefined()
    })

    it('should return error for insufficient permissions', async () => {
      const mockVerifyToken = verifyToken as any
      mockVerifyToken.mockResolvedValue({
        userId: 'user123',
        email: 'user@example.com',
        role: UserRole.LEARNER // Learner doesn't have admin permissions
      })

      const request = new NextRequest('http://localhost/api/admin/users', {
        headers: { authorization: 'Bearer valid-token' }
      })
      
      const result = await verifyAdminAuth(request, [Permission.READ_USERS])
      
      expect(result.error).toBe('Admin access required')
    })

    it('should handle token verification errors', async () => {
      const mockVerifyToken = verifyToken as any
      mockVerifyToken.mockRejectedValue(new Error('Token expired'))

      const request = new NextRequest('http://localhost/api/admin/dashboard', {
        headers: { authorization: 'Bearer expired-token' }
      })
      
      const result = await verifyAdminAuth(request)
      
      expect(result.error).toBe('Authentication failed')
    })
  })

  describe('createAdminMiddleware', () => {
    it('should return 401 for unauthorized requests', async () => {
      const middleware = createAdminMiddleware([Permission.READ_USERS])
      
      const request = new NextRequest('http://localhost/api/admin/users')
      const response = await middleware(request)
      
      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('Missing or invalid authorization header')
    })

    it('should pass through for authorized requests', async () => {
      const mockVerifyToken = verifyToken as any
      mockVerifyToken.mockResolvedValue({
        userId: 'admin123',
        email: 'admin@example.com',
        role: UserRole.ADMIN
      })

      const middleware = createAdminMiddleware([Permission.READ_USERS])
      
      const request = new NextRequest('http://localhost/api/admin/users', {
        headers: { authorization: 'Bearer valid-admin-token' }
      })
      
      const response = await middleware(request)
      
      // Should return NextResponse.next() which doesn't have a status
      expect(response.status).toBeUndefined()
    })
  })
})