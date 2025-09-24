import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PrismaClient, UserRole } from '@prisma/client'
import { UserService, UserPreferences } from '../user.service'

// Mock Prisma Client
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  }
} as unknown as PrismaClient

describe('UserService', () => {
  let userService: UserService

  beforeEach(() => {
    userService = new UserService(mockPrisma)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('getUserProfile', () => {
    it('should return user profile with preferences when user exists', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        role: UserRole.LEARNER,
        preferredLanguage: 'zh-HK',
        createdAt: new Date(),
        updatedAt: new Date(),
        passwordHash: 'hashed'
      }

      mockPrisma.user.findUnique = vi.fn().mockResolvedValue(mockUser)

      const result = await userService.getUserProfile('user-1')

      expect(result).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        role: UserRole.LEARNER,
        preferredLanguage: 'zh-HK',
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
        preferences: expect.any(Object)
      })

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' }
      })
    })

    it('should return null when user does not exist', async () => {
      mockPrisma.user.findUnique = vi.fn().mockResolvedValue(null)

      const result = await userService.getUserProfile('non-existent')

      expect(result).toBeNull()
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent' }
      })
    })
  })

  describe('updateUserProfile', () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      role: UserRole.LEARNER,
      preferredLanguage: 'en',
      createdAt: new Date(),
      updatedAt: new Date(),
      passwordHash: 'hashed'
    }

    it('should update user profile with valid data', async () => {
      mockPrisma.user.update = vi.fn().mockResolvedValue(mockUser)
      mockPrisma.user.findUnique = vi.fn().mockResolvedValue(mockUser)

      const updateData = {
        preferredLanguage: 'en'
      }

      const result = await userService.updateUserProfile('user-1', updateData)

      expect(result).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        role: UserRole.LEARNER,
        preferredLanguage: 'en',
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
        preferences: expect.any(Object)
      })

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { preferredLanguage: 'en' }
      })
    })

    it('should throw error for invalid preferred language', async () => {
      const updateData = {
        preferredLanguage: 'invalid-lang'
      }

      await expect(userService.updateUserProfile('user-1', updateData))
        .rejects.toThrow('Validation failed: Invalid preferred language')
    })

    it('should update preferences when provided', async () => {
      mockPrisma.user.findUnique = vi.fn().mockResolvedValue(mockUser)

      const updateData = {
        preferences: {
          notifications: {
            email: false,
            push: true
          }
        }
      }

      const result = await userService.updateUserProfile('user-1', updateData)

      expect(result.preferences?.notifications?.email).toBe(false)
      expect(result.preferences?.notifications?.push).toBe(true)
    })
  })

  describe('getUserPreferences', () => {
    it('should return default preferences for existing user', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        role: UserRole.LEARNER,
        preferredLanguage: 'zh-HK',
        createdAt: new Date(),
        updatedAt: new Date(),
        passwordHash: 'hashed'
      }

      mockPrisma.user.findUnique = vi.fn().mockResolvedValue(mockUser)

      const result = await userService.getUserPreferences('user-1')

      expect(result).toEqual({
        language: 'zh-HK',
        notifications: {
          email: true,
          push: true,
          sms: false,
          courseReminders: true,
          orderUpdates: true,
          newFollowers: true,
          promotions: false
        },
        privacy: {
          showEmail: false,
          showPhone: false,
          allowMessages: true
        }
      })
    })

    it('should throw error when user does not exist', async () => {
      mockPrisma.user.findUnique = vi.fn().mockResolvedValue(null)

      await expect(userService.getUserPreferences('non-existent'))
        .rejects.toThrow('User not found')
    })
  })

  describe('updateUserPreferences', () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      role: UserRole.LEARNER,
      preferredLanguage: 'zh-HK',
      createdAt: new Date(),
      updatedAt: new Date(),
      passwordHash: 'hashed'
    }

    beforeEach(() => {
      mockPrisma.user.findUnique = vi.fn().mockResolvedValue(mockUser)
    })

    it('should update notification preferences', async () => {
      const preferencesUpdate = {
        notifications: {
          email: false,
          courseReminders: false
        }
      }

      const result = await userService.updateUserPreferences('user-1', preferencesUpdate)

      expect(result.notifications.email).toBe(false)
      expect(result.notifications.courseReminders).toBe(false)
      expect(result.notifications.push).toBe(true) // Should keep existing values
    })

    it('should update privacy preferences', async () => {
      const preferencesUpdate = {
        privacy: {
          showEmail: true,
          allowMessages: false
        }
      }

      const result = await userService.updateUserPreferences('user-1', preferencesUpdate)

      expect(result.privacy.showEmail).toBe(true)
      expect(result.privacy.allowMessages).toBe(false)
      expect(result.privacy.showPhone).toBe(false) // Should keep existing values
    })

    it('should validate invalid language preference', async () => {
      const preferencesUpdate = {
        language: 'invalid-lang'
      }

      await expect(userService.updateUserPreferences('user-1', preferencesUpdate))
        .rejects.toThrow('Preferences validation failed: Invalid language preference')
    })

    it('should validate invalid notification preference types', async () => {
      const preferencesUpdate = {
        notifications: {
          email: 'not-boolean' as any
        }
      }

      await expect(userService.updateUserPreferences('user-1', preferencesUpdate))
        .rejects.toThrow('Preferences validation failed: email must be a boolean')
    })
  })

  describe('getUsersByRole', () => {
    it('should return paginated users by role', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          role: UserRole.CRAFTSMAN,
          preferredLanguage: 'zh-HK',
          createdAt: new Date(),
          updatedAt: new Date(),
          passwordHash: 'hashed'
        },
        {
          id: 'user-2',
          email: 'user2@example.com',
          role: UserRole.CRAFTSMAN,
          preferredLanguage: 'en',
          createdAt: new Date(),
          updatedAt: new Date(),
          passwordHash: 'hashed'
        }
      ]

      mockPrisma.user.findMany = vi.fn().mockResolvedValue(mockUsers)
      mockPrisma.user.count = vi.fn().mockResolvedValue(15)

      const result = await userService.getUsersByRole(UserRole.CRAFTSMAN, 1, 10)

      expect(result).toEqual({
        users: expect.arrayContaining([
          expect.objectContaining({ id: 'user-1', role: UserRole.CRAFTSMAN }),
          expect.objectContaining({ id: 'user-2', role: UserRole.CRAFTSMAN })
        ]),
        total: 15,
        page: 1,
        limit: 10,
        totalPages: 2
      })

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: { role: UserRole.CRAFTSMAN },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' }
      })
    })
  })

  describe('searchUsers', () => {
    it('should search users by email', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'john@example.com',
          role: UserRole.LEARNER,
          preferredLanguage: 'zh-HK',
          createdAt: new Date(),
          updatedAt: new Date(),
          passwordHash: 'hashed'
        }
      ]

      mockPrisma.user.findMany = vi.fn().mockResolvedValue(mockUsers)
      mockPrisma.user.count = vi.fn().mockResolvedValue(1)

      const result = await userService.searchUsers('john', 1, 10)

      expect(result.users).toHaveLength(1)
      expect(result.users[0].email).toBe('john@example.com')
      expect(result.total).toBe(1)

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          email: {
            contains: 'john',
            mode: 'insensitive'
          }
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' }
      })
    })
  })

  describe('getUserStatistics', () => {
    it('should return user statistics', async () => {
      const mockGroupByResult = [
        { role: UserRole.LEARNER, _count: { role: 100 } },
        { role: UserRole.CRAFTSMAN, _count: { role: 25 } },
        { role: UserRole.ADMIN, _count: { role: 5 } }
      ]

      mockPrisma.user.count = vi.fn()
        .mockResolvedValueOnce(130) // total users
        .mockResolvedValueOnce(15)  // recent registrations

      mockPrisma.user.groupBy = vi.fn().mockResolvedValue(mockGroupByResult)

      const result = await userService.getUserStatistics()

      expect(result).toEqual({
        totalUsers: 130,
        usersByRole: {
          [UserRole.LEARNER]: 100,
          [UserRole.CRAFTSMAN]: 25,
          [UserRole.ADMIN]: 5
        },
        recentRegistrations: 15
      })
    })
  })

  describe('deleteUser', () => {
    it('should delete user', async () => {
      mockPrisma.user.delete = vi.fn().mockResolvedValue({})

      await userService.deleteUser('user-1')

      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' }
      })
    })

    it('should perform hard delete when specified', async () => {
      mockPrisma.user.delete = vi.fn().mockResolvedValue({})

      await userService.deleteUser('user-1', true)

      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' }
      })
    })
  })

  describe('validation methods', () => {
    it('should validate user update data correctly', async () => {
      const validData = {
        preferredLanguage: 'en',
        preferences: {
          notifications: {
            email: true
          }
        }
      }

      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        role: UserRole.LEARNER,
        preferredLanguage: 'en',
        createdAt: new Date(),
        updatedAt: new Date(),
        passwordHash: 'hashed'
      }

      // This is testing the private method indirectly through updateUserProfile
      mockPrisma.user.update = vi.fn().mockResolvedValue(mockUser)
      mockPrisma.user.findUnique = vi.fn().mockResolvedValue(mockUser)

      await expect(userService.updateUserProfile('user-1', validData))
        .resolves.toBeDefined()
    })

    it('should reject invalid user update data', async () => {
      const invalidData = {
        preferredLanguage: 'invalid-language'
      }

      await expect(userService.updateUserProfile('user-1', invalidData))
        .rejects.toThrow('Validation failed')
    })
  })
})