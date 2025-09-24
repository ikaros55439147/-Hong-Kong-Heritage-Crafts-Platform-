import { PasswordService } from '../password'

describe('PasswordService', () => {
  describe('hashPassword', () => {
    it('should hash a valid password', async () => {
      const password = 'TestPassword123!'
      const hash = await PasswordService.hashPassword(password)
      
      expect(hash).toBeDefined()
      expect(hash).not.toBe(password)
      expect(hash.length).toBeGreaterThan(50)
    })

    it('should throw error for empty password', async () => {
      await expect(PasswordService.hashPassword('')).rejects.toThrow('Password is required')
    })

    it('should throw error for short password', async () => {
      await expect(PasswordService.hashPassword('short')).rejects.toThrow('Password must be at least 8 characters long')
    })

    it('should generate different hashes for same password', async () => {
      const password = 'TestPassword123!'
      const hash1 = await PasswordService.hashPassword(password)
      const hash2 = await PasswordService.hashPassword(password)
      
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'TestPassword123!'
      const hash = await PasswordService.hashPassword(password)
      
      const isValid = await PasswordService.verifyPassword(password, hash)
      expect(isValid).toBe(true)
    })

    it('should reject incorrect password', async () => {
      const password = 'TestPassword123!'
      const wrongPassword = 'WrongPassword123!'
      const hash = await PasswordService.hashPassword(password)
      
      const isValid = await PasswordService.verifyPassword(wrongPassword, hash)
      expect(isValid).toBe(false)
    })

    it('should return false for empty password', async () => {
      const hash = await PasswordService.hashPassword('TestPassword123!')
      
      const isValid = await PasswordService.verifyPassword('', hash)
      expect(isValid).toBe(false)
    })

    it('should return false for empty hash', async () => {
      const isValid = await PasswordService.verifyPassword('TestPassword123!', '')
      expect(isValid).toBe(false)
    })
  })

  describe('validatePasswordStrength', () => {
    it('should validate strong password', () => {
      const result = PasswordService.validatePasswordStrength('StrongPass123!')
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject password without lowercase', () => {
      const result = PasswordService.validatePasswordStrength('STRONGPASS123!')
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one lowercase letter')
    })

    it('should reject password without uppercase', () => {
      const result = PasswordService.validatePasswordStrength('strongpass123!')
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one uppercase letter')
    })

    it('should reject password without numbers', () => {
      const result = PasswordService.validatePasswordStrength('StrongPass!')
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one number')
    })

    it('should reject password without special characters', () => {
      const result = PasswordService.validatePasswordStrength('StrongPass123')
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one special character')
    })

    it('should reject too short password', () => {
      const result = PasswordService.validatePasswordStrength('Short1!')
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must be at least 8 characters long')
    })

    it('should reject too long password', () => {
      const longPassword = 'A'.repeat(129) + '1!'
      const result = PasswordService.validatePasswordStrength(longPassword)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must be less than 128 characters long')
    })

    it('should reject common passwords', () => {
      const result = PasswordService.validatePasswordStrength('password')
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password is too common, please choose a stronger password')
    })

    it('should reject empty password', () => {
      const result = PasswordService.validatePasswordStrength('')
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password is required')
    })
  })

  describe('generateRandomPassword', () => {
    it('should generate password with default length', () => {
      const password = PasswordService.generateRandomPassword()
      
      expect(password).toBeDefined()
      expect(password.length).toBe(12)
    })

    it('should generate password with custom length', () => {
      const password = PasswordService.generateRandomPassword(16)
      
      expect(password).toBeDefined()
      expect(password.length).toBe(16)
    })

    it('should generate strong password', () => {
      const password = PasswordService.generateRandomPassword()
      const validation = PasswordService.validatePasswordStrength(password)
      
      expect(validation.isValid).toBe(true)
    })

    it('should generate different passwords each time', () => {
      const password1 = PasswordService.generateRandomPassword()
      const password2 = PasswordService.generateRandomPassword()
      
      expect(password1).not.toBe(password2)
    })
  })
})