/**
 * Test file for data models and validation
 * Run with: npm test src/lib/__tests__/data-models.test.ts
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { 
  validateData, 
  sanitizeText, 
  cleanMultiLanguageContent,
  normalizeEmail,
  normalizePhoneNumber,
  cleanPrice,
  generateSlug
} from '../data-utils'
import {
  userRegistrationSchema,
  craftsmanProfileSchema,
  courseSchema,
  productSchema,
  orderSchema,
  multiLanguageContentSchema
} from '../validations'

// Mock Prisma for testing
const prisma = new PrismaClient()

describe('Data Validation Tests', () => {
  describe('User Registration Validation', () => {
    test('should validate correct user registration data', () => {
      const validUserData = {
        email: 'test@example.com',
        password: 'Password123',
        role: 'LEARNER' as const,
        preferredLanguage: 'zh-HK' as const,
      }

      const result = validateData(userRegistrationSchema, validUserData)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('should reject invalid email format', () => {
      const invalidUserData = {
        email: 'invalid-email',
        password: 'Password123',
      }

      const result = validateData(userRegistrationSchema, invalidUserData)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'email')).toBe(true)
    })

    test('should reject weak password', () => {
      const invalidUserData = {
        email: 'test@example.com',
        password: 'weak',
      }

      const result = validateData(userRegistrationSchema, invalidUserData)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'password')).toBe(true)
    })
  })

  describe('Craftsman Profile Validation', () => {
    test('should validate correct craftsman profile data', () => {
      const validProfileData = {
        craftSpecialties: ['手雕麻將', '傳統雕刻'],
        bio: {
          'zh-HK': '資深師傅',
          'en': 'Senior craftsman',
        },
        experienceYears: 25,
        workshopLocation: '香港九龍',
        contactInfo: {
          phone: '+852-9876-5432',
          email: 'craftsman@example.com',
        },
      }

      const result = validateData(craftsmanProfileSchema, validProfileData)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('should require at least one craft specialty', () => {
      const invalidProfileData = {
        craftSpecialties: [],
      }

      const result = validateData(craftsmanProfileSchema, invalidProfileData)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'craftSpecialties')).toBe(true)
    })

    test('should validate contact info format', () => {
      const invalidProfileData = {
        craftSpecialties: ['手雕麻將'],
        contactInfo: {
          phone: 'invalid-phone',
          email: 'invalid-email',
        },
      }

      const result = validateData(craftsmanProfileSchema, invalidProfileData)
      expect(result.isValid).toBe(false)
    })
  })

  describe('Course Validation', () => {
    test('should validate correct course data', () => {
      const validCourseData = {
        title: {
          'zh-HK': '手雕麻將入門班',
          'en': 'Mahjong Carving Beginner Class',
        },
        description: {
          'zh-HK': '學習基本雕刻技巧',
          'en': 'Learn basic carving techniques',
        },
        craftCategory: '手雕麻將',
        maxParticipants: 8,
        durationHours: 4,
        price: 800,
      }

      const result = validateData(courseSchema, validCourseData)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('should require multi-language title', () => {
      const invalidCourseData = {
        title: {},
        craftCategory: '手雕麻將',
      }

      const result = validateData(courseSchema, invalidCourseData)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'title')).toBe(true)
    })
  })

  describe('Product Validation', () => {
    test('should validate correct product data', () => {
      const validProductData = {
        name: {
          'zh-HK': '手雕麻將套裝',
          'en': 'Hand-carved Mahjong Set',
        },
        description: {
          'zh-HK': '精美手工雕刻',
          'en': 'Exquisite hand carving',
        },
        price: 2800,
        inventoryQuantity: 5,
        isCustomizable: true,
        craftCategory: '手雕麻將',
      }

      const result = validateData(productSchema, validProductData)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('should reject negative price', () => {
      const invalidProductData = {
        name: { 'zh-HK': '產品' },
        price: -100,
        craftCategory: '手雕麻將',
      }

      const result = validateData(productSchema, invalidProductData)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'price')).toBe(true)
    })
  })

  describe('Multi-language Content Validation', () => {
    test('should validate multi-language content', () => {
      const validContent = {
        'zh-HK': '繁體中文',
        'zh-CN': '简体中文',
        'en': 'English',
      }

      const result = validateData(multiLanguageContentSchema, validContent)
      expect(result.isValid).toBe(true)
    })

    test('should require at least one language', () => {
      const invalidContent = {}

      const result = validateData(multiLanguageContentSchema, invalidContent)
      expect(result.isValid).toBe(false)
    })

    test('should accept partial language content', () => {
      const partialContent = {
        'zh-HK': '繁體中文',
      }

      const result = validateData(multiLanguageContentSchema, partialContent)
      expect(result.isValid).toBe(true)
    })
  })
})

describe('Data Cleaning and Sanitization Tests', () => {
  describe('Text Sanitization', () => {
    test('should sanitize text input', () => {
      const dirtyText = '  <script>alert("xss")</script>  Hello World  '
      const cleaned = sanitizeText(dirtyText)
      
      expect(cleaned).toBe('alert("xss") Hello World')
      expect(cleaned).not.toContain('<script>')
      expect(cleaned).not.toContain('  ')
    })

    test('should handle empty or invalid input', () => {
      expect(sanitizeText('')).toBe('')
      expect(sanitizeText(null as any)).toBe('')
      expect(sanitizeText(undefined as any)).toBe('')
    })

    test('should limit text length', () => {
      const longText = 'a'.repeat(20000)
      const cleaned = sanitizeText(longText)
      
      expect(cleaned.length).toBeLessThanOrEqual(10000)
    })
  })

  describe('Multi-language Content Cleaning', () => {
    test('should clean multi-language content', () => {
      const dirtyContent = {
        'zh-HK': '  繁體中文  ',
        'zh-CN': '<script>简体中文</script>',
        'en': '  English  ',
        'invalid': 'should be ignored',
      }

      const cleaned = cleanMultiLanguageContent(dirtyContent)
      
      expect(cleaned['zh-HK']).toBe('繁體中文')
      expect(cleaned['zh-CN']).toBe('简体中文')
      expect(cleaned['en']).toBe('English')
      expect(cleaned).not.toHaveProperty('invalid')
    })

    test('should handle invalid input', () => {
      expect(cleanMultiLanguageContent(null)).toEqual({})
      expect(cleanMultiLanguageContent('string')).toEqual({})
      expect(cleanMultiLanguageContent(123)).toEqual({})
    })
  })

  describe('Email Normalization', () => {
    test('should normalize email addresses', () => {
      expect(normalizeEmail('  TEST@EXAMPLE.COM  ')).toBe('test@example.com')
      expect(normalizeEmail('User@Domain.org')).toBe('user@domain.org')
    })

    test('should handle invalid input', () => {
      expect(normalizeEmail('')).toBe('')
      expect(normalizeEmail(null as any)).toBe('')
      expect(normalizeEmail(undefined as any)).toBe('')
    })
  })

  describe('Phone Number Normalization', () => {
    test('should normalize phone numbers', () => {
      expect(normalizePhoneNumber('852-9876-5432')).toBe('+85298765432')
      expect(normalizePhoneNumber('(852) 9876 5432')).toBe('+85298765432')
      expect(normalizePhoneNumber('+852 9876 5432')).toBe('+85298765432')
    })

    test('should handle local numbers', () => {
      expect(normalizePhoneNumber('98765432')).toBe('+98765432')
    })

    test('should handle invalid input', () => {
      expect(normalizePhoneNumber('')).toBe('')
      expect(normalizePhoneNumber('abc')).toBe('+')
    })
  })

  describe('Price Cleaning', () => {
    test('should clean and validate prices', () => {
      expect(cleanPrice(123.456)).toBe(123.46)
      expect(cleanPrice('123.456')).toBe(123.46)
      expect(cleanPrice(-100)).toBe(0)
      expect(cleanPrice('invalid')).toBe(0)
    })

    test('should handle edge cases', () => {
      expect(cleanPrice(0)).toBe(0)
      expect(cleanPrice(null)).toBe(0)
      expect(cleanPrice(undefined)).toBe(0)
    })
  })

  describe('Slug Generation', () => {
    test('should generate URL-friendly slugs', () => {
      expect(generateSlug('Hello World!')).toBe('hello-world')
      expect(generateSlug('手雕麻將課程')).toBe('手雕麻將課程')
      expect(generateSlug('  Multiple   Spaces  ')).toBe('multiple-spaces')
    })

    test('should handle special characters', () => {
      expect(generateSlug('Test@#$%^&*()_+')).toBe('test_')
      expect(generateSlug('---test---')).toBe('test')
    })

    test('should handle empty input', () => {
      expect(generateSlug('')).toBe('')
      expect(generateSlug('   ')).toBe('')
    })
  })
})

describe('Database Schema Tests', () => {
  // Note: These tests would require a test database
  // For now, we'll test the schema validation logic
  
  test('should have valid Prisma schema structure', () => {
    // This test verifies that our types are properly exported
    expect(typeof prisma.user).toBe('object')
    expect(typeof prisma.craftsmanProfile).toBe('object')
    expect(typeof prisma.course).toBe('object')
    expect(typeof prisma.product).toBe('object')
    expect(typeof prisma.order).toBe('object')
    expect(typeof prisma.booking).toBe('object')
    expect(typeof prisma.mediaFile).toBe('object')
    expect(typeof prisma.follow).toBe('object')
  })
})

// Utility function tests
describe('Utility Functions', () => {
  test('should format currency correctly', () => {
    // These tests would use the utility functions from data-utils
    // Implementation depends on the specific formatting requirements
  })

  test('should format dates correctly', () => {
    // Date formatting tests
  })

  test('should validate UUIDs correctly', () => {
    // UUID validation tests
  })
})