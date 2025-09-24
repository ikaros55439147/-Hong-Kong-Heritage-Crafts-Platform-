import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { hash, compare } from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { AuthService } from '../auth/auth.service'
import { validateInput } from '../validations'

const prisma = new PrismaClient()

describe('Security Tests', () => {
  let authService: AuthService

  beforeAll(async () => {
    await prisma.$connect()
    authService = new AuthService()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    // Clean up test data
    await prisma.user.deleteMany()
  })

  describe('Authentication Security', () => {
    it('should hash passwords securely', async () => {
      const plainPassword = 'testpassword123'
      const hashedPassword = await hash(plainPassword, 12)

      expect(hashedPassword).not.toBe(plainPassword)
      expect(hashedPassword.length).toBeGreaterThan(50)
      expect(hashedPassword.startsWith('$2b$12$')).toBe(true)

      // Verify password can be validated
      const isValid = await compare(plainPassword, hashedPassword)
      expect(isValid).toBe(true)

      // Verify wrong password fails
      const isInvalid = await compare('wrongpassword', hashedPassword)
      expect(isInvalid).toBe(false)
    })

    it('should prevent password brute force attacks', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'bruteforce@example.com',
          passwordHash: await hash('correctpassword', 12),
          role: 'learner'
        }
      })

      // Simulate multiple failed login attempts
      const failedAttempts = []
      for (let i = 0; i < 6; i++) {
        try {
          await authService.login({
            email: 'bruteforce@example.com',
            password: 'wrongpassword'
          })
        } catch (error) {
          failedAttempts.push(error)
        }
      }

      expect(failedAttempts.length).toBe(6)

      // Account should be locked after 5 failed attempts
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id }
      })

      expect(updatedUser?.loginAttempts).toBeGreaterThanOrEqual(5)
      expect(updatedUser?.lockedUntil).toBeDefined()

      // Should reject login even with correct password when locked
      await expect(
        authService.login({
          email: 'bruteforce@example.com',
          password: 'correctpassword'
        })
      ).rejects.toThrow('Account temporarily locked')
    })

    it('should validate JWT tokens securely', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'jwt@example.com',
          passwordHash: await hash('password123', 12),
          role: 'learner'
        }
      })

      // Create valid token
      const validToken = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      )

      const validPayload = authService.verifyToken(validToken)
      expect(validPayload.userId).toBe(user.id)

      // Test invalid token
      expect(() => {
        authService.verifyToken('invalid.token.here')
      }).toThrow()

      // Test expired token
      const expiredToken = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' } // Already expired
      )

      expect(() => {
        authService.verifyToken(expiredToken)
      }).toThrow('jwt expired')

      // Test token with wrong secret
      const wrongSecretToken = jwt.sign(
        { userId: user.id, role: user.role },
        'wrong-secret',
        { expiresIn: '1h' }
      )

      expect(() => {
        authService.verifyToken(wrongSecretToken)
      }).toThrow()
    })

    it('should prevent session hijacking', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'session@example.com',
          passwordHash: await hash('password123', 12),
          role: 'learner'
        }
      })

      // Create token with user agent and IP
      const originalUserAgent = 'Mozilla/5.0 (Test Browser)'
      const originalIP = '192.168.1.100'

      const token = authService.createToken(user.id, user.role, {
        userAgent: originalUserAgent,
        ipAddress: originalIP
      })

      // Verify token with same user agent and IP
      const validVerification = authService.verifyTokenWithContext(token, {
        userAgent: originalUserAgent,
        ipAddress: originalIP
      })
      expect(validVerification.userId).toBe(user.id)

      // Should reject token with different user agent
      expect(() => {
        authService.verifyTokenWithContext(token, {
          userAgent: 'Different Browser',
          ipAddress: originalIP
        })
      }).toThrow('Token context mismatch')

      // Should reject token with different IP
      expect(() => {
        authService.verifyTokenWithContext(token, {
          userAgent: originalUserAgent,
          ipAddress: '192.168.1.200'
        })
      }).toThrow('Token context mismatch')
    })
  })

  describe('Input Validation Security', () => {
    it('should prevent SQL injection attempts', async () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "admin'/*",
        "1; DELETE FROM users WHERE 1=1; --",
        "' UNION SELECT * FROM users --"
      ]

      for (const maliciousInput of maliciousInputs) {
        // Test email validation
        expect(() => {
          validateInput.email(maliciousInput)
        }).toThrow('Invalid email format')

        // Test search query validation
        expect(() => {
          validateInput.searchQuery(maliciousInput)
        }).toThrow('Invalid search query')

        // Ensure Prisma ORM prevents SQL injection
        await expect(
          prisma.user.findMany({
            where: {
              email: maliciousInput
            }
          })
        ).resolves.toEqual([]) // Should return empty array, not throw error
      }
    })

    it('should prevent XSS attacks', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src="x" onerror="alert(\'XSS\')">',
        '<svg onload="alert(\'XSS\')">',
        '"><script>alert("XSS")</script>'
      ]

      for (const payload of xssPayloads) {
        // Test content validation
        const sanitizedContent = validateInput.htmlContent(payload)
        expect(sanitizedContent).not.toContain('<script>')
        expect(sanitizedContent).not.toContain('javascript:')
        expect(sanitizedContent).not.toContain('onerror=')
        expect(sanitizedContent).not.toContain('onload=')

        // Test user input validation
        expect(() => {
          validateInput.userName(payload)
        }).toThrow('Invalid characters in name')
      }
    })

    it('should validate file upload security', async () => {
      const dangerousFiles = [
        { name: 'malware.exe', type: 'application/x-executable' },
        { name: 'script.php', type: 'application/x-php' },
        { name: 'shell.sh', type: 'application/x-sh' },
        { name: 'virus.bat', type: 'application/x-bat' },
        { name: 'trojan.scr', type: 'application/x-screensaver' }
      ]

      for (const file of dangerousFiles) {
        expect(() => {
          validateInput.fileType(file.type)
        }).toThrow('File type not allowed')

        expect(() => {
          validateInput.fileName(file.name)
        }).toThrow('File extension not allowed')
      }

      // Test allowed file types
      const allowedFiles = [
        { name: 'image.jpg', type: 'image/jpeg' },
        { name: 'photo.png', type: 'image/png' },
        { name: 'video.mp4', type: 'video/mp4' },
        { name: 'document.pdf', type: 'application/pdf' }
      ]

      for (const file of allowedFiles) {
        expect(() => {
          validateInput.fileType(file.type)
        }).not.toThrow()

        expect(() => {
          validateInput.fileName(file.name)
        }).not.toThrow()
      }
    })

    it('should prevent path traversal attacks', async () => {
      const pathTraversalAttempts = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '/etc/shadow',
        'C:\\Windows\\System32\\drivers\\etc\\hosts',
        '....//....//....//etc/passwd',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
      ]

      for (const path of pathTraversalAttempts) {
        expect(() => {
          validateInput.filePath(path)
        }).toThrow('Invalid file path')
      }

      // Test valid paths
      const validPaths = [
        'uploads/images/photo.jpg',
        'media/videos/tutorial.mp4',
        'documents/manual.pdf'
      ]

      for (const path of validPaths) {
        expect(() => {
          validateInput.filePath(path)
        }).not.toThrow()
      }
    })
  })

  describe('Authorization Security', () => {
    it('should enforce role-based access control', async () => {
      const learner = await prisma.user.create({
        data: {
          email: 'learner@example.com',
          passwordHash: await hash('password123', 12),
          role: 'learner'
        }
      })

      const craftsman = await prisma.user.create({
        data: {
          email: 'craftsman@example.com',
          passwordHash: await hash('password123', 12),
          role: 'craftsman'
        }
      })

      const admin = await prisma.user.create({
        data: {
          email: 'admin@example.com',
          passwordHash: await hash('password123', 12),
          role: 'admin'
        }
      })

      // Test learner permissions
      expect(authService.hasPermission(learner.role, 'view_courses')).toBe(true)
      expect(authService.hasPermission(learner.role, 'book_courses')).toBe(true)
      expect(authService.hasPermission(learner.role, 'create_courses')).toBe(false)
      expect(authService.hasPermission(learner.role, 'admin_access')).toBe(false)

      // Test craftsman permissions
      expect(authService.hasPermission(craftsman.role, 'view_courses')).toBe(true)
      expect(authService.hasPermission(craftsman.role, 'create_courses')).toBe(true)
      expect(authService.hasPermission(craftsman.role, 'manage_products')).toBe(true)
      expect(authService.hasPermission(craftsman.role, 'admin_access')).toBe(false)

      // Test admin permissions
      expect(authService.hasPermission(admin.role, 'view_courses')).toBe(true)
      expect(authService.hasPermission(admin.role, 'create_courses')).toBe(true)
      expect(authService.hasPermission(admin.role, 'admin_access')).toBe(true)
      expect(authService.hasPermission(admin.role, 'manage_users')).toBe(true)
    })

    it('should prevent privilege escalation', async () => {
      const learner = await prisma.user.create({
        data: {
          email: 'escalation@example.com',
          passwordHash: await hash('password123', 12),
          role: 'learner'
        }
      })

      // Attempt to modify role through API
      await expect(
        prisma.user.update({
          where: { id: learner.id },
          data: { role: 'admin' }
        })
      ).rejects.toThrow() // Should be prevented by middleware

      // Verify role hasn't changed
      const unchangedUser = await prisma.user.findUnique({
        where: { id: learner.id }
      })
      expect(unchangedUser?.role).toBe('learner')
    })

    it('should validate resource ownership', async () => {
      const user1 = await prisma.user.create({
        data: {
          email: 'owner@example.com',
          passwordHash: await hash('password123', 12),
          role: 'craftsman'
        }
      })

      const user2 = await prisma.user.create({
        data: {
          email: 'other@example.com',
          passwordHash: await hash('password123', 12),
          role: 'craftsman'
        }
      })

      const profile1 = await prisma.craftsmanProfile.create({
        data: {
          userId: user1.id,
          craftSpecialties: ['mahjong'],
          bio: { 'zh-HK': '用戶1的檔案' },
          experienceYears: 10
        }
      })

      const course1 = await prisma.course.create({
        data: {
          craftsmanId: profile1.id,
          title: { 'zh-HK': '用戶1的課程' },
          craftCategory: 'mahjong',
          maxParticipants: 10,
          price: 500
        }
      })

      // User1 should be able to access their own course
      expect(authService.canAccessResource(user1.id, 'course', course1.id)).toBe(true)

      // User2 should not be able to modify User1's course
      expect(authService.canAccessResource(user2.id, 'course', course1.id)).toBe(false)
    })
  })

  describe('Data Protection Security', () => {
    it('should encrypt sensitive data', async () => {
      const sensitiveData = {
        creditCardNumber: '4111111111111111',
        socialSecurityNumber: '123-45-6789',
        phoneNumber: '+852-1234-5678'
      }

      // Test data encryption
      const encryptedCard = authService.encryptSensitiveData(sensitiveData.creditCardNumber)
      const encryptedSSN = authService.encryptSensitiveData(sensitiveData.socialSecurityNumber)
      const encryptedPhone = authService.encryptSensitiveData(sensitiveData.phoneNumber)

      // Encrypted data should be different from original
      expect(encryptedCard).not.toBe(sensitiveData.creditCardNumber)
      expect(encryptedSSN).not.toBe(sensitiveData.socialSecurityNumber)
      expect(encryptedPhone).not.toBe(sensitiveData.phoneNumber)

      // Should be able to decrypt
      expect(authService.decryptSensitiveData(encryptedCard)).toBe(sensitiveData.creditCardNumber)
      expect(authService.decryptSensitiveData(encryptedSSN)).toBe(sensitiveData.socialSecurityNumber)
      expect(authService.decryptSensitiveData(encryptedPhone)).toBe(sensitiveData.phoneNumber)
    })

    it('should mask sensitive data in logs', async () => {
      const logData = {
        email: 'user@example.com',
        password: 'secretpassword123',
        creditCard: '4111111111111111',
        phone: '+852-1234-5678'
      }

      const maskedLog = authService.maskSensitiveDataForLogging(logData)

      expect(maskedLog.email).toBe('u***@example.com')
      expect(maskedLog.password).toBe('***')
      expect(maskedLog.creditCard).toBe('****-****-****-1111')
      expect(maskedLog.phone).toBe('+852-****-5678')
    })

    it('should validate data retention policies', async () => {
      // Create old user data
      const oldUser = await prisma.user.create({
        data: {
          email: 'old@example.com',
          passwordHash: await hash('password123', 12),
          role: 'learner',
          createdAt: new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000) // 3 years ago
        }
      })

      // Check if data should be archived/deleted based on retention policy
      const shouldArchive = authService.shouldArchiveUserData(oldUser.id)
      expect(shouldArchive).toBe(true)

      // Test data anonymization
      const anonymizedData = await authService.anonymizeUserData(oldUser.id)
      expect(anonymizedData.email).toMatch(/^anonymous_\w+@deleted\.com$/)
      expect(anonymizedData.passwordHash).toBe('DELETED')
    })
  })

  describe('Rate Limiting Security', () => {
    it('should enforce API rate limits', async () => {
      const userIP = '192.168.1.100'
      const endpoint = '/api/auth/login'

      // Simulate multiple requests from same IP
      const requests = []
      for (let i = 0; i < 15; i++) {
        requests.push(
          authService.checkRateLimit(userIP, endpoint)
        )
      }

      const results = await Promise.allSettled(requests)
      
      // First 10 requests should succeed
      const successful = results.slice(0, 10).every(r => r.status === 'fulfilled')
      expect(successful).toBe(true)

      // Remaining requests should be rate limited
      const rateLimited = results.slice(10).every(r => 
        r.status === 'rejected' && r.reason.message.includes('Rate limit exceeded')
      )
      expect(rateLimited).toBe(true)
    })

    it('should implement progressive delays for repeated violations', async () => {
      const userIP = '192.168.1.200'
      const endpoint = '/api/auth/login'

      // First violation
      await authService.recordRateLimitViolation(userIP, endpoint)
      const firstDelay = authService.getRateLimitDelay(userIP, endpoint)
      expect(firstDelay).toBe(1000) // 1 second

      // Second violation
      await authService.recordRateLimitViolation(userIP, endpoint)
      const secondDelay = authService.getRateLimitDelay(userIP, endpoint)
      expect(secondDelay).toBe(5000) // 5 seconds

      // Third violation
      await authService.recordRateLimitViolation(userIP, endpoint)
      const thirdDelay = authService.getRateLimitDelay(userIP, endpoint)
      expect(thirdDelay).toBe(15000) // 15 seconds
    })
  })

  describe('Security Headers and CSRF Protection', () => {
    it('should validate CSRF tokens', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'csrf@example.com',
          passwordHash: await hash('password123', 12),
          role: 'learner'
        }
      })

      // Generate CSRF token
      const csrfToken = authService.generateCSRFToken(user.id)
      expect(csrfToken).toBeDefined()
      expect(csrfToken.length).toBeGreaterThan(20)

      // Valid CSRF token should pass
      const isValidToken = authService.validateCSRFToken(user.id, csrfToken)
      expect(isValidToken).toBe(true)

      // Invalid CSRF token should fail
      const isInvalidToken = authService.validateCSRFToken(user.id, 'invalid-token')
      expect(isInvalidToken).toBe(false)

      // Expired CSRF token should fail
      const expiredToken = authService.generateCSRFToken(user.id, -3600) // Expired 1 hour ago
      const isExpiredToken = authService.validateCSRFToken(user.id, expiredToken)
      expect(isExpiredToken).toBe(false)
    })

    it('should enforce secure headers', () => {
      const securityHeaders = authService.getSecurityHeaders()

      expect(securityHeaders['X-Content-Type-Options']).toBe('nosniff')
      expect(securityHeaders['X-Frame-Options']).toBe('DENY')
      expect(securityHeaders['X-XSS-Protection']).toBe('1; mode=block')
      expect(securityHeaders['Strict-Transport-Security']).toContain('max-age=')
      expect(securityHeaders['Content-Security-Policy']).toContain("default-src 'self'")
      expect(securityHeaders['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
    })
  })

  describe('Audit Logging Security', () => {
    it('should log security events', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'audit@example.com',
          passwordHash: await hash('password123', 12),
          role: 'learner'
        }
      })

      // Test login event logging
      await authService.logSecurityEvent({
        userId: user.id,
        event: 'LOGIN_SUCCESS',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 Test Browser',
        timestamp: new Date()
      })

      // Test failed login logging
      await authService.logSecurityEvent({
        userId: user.id,
        event: 'LOGIN_FAILED',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 Test Browser',
        details: { reason: 'Invalid password' },
        timestamp: new Date()
      })

      // Verify logs were created
      const securityLogs = await prisma.securityLog.findMany({
        where: { userId: user.id }
      })

      expect(securityLogs.length).toBe(2)
      expect(securityLogs.some(log => log.event === 'LOGIN_SUCCESS')).toBe(true)
      expect(securityLogs.some(log => log.event === 'LOGIN_FAILED')).toBe(true)
    })

    it('should detect suspicious activity patterns', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'suspicious@example.com',
          passwordHash: await hash('password123', 12),
          role: 'learner'
        }
      })

      // Log multiple failed login attempts from different IPs
      const suspiciousIPs = ['192.168.1.100', '10.0.0.50', '172.16.0.25']
      
      for (const ip of suspiciousIPs) {
        await authService.logSecurityEvent({
          userId: user.id,
          event: 'LOGIN_FAILED',
          ipAddress: ip,
          timestamp: new Date()
        })
      }

      // Check for suspicious activity
      const isSuspicious = await authService.detectSuspiciousActivity(user.id)
      expect(isSuspicious).toBe(true)

      // Should trigger security alert
      const alerts = await prisma.securityAlert.findMany({
        where: { userId: user.id }
      })
      expect(alerts.length).toBeGreaterThan(0)
      expect(alerts[0].alertType).toBe('MULTIPLE_FAILED_LOGINS')
    })
  })
})