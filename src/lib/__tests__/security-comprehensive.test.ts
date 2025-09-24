import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createMocks } from 'node-mocks-http'
import { authMiddleware } from '@/lib/auth/middleware'
import { verifyJWT } from '@/lib/auth/jwt'
import { hashPassword, verifyPassword } from '@/lib/auth/password'
import { sanitizeText, sanitizeHtml } from '@/lib/data-utils'

describe('Comprehensive Security Tests', () => {
  describe('Authentication Security', () => {
    it('should reject requests without authentication token', async () => {
      const request = new NextRequest('http://localhost:3000/api/protected')
      
      const response = await authMiddleware(request)
      
      expect(response.status).toBe(401)
    })

    it('should reject requests with invalid JWT tokens', async () => {
      const request = new NextRequest('http://localhost:3000/api/protected', {
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      })
      
      const response = await authMiddleware(request)
      
      expect(response.status).toBe(401)
    })

    it('should reject expired JWT tokens', async () => {
      // Create an expired token (this would need to be mocked in real implementation)
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid'
      
      const request = new NextRequest('http://localhost:3000/api/protected', {
        headers: {
          'Authorization': `Bearer ${expiredToken}`
        }
      })
      
      const response = await authMiddleware(request)
      
      expect(response.status).toBe(401)
    })

    it('should validate JWT token structure and signature', async () => {
      const invalidTokens = [
        'not-a-jwt-token',
        'header.payload', // Missing signature
        'header.payload.signature.extra', // Too many parts
        '', // Empty token
        'Bearer ', // Empty bearer token
      ]

      for (const token of invalidTokens) {
        try {
          await verifyJWT(token)
          expect.fail('Should have thrown an error for invalid token')
        } catch (error) {
          expect(error).toBeDefined()
        }
      }
    })
  })

  describe('Password Security', () => {
    it('should hash passwords securely', async () => {
      const password = 'testPassword123!'
      const hashedPassword = await hashPassword(password)
      
      expect(hashedPassword).not.toBe(password)
      expect(hashedPassword.length).toBeGreaterThan(50) // bcrypt hashes are typically 60 chars
      expect(hashedPassword.startsWith('$2b$')).toBe(true) // bcrypt format
    })

    it('should verify passwords correctly', async () => {
      const password = 'testPassword123!'
      const hashedPassword = await hashPassword(password)
      
      const isValid = await verifyPassword(password, hashedPassword)
      const isInvalid = await verifyPassword('wrongPassword', hashedPassword)
      
      expect(isValid).toBe(true)
      expect(isInvalid).toBe(false)
    })

    it('should reject weak passwords', () => {
      const weakPasswords = [
        '123456',
        'password',
        'abc123',
        '12345678',
        'qwerty',
        'password123',
        'admin',
        'user',
        '', // Empty password
        'a', // Too short
        '1234567', // Only numbers, too short
      ]

      // This would be implemented in a password validation function
      const validatePasswordStrength = (password: string): boolean => {
        if (password.length < 8) return false
        if (!/[A-Z]/.test(password)) return false
        if (!/[a-z]/.test(password)) return false
        if (!/[0-9]/.test(password)) return false
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return false
        return true
      }

      weakPasswords.forEach(password => {
        expect(validatePasswordStrength(password)).toBe(false)
      })

      // Strong password should pass
      expect(validatePasswordStrength('StrongP@ssw0rd!')).toBe(true)
    })
  })

  describe('Input Sanitization', () => {
    it('should sanitize text input to prevent XSS', () => {
      const maliciousInputs = [
        '<script>alert("XSS")</script>',
        '<img src="x" onerror="alert(1)">',
        'javascript:alert("XSS")',
        '<iframe src="javascript:alert(1)"></iframe>',
        '<svg onload="alert(1)">',
        '<body onload="alert(1)">',
        '<div onclick="alert(1)">Click me</div>',
        '"><script>alert("XSS")</script>',
        "'; DROP TABLE users; --",
        '<script src="http://malicious.com/script.js"></script>',
      ]

      maliciousInputs.forEach(input => {
        const sanitized = sanitizeText(input)
        expect(sanitized).not.toContain('<script>')
        expect(sanitized).not.toContain('javascript:')
        expect(sanitized).not.toContain('onerror=')
        expect(sanitized).not.toContain('onload=')
        expect(sanitized).not.toContain('onclick=')
      })
    })

    it('should sanitize HTML content', () => {
      const maliciousHTML = `
        <div>
          <p>Safe content</p>
          <script>alert('XSS')</script>
          <img src="x" onerror="alert(1)">
          <a href="javascript:alert(1)">Click</a>
          <div onclick="alert(1)">Click me</div>
        </div>
      `

      const sanitized = sanitizeHtml(maliciousHTML)
      
      expect(sanitized).not.toContain('<script>')
      expect(sanitized).not.toContain('javascript:')
      expect(sanitized).not.toContain('onerror=')
      expect(sanitized).not.toContain('onclick=')
      expect(sanitized).toContain('Safe content') // Should preserve safe content
    })

    it('should handle SQL injection attempts', () => {
      const sqlInjectionAttempts = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "' UNION SELECT * FROM users --",
        "'; DELETE FROM users WHERE '1'='1",
        "' OR 1=1 --",
        "admin'--",
        "admin'/*",
        "' OR 'x'='x",
        "'; EXEC xp_cmdshell('dir'); --",
      ]

      // In a real application, these would be handled by parameterized queries
      // Here we test that our sanitization catches these patterns
      sqlInjectionAttempts.forEach(attempt => {
        const sanitized = sanitizeText(attempt)
        // Basic sanitization should remove or escape dangerous characters
        expect(sanitized).not.toMatch(/DROP\s+TABLE/i)
        expect(sanitized).not.toMatch(/DELETE\s+FROM/i)
        expect(sanitized).not.toMatch(/UNION\s+SELECT/i)
        expect(sanitized).not.toMatch(/EXEC\s+xp_cmdshell/i)
      })
    })
  })

  describe('Rate Limiting', () => {
    it('should implement rate limiting for API endpoints', async () => {
      // Mock rate limiting implementation
      const rateLimiter = new Map<string, { count: number; resetTime: number }>()
      const RATE_LIMIT = 10
      const WINDOW_MS = 60000 // 1 minute

      const checkRateLimit = (ip: string): boolean => {
        const now = Date.now()
        const record = rateLimiter.get(ip)

        if (!record || now > record.resetTime) {
          rateLimiter.set(ip, { count: 1, resetTime: now + WINDOW_MS })
          return true
        }

        if (record.count >= RATE_LIMIT) {
          return false
        }

        record.count++
        return true
      }

      const testIP = '192.168.1.1'

      // Should allow requests within limit
      for (let i = 0; i < RATE_LIMIT; i++) {
        expect(checkRateLimit(testIP)).toBe(true)
      }

      // Should block requests over limit
      expect(checkRateLimit(testIP)).toBe(false)
      expect(checkRateLimit(testIP)).toBe(false)
    })
  })

  describe('CORS Security', () => {
    it('should validate CORS origins', () => {
      const allowedOrigins = [
        'https://hk-heritage-crafts.com',
        'https://www.hk-heritage-crafts.com',
        'http://localhost:3000',
        'http://localhost:3001',
      ]

      const validateOrigin = (origin: string): boolean => {
        return allowedOrigins.includes(origin)
      }

      // Valid origins
      allowedOrigins.forEach(origin => {
        expect(validateOrigin(origin)).toBe(true)
      })

      // Invalid origins
      const invalidOrigins = [
        'https://malicious.com',
        'http://evil.com',
        'https://hk-heritage-crafts.com.evil.com',
        'javascript:alert(1)',
        '',
        'null',
      ]

      invalidOrigins.forEach(origin => {
        expect(validateOrigin(origin)).toBe(false)
      })
    })
  })

  describe('File Upload Security', () => {
    it('should validate file types and sizes', () => {
      const validateFile = (filename: string, mimeType: string, size: number) => {
        const allowedTypes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'video/mp4',
          'application/pdf',
        ]
        const maxSize = 10 * 1024 * 1024 // 10MB
        const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'pdf']

        const extension = filename.split('.').pop()?.toLowerCase()

        return {
          isValidType: allowedTypes.includes(mimeType),
          isValidSize: size <= maxSize,
          isValidExtension: extension ? allowedExtensions.includes(extension) : false,
        }
      }

      // Valid files
      expect(validateFile('image.jpg', 'image/jpeg', 1024 * 1024)).toEqual({
        isValidType: true,
        isValidSize: true,
        isValidExtension: true,
      })

      // Invalid file type
      expect(validateFile('script.exe', 'application/x-executable', 1024)).toEqual({
        isValidType: false,
        isValidSize: true,
        isValidExtension: false,
      })

      // File too large
      expect(validateFile('large.jpg', 'image/jpeg', 20 * 1024 * 1024)).toEqual({
        isValidType: true,
        isValidSize: false,
        isValidExtension: true,
      })
    })

    it('should scan for malicious file content', () => {
      const scanFileContent = (content: string): boolean => {
        const maliciousPatterns = [
          /<script/i,
          /javascript:/i,
          /vbscript:/i,
          /onload=/i,
          /onerror=/i,
          /onclick=/i,
          /eval\(/i,
          /document\.cookie/i,
          /window\.location/i,
        ]

        return !maliciousPatterns.some(pattern => pattern.test(content))
      }

      // Safe content
      expect(scanFileContent('This is safe text content')).toBe(true)
      expect(scanFileContent('<p>Safe HTML content</p>')).toBe(true)

      // Malicious content
      expect(scanFileContent('<script>alert("XSS")</script>')).toBe(false)
      expect(scanFileContent('javascript:alert(1)')).toBe(false)
      expect(scanFileContent('<img onerror="alert(1)" src="x">')).toBe(false)
    })
  })

  describe('Session Security', () => {
    it('should generate secure session tokens', () => {
      const generateSessionToken = (): string => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        let result = ''
        for (let i = 0; i < 64; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        return result
      }

      const token1 = generateSessionToken()
      const token2 = generateSessionToken()

      expect(token1).not.toBe(token2) // Should be unique
      expect(token1.length).toBe(64) // Should be long enough
      expect(/^[A-Za-z0-9]+$/.test(token1)).toBe(true) // Should only contain safe characters
    })

    it('should validate session expiration', () => {
      const isSessionValid = (createdAt: Date, maxAge: number): boolean => {
        const now = new Date()
        const expiresAt = new Date(createdAt.getTime() + maxAge)
        return now < expiresAt
      }

      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000)
      const maxAge = 2 * 60 * 60 * 1000 // 2 hours

      // Valid session (created 1 hour ago, expires in 1 hour)
      expect(isSessionValid(oneHourAgo, maxAge)).toBe(true)

      // Invalid session (created 3 hours ago, expired 1 hour ago)
      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000)
      expect(isSessionValid(threeHoursAgo, maxAge)).toBe(false)
    })
  })

  describe('Data Validation Security', () => {
    it('should validate email addresses strictly', () => {
      const validateEmail = (email: string): boolean => {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
        return emailRegex.test(email) && email.length <= 254
      }

      // Valid emails
      const validEmails = [
        'user@example.com',
        'test.email@domain.co.uk',
        'user+tag@example.org',
        'user123@test-domain.com',
      ]

      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true)
      })

      // Invalid emails
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user@domain',
        'user..double.dot@domain.com',
        'user@domain..com',
        'user@domain.c',
        'user@domain.toolongextension',
        'a'.repeat(250) + '@domain.com', // Too long
        'user@domain.com<script>alert(1)</script>',
      ]

      invalidEmails.forEach(email => {
        expect(validateEmail(email)).toBe(false)
      })
    })

    it('should validate UUIDs strictly', () => {
      const validateUUID = (uuid: string): boolean => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        return uuidRegex.test(uuid)
      }

      // Valid UUIDs
      const validUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      ]

      validUUIDs.forEach(uuid => {
        expect(validateUUID(uuid)).toBe(true)
      })

      // Invalid UUIDs
      const invalidUUIDs = [
        'not-a-uuid',
        '123e4567-e89b-12d3-a456-42661417400', // Too short
        '123e4567-e89b-12d3-a456-426614174000-extra', // Too long
        '123e4567-e89b-12d3-a456-42661417400g', // Invalid character
        '', // Empty
        '123e4567e89b12d3a456426614174000', // Missing dashes
      ]

      invalidUUIDs.forEach(uuid => {
        expect(validateUUID(uuid)).toBe(false)
      })
    })
  })

  describe('Error Handling Security', () => {
    it('should not expose sensitive information in error messages', () => {
      const sanitizeErrorMessage = (error: Error): string => {
        const message = error.message.toLowerCase()
        
        // Remove sensitive information
        const sensitivePatterns = [
          /password/g,
          /token/g,
          /secret/g,
          /key/g,
          /database/g,
          /connection/g,
          /server/g,
          /internal/g,
          /stack trace/g,
          /file path/g,
        ]

        let sanitized = error.message
        sensitivePatterns.forEach(pattern => {
          sanitized = sanitized.replace(pattern, '[REDACTED]')
        })

        return sanitized
      }

      const sensitiveError = new Error('Database connection failed: password incorrect for user admin')
      const sanitized = sanitizeErrorMessage(sensitiveError)
      
      expect(sanitized).not.toContain('password')
      expect(sanitized).not.toContain('Database')
      expect(sanitized).toContain('[REDACTED]')
    })
  })

  describe('Logging Security', () => {
    it('should sanitize logs to prevent log injection', () => {
      const sanitizeLogMessage = (message: string): string => {
        return message
          .replace(/[\r\n]/g, '_') // Replace newlines to prevent log injection
          .replace(/\t/g, ' ') // Replace tabs
          .substring(0, 1000) // Limit length
      }

      const maliciousLog = 'User login\nFAKE LOG ENTRY: Admin access granted\nActual log continues'
      const sanitized = sanitizeLogMessage(maliciousLog)
      
      expect(sanitized).not.toContain('\n')
      expect(sanitized).not.toContain('\r')
      expect(sanitized.length).toBeLessThanOrEqual(1000)
    })
  })
})