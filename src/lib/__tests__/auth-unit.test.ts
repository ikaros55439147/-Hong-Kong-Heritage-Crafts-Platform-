/**
 * Authentication and Authorization Unit Tests
 * Tests all auth-related functionality in isolation
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { setupTestEnvironment, cleanupTestEnvironment, createMockUser } from '@/lib/test-utils'

describe('Authentication Unit Tests', () => {
  beforeEach(() => {
    setupTestEnvironment()
  })

  afterEach(() => {
    cleanupTestEnvironment()
  })

  describe('Password Utilities', () => {
    test('should hash password correctly', async () => {
      const { hashPassword } = await import('@/lib/auth/password')
      
      const password = 'SecurePass123!'
      const hashedPassword = await hashPassword(password)
      
      expect(hashedPassword).not.toBe(password)
      expect(hashedPassword).toMatch(/^\$2b\$10\$/)
      expect(hashedPassword.length).toBeGreaterThan(50)
    })

    test('should verify correct password', async () => {
      const { hashPassword, verifyPassword } = await import('@/lib/auth/password')
      
      const password = 'SecurePass123!'
      const hashedPassword = await hashPassword(password)
      
      const isValid = await verifyPassword(password, hashedPassword)
      expect(isValid).toBe(true)
    })

    test('should reject incorrect password', async () => {
      const { hashPassword, verifyPassword } = await import('@/lib/auth/password')
      
      const password = 'SecurePass123!'
      const wrongPassword = 'WrongPass456!'
      const hashedPassword = await hashPassword(password)
      
      const isValid = await verifyPassword(wrongPassword, hashedPassword)
      expect(isValid).toBe(false)
    })

    test('should handle empty passwords', async () => {
      const { hashPassword, verifyPassword } = await import('@/lib/auth/password')
      
      await expect(hashPassword('')).rejects.toThrow()
      await expect(verifyPassword('', 'hash')).rejects.toThrow()
    })

    test('should validate password strength', async () => {
      const { validatePasswordStrength } = await import('@/lib/auth/password')
      
      // Strong passwords
      const strongPasswords = [
        'SecurePass123!',
        'MyP@ssw0rd',
        'Str0ng#P@ss',
        'C0mpl3x!Pass'
      ]
      
      strongPasswords.forEach(password => {
        const result = validatePasswordStrength(password)
        expect(result.isValid).toBe(true)
        expect(result.score).toBeGreaterThanOrEqual(3)
      })
      
      // Weak passwords
      const weakPasswords = [
        '123456',
        'password',
        'PASSWORD',
        'Pass123',
        '12345678'
      ]
      
      weakPasswords.forEach(password => {
        const result = validatePasswordStrength(password)
        expect(result.isValid).toBe(false)
        expect(result.score).toBeLessThan(3)
      })
    })
  })

  describe('JWT Utilities', () => {
    test('should generate valid JWT token', async () => {
      const { generateToken } = await import('@/lib/auth/jwt')
      const mockUser = createMockUser()
      
      const token = await generateToken({
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role
      })
      
      expect(token).toBeTruthy()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // JWT has 3 parts
    })

    test('should verify valid JWT token', async () => {
      const { generateToken, verifyToken } = await import('@/lib/auth/jwt')
      const mockUser = createMockUser()
      
      const payload = {
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role
      }
      
      const token = await generateToken(payload)
      const decoded = await verifyToken(token)
      
      expect(decoded.userId).toBe(payload.userId)
      expect(decoded.email).toBe(payload.email)
      expect(decoded.role).toBe(payload.role)
    })

    test('should reject invalid JWT token', async () => {
      const { verifyToken } = await import('@/lib/auth/jwt')
      
      const invalidTokens = [
        'invalid.token.here',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
        '',
        'not-a-jwt-token'
      ]
      
      for (const token of invalidTokens) {
        await expect(verifyToken(token)).rejects.toThrow()
      }
    })

    test('should handle expired tokens', async () => {
      const { generateToken, verifyToken } = await import('@/lib/auth/jwt')
      const mockUser = createMockUser()
      
      // Generate token with very short expiry
      const token = await generateToken({
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role
      }, '1ms') // 1 millisecond expiry
      
      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 10))
      
      await expect(verifyToken(token)).rejects.toThrow('expired')
    })

    test('should generate refresh token', async () => {
      const { generateRefreshToken, verifyRefreshToken } = await import('@/lib/auth/jwt')
      
      const refreshToken = await generateRefreshToken('user-123')
      expect(refreshToken).toBeTruthy()
      
      const decoded = await verifyRefreshToken(refreshToken)
      expect(decoded.userId).toBe('user-123')
    })
  })

  describe('Authentication Service', () => {
    test('should authenticate user with valid credentials', async () => {
      const { AuthService } = await import('@/lib/auth/auth.service')
      const { hashPassword } = await import('@/lib/auth/password')
      
      const mockUser = createMockUser({
        email: 'test@example.com',
        passwordHash: await hashPassword('SecurePass123!')
      })
      
      // Mock database
      const mockPrisma = {
        user: {
          findUnique: vi.fn().mockResolvedValue(mockUser)
        }
      }
      
      const authService = new AuthService(mockPrisma as any)
      const result = await authService.authenticate('test@example.com', 'SecurePass123!')
      
      expect(result.success).toBe(true)
      expect(result.user?.id).toBe(mockUser.id)
      expect(result.token).toBeTruthy()
    })

    test('should reject invalid email', async () => {
      const { AuthService } = await import('@/lib/auth/auth.service')
      
      const mockPrisma = {
        user: {
          findUnique: vi.fn().mockResolvedValue(null)
        }
      }
      
      const authService = new AuthService(mockPrisma as any)
      const result = await authService.authenticate('nonexistent@example.com', 'password')
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid credentials')
    })

    test('should reject invalid password', async () => {
      const { AuthService } = await import('@/lib/auth/auth.service')
      const { hashPassword } = await import('@/lib/auth/password')
      
      const mockUser = createMockUser({
        passwordHash: await hashPassword('CorrectPassword123!')
      })
      
      const mockPrisma = {
        user: {
          findUnique: vi.fn().mockResolvedValue(mockUser)
        }
      }
      
      const authService = new AuthService(mockPrisma as any)
      const result = await authService.authenticate(mockUser.email, 'WrongPassword')
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid credentials')
    })

    test('should register new user', async () => {
      const { AuthService } = await import('@/lib/auth/auth.service')
      const mockUser = createMockUser()
      
      const mockPrisma = {
        user: {
          findUnique: vi.fn().mockResolvedValue(null), // Email not exists
          create: vi.fn().mockResolvedValue(mockUser)
        }
      }
      
      const authService = new AuthService(mockPrisma as any)
      const result = await authService.register({
        email: 'new@example.com',
        password: 'SecurePass123!',
        role: 'LEARNER'
      })
      
      expect(result.success).toBe(true)
      expect(result.user?.email).toBe('new@example.com')
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'new@example.com',
          role: 'LEARNER'
        })
      })
    })

    test('should reject duplicate email registration', async () => {
      const { AuthService } = await import('@/lib/auth/auth.service')
      const existingUser = createMockUser()
      
      const mockPrisma = {
        user: {
          findUnique: vi.fn().mockResolvedValue(existingUser)
        }
      }
      
      const authService = new AuthService(mockPrisma as any)
      const result = await authService.register({
        email: existingUser.email,
        password: 'SecurePass123!',
        role: 'LEARNER'
      })
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Email already exists')
    })

    test('should refresh access token', async () => {
      const { AuthService } = await import('@/lib/auth/auth.service')
      const { generateRefreshToken } = await import('@/lib/auth/jwt')
      
      const mockUser = createMockUser()
      const refreshToken = await generateRefreshToken(mockUser.id)
      
      const mockPrisma = {
        user: {
          findUnique: vi.fn().mockResolvedValue(mockUser)
        }
      }
      
      const authService = new AuthService(mockPrisma as any)
      const result = await authService.refreshToken(refreshToken)
      
      expect(result.success).toBe(true)
      expect(result.token).toBeTruthy()
      expect(result.user?.id).toBe(mockUser.id)
    })
  })

  describe('Permission System', () => {
    test('should check user permissions correctly', async () => {
      const { PermissionService } = await import('@/lib/auth/permissions')
      
      const learner = createMockUser({ role: 'LEARNER' })
      const craftsman = createMockUser({ role: 'CRAFTSMAN' })
      const admin = createMockUser({ role: 'ADMIN' })
      
      // Test basic permissions
      expect(PermissionService.canCreateCourse(learner)).toBe(false)
      expect(PermissionService.canCreateCourse(craftsman)).toBe(true)
      expect(PermissionService.canCreateCourse(admin)).toBe(true)
      
      expect(PermissionService.canModerateContent(learner)).toBe(false)
      expect(PermissionService.canModerateContent(craftsman)).toBe(false)
      expect(PermissionService.canModerateContent(admin)).toBe(true)
    })

    test('should check resource ownership permissions', async () => {
      const { PermissionService } = await import('@/lib/auth/permissions')
      
      const user1 = createMockUser({ id: 'user-1' })
      const user2 = createMockUser({ id: 'user-2' })
      const admin = createMockUser({ id: 'admin-1', role: 'ADMIN' })
      
      const resource = { userId: 'user-1' }
      
      expect(PermissionService.canEditResource(user1, resource)).toBe(true)
      expect(PermissionService.canEditResource(user2, resource)).toBe(false)
      expect(PermissionService.canEditResource(admin, resource)).toBe(true) // Admin can edit all
    })

    test('should validate role hierarchy', async () => {
      const { PermissionService } = await import('@/lib/auth/permissions')
      
      expect(PermissionService.hasRoleOrHigher('LEARNER', 'LEARNER')).toBe(true)
      expect(PermissionService.hasRoleOrHigher('CRAFTSMAN', 'LEARNER')).toBe(true)
      expect(PermissionService.hasRoleOrHigher('ADMIN', 'LEARNER')).toBe(true)
      expect(PermissionService.hasRoleOrHigher('ADMIN', 'CRAFTSMAN')).toBe(true)
      
      expect(PermissionService.hasRoleOrHigher('LEARNER', 'CRAFTSMAN')).toBe(false)
      expect(PermissionService.hasRoleOrHigher('LEARNER', 'ADMIN')).toBe(false)
      expect(PermissionService.hasRoleOrHigher('CRAFTSMAN', 'ADMIN')).toBe(false)
    })

    test('should check course management permissions', async () => {
      const { PermissionService } = await import('@/lib/auth/permissions')
      
      const craftsman1 = createMockUser({ id: 'craftsman-1', role: 'CRAFTSMAN' })
      const craftsman2 = createMockUser({ id: 'craftsman-2', role: 'CRAFTSMAN' })
      const admin = createMockUser({ role: 'ADMIN' })
      
      const course = { craftsmanId: 'craftsman-profile-1' }
      const craftsmanProfile1 = { id: 'craftsman-profile-1', userId: 'craftsman-1' }
      
      expect(PermissionService.canManageCourse(craftsman1, course, craftsmanProfile1)).toBe(true)
      expect(PermissionService.canManageCourse(craftsman2, course, craftsmanProfile1)).toBe(false)
      expect(PermissionService.canManageCourse(admin, course, craftsmanProfile1)).toBe(true)
    })

    test('should check product management permissions', async () => {
      const { PermissionService } = await import('@/lib/auth/permissions')
      
      const craftsman = createMockUser({ id: 'craftsman-1', role: 'CRAFTSMAN' })
      const otherUser = createMockUser({ id: 'other-user', role: 'LEARNER' })
      const admin = createMockUser({ role: 'ADMIN' })
      
      const product = { craftsmanId: 'craftsman-profile-1' }
      const craftsmanProfile = { id: 'craftsman-profile-1', userId: 'craftsman-1' }
      
      expect(PermissionService.canManageProduct(craftsman, product, craftsmanProfile)).toBe(true)
      expect(PermissionService.canManageProduct(otherUser, product, craftsmanProfile)).toBe(false)
      expect(PermissionService.canManageProduct(admin, product, craftsmanProfile)).toBe(true)
    })
  })

  describe('Authentication Middleware', () => {
    test('should authenticate valid token', async () => {
      const { authenticateToken } = await import('@/lib/auth/middleware')
      const { generateToken } = await import('@/lib/auth/jwt')
      
      const mockUser = createMockUser()
      const token = await generateToken({
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role
      })
      
      const mockPrisma = {
        user: {
          findUnique: vi.fn().mockResolvedValue(mockUser)
        }
      }
      
      const result = await authenticateToken(token, mockPrisma as any)
      
      expect(result.success).toBe(true)
      expect(result.user?.id).toBe(mockUser.id)
    })

    test('should reject invalid token', async () => {
      const { authenticateToken } = await import('@/lib/auth/middleware')
      
      const mockPrisma = {
        user: {
          findUnique: vi.fn()
        }
      }
      
      const result = await authenticateToken('invalid-token', mockPrisma as any)
      
      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })

    test('should handle missing user in database', async () => {
      const { authenticateToken } = await import('@/lib/auth/middleware')
      const { generateToken } = await import('@/lib/auth/jwt')
      
      const token = await generateToken({
        userId: 'nonexistent-user',
        email: 'test@example.com',
        role: 'LEARNER'
      })
      
      const mockPrisma = {
        user: {
          findUnique: vi.fn().mockResolvedValue(null)
        }
      }
      
      const result = await authenticateToken(token, mockPrisma as any)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('User not found')
    })

    test('should require specific role', async () => {
      const { requireRole } = await import('@/lib/auth/middleware')
      
      const learner = createMockUser({ role: 'LEARNER' })
      const craftsman = createMockUser({ role: 'CRAFTSMAN' })
      const admin = createMockUser({ role: 'ADMIN' })
      
      expect(requireRole(learner, 'LEARNER')).toBe(true)
      expect(requireRole(craftsman, 'LEARNER')).toBe(true) // Higher role can access lower
      expect(requireRole(admin, 'LEARNER')).toBe(true)
      
      expect(requireRole(learner, 'CRAFTSMAN')).toBe(false)
      expect(requireRole(craftsman, 'CRAFTSMAN')).toBe(true)
      expect(requireRole(admin, 'CRAFTSMAN')).toBe(true)
      
      expect(requireRole(learner, 'ADMIN')).toBe(false)
      expect(requireRole(craftsman, 'ADMIN')).toBe(false)
      expect(requireRole(admin, 'ADMIN')).toBe(true)
    })
  })

  describe('Rate Limiting', () => {
    test('should allow requests within limit', async () => {
      const { RateLimiter } = await import('@/lib/auth/rate-limiter')
      
      const rateLimiter = new RateLimiter({
        windowMs: 60000, // 1 minute
        maxRequests: 5
      })
      
      const clientId = 'test-client'
      
      // First 5 requests should be allowed
      for (let i = 0; i < 5; i++) {
        const result = await rateLimiter.checkLimit(clientId)
        expect(result.allowed).toBe(true)
        expect(result.remaining).toBe(4 - i)
      }
    })

    test('should block requests exceeding limit', async () => {
      const { RateLimiter } = await import('@/lib/auth/rate-limiter')
      
      const rateLimiter = new RateLimiter({
        windowMs: 60000,
        maxRequests: 3
      })
      
      const clientId = 'test-client-2'
      
      // First 3 requests allowed
      for (let i = 0; i < 3; i++) {
        const result = await rateLimiter.checkLimit(clientId)
        expect(result.allowed).toBe(true)
      }
      
      // 4th request should be blocked
      const blockedResult = await rateLimiter.checkLimit(clientId)
      expect(blockedResult.allowed).toBe(false)
      expect(blockedResult.retryAfter).toBeGreaterThan(0)
    })

    test('should reset limit after window expires', async () => {
      const { RateLimiter } = await import('@/lib/auth/rate-limiter')
      
      const rateLimiter = new RateLimiter({
        windowMs: 100, // 100ms window
        maxRequests: 2
      })
      
      const clientId = 'test-client-3'
      
      // Use up the limit
      await rateLimiter.checkLimit(clientId)
      await rateLimiter.checkLimit(clientId)
      
      const blockedResult = await rateLimiter.checkLimit(clientId)
      expect(blockedResult.allowed).toBe(false)
      
      // Wait for window to reset
      await new Promise(resolve => setTimeout(resolve, 150))
      
      // Should be allowed again
      const allowedResult = await rateLimiter.checkLimit(clientId)
      expect(allowedResult.allowed).toBe(true)
    })
  })

  describe('Session Management', () => {
    test('should create user session', async () => {
      const { SessionManager } = await import('@/lib/auth/session-manager')
      
      const sessionManager = new SessionManager()
      const mockUser = createMockUser()
      
      const session = await sessionManager.createSession(mockUser.id, {
        userAgent: 'Mozilla/5.0...',
        ipAddress: '192.168.1.1'
      })
      
      expect(session.sessionId).toBeTruthy()
      expect(session.userId).toBe(mockUser.id)
      expect(session.expiresAt).toBeInstanceOf(Date)
    })

    test('should validate active session', async () => {
      const { SessionManager } = await import('@/lib/auth/session-manager')
      
      const sessionManager = new SessionManager()
      const mockUser = createMockUser()
      
      const session = await sessionManager.createSession(mockUser.id, {
        userAgent: 'Mozilla/5.0...',
        ipAddress: '192.168.1.1'
      })
      
      const isValid = await sessionManager.validateSession(session.sessionId)
      expect(isValid).toBe(true)
    })

    test('should invalidate expired session', async () => {
      const { SessionManager } = await import('@/lib/auth/session-manager')
      
      const sessionManager = new SessionManager()
      const mockUser = createMockUser()
      
      // Create session with very short expiry
      const session = await sessionManager.createSession(mockUser.id, {
        userAgent: 'Mozilla/5.0...',
        ipAddress: '192.168.1.1'
      }, 1) // 1ms expiry
      
      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 10))
      
      const isValid = await sessionManager.validateSession(session.sessionId)
      expect(isValid).toBe(false)
    })

    test('should revoke user sessions', async () => {
      const { SessionManager } = await import('@/lib/auth/session-manager')
      
      const sessionManager = new SessionManager()
      const mockUser = createMockUser()
      
      // Create multiple sessions
      const session1 = await sessionManager.createSession(mockUser.id, { userAgent: 'Browser1', ipAddress: '192.168.1.1' })
      const session2 = await sessionManager.createSession(mockUser.id, { userAgent: 'Browser2', ipAddress: '192.168.1.2' })
      
      // Revoke all sessions for user
      await sessionManager.revokeUserSessions(mockUser.id)
      
      // Both sessions should be invalid
      expect(await sessionManager.validateSession(session1.sessionId)).toBe(false)
      expect(await sessionManager.validateSession(session2.sessionId)).toBe(false)
    })
  })
})