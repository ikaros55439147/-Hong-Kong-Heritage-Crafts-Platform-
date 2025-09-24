import { PrismaClient, CraftsmanProfile, VerificationStatus, UserRole } from '@prisma/client'
import { 
  CraftsmanProfileData, 
  CraftsmanProfileCreateInput,
  CraftsmanProfileUpdateInput,
  CraftsmanProfileWithUser, 
  ValidationResult, 
  ValidationError, 
  MultiLanguageContent, 
  ContactInfo 
} from '@/types'
import { notificationService } from './notification.service'

export interface CraftsmanExperience {
  title: MultiLanguageContent
  company?: string
  location?: string
  startDate: Date
  endDate?: Date
  description?: MultiLanguageContent
  isCurrentPosition?: boolean
}

export interface CraftsmanSkill {
  name: string
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  yearsOfExperience?: number
  certifications?: string[]
}

export interface CraftsmanPortfolio {
  title: MultiLanguageContent
  description?: MultiLanguageContent
  images: string[]
  videos?: string[]
  category: string
  completionDate?: Date
  materials?: string[]
  techniques?: string[]
}

export interface ExtendedCraftsmanProfileData extends CraftsmanProfileData {
  experiences?: CraftsmanExperience[]
  skills?: CraftsmanSkill[]
  portfolio?: CraftsmanPortfolio[]
  achievements?: string[]
  certifications?: string[]
  workshopImages?: string[]
  socialMedia?: {
    facebook?: string
    instagram?: string
    youtube?: string
    website?: string
  }
}

