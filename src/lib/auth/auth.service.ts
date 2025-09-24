import { PrismaClient, User, UserRole } from '@prisma/client'
import { PasswordService } from './password'
import { JwtService, TokenPair } from './jwt'
import { UserRegistrationData, LoginCredentials, AuthResult, UserProfile } from '@/types'

export class AuthService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * Register a new user
   */
  async registerUser(userData: UserRegistrationData): Promise<AuthResult> {
    const { email, password, role = UserRole.LEARNER, preferredLanguage = 'zh-HK' } = userData

    // Validate email format
    if (!this.isValidEmail(email)) {
      throw new Error('Invalid email format')
    }

    // Validate password strength
    const passwordValidation = PasswordService.validatePasswordStrength(password)
    if (!passwordValidation.isValid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`)
    }

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (existingUser) {
      throw new Error('User with this email already exists')
    }

    // Hash password
    const passwordHash = await PasswordService.hashPassword(password)

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        role,
        preferredLanguage,
      }
    })

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    }

    const tokens = JwtService.generateTokenPair(tokenPayload)

    return {
      user: this.mapUserToProfile(user),
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    }
  }

  /**
   * Authenticate user login
   */
  async loginUser(credentials: LoginCredentials): Promise<AuthResult> {
    const { email, password } = credentials

    if (!email || !password) {
      throw new Error('Email and password are required')
    }

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (!user) {
      throw new Error('Invalid email or password')
    }

    // Verify password
    const isPasswordValid = await PasswordService.verifyPassword(password, user.passwordHash)
    if (!isPasswordValid) {
      throw new Error('Invalid email or password')
    }

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    }

    const tokens = JwtService.generateTokenPair(tokenPayload)

    return {
      user: this.mapUserToProfile(user),
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = JwtService.verifyRefreshToken(refreshToken)
      
      // Verify user still exists and is active
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId }
      })

      if (!user) {
        throw new Error('User not found')
      }

      // Generate new access token
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
      }

      const accessToken = JwtService.generateAccessToken(tokenPayload)

      return { accessToken }
    } catch (error) {
      throw new Error('Invalid refresh token')
    }
  }

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    })

    return user ? this.mapUserToProfile(user) : null
  }

  /**
   * Update user profile
   */
  async updateUserProfile(
    userId: string, 
    updates: Partial<Pick<User, 'preferredLanguage'>>
  ): Promise<UserProfile> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updates
    })

    return this.mapUserToProfile(user)
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string, 
    currentPassword: string, 
    newPassword: string
  ): Promise<void> {
    // Get current user
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Verify current password
    const isCurrentPasswordValid = await PasswordService.verifyPassword(
      currentPassword, 
      user.passwordHash
    )

    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect')
    }

    // Validate new password
    const passwordValidation = PasswordService.validatePasswordStrength(newPassword)
    if (!passwordValidation.isValid) {
      throw new Error(`New password validation failed: ${passwordValidation.errors.join(', ')}`)
    }

    // Hash new password
    const newPasswordHash = await PasswordService.hashPassword(newPassword)

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash }
    })
  }

  /**
   * Delete user account
   */
  async deleteUser(userId: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id: userId }
    })
  }

  /**
   * Check if email is valid
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
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
   * Verify user exists and return user data
   */
  async verifyUser(userId: string): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      throw new Error('User not found')
    }

    return this.mapUserToProfile(user)
  }

  /**
   * Get users by role (admin only)
   */
  async getUsersByRole(role: UserRole): Promise<UserProfile[]> {
    const users = await this.prisma.user.findMany({
      where: { role },
      orderBy: { createdAt: 'desc' }
    })

    return users.map(user => this.mapUserToProfile(user))
  }

  /**
   * Update user role (admin only)
   */
  async updateUserRole(userId: string, newRole: UserRole): Promise<UserProfile> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { role: newRole }
    })

    return this.mapUserToProfile(user)
  }
}