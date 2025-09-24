import { JwtService, JwtPayload } from '../jwt'
import { UserRole } from '@prisma/client'

// Mock environment variables
const originalEnv = process.env
beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-key'
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key'
  process.env.JWT_EXPIRES_IN = '15m'
  process.env.JWT_REFRESH_EXPIRES_IN = '7d'
})

afterAll(() => {
  process.env = originalEnv
})

describe('JwtService', () => {
  const mockPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
    userId: 'test-user-id',
    email: 'test@example.com',
    role: UserRole.LEARNER
  }

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const token = JwtService.generateAccessToken(mockPayload)
      
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // JWT has 3 parts
    })

    it('should include payload data in token', () => {
      const token = JwtService.generateAccessToken(mockPayload)
      const decoded = JwtService.decodeToken(token)
      
      expect(decoded).toBeDefined()
      expect(decoded!.userId).toBe(mockPayload.userId)
      expect(decoded!.email).toBe(mockPayload.email)
      expect(decoded!.role).toBe(mockPayload.role)
    })
  })

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const token = JwtService.generateRefreshToken(mockPayload)
      
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3)
    })

    it('should generate different tokens for access and refresh', () => {
      const accessToken = JwtService.generateAccessToken(mockPayload)
      const refreshToken = JwtService.generateRefreshToken(mockPayload)
      
      expect(accessToken).not.toBe(refreshToken)
    })
  })

  describe('generateTokenPair', () => {
    it('should generate both access and refresh tokens', () => {
      const tokens = JwtService.generateTokenPair(mockPayload)
      
      expect(tokens).toBeDefined()
      expect(tokens.accessToken).toBeDefined()
      expect(tokens.refreshToken).toBeDefined()
      expect(tokens.accessToken).not.toBe(tokens.refreshToken)
    })
  })

  describe('verifyAccessToken', () => {
    it('should verify valid access token', () => {
      const token = JwtService.generateAccessToken(mockPayload)
      const verified = JwtService.verifyAccessToken(token)
      
      expect(verified).toBeDefined()
      expect(verified.userId).toBe(mockPayload.userId)
      expect(verified.email).toBe(mockPayload.email)
      expect(verified.role).toBe(mockPayload.role)
    })

    it('should throw error for invalid token', () => {
      expect(() => {
        JwtService.verifyAccessToken('invalid-token')
      }).toThrow('Invalid or expired access token')
    })

    it('should throw error for refresh token used as access token', () => {
      const refreshToken = JwtService.generateRefreshToken(mockPayload)
      
      expect(() => {
        JwtService.verifyAccessToken(refreshToken)
      }).toThrow('Invalid or expired access token')
    })
  })

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', () => {
      const token = JwtService.generateRefreshToken(mockPayload)
      const verified = JwtService.verifyRefreshToken(token)
      
      expect(verified).toBeDefined()
      expect(verified.userId).toBe(mockPayload.userId)
      expect(verified.email).toBe(mockPayload.email)
      expect(verified.role).toBe(mockPayload.role)
    })

    it('should throw error for invalid refresh token', () => {
      expect(() => {
        JwtService.verifyRefreshToken('invalid-token')
      }).toThrow('Invalid or expired refresh token')
    })

    it('should throw error for access token used as refresh token', () => {
      const accessToken = JwtService.generateAccessToken(mockPayload)
      
      expect(() => {
        JwtService.verifyRefreshToken(accessToken)
      }).toThrow('Invalid or expired refresh token')
    })
  })

  describe('decodeToken', () => {
    it('should decode valid token without verification', () => {
      const token = JwtService.generateAccessToken(mockPayload)
      const decoded = JwtService.decodeToken(token)
      
      expect(decoded).toBeDefined()
      expect(decoded!.userId).toBe(mockPayload.userId)
      expect(decoded!.email).toBe(mockPayload.email)
      expect(decoded!.role).toBe(mockPayload.role)
    })

    it('should return null for invalid token', () => {
      const decoded = JwtService.decodeToken('invalid-token')
      expect(decoded).toBeNull()
    })
  })

  describe('isTokenExpired', () => {
    it('should return false for valid token', () => {
      const token = JwtService.generateAccessToken(mockPayload)
      const isExpired = JwtService.isTokenExpired(token)
      
      expect(isExpired).toBe(false)
    })

    it('should return true for invalid token', () => {
      const isExpired = JwtService.isTokenExpired('invalid-token')
      expect(isExpired).toBe(true)
    })

    it('should return true for token without expiration', () => {
      // Create a token without expiration for testing
      const tokenWithoutExp = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0In0.invalid'
      const isExpired = JwtService.isTokenExpired(tokenWithoutExp)
      
      expect(isExpired).toBe(true)
    })
  })
})