export class CraftsmanService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * Create a new craftsman profile
   */
  async createCraftsmanProfile(
    userId: string, 
    profileData: ExtendedCraftsmanProfileData
  ): Promise<CraftsmanProfileWithUser> {
    // Validate the user exists and has appropriate role
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Check if user already has a craftsman profile
    const existingProfile = await this.prisma.craftsmanProfile.findUnique({
      where: { userId }
    })

    if (existingProfile) {
      throw new Error('User already has a craftsman profile')
    }

    // Validate profile data
    const validation = this.validateCraftsmanProfileData(profileData)
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`)
    }

    // Update user role to CRAFTSMAN if not already
    if (user.role === UserRole.LEARNER) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { role: UserRole.CRAFTSMAN }
      })
    }

    // Convert to Prisma input format
    const createInput: CraftsmanProfileCreateInput = {
      craftSpecialties: profileData.craftSpecialties,
      bio: (profileData.bio || {}) as any,
      experienceYears: profileData.experienceYears,
      workshopLocation: profileData.workshopLocation,
      contactInfo: (profileData.contactInfo || {}) as any
    }

    // Create craftsman profile
    const profile = await this.prisma.craftsmanProfile.create({
      data: {
        userId,
        ...createInput,
        verificationStatus: VerificationStatus.PENDING
      },
      include: {
        user: true
      }
    })

    return profile
  }

  /**
   * Update craftsman profile
   */
  async updateCraftsmanProfile(
    profileId: string, 
    updateData: Partial<ExtendedCraftsmanProfileData>,
    userId?: string
  ): Promise<CraftsmanProfileWithUser> {
    // Get existing profile
    const existingProfile = await this.prisma.craftsmanProfile.findUnique({
      where: { id: profileId },
      include: { user: true }
    })

    if (!existingProfile) {
      throw new Error('Craftsman profile not found')
    }

    // Check permissions (user can only update their own profile, unless admin)
    if (userId && existingProfile.userId !== userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      })
      
      if (!user || user.role !== UserRole.ADMIN) {
        throw new Error('Permission denied')
      }
    }

    // Validate update data
    const validation = this.validateCraftsmanProfileData(updateData)
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`)
    }

    // Convert to Prisma input format
    const updateInput: Partial<CraftsmanProfileUpdateInput> = {}
    
    if (updateData.craftSpecialties) {
      updateInput.craftSpecialties = updateData.craftSpecialties
    }
    
    if (updateData.bio) {
      updateInput.bio = updateData.bio as any
    }
    
    if (updateData.experienceYears !== undefined) {
      updateInput.experienceYears = updateData.experienceYears
    }
    
    if (updateData.workshopLocation !== undefined) {
      updateInput.workshopLocation = updateData.workshopLocation
    }
    
    if (updateData.contactInfo) {
      updateInput.contactInfo = updateData.contactInfo as any
    }

    // Update profile
    const updatedProfile = await this.prisma.craftsmanProfile.update({
      where: { id: profileId },
      data: updateInput,
      include: {
        user: true
      }
    })

    return updatedProfile
  }

  /**
   * Get craftsman profile by ID
   */
  async getCraftsmanProfile(profileId: string): Promise<CraftsmanProfileWithUser | null> {
    const profile = await this.prisma.craftsmanProfile.findUnique({
      where: { id: profileId },
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

    return profile
  }

  /**
   * Get craftsman profile by user ID
   */
  async getCraftsmanProfileByUserId(userId: string): Promise<CraftsmanProfileWithUser | null> {
    const profile = await this.prisma.craftsmanProfile.findUnique({
      where: { userId },
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

    return profile
  }

  /**
   * Search craftsmen by criteria
   */
  async searchCraftsmen(criteria: {
    query?: string
    craftCategory?: string
    location?: string
    verificationStatus?: VerificationStatus
    experienceLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
    page?: number
    limit?: number
  }): Promise<{
    craftsmen: CraftsmanProfileWithUser[]
    total: number
    page: number
    limit: number
    totalPages: number
  }> {
    const {
      query,
      craftCategory,
      location,
      verificationStatus = VerificationStatus.VERIFIED,
      page = 1,
      limit = 20
    } = criteria

    const offset = (page - 1) * limit

    // Build where clause
    const where: any = {
      verificationStatus
    }

    if (craftCategory) {
      where.craftSpecialties = {
        has: craftCategory
      }
    }

    if (location) {
      where.workshopLocation = {
        contains: location,
        mode: 'insensitive'
      }
    }

    if (query) {
      where.OR = [
        {
          craftSpecialties: {
            hasSome: [query]
          }
        },
        {
          user: {
            email: {
              contains: query,
              mode: 'insensitive'
            }
          }
        },
        {
          workshopLocation: {
            contains: query,
            mode: 'insensitive'
          }
        }
      ]
    }

    const [craftsmen, total] = await Promise.all([
      this.prisma.craftsmanProfile.findMany({
        where,
        include: {
          user: true,
          _count: {
            select: {
              courses: true,
              products: true
            }
          }
        },
        skip: offset,
        take: limit,
        orderBy: [
          { verificationStatus: 'desc' },
          { createdAt: 'desc' }
        ]
      }),
      this.prisma.craftsmanProfile.count({ where })
    ])

    return {
      craftsmen,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  /**
   * Update verification status (admin only)
   */
  async updateVerificationStatus(
    profileId: string,
    status: VerificationStatus,
    adminUserId: string,
    notes?: string
  ): Promise<CraftsmanProfileWithUser> {
    // Verify admin permissions
    const admin = await this.prisma.user.findUnique({
      where: { id: adminUserId }
    })

    if (!admin || admin.role !== UserRole.ADMIN) {
      throw new Error('Admin permissions required')
    }

    // Get current profile to compare status
    const currentProfile = await this.prisma.craftsmanProfile.findUnique({
      where: { id: profileId },
      include: { user: true }
    })

    if (!currentProfile) {
      throw new Error('Craftsman profile not found')
    }

    const oldStatus = currentProfile.verificationStatus

    // Update verification status
    const updatedProfile = await this.prisma.craftsmanProfile.update({
      where: { id: profileId },
      data: {
        verificationStatus: status
      },
      include: {
        user: true
      }
    })

    // Send notification to craftsman about status change
    if (oldStatus !== status) {
      try {
        await notificationService.notifyCraftsmanStatusChange(
          currentProfile.userId,
          oldStatus,
          status,
          notes
        )
      } catch (error) {
        console.error('Failed to send craftsman status change notification:', error)
        // Don't fail the main operation if notification fails
      }
    }

    return updatedProfile
  }

  /**
   * Get craftsmen statistics
   */
  async getCraftsmenStatistics(): Promise<{
    totalCraftsmen: number
    verifiedCraftsmen: number
    pendingVerification: number
    byCategory: Record<string, number>
    recentRegistrations: number
  }> {
    const [
      totalCraftsmen,
      verifiedCraftsmen,
      pendingVerification,
      recentRegistrations,
      allCraftsmen
    ] = await Promise.all([
      this.prisma.craftsmanProfile.count(),
      this.prisma.craftsmanProfile.count({
        where: { verificationStatus: VerificationStatus.VERIFIED }
      }),
      this.prisma.craftsmanProfile.count({
        where: { verificationStatus: VerificationStatus.PENDING }
      }),
      this.prisma.craftsmanProfile.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        }
      }),
      this.prisma.craftsmanProfile.findMany({
        select: { craftSpecialties: true }
      })
    ])

    // Count by category
    const byCategory: Record<string, number> = {}
    allCraftsmen.forEach(craftsman => {
      craftsman.craftSpecialties.forEach(specialty => {
        byCategory[specialty] = (byCategory[specialty] || 0) + 1
      })
    })

    return {
      totalCraftsmen,
      verifiedCraftsmen,
      pendingVerification,
      byCategory,
      recentRegistrations
    }
  }

  /**
   * Delete craftsman profile
   */
  async deleteCraftsmanProfile(profileId: string, userId?: string): Promise<void> {
    // Get existing profile
    const existingProfile = await this.prisma.craftsmanProfile.findUnique({
      where: { id: profileId },
      include: { user: true }
    })

    if (!existingProfile) {
      throw new Error('Craftsman profile not found')
    }

    // Check permissions
    if (userId && existingProfile.userId !== userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      })
      
      if (!user || user.role !== UserRole.ADMIN) {
        throw new Error('Permission denied')
      }
    }

    // Delete profile (this will cascade delete related courses and products)
    await this.prisma.craftsmanProfile.delete({
      where: { id: profileId }
    })

    // Update user role back to LEARNER if they want to
    await this.prisma.user.update({
      where: { id: existingProfile.userId },
      data: { role: UserRole.LEARNER }
    })
  }

  /**
   * Validate craftsman profile data
   */
  private validateCraftsmanProfileData(data: Partial<ExtendedCraftsmanProfileData>): ValidationResult {
    const errors: ValidationError[] = []

    // Validate craft specialties
    if (data.craftSpecialties) {
      if (!Array.isArray(data.craftSpecialties) || data.craftSpecialties.length === 0) {
        errors.push({
          field: 'craftSpecialties',
          message: 'At least one craft specialty is required',
          code: 'REQUIRED'
        })
      }

      // Validate each specialty
      data.craftSpecialties.forEach((specialty, index) => {
        if (!specialty || typeof specialty !== 'string' || specialty.trim().length === 0) {
          errors.push({
            field: `craftSpecialties[${index}]`,
            message: 'Craft specialty cannot be empty',
            code: 'INVALID_VALUE'
          })
        }
      })
    }

    // Validate experience years
    if (data.experienceYears !== undefined) {
      if (typeof data.experienceYears !== 'number' || data.experienceYears < 0 || data.experienceYears > 100) {
        errors.push({
          field: 'experienceYears',
          message: 'Experience years must be a number between 0 and 100',
          code: 'INVALID_RANGE'
        })
      }
    }

    // Validate bio (multi-language content)
    if (data.bio) {
      const validLanguages = ['zh-HK', 'zh-CN', 'en']
      Object.keys(data.bio).forEach(lang => {
        if (!validLanguages.includes(lang)) {
          errors.push({
            field: `bio.${lang}`,
            message: 'Invalid language code',
            code: 'INVALID_LANGUAGE'
          })
        }
      })
    }

    // Validate contact info
    if (data.contactInfo) {
      this.validateContactInfo(data.contactInfo, errors)
    }

    // Validate workshop location
    if (data.workshopLocation !== undefined && typeof data.workshopLocation !== 'string') {
      errors.push({
        field: 'workshopLocation',
        message: 'Workshop location must be a string',
        code: 'INVALID_TYPE'
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
      data
    }
  }

  /**
   * Validate contact information
   */
  private validateContactInfo(contactInfo: ContactInfo, errors: ValidationError[]): void {
    // Validate email
    if (contactInfo.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(contactInfo.email)) {
        errors.push({
          field: 'contactInfo.email',
          message: 'Invalid email format',
          code: 'INVALID_FORMAT'
        })
      }
    }

    // Validate phone
    if (contactInfo.phone) {
      const phoneRegex = /^[\+]?[0-9\s\-\(\)]{8,20}$/
      if (!phoneRegex.test(contactInfo.phone)) {
        errors.push({
          field: 'contactInfo.phone',
          message: 'Invalid phone format',
          code: 'INVALID_FORMAT'
        })
      }
    }

    // Validate website
    if (contactInfo.website) {
      try {
        new URL(contactInfo.website)
      } catch {
        errors.push({
          field: 'contactInfo.website',
          message: 'Invalid website URL',
          code: 'INVALID_FORMAT'
        })
      }
    }
  }
}