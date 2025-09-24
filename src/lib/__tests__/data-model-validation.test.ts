/**
 * Data Model Validation Tests
 * Tests all data validation functions and schemas
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { setupTestEnvironment, cleanupTestEnvironment } from '@/lib/test-utils'
import {
  validateUserRegistration,
  validateCraftsmanProfile,
  validateCourseData,
  validateProductData,
  validateOrderData,
  validateBookingData,
  validateEmail,
  validateUUID,
  validateShippingAddress,
  validateImageFile,
  validateVideoFile,
  validateDocumentFile
} from '@/lib/validations'

describe('Data Model Validation Tests', () => {
  beforeEach(() => {
    setupTestEnvironment()
  })

  afterEach(() => {
    cleanupTestEnvironment()
  })

  describe('User Registration Validation', () => {
    test('should validate correct user registration data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        role: 'LEARNER',
        preferredLanguage: 'zh-HK'
      }

      const result = validateUserRegistration(validData)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('should reject invalid email format', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'SecurePass123!',
        role: 'LEARNER'
      }

      const result = validateUserRegistration(invalidData)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'email')).toBe(true)
    })

    test('should reject weak passwords', () => {
      const weakPasswords = [
        '123',           // Too short
        'password',      // No numbers/symbols
        '12345678',      // Only numbers
        'PASSWORD',      // Only uppercase
        'password123'    // No symbols
      ]

      weakPasswords.forEach(password => {
        const result = validateUserRegistration({
          email: 'test@example.com',
          password,
          role: 'LEARNER'
        })
        expect(result.isValid).toBe(false)
        expect(result.errors.some(e => e.field === 'password')).toBe(true)
      })
    })

    test('should reject invalid user roles', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        role: 'INVALID_ROLE'
      }

      const result = validateUserRegistration(invalidData)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'role')).toBe(true)
    })

    test('should validate supported languages', () => {
      const supportedLanguages = ['zh-HK', 'zh-CN', 'en']
      
      supportedLanguages.forEach(language => {
        const result = validateUserRegistration({
          email: 'test@example.com',
          password: 'SecurePass123!',
          role: 'LEARNER',
          preferredLanguage: language
        })
        expect(result.isValid).toBe(true)
      })

      // Test unsupported language
      const result = validateUserRegistration({
        email: 'test@example.com',
        password: 'SecurePass123!',
        role: 'LEARNER',
        preferredLanguage: 'fr'
      })
      expect(result.isValid).toBe(false)
    })
  })

  describe('Craftsman Profile Validation', () => {
    test('should validate correct craftsman profile data', () => {
      const validData = {
        craftSpecialties: ['手雕麻將', '竹編'],
        bio: {
          'zh-HK': '資深師傅，擁有20年經驗',
          'en': 'Senior craftsman with 20 years experience'
        },
        experienceYears: 20,
        workshopLocation: '香港',
        contactInfo: {
          phone: '+852-12345678',
          email: 'craftsman@example.com'
        }
      }

      const result = validateCraftsmanProfile(validData)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('should require at least one craft specialty', () => {
      const invalidData = {
        craftSpecialties: [],
        bio: { 'zh-HK': '師傅' },
        experienceYears: 10
      }

      const result = validateCraftsmanProfile(invalidData)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'craftSpecialties')).toBe(true)
    })

    test('should validate experience years range', () => {
      const invalidExperience = [-1, 101, 'invalid']
      
      invalidExperience.forEach(years => {
        const result = validateCraftsmanProfile({
          craftSpecialties: ['手雕麻將'],
          experienceYears: years as number
        })
        expect(result.isValid).toBe(false)
        expect(result.errors.some(e => e.field === 'experienceYears')).toBe(true)
      })
    })

    test('should validate contact information format', () => {
      const invalidContacts = [
        { phone: '123' },           // Too short
        { phone: 'not-a-number' },  // Invalid format
        { email: 'invalid-email' }, // Invalid email
        { website: 'not-a-url' }    // Invalid URL
      ]

      invalidContacts.forEach(contactInfo => {
        const result = validateCraftsmanProfile({
          craftSpecialties: ['手雕麻將'],
          contactInfo
        })
        expect(result.isValid).toBe(false)
      })
    })
  })

  describe('Course Data Validation', () => {
    test('should validate correct course data', () => {
      const validData = {
        title: {
          'zh-HK': '手雕麻將入門課程',
          'en': 'Mahjong Carving Basics'
        },
        description: {
          'zh-HK': '學習傳統手雕麻將技藝',
          'en': 'Learn traditional mahjong carving skills'
        },
        craftCategory: '手雕麻將',
        maxParticipants: 8,
        durationHours: 3.5,
        price: 500
      }

      const result = validateCourseData(validData)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('should require multilingual title', () => {
      const invalidData = {
        title: { 'fr': 'French title only' }, // Unsupported language
        craftCategory: '手雕麻將'
      }

      const result = validateCourseData(invalidData)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'title')).toBe(true)
    })

    test('should validate participant limits', () => {
      const invalidLimits = [0, -1, 101, 'invalid']
      
      invalidLimits.forEach(maxParticipants => {
        const result = validateCourseData({
          title: { 'zh-HK': '課程' },
          craftCategory: '手雕麻將',
          maxParticipants: maxParticipants as number
        })
        expect(result.isValid).toBe(false)
        expect(result.errors.some(e => e.field === 'maxParticipants')).toBe(true)
      })
    })

    test('should validate price range', () => {
      const invalidPrices = [-1, 0, 100001, 'invalid']
      
      invalidPrices.forEach(price => {
        const result = validateCourseData({
          title: { 'zh-HK': '課程' },
          craftCategory: '手雕麻將',
          price: price as number
        })
        expect(result.isValid).toBe(false)
        expect(result.errors.some(e => e.field === 'price')).toBe(true)
      })
    })

    test('should validate duration hours', () => {
      const invalidDurations = [-1, 0, 25, 'invalid'] // Max 24 hours
      
      invalidDurations.forEach(durationHours => {
        const result = validateCourseData({
          title: { 'zh-HK': '課程' },
          craftCategory: '手雕麻將',
          durationHours: durationHours as number
        })
        expect(result.isValid).toBe(false)
        expect(result.errors.some(e => e.field === 'durationHours')).toBe(true)
      })
    })
  })

  describe('Product Data Validation', () => {
    test('should validate correct product data', () => {
      const validData = {
        name: {
          'zh-HK': '手工麻將',
          'en': 'Handmade Mahjong Set'
        },
        description: {
          'zh-HK': '純手工雕刻麻將',
          'en': 'Hand-carved mahjong set'
        },
        price: 2000,
        inventoryQuantity: 5,
        isCustomizable: true,
        craftCategory: '手雕麻將'
      }

      const result = validateProductData(validData)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('should require product name in at least one supported language', () => {
      const invalidData = {
        name: {},
        price: 100,
        craftCategory: '手雕麻將'
      }

      const result = validateProductData(invalidData)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'name')).toBe(true)
    })

    test('should validate inventory quantity', () => {
      const invalidQuantities = [-1, 'invalid', 10001] // Max 10000
      
      invalidQuantities.forEach(inventoryQuantity => {
        const result = validateProductData({
          name: { 'zh-HK': '產品' },
          price: 100,
          craftCategory: '手雕麻將',
          inventoryQuantity: inventoryQuantity as number
        })
        expect(result.isValid).toBe(false)
        expect(result.errors.some(e => e.field === 'inventoryQuantity')).toBe(true)
      })
    })
  })

  describe('Order Data Validation', () => {
    test('should validate correct order data', () => {
      const validData = {
        items: [
          {
            productId: 'product-123',
            quantity: 2,
            customizationNotes: 'Red color preferred'
          }
        ],
        shippingAddress: {
          recipientName: 'John Doe',
          phone: '+852-12345678',
          addressLine1: '123 Test Street',
          city: 'Hong Kong',
          district: 'Central',
          country: 'HK'
        }
      }

      const result = validateOrderData(validData)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('should require at least one order item', () => {
      const invalidData = {
        items: [],
        shippingAddress: {
          recipientName: 'John Doe',
          phone: '+852-12345678',
          addressLine1: '123 Test Street',
          city: 'Hong Kong',
          district: 'Central',
          country: 'HK'
        }
      }

      const result = validateOrderData(invalidData)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'items')).toBe(true)
    })

    test('should validate item quantities', () => {
      const invalidQuantities = [0, -1, 101, 'invalid'] // Max 100 per item
      
      invalidQuantities.forEach(quantity => {
        const result = validateOrderData({
          items: [{
            productId: 'product-123',
            quantity: quantity as number
          }],
          shippingAddress: {
            recipientName: 'John Doe',
            phone: '+852-12345678',
            addressLine1: '123 Test Street',
            city: 'Hong Kong',
            district: 'Central',
            country: 'HK'
          }
        })
        expect(result.isValid).toBe(false)
      })
    })
  })

  describe('Booking Data Validation', () => {
    test('should validate correct booking data', () => {
      const validData = {
        notes: 'Looking forward to learning traditional crafts'
      }

      const result = validateBookingData(validData)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('should validate notes length', () => {
      const longNotes = 'a'.repeat(1001) // Max 1000 characters
      
      const result = validateBookingData({
        notes: longNotes
      })
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'notes')).toBe(true)
    })

    test('should allow empty notes', () => {
      const result = validateBookingData({})
      expect(result.isValid).toBe(true)
    })
  })

  describe('Email Validation', () => {
    test('should validate correct email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'user123@test-domain.com'
      ]

      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true)
      })
    })

    test('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user..name@domain.com',
        'user@domain',
        ''
      ]

      invalidEmails.forEach(email => {
        expect(validateEmail(email)).toBe(false)
      })
    })
  })

  describe('UUID Validation', () => {
    test('should validate correct UUIDs', () => {
      const validUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
      ]

      validUUIDs.forEach(uuid => {
        expect(validateUUID(uuid)).toBe(true)
      })
    })

    test('should reject invalid UUIDs', () => {
      const invalidUUIDs = [
        'not-a-uuid',
        '123e4567-e89b-12d3-a456',
        '123e4567-e89b-12d3-a456-426614174000-extra',
        '',
        'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
      ]

      invalidUUIDs.forEach(uuid => {
        expect(validateUUID(uuid)).toBe(false)
      })
    })
  })

  describe('Multi-language Content Validation', () => {
    test('should validate correct multilingual content in course data', () => {
      const validCourseData = {
        title: {
          'zh-HK': '繁體中文標題',
          'en': 'English Title'
        },
        craftCategory: '手雕麻將'
      }

      const result = validateCourseData(validCourseData)
      expect(result.isValid).toBe(true)
    })

    test('should require at least one language in title', () => {
      const invalidCourseData = {
        title: {},
        craftCategory: '手雕麻將'
      }

      const result = validateCourseData(invalidCourseData)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'title')).toBe(true)
    })

    test('should allow optional multilingual description', () => {
      const validCourseData = {
        title: { 'zh-HK': '標題' },
        craftCategory: '手雕麻將'
      }

      const result = validateCourseData(validCourseData)
      expect(result.isValid).toBe(true)
    })
  })

  describe('Contact Information Validation', () => {
    test('should validate correct contact information in craftsman profile', () => {
      const validProfile = {
        craftSpecialties: ['手雕麻將'],
        contactInfo: {
          phone: '+85212345678',
          email: 'contact@example.com',
          website: 'https://example.com'
        }
      }

      const result = validateCraftsmanProfile(validProfile)
      expect(result.isValid).toBe(true)
    })

    test('should validate phone number formats', () => {
      const validProfile = {
        craftSpecialties: ['手雕麻將'],
        contactInfo: {
          phone: '+85212345678'
        }
      }

      const result = validateCraftsmanProfile(validProfile)
      expect(result.isValid).toBe(true)

      const invalidProfile = {
        craftSpecialties: ['手雕麻將'],
        contactInfo: {
          phone: '123' // Invalid format
        }
      }

      const invalidResult = validateCraftsmanProfile(invalidProfile)
      expect(invalidResult.isValid).toBe(false)
    })

    test('should validate website URLs', () => {
      const validProfile = {
        craftSpecialties: ['手雕麻將'],
        contactInfo: {
          website: 'https://example.com'
        }
      }

      const result = validateCraftsmanProfile(validProfile)
      expect(result.isValid).toBe(true)

      const invalidProfile = {
        craftSpecialties: ['手雕麻將'],
        contactInfo: {
          website: 'not-a-url'
        }
      }

      const invalidResult = validateCraftsmanProfile(invalidProfile)
      expect(invalidResult.isValid).toBe(false)
    })
  })

  describe('Shipping Address Validation', () => {
    test('should validate correct shipping address', () => {
      const validAddress = {
        recipientName: 'John Doe',
        phone: '+852-12345678',
        addressLine1: '123 Test Street',
        addressLine2: 'Apartment 4B',
        city: 'Hong Kong',
        district: 'Central',
        postalCode: '00000',
        country: 'HK'
      }

      const result = validateShippingAddress(validAddress)
      expect(result.isValid).toBe(true)
    })

    test('should require essential address fields', () => {
      const requiredFields = ['recipientName', 'phone', 'addressLine1', 'city', 'country']
      
      requiredFields.forEach(field => {
        const incompleteAddress = {
          recipientName: 'John Doe',
          phone: '+852-12345678',
          addressLine1: '123 Test Street',
          city: 'Hong Kong',
          district: 'Central',
          country: 'HK'
        }
        
        delete (incompleteAddress as any)[field]
        
        const result = validateShippingAddress(incompleteAddress)
        expect(result.isValid).toBe(false)
        expect(result.errors.some(e => e.field === field)).toBe(true)
      })
    })

    test('should validate country codes', () => {
      const validCountries = ['HK', 'CN', 'US', 'UK', 'CA']
      
      validCountries.forEach(country => {
        const result = validateShippingAddress({
          recipientName: 'John Doe',
          phone: '+852-12345678',
          addressLine1: '123 Test Street',
          city: 'Hong Kong',
          district: 'Central',
          country
        })
        expect(result.isValid).toBe(true)
      })

      const result = validateShippingAddress({
        recipientName: 'John Doe',
        phone: '+852-12345678',
        addressLine1: '123 Test Street',
        city: 'Hong Kong',
        district: 'Central',
        country: 'INVALID'
      })
      expect(result.isValid).toBe(false)
    })
  })

  describe('Input Validation Edge Cases', () => {
    test('should handle empty strings in required fields', () => {
      const invalidData = {
        email: '',
        password: 'ValidPass123',
        role: 'LEARNER'
      }

      const result = validateUserRegistration(invalidData)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'email')).toBe(true)
    })

    test('should handle null values gracefully', () => {
      const invalidData = {
        email: null,
        password: 'ValidPass123',
        role: 'LEARNER'
      }

      const result = validateUserRegistration(invalidData)
      expect(result.isValid).toBe(false)
    })

    test('should handle undefined values gracefully', () => {
      const invalidData = {
        password: 'ValidPass123',
        role: 'LEARNER'
        // email is undefined
      }

      const result = validateUserRegistration(invalidData)
      expect(result.isValid).toBe(false)
    })
  })

  describe('File Upload Validation', () => {
    test('should validate image files correctly', () => {
      // Create a mock File object
      const validImageFile = new File(['test'], 'image.jpg', { type: 'image/jpeg' })
      Object.defineProperty(validImageFile, 'size', { value: 1024 * 1024 }) // 1MB
      
      const result = validateImageFile(validImageFile)
      expect(result).toBe(true)
    })

    test('should reject oversized image files', () => {
      const largeImageFile = new File(['test'], 'large.jpg', { type: 'image/jpeg' })
      Object.defineProperty(largeImageFile, 'size', { value: 20 * 1024 * 1024 }) // 20MB
      
      const result = validateImageFile(largeImageFile)
      expect(result).toBe(false)
    })

    test('should validate video files correctly', () => {
      const validVideoFile = new File(['test'], 'video.mp4', { type: 'video/mp4' })
      Object.defineProperty(validVideoFile, 'size', { value: 50 * 1024 * 1024 }) // 50MB
      
      const result = validateVideoFile(validVideoFile)
      expect(result).toBe(true)
    })

    test('should validate document files correctly', () => {
      const validDocFile = new File(['test'], 'document.pdf', { type: 'application/pdf' })
      Object.defineProperty(validDocFile, 'size', { value: 2 * 1024 * 1024 }) // 2MB
      
      const result = validateDocumentFile(validDocFile)
      expect(result).toBe(true)
    })

    test('should reject invalid file types', () => {
      const invalidFile = new File(['test'], 'script.exe', { type: 'application/exe' })
      Object.defineProperty(invalidFile, 'size', { value: 1024 })
      
      const imageResult = validateImageFile(invalidFile)
      const videoResult = validateVideoFile(invalidFile)
      const docResult = validateDocumentFile(invalidFile)
      
      expect(imageResult).toBe(false)
      expect(videoResult).toBe(false)
      expect(docResult).toBe(false)
    })
  })
})