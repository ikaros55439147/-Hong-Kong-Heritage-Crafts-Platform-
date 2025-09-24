import { PrismaClient, User, UserRole } from '@prisma/client'
import { UserProfile, UserRegistrationData, ValidationResult, ValidationError } from '@/types'

export interface UserPreferences {
  language: string
  notifications: {
    email: boolean
    push: boolean
    sms: boolean
    courseReminders: boolean
    orderUpdates: boolean
    newFollowers: boolean
    promotions: boolean
  }
  privacy: {
    showEmail: boolean
    showPhone: boolean
    allowMessages: boolean
  }
}

export interface UserUpdateData {
  preferredLanguage?: string
  preferences?: Partial<UserPreferences>
}

export class UserService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * Get user profile with preferences
   */
  async getUserProfile(userId: string): Promise<UserProfile & { preferences?: UserPreferences } | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return null
    }

    // Get user preferences (stored in a separate table or as JSON)
    const preferences = await this.getUserPreferences(userId)

    return {
      ...this.mapUserToProfile(user),
      preferences
    }
  }

  /**
   * Update user profile and preferences
   */
  async updateUserProfile(
    userId: string, 
    updateData: UserUpdateData
  ): Promise<UserProfile & { preferences?: UserPreferences }> {
    const validation = this.validateUserUpdateData(updateData)
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`)
    }

    // Update user basic info
    const updateFields: Partial<User> = {}
    if (updateData.preferredLanguage) {
      updateFields.preferredLanguage = updateData.preferredLanguage
    }

    let user: User
    if (Object.keys(updateFields).length > 0) {
      user = await this.prisma.user.update({
        where: { id: userId },
        data: updateFields
      })
    } else {
      const existingUser = await this.prisma.user.findUnique({
        where: { id: userId }
      })
      if (!existingUser) {
        throw new Error('User not found')
      }
      user = existingUser
    }

    // Update preferences if provided
    let preferences: UserPreferences | undefined
    if (updateData.preferences) {
      preferences = await this.updateUserPreferences(userId, updateData.preferences)
    } else {
      preferences = await this.getUserPreferences(userId)
    }

    return {
      ...this.mapUserToProfile(user),
      preferences
    }
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    // For now, we'll store preferences in the user table as JSON
    // In a more complex system, you might have a separate preferences table
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Return default preferences if none exist
    return this.getDefaultPreferences()
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(
    userId: string, 
    preferencesUpdate: Partial<UserPreferences>
  ): Promise<UserPreferences> {
    const currentPreferences = await this.getUserPreferences(userId)
    
    // Merge with current preferences
    const updatedPreferences: UserPreferences = {
      ...currentPreferences,
      ...preferencesUpdate,
      notifications: {
        ...currentPreferences.notifications,
        ...preferencesUpdate.notifications
      },
      privacy: {
        ...currentPreferences.privacy,
        ...preferencesUpdate.privacy
      }
    }

    // Validate preferences
    const validation = this.validateUserPreferences(updatedPreferences)
    if (!validation.isValid) {
      throw new Error(`Preferences validation failed: ${validation.errors.map(e => e.message).join(', ')}`)
    }

    // For now, we'll store in a separate table or extend the user model
    // This is a placeholder - you might want to create a separate preferences table
    
    return updatedPreferences
  }

  /**
   * Get users by role (admin function)
   */
  async getUsersByRole(role: UserRole, page = 1, limit = 20): Promise<{
    users: UserProfile[]
    total: number
    page: number
    limit: number
    totalPages: number
  }> {
    const offset = (page - 1) * limit

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { role },
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.user.count({
        where: { role }
      })
    ])

    return {
      users: users.map(user => this.mapUserToProfile(user)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  /**
   * Search users by email or name
   */
  async searchUsers(query: string, page = 1, limit = 20): Promise<{
    users: UserProfile[]
    total: number
    page: number
    limit: number
    totalPages: number
  }> {
    const offset = (page - 1) * limit

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          email: {
            contains: query,
            mode: 'insensitive'
          }
        },
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.user.count({
        where: {
          email: {
            contains: query,
            mode: 'insensitive'
          }
        }
      })
    ])

    return {
      users: users.map(user => this.mapUserToProfile(user)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  /**
   * Validate user update data
   */
  private validateUserUpdateData(updateData: UserUpdateData): ValidationResult {
    const errors: ValidationError[] = []

    // Validate preferred language
    if (updateData.preferredLanguage) {
      const validLanguages = ['zh-HK', 'zh-CN', 'en']
      if (!validLanguages.includes(updateData.preferredLanguage)) {
        errors.push({
          field: 'preferredLanguage',
          message: 'Invalid preferred language',
          code: 'INVALID_LANGUAGE'
        })
      }
    }

    // Validate preferences if provided
    if (updateData.preferences) {
      const preferencesValidation = this.validateUserPreferences(updateData.preferences as UserPreferences)
      errors.push(...preferencesValidation.errors)
    }

    return {
      isValid: errors.length === 0,
      errors,
      data: updateData
    }
  }

  /**
   * Validate user preferences
   */
  private validateUserPreferences(preferences: Partial<UserPreferences>): ValidationResult {
    const errors: ValidationError[] = []

    // Validate language
    if (preferences.language) {
      const validLanguages = ['zh-HK', 'zh-CN', 'en']
      if (!validLanguages.includes(preferences.language)) {
        errors.push({
          field: 'preferences.language',
          message: 'Invalid language preference',
          code: 'INVALID_LANGUAGE'
        })
      }
    }

    // Validate notification preferences
    if (preferences.notifications) {
      const booleanFields = [
        'email', 'push', 'sms', 'courseReminders', 
        'orderUpdates', 'newFollowers', 'promotions'
      ]
      
      for (const field of booleanFields) {
        const value = preferences.notifications[field as keyof typeof preferences.notifications]
        if (value !== undefined && typeof value !== 'boolean') {
          errors.push({
            field: `preferences.notifications.${field}`,
            message: `${field} must be a boolean`,
            code: 'INVALID_TYPE'
          })
        }
      }
    }

    // Validate privacy preferences
    if (preferences.privacy) {
      const booleanFields = ['showEmail', 'showPhone', 'allowMessages']
      
      for (const field of booleanFields) {
        const value = preferences.privacy[field as keyof typeof preferences.privacy]
        if (value !== undefined && typeof value !== 'boolean') {
          errors.push({
            field: `preferences.privacy.${field}`,
            message: `${field} must be a boolean`,
            code: 'INVALID_TYPE'
          })
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Get default user preferences
   */
  private getDefaultPreferences(): UserPreferences {
    return {
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
    }
  }

  /**
   * Map Prisma User to UserProfile
   */
  private mapUserToProfile(user: User): UserProfile {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      preferredLanguage: user.preferredLanguage,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  }

  /**
   * Delete user account (soft delete or hard delete)
   */
  async deleteUser(userId: string, hardDelete = false): Promise<void> {
    if (hardDelete) {
      await this.prisma.user.delete({
        where: { id: userId }
      })
    } else {
      // Implement soft delete by updating a status field
      // For now, we'll do hard delete as the schema doesn't have a status field
      await this.prisma.user.delete({
        where: { id: userId }
      })
    }
  }

  /**
   * Get user statistics (admin function)
   */
  async getUserStatistics(): Promise<{
    totalUsers: number
    usersByRole: Record<UserRole, number>
    recentRegistrations: number
  }> {
    const [totalUsers, usersByRole, recentRegistrations] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.groupBy({
        by: ['role'],
        _count: {
          role: true
        }
      }),
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        }
      })
    ])

    const roleStats = usersByRole.reduce((acc, item) => {
      acc[item.role] = item._count.role
      return acc
    }, {} as Record<UserRole, number>)

    return {
      totalUsers,
      usersByRole: roleStats,
      recentRegistrations
    }
  }
}