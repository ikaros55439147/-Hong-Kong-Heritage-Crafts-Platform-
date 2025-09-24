import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PrismaClient, UserRole, VerificationStatus } from '@prisma/client'
import { CraftsmanService, ExtendedCraftsmanProfileData } from '../craftsman.service'

// Mock Prisma Client
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  craftsmanProfile: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  }
} as unknown as PrismaClient

describe('CraftsmanService', () => {
  let craftsmanService: CraftsmanService

  beforeEach(() => {
    craftsmanService = new CraftsmanService(mockPrisma)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('createCraftsmanProfile', () => {
    const mockUser = {
      id: 'user-1',
      email: 'craftsman@example.com',
      role: UserRole.LEARNER,
      preferredLanguage: 'zh-HK',
      createdAt: new Date(),
      updatedAt: new Date(),
      passwordHash: 'hashed'
    }

    const validProfileData: ExtendedCraftsmanProfileData = {
      craftSpecialties: ['手雕麻將', '竹編'],
      bio: {
        'zh-HK': '我是一位傳統手工藝師傅',
        'en': 'I am a traditional craftsman'
      },
      experienceYears: 15,
      workshopLocation: '香港九龍',
      contactInfo: {
        phone: '+852 1234 5678',
        email: 'craftsman@example.com'
      }
    }

    it('should create craftsman profile successfully', async () => {
      const mockCreatedProfile = {
        id: 'profile-1',
        userId: 'user-1',
        craftSpecialties: validProfileData.craftSpecialties,
        bio: validProfileData.bio,
        experienceYears: validProfileData.experienceYears,
        workshopLocation: validProfileData.workshopLocation,
        contactInfo: validProfileData.contactInfo,
        verificationStatus: VerificationStatus.PENDING,
        createdAt: new Date(),
        user: mockUser
      }

      mockPrisma.user.findUnique = vi.fn().mockResolvedValue(mockUser)
      mockPrisma.craftsmanProfile.findUnique = vi.fn().mockResolvedValue(null)
      mockPrisma.user.update = vi.fn().mockResolvedValue({ ...mockUser, role: UserRole.CRAFTSMAN })
      mockPrisma.craftsmanProfile.create = vi.fn().mockResolvedValue(mockCreatedProfile)

      const result = await craftsmanService.createCraftsmanProfile('user-1', validProfileData)

      expect(result).toEqual(mockCreatedProfile)
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' }
      })
      expect(mockPrisma.craftsmanProfile.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          craftSpecialties: validProfileData.craftSpecialties,
          bio: validProfileData.bio,
          experienceYears: validProfileData.experienceYears,
          workshopLocation: validProfileData.workshopLocation,
          contactInfo: validProfileData.contactInfo,
          verificationStatus: VerificationStatus.PENDING
        },
        include: {
          user: true
        }
      })
    })

    it('should throw error when user not found', async () => {
      mockPrisma.user.findUnique = vi.fn().mockResolvedValue(null)

      await expect(craftsmanService.createCraftsmanProfile('non-existent', validProfileData))
        .rejects.toThrow('User not found')
    })

    it('should throw error when user already has craftsman profile', async () => {
      mockPrisma.user.findUnique = vi.fn().mockResolvedValue(mockUser)
      mockPrisma.craftsmanProfile.findUnique = vi.fn().mockResolvedValue({
        id: 'existing-profile',
        userId: 'user-1'
      })

      await expect(craftsmanService.createCraftsmanProfile('user-1', validProfileData))
        .rejects.toThrow('User already has a craftsman profile')
    })

    it('should throw error for invalid craft specialties', async () => {
      const invalidData = {
        ...validProfileData,
        craftSpecialties: []
      }

      mockPrisma.user.findUnique = vi.fn().mockResolvedValue(mockUser)
      mockPrisma.craftsmanProfile.findUnique = vi.fn().mockResolvedValue(null)

      await expect(craftsmanService.createCraftsmanProfile('user-1', invalidData))
        .rejects.toThrow('Validation failed: At least one craft specialty is required')
    })

    it('should throw error for invalid experience years', async () => {
      const invalidData = {
        ...validProfileData,
        experienceYears: -5
      }

      mockPrisma.user.findUnique = vi.fn().mockResolvedValue(mockUser)
      mockPrisma.craftsmanProfile.findUnique = vi.fn().mockResolvedValue(null)

      await expect(craftsmanService.createCraftsmanProfile('user-1', invalidData))
        .rejects.toThrow('Validation failed: Experience years must be a number between 0 and 100')
    })

    it('should throw error for invalid contact email', async () => {
      const invalidData = {
        ...validProfileData,
        contactInfo: {
          email: 'invalid-email'
        }
      }

      mockPrisma.user.findUnique = vi.fn().mockResolvedValue(mockUser)
      mockPrisma.craftsmanProfile.findUnique = vi.fn().mockResolvedValue(null)

      await expect(craftsmanService.createCraftsmanProfile('user-1', invalidData))
        .rejects.toThrow('Validation failed: Invalid email format')
    })
  })

  describe('updateCraftsmanProfile', () => {
    const mockProfile = {
      id: 'profile-1',
      userId: 'user-1',
      craftSpecialties: ['手雕麻將'],
      bio: { 'zh-HK': '原本的介紹' },
      experienceYears: 10,
      workshopLocation: '香港',
      contactInfo: {},
      verificationStatus: VerificationStatus.VERIFIED,
      createdAt: new Date(),
      user: {
        id: 'user-1',
        email: 'craftsman@example.com',
        role: UserRole.CRAFTSMAN
      }
    }

    it('should update craftsman profile successfully', async () => {
      const updateData = {
        craftSpecialties: ['手雕麻將', '竹編'],
        experienceYears: 15
      }

      const updatedProfile = {
        ...mockProfile,
        ...updateData
      }

      mockPrisma.craftsmanProfile.findUnique = vi.fn().mockResolvedValue(mockProfile)
      mockPrisma.craftsmanProfile.update = vi.fn().mockResolvedValue(updatedProfile)

      const result = await craftsmanService.updateCraftsmanProfile('profile-1', updateData, 'user-1')

      expect(result).toEqual(updatedProfile)
      expect(mockPrisma.craftsmanProfile.update).toHaveBeenCalledWith({
        where: { id: 'profile-1' },
        data: {
          craftSpecialties: updateData.craftSpecialties,
          experienceYears: updateData.experienceYears
        },
        include: {
          user: true
        }
      })
    })

    it('should throw error when profile not found', async () => {
      mockPrisma.craftsmanProfile.findUnique = vi.fn().mockResolvedValue(null)

      await expect(craftsmanService.updateCraftsmanProfile('non-existent', {}, 'user-1'))
        .rejects.toThrow('Craftsman profile not found')
    })

    it('should throw error when user tries to update another user\'s profile', async () => {
      mockPrisma.craftsmanProfile.findUnique = vi.fn().mockResolvedValue(mockProfile)
      mockPrisma.user.findUnique = vi.fn().mockResolvedValue({
        id: 'other-user',
        role: UserRole.LEARNER
      })

      await expect(craftsmanService.updateCraftsmanProfile('profile-1', {}, 'other-user'))
        .rejects.toThrow('Permission denied')
    })

    it('should allow admin to update any profile', async () => {
      const updateData = { experienceYears: 20 }
      const updatedProfile = { ...mockProfile, ...updateData }

      mockPrisma.craftsmanProfile.findUnique = vi.fn().mockResolvedValue(mockProfile)
      mockPrisma.user.findUnique = vi.fn().mockResolvedValue({
        id: 'admin-user',
        role: UserRole.ADMIN
      })
      mockPrisma.craftsmanProfile.update = vi.fn().mockResolvedValue(updatedProfile)

      const result = await craftsmanService.updateCraftsmanProfile('profile-1', updateData, 'admin-user')

      expect(result).toEqual(updatedProfile)
    })
  })

  describe('getCraftsmanProfile', () => {
    it('should return craftsman profile with related data', async () => {
      const mockProfile = {
        id: 'profile-1',
        userId: 'user-1',
        craftSpecialties: ['手雕麻將'],
        user: { id: 'user-1', email: 'craftsman@example.com' },
        courses: [],
        products: []
      }

      mockPrisma.craftsmanProfile.findUnique = vi.fn().mockResolvedValue(mockProfile)

      const result = await craftsmanService.getCraftsmanProfile('profile-1')

      expect(result).toEqual(mockProfile)
      expect(mockPrisma.craftsmanProfile.findUnique).toHaveBeenCalledWith({
        where: { id: 'profile-1' },
        include: {
          user: true,
          courses: {
            where: { status: 'ACTIVE' },
            take: 5,
            orderBy: { createdAt: 'desc' }
          },
          products: {
            where: { status: 'ACTIVE' },
            take: 5,
            orderBy: { createdAt: 'desc' }
          }
        }
      })
    })

    it('should return null when profile not found', async () => {
      mockPrisma.craftsmanProfile.findUnique = vi.fn().mockResolvedValue(null)

      const result = await craftsmanService.getCraftsmanProfile('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('searchCraftsmen', () => {
    it('should search craftsmen with filters', async () => {
      const mockCraftsmen = [
        {
          id: 'profile-1',
          craftSpecialties: ['手雕麻將'],
          verificationStatus: VerificationStatus.VERIFIED,
          user: { id: 'user-1', email: 'craftsman1@example.com' },
          _count: { courses: 3, products: 5 }
        },
        {
          id: 'profile-2',
          craftSpecialties: ['竹編'],
          verificationStatus: VerificationStatus.VERIFIED,
          user: { id: 'user-2', email: 'craftsman2@example.com' },
          _count: { courses: 1, products: 2 }
        }
      ]

      mockPrisma.craftsmanProfile.findMany = vi.fn().mockResolvedValue(mockCraftsmen)
      mockPrisma.craftsmanProfile.count = vi.fn().mockResolvedValue(2)

      const result = await craftsmanService.searchCraftsmen({
        craftCategory: '手雕麻將',
        page: 1,
        limit: 10
      })

      expect(result).toEqual({
        craftsmen: mockCraftsmen,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1
      })
    })

    it('should search with query parameter', async () => {
      mockPrisma.craftsmanProfile.findMany = vi.fn().mockResolvedValue([])
      mockPrisma.craftsmanProfile.count = vi.fn().mockResolvedValue(0)

      await craftsmanService.searchCraftsmen({
        query: '麻將',
        page: 1,
        limit: 10
      })

      expect(mockPrisma.craftsmanProfile.findMany).toHaveBeenCalledWith({
        where: {
          verificationStatus: VerificationStatus.VERIFIED,
          OR: [
            {
              craftSpecialties: {
                hasSome: ['麻將']
              }
            },
            {
              user: {
                email: {
                  contains: '麻將',
                  mode: 'insensitive'
                }
              }
            },
            {
              workshopLocation: {
                contains: '麻將',
                mode: 'insensitive'
              }
            }
          ]
        },
        include: {
          user: true,
          _count: {
            select: {
              courses: true,
              products: true
            }
          }
        },
        skip: 0,
        take: 10,
        orderBy: [
          { verificationStatus: 'desc' },
          { createdAt: 'desc' }
        ]
      })
    })
  })

  describe('updateVerificationStatus', () => {
    const mockProfile = {
      id: 'profile-1',
      userId: 'user-1',
      verificationStatus: VerificationStatus.PENDING,
      user: { id: 'user-1', email: 'craftsman@example.com' }
    }

    it('should update verification status successfully', async () => {
      const updatedProfile = {
        ...mockProfile,
        verificationStatus: VerificationStatus.VERIFIED
      }

      mockPrisma.user.findUnique = vi.fn().mockResolvedValue({
        id: 'admin-1',
        role: UserRole.ADMIN
      })
      mockPrisma.craftsmanProfile.update = vi.fn().mockResolvedValue(updatedProfile)

      const result = await craftsmanService.updateVerificationStatus(
        'profile-1',
        VerificationStatus.VERIFIED,
        'admin-1'
      )

      expect(result).toEqual(updatedProfile)
      expect(mockPrisma.craftsmanProfile.update).toHaveBeenCalledWith({
        where: { id: 'profile-1' },
        data: {
          verificationStatus: VerificationStatus.VERIFIED
        },
        include: {
          user: true
        }
      })
    })

    it('should throw error when user is not admin', async () => {
      mockPrisma.user.findUnique = vi.fn().mockResolvedValue({
        id: 'user-1',
        role: UserRole.LEARNER
      })

      await expect(craftsmanService.updateVerificationStatus(
        'profile-1',
        VerificationStatus.VERIFIED,
        'user-1'
      )).rejects.toThrow('Admin permissions required')
    })
  })

  describe('getCraftsmenStatistics', () => {
    it('should return craftsmen statistics', async () => {
      const mockAllCraftsmen = [
        { craftSpecialties: ['手雕麻將', '竹編'] },
        { craftSpecialties: ['手雕麻將'] },
        { craftSpecialties: ['吹糖'] }
      ]

      mockPrisma.craftsmanProfile.count = vi.fn()
        .mockResolvedValueOnce(50) // total
        .mockResolvedValueOnce(35) // verified
        .mockResolvedValueOnce(10) // pending
        .mockResolvedValueOnce(5)  // recent

      mockPrisma.craftsmanProfile.findMany = vi.fn().mockResolvedValue(mockAllCraftsmen)

      const result = await craftsmanService.getCraftsmenStatistics()

      expect(result).toEqual({
        totalCraftsmen: 50,
        verifiedCraftsmen: 35,
        pendingVerification: 10,
        byCategory: {
          '手雕麻將': 2,
          '竹編': 1,
          '吹糖': 1
        },
        recentRegistrations: 5
      })
    })
  })

  describe('deleteCraftsmanProfile', () => {
    const mockProfile = {
      id: 'profile-1',
      userId: 'user-1',
      user: { id: 'user-1', role: UserRole.CRAFTSMAN }
    }

    it('should delete craftsman profile successfully', async () => {
      mockPrisma.craftsmanProfile.findUnique = vi.fn().mockResolvedValue(mockProfile)
      mockPrisma.craftsmanProfile.delete = vi.fn().mockResolvedValue({})
      mockPrisma.user.update = vi.fn().mockResolvedValue({})

      await craftsmanService.deleteCraftsmanProfile('profile-1', 'user-1')

      expect(mockPrisma.craftsmanProfile.delete).toHaveBeenCalledWith({
        where: { id: 'profile-1' }
      })
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { role: UserRole.LEARNER }
      })
    })

    it('should throw error when profile not found', async () => {
      mockPrisma.craftsmanProfile.findUnique = vi.fn().mockResolvedValue(null)

      await expect(craftsmanService.deleteCraftsmanProfile('non-existent', 'user-1'))
        .rejects.toThrow('Craftsman profile not found')
    })
  })
})