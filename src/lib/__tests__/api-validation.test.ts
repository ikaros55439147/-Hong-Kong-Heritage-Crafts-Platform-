/**
 * API Validation Tests
 * Tests API request/response validation without external dependencies
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { setupTestEnvironment, cleanupTestEnvironment } from '@/lib/test-utils'

describe('API Validation Tests', () => {
  beforeEach(() => {
    setupTestEnvironment()
  })

  afterEach(() => {
    cleanupTestEnvironment()
  })

  describe('Request Validation', () => {
    test('should validate user registration requests', async () => {
      const { validateUserRegistration } = await import('@/lib/validations')
      
      // Valid request
      const validRequest = {
        email: 'test@example.com',
        password: 'SecurePass123',
        role: 'LEARNER',
        preferredLanguage: 'zh-HK'
      }
      
      const result = validateUserRegistration(validRequest)
      expect(result.isValid).toBe(true)
      
      // Invalid requests
      const invalidRequests = [
        { email: 'invalid-email', password: 'SecurePass123', role: 'LEARNER' },
        { email: 'test@example.com', password: '123', role: 'LEARNER' },
        { email: 'test@example.com', password: 'SecurePass123', role: 'INVALID_ROLE' }
      ]
      
      invalidRequests.forEach(request => {
        const result = validateUserRegistration(request)
        expect(result.isValid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
      })
    })

    test('should validate course creation requests', async () => {
      const { validateCourseData } = await import('@/lib/validations')
      
      // Valid request
      const validRequest = {
        title: {
          'zh-HK': '手雕麻將入門課程',
          'en': 'Mahjong Carving Basics'
        },
        description: {
          'zh-HK': '學習傳統手雕麻將技藝'
        },
        craftCategory: '手雕麻將',
        maxParticipants: 8,
        durationHours: 3.5,
        price: 500
      }
      
      const result = validateCourseData(validRequest)
      expect(result.isValid).toBe(true)
      
      // Invalid requests
      const invalidRequests = [
        { craftCategory: '手雕麻將' }, // Missing title
        { title: {}, craftCategory: '手雕麻將' }, // Empty title
        { title: { 'zh-HK': '課程' }, craftCategory: '手雕麻將', maxParticipants: 0 }, // Invalid participants
        { title: { 'zh-HK': '課程' }, craftCategory: '手雕麻將', price: -100 } // Negative price
      ]
      
      invalidRequests.forEach(request => {
        const result = validateCourseData(request)
        expect(result.isValid).toBe(false)
      })
    })

    test('should validate product creation requests', async () => {
      const { validateProductData } = await import('@/lib/validations')
      
      // Valid request
      const validRequest = {
        name: {
          'zh-HK': '手工麻將',
          'en': 'Handmade Mahjong Set'
        },
        description: {
          'zh-HK': '純手工雕刻麻將'
        },
        price: 2000,
        inventoryQuantity: 5,
        isCustomizable: true,
        craftCategory: '手雕麻將'
      }
      
      const result = validateProductData(validRequest)
      expect(result.isValid).toBe(true)
      
      // Invalid requests
      const invalidRequests = [
        { craftCategory: '手雕麻將', price: 100 }, // Missing name
        { name: {}, craftCategory: '手雕麻將', price: 100 }, // Empty name
        { name: { 'zh-HK': '產品' }, craftCategory: '手雕麻將', price: -100 }, // Negative price
        { name: { 'zh-HK': '產品' }, craftCategory: '手雕麻將', price: 100, inventoryQuantity: -1 } // Negative inventory
      ]
      
      invalidRequests.forEach(request => {
        const result = validateProductData(request)
        expect(result.isValid).toBe(false)
      })
    })

    test('should validate order creation requests', async () => {
      const { validateOrderData } = await import('@/lib/validations')
      
      // Valid request
      const validRequest = {
        items: [
          {
            productId: '123e4567-e89b-12d3-a456-426614174000',
            quantity: 2,
            customizationNotes: 'Red color preferred'
          }
        ],
        shippingAddress: {
          recipientName: 'John Doe',
          phone: '+85212345678',
          addressLine1: '123 Test Street',
          city: 'Hong Kong',
          district: 'Central',
          country: 'HK'
        }
      }
      
      const result = validateOrderData(validRequest)
      expect(result.isValid).toBe(true)
      
      // Invalid requests
      const invalidRequests = [
        { items: [], shippingAddress: validRequest.shippingAddress }, // Empty items
        { 
          items: [{ productId: 'invalid-uuid', quantity: 1 }], 
          shippingAddress: validRequest.shippingAddress 
        }, // Invalid product ID
        {
          items: validRequest.items,
          shippingAddress: { ...validRequest.shippingAddress, recipientName: '' }
        } // Missing recipient name
      ]
      
      invalidRequests.forEach(request => {
        const result = validateOrderData(request)
        expect(result.isValid).toBe(false)
      })
    })

    test('should validate booking requests', async () => {
      const { validateBookingData } = await import('@/lib/validations')
      
      // Valid requests
      const validRequests = [
        { notes: 'Looking forward to learning' },
        { notes: '' },
        {}
      ]
      
      validRequests.forEach(request => {
        const result = validateBookingData(request)
        expect(result.isValid).toBe(true)
      })
      
      // Invalid request - notes too long
      const longNotes = 'a'.repeat(501) // Max 500 characters
      const invalidRequest = { notes: longNotes }
      
      const result = validateBookingData(invalidRequest)
      expect(result.isValid).toBe(false)
    })
  })

  describe('Response Validation', () => {
    test('should validate API response structure', () => {
      const validateApiResponse = (response: any) => {
        if (!response || typeof response !== 'object') {
          return { isValid: false, structure: response }
        }
        
        const requiredFields = ['success', 'data', 'message']
        const hasRequiredStructure = requiredFields.every(field => 
          response.hasOwnProperty(field)
        )
        
        return {
          isValid: hasRequiredStructure && typeof response.success === 'boolean',
          structure: response
        }
      }
      
      // Valid responses
      const validResponses = [
        { success: true, data: { id: '123' }, message: 'Success' },
        { success: false, data: null, message: 'Error occurred' }
      ]
      
      validResponses.forEach(response => {
        const result = validateApiResponse(response)
        expect(result.isValid).toBe(true)
      })
      
      // Invalid responses
      const invalidResponses = [
        { data: { id: '123' } }, // Missing success and message
        { success: 'true', data: null, message: 'Error' }, // Wrong type for success
        null,
        undefined
      ]
      
      invalidResponses.forEach(response => {
        const result = validateApiResponse(response)
        expect(result.isValid).toBe(false)
      })
    })

    test('should validate pagination response structure', () => {
      const validatePaginationResponse = (response: any) => {
        const requiredFields = ['data', 'total', 'page', 'limit', 'totalPages']
        const hasRequiredStructure = requiredFields.every(field => 
          response.hasOwnProperty(field)
        )
        
        const hasValidTypes = 
          Array.isArray(response.data) &&
          typeof response.total === 'number' &&
          typeof response.page === 'number' &&
          typeof response.limit === 'number' &&
          typeof response.totalPages === 'number'
        
        return {
          isValid: hasRequiredStructure && hasValidTypes,
          structure: response
        }
      }
      
      // Valid pagination response
      const validResponse = {
        data: [{ id: '1' }, { id: '2' }],
        total: 100,
        page: 1,
        limit: 20,
        totalPages: 5
      }
      
      const result = validatePaginationResponse(validResponse)
      expect(result.isValid).toBe(true)
      
      // Invalid pagination responses
      const invalidResponses = [
        { data: 'not-array', total: 100, page: 1, limit: 20, totalPages: 5 },
        { data: [], total: '100', page: 1, limit: 20, totalPages: 5 },
        { data: [], total: 100 } // Missing fields
      ]
      
      invalidResponses.forEach(response => {
        const result = validatePaginationResponse(response)
        expect(result.isValid).toBe(false)
      })
    })
  })

  describe('Query Parameter Validation', () => {
    test('should validate search query parameters', () => {
      const validateSearchParams = (params: any) => {
        const validSortOrders = ['asc', 'desc']
        const validLanguages = ['zh-HK', 'zh-CN', 'en']
        
        const errors = []
        
        if (params.page && (typeof params.page !== 'number' || params.page < 1)) {
          errors.push('Invalid page number')
        }
        
        if (params.limit && (typeof params.limit !== 'number' || params.limit < 1 || params.limit > 100)) {
          errors.push('Invalid limit')
        }
        
        if (params.sortOrder && !validSortOrders.includes(params.sortOrder)) {
          errors.push('Invalid sort order')
        }
        
        if (params.language && !validLanguages.includes(params.language)) {
          errors.push('Invalid language')
        }
        
        return {
          isValid: errors.length === 0,
          errors
        }
      }
      
      // Valid parameters
      const validParams = [
        { page: 1, limit: 20, sortOrder: 'desc', language: 'zh-HK' },
        { query: 'search term' },
        {}
      ]
      
      validParams.forEach(params => {
        const result = validateSearchParams(params)
        expect(result.isValid).toBe(true)
      })
      
      // Invalid parameters
      const invalidParams = [
        { page: 0 },
        { page: -1 },
        { limit: 0 },
        { limit: 101 }
      ]
      
      invalidParams.forEach(params => {
        const result = validateSearchParams(params)
        expect(result.isValid).toBe(false)
      })
    })

    test('should validate filter parameters', () => {
      const validateFilters = (filters: any) => {
        const errors = []
        
        if (filters.priceRange) {
          if (filters.priceRange.min && filters.priceRange.min < 0) {
            errors.push('Minimum price cannot be negative')
          }
          if (filters.priceRange.max && filters.priceRange.max < 0) {
            errors.push('Maximum price cannot be negative')
          }
          if (filters.priceRange.min && filters.priceRange.max && 
              filters.priceRange.min > filters.priceRange.max) {
            errors.push('Minimum price cannot be greater than maximum price')
          }
        }
        
        if (filters.category && !Array.isArray(filters.category)) {
          errors.push('Category filter must be an array')
        }
        
        return {
          isValid: errors.length === 0,
          errors
        }
      }
      
      // Valid filters
      const validFilters = [
        { priceRange: { min: 100, max: 1000 } },
        { category: ['手雕麻將', '竹編'] },
        { location: 'Hong Kong' },
        {}
      ]
      
      validFilters.forEach(filters => {
        const result = validateFilters(filters)
        expect(result.isValid).toBe(true)
      })
      
      // Invalid filters
      const invalidFilters = [
        { priceRange: { min: -100 } },
        { priceRange: { min: 1000, max: 100 } },
        { category: 'not-array' }
      ]
      
      invalidFilters.forEach(filters => {
        const result = validateFilters(filters)
        expect(result.isValid).toBe(false)
      })
    })
  })

  describe('Content Type Validation', () => {
    test('should validate JSON content type', () => {
      const validateContentType = (contentType: string) => {
        const validTypes = [
          'application/json',
          'application/json; charset=utf-8'
        ]
        
        return validTypes.some(type => 
          contentType.toLowerCase().startsWith(type.toLowerCase())
        )
      }
      
      expect(validateContentType('application/json')).toBe(true)
      expect(validateContentType('application/json; charset=utf-8')).toBe(true)
      expect(validateContentType('APPLICATION/JSON')).toBe(true)
      
      expect(validateContentType('text/plain')).toBe(false)
      expect(validateContentType('application/xml')).toBe(false)
      expect(validateContentType('')).toBe(false)
    })

    test('should validate multipart form data', () => {
      const validateMultipartContentType = (contentType: string) => {
        return contentType.toLowerCase().startsWith('multipart/form-data')
      }
      
      expect(validateMultipartContentType('multipart/form-data')).toBe(true)
      expect(validateMultipartContentType('multipart/form-data; boundary=something')).toBe(true)
      expect(validateMultipartContentType('MULTIPART/FORM-DATA')).toBe(true)
      
      expect(validateMultipartContentType('application/json')).toBe(false)
      expect(validateMultipartContentType('text/plain')).toBe(false)
    })
  })

  describe('HTTP Status Code Validation', () => {
    test('should validate success status codes', () => {
      const isSuccessStatus = (status: number) => {
        return status >= 200 && status < 300
      }
      
      expect(isSuccessStatus(200)).toBe(true)
      expect(isSuccessStatus(201)).toBe(true)
      expect(isSuccessStatus(204)).toBe(true)
      
      expect(isSuccessStatus(400)).toBe(false)
      expect(isSuccessStatus(404)).toBe(false)
      expect(isSuccessStatus(500)).toBe(false)
    })

    test('should validate client error status codes', () => {
      const isClientError = (status: number) => {
        return status >= 400 && status < 500
      }
      
      expect(isClientError(400)).toBe(true)
      expect(isClientError(401)).toBe(true)
      expect(isClientError(404)).toBe(true)
      expect(isClientError(422)).toBe(true)
      
      expect(isClientError(200)).toBe(false)
      expect(isClientError(500)).toBe(false)
    })

    test('should validate server error status codes', () => {
      const isServerError = (status: number) => {
        return status >= 500 && status < 600
      }
      
      expect(isServerError(500)).toBe(true)
      expect(isServerError(502)).toBe(true)
      expect(isServerError(503)).toBe(true)
      
      expect(isServerError(200)).toBe(false)
      expect(isServerError(400)).toBe(false)
    })
  })

  describe('Rate Limiting Validation', () => {
    test('should validate rate limit headers', () => {
      const validateRateLimitHeaders = (headers: Record<string, string>) => {
        const requiredHeaders = ['x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset']
        
        const hasRequiredHeaders = requiredHeaders.every(header => 
          headers[header] !== undefined
        )
        
        const hasValidValues = 
          !isNaN(Number(headers['x-ratelimit-limit'])) &&
          !isNaN(Number(headers['x-ratelimit-remaining'])) &&
          !isNaN(Number(headers['x-ratelimit-reset']))
        
        return {
          isValid: hasRequiredHeaders && hasValidValues,
          headers
        }
      }
      
      // Valid headers
      const validHeaders = {
        'x-ratelimit-limit': '100',
        'x-ratelimit-remaining': '95',
        'x-ratelimit-reset': '1640995200'
      }
      
      const result = validateRateLimitHeaders(validHeaders)
      expect(result.isValid).toBe(true)
      
      // Invalid headers
      const invalidHeaders = [
        { 'x-ratelimit-limit': '100' }, // Missing headers
        { 
          'x-ratelimit-limit': 'invalid',
          'x-ratelimit-remaining': '95',
          'x-ratelimit-reset': '1640995200'
        } // Invalid value
      ]
      
      invalidHeaders.forEach(headers => {
        const result = validateRateLimitHeaders(headers)
        expect(result.isValid).toBe(false)
      })
    })
  })
})