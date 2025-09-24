import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PrismaClient, UserRole } from '@prisma/client'
import { AuthService } from '../auth.service'

// Mock PasswordService
vi.mock('../password', () => ({
  PasswordService: {
    validatePasswordStrength: vi.fn(),
    hashPassword: vi.fn(),
    verifyPassword: vi.fn(),
  }
}))

import { PasswordService } from '../password'

// Mock Prisma Client
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
  },
} as unknown as PrismaClient

const mockPasswordService = PasswordService as any

describe('AuthService', () => {
  let authService: AuthService

  beforeEach(() => {
    authService = new AuthService(mockPrisma)
    vi.clearAllMocks()
  })

  describe('registerUser', () => {
    const validUserData = {
      email: 'test@example.com',
      password: 'TestPassword123!',
      role: UserRole.LEARNER,
      preferredLanguage: 'zh-HK'
    }

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
      role: UserRole.LEARNER,
      preferredLanguage: 'zh-HK',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    beforeEach(() => {
      mockPasswordService.validatePasswordStrength.mockReturnValue({
        isValid: true,
        errors: []
      })
      mockPasswordService.hashPassword.mockResolvedValue('hashed-password')
    })

    it('should register user successfully', async () => {
      mockPrisma.user.findUnique = vi.fn().mockResolvedValue(null)
      mockPrisma.user.create = vi.fn().mockResolvedValue(mockUser)

      const result = await authService.registerUser(validUserData)

      expect(result).toBeDefined()
      expect(result.user.email).toBe(validUserData.email)
      expect(result.token).toBeDefined()
      expect(result.refreshToken).toBeDefined()
    })

    it('should throw error for invalid email', async () => {
      const invalidData = { ...validUserData, email: 'invalid-email' }

      await expect(authService.registerUser(invalidData)).rejects.toThrow('Invalid email format')
    })

    it('should throw error for weak password', async () => {
      mockPasswordService.validatePasswordStrength.mockReturnValue({
        isValid: false,
        errors: ['Password is too weak']
      })

      await expect(authService.registerUser(validUserData)).rejects.toThrow('Password validation failed')
    })

    it('should throw error for existing user', async () => {
      mockPrisma.user.findUnique = vi.fn().mockResolvedValue(mockUser)

      await expect(authService.registerUser(validUserData)).rejects.toThrow('User with this email already exists')
    })
  })

  describe('loginUser', () => {
    const loginCredentials = {
      email: 'test@example.com',
      password: 'TestPassword123!'
    }

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
      role: UserRole.LEARNER,
      preferredLanguage: 'zh-HK',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    it('should login user successfully', async () => {
      mockPrisma.user.findUnique = vi.fn().mockResolvedValue(mockUser)
      mockPasswordService.verifyPassword.mockResolvedValue(true)

      const result = await authService.loginUser(loginCredentials)

      expect(result).toBeDefined()
      expect(result.user.email).toBe(loginCredentials.email)
      expect(result.token).toBeDefined()
      expect(result.refreshToken).toBeDefined()
    })

    it('should throw error for missing email', async () => {
      const invalidCredentials = { ...loginCredentials, email: '' }

      await expect(authService.loginUser(invalidCredentials)).rejects.toThrow('Email and password are required')
    })

    it('should throw error for non-existent user', async () => {
      mockPrisma.user.findUnique = vi.fn().mockResolvedValue(null)

      await expect(authService.loginUser(loginCredentials)).rejects.toThrow('Invalid email or password')
    })

    it('should throw error for incorrect password', async () => {
      mockPrisma.user.findUnique = vi.fn().mockResolvedValue(mockUser)
      mockPasswordService.verifyPassword.mockResolvedValue(false)

      await expect(authService.loginUser(loginCredentials)).rejects.toThrow('Invalid email or password')
    })
  })

  describe('getUserProfile', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
      role: UserRole.LEARNER,
      preferredLanguage: 'zh-HK',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    it('should return user profile', async () => {
      mockPrisma.user.findUnique = vi.fn().mockResolvedValue(mockUser)

      const result = await authService.getUserProfile('user-123')

      expect(result).toBeDefined()
      expect(result!.id).toBe('user-123')
      expect(result!.email).toBe('test@example.com')
    })

    it('should return null for non-existent user', async () => {
      mockPrisma.user.findUnique = vi.fn().mockResolvedValue(null)

      const result = await authService.getUserProfile('non-existent')

      expect(result).toBeNull()
    })
  })
})