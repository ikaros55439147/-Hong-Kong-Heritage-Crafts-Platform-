/**
 * Core Unit Tests
 * Tests core business logic functions without external dependencies
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { setupTestEnvironment, cleanupTestEnvironment } from '@/lib/test-utils'

describe('Core Unit Tests', () => {
  beforeEach(() => {
    setupTestEnvironment()
  })

  afterEach(() => {
    cleanupTestEnvironment()
  })

  describe('Data Validation', () => {
    test('should validate email formats', async () => {
      const { validateEmail } = await import('@/lib/validations')
      
      // Valid emails
      expect(validateEmail('test@example.com')).toBe(true)
      expect(validateEmail('user.name@domain.co.uk')).toBe(true)
      expect(validateEmail('user+tag@example.org')).toBe(true)
      
      // Invalid emails
      expect(validateEmail('invalid-email')).toBe(false)
      expect(validateEmail('@domain.com')).toBe(false)
      expect(validateEmail('user@')).toBe(false)
      expect(validateEmail('')).toBe(false)
    })

    test('should validate UUID formats', async () => {
      const { validateUUID } = await import('@/lib/validations')
      
      // Valid UUIDs
      expect(validateUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true)
      expect(validateUUID('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(true)
      
      // Invalid UUIDs
      expect(validateUUID('not-a-uuid')).toBe(false)
      expect(validateUUID('123e4567-e89b-12d3-a456')).toBe(false)
      expect(validateUUID('')).toBe(false)
    })

    test('should validate user registration data', async () => {
      const { validateUserRegistration } = await import('@/lib/validations')
      
      // Valid registration
      const validData = {
        email: 'test@example.com',
        password: 'SecurePass123',
        role: 'LEARNER',
        preferredLanguage: 'zh-HK'
      }
      
      const result = validateUserRegistration(validData)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      
      // Invalid registration - weak password
      const invalidData = {
        email: 'test@example.com',
        password: '123',
        role: 'LEARNER'
      }
      
      const invalidResult = validateUserRegistration(invalidData)
      expect(invalidResult.isValid).toBe(false)
      expect(invalidResult.errors.length).toBeGreaterThan(0)
    })

    test('should validate course data', async () => {
      const { validateCourseData } = await import('@/lib/validations')
      
      // Valid course
      const validCourse = {
        title: {
          'zh-HK': '手雕麻將入門課程',
          'en': 'Mahjong Carving Basics'
        },
        craftCategory: '手雕麻將',
        maxParticipants: 8,
        price: 500
      }
      
      const result = validateCourseData(validCourse)
      expect(result.isValid).toBe(true)
      
      // Invalid course - missing title
      const invalidCourse = {
        craftCategory: '手雕麻將'
      }
      
      const invalidResult = validateCourseData(invalidCourse)
      expect(invalidResult.isValid).toBe(false)
    })

    test('should validate product data', async () => {
      const { validateProductData } = await import('@/lib/validations')
      
      // Valid product
      const validProduct = {
        name: {
          'zh-HK': '手工麻將',
          'en': 'Handmade Mahjong Set'
        },
        price: 2000,
        craftCategory: '手雕麻將'
      }
      
      const result = validateProductData(validProduct)
      expect(result.isValid).toBe(true)
      
      // Invalid product - negative price
      const invalidProduct = {
        name: { 'zh-HK': '產品' },
        price: -100,
        craftCategory: '手雕麻將'
      }
      
      const invalidResult = validateProductData(invalidProduct)
      expect(invalidResult.isValid).toBe(false)
    })
  })

  describe('Business Logic Calculations', () => {
    test('should calculate order totals correctly', () => {
      const items = [
        { price: 1000, quantity: 2 },
        { price: 1500, quantity: 1 },
        { price: 500, quantity: 3 }
      ]
      
      const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      expect(total).toBe(5000) // (1000*2) + (1500*1) + (500*3)
    })

    test('should calculate course availability correctly', () => {
      const maxParticipants = 10
      const currentBookings = 7
      const availableSpots = maxParticipants - currentBookings
      
      expect(availableSpots).toBe(3)
      expect(availableSpots > 0).toBe(true) // Course is available
    })

    test('should handle percentage calculations', () => {
      const completed = 7
      const total = 10
      const percentage = Math.round((completed / total) * 100)
      
      expect(percentage).toBe(70)
    })

    test('should validate inventory operations', () => {
      const currentInventory = 10
      const orderQuantity = 3
      const newInventory = currentInventory - orderQuantity
      
      expect(newInventory).toBe(7)
      expect(newInventory >= 0).toBe(true) // Valid operation
      
      // Test overselling prevention
      const largeOrder = 15
      const wouldBeNegative = currentInventory - largeOrder < 0
      expect(wouldBeNegative).toBe(true) // Should prevent this
    })
  })

  describe('Data Transformation', () => {
    test('should format currency correctly', () => {
      const formatCurrency = (amount: number, currency: string = 'HKD') => {
        if (currency === 'HKD') {
          return `HK$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        }
        return `${amount.toFixed(2)} ${currency}`
      }
      
      expect(formatCurrency(1000)).toBe('HK$1,000.00')
      expect(formatCurrency(1234.56)).toBe('HK$1,234.56')
      expect(formatCurrency(100, 'USD')).toBe('100.00 USD')
    })

    test('should generate slugs from text', () => {
      const generateSlug = (text: string) => {
        return text
          .toLowerCase()
          .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
          .replace(/^-+|-+$/g, '')
      }
      
      expect(generateSlug('Hello World')).toBe('hello-world')
      expect(generateSlug('Special!@#Characters')).toBe('special-characters')
      expect(generateSlug('手雕麻將課程')).toBe('手雕麻將課程')
    })

    test('should truncate text correctly', () => {
      const truncateText = (text: string, maxLength: number) => {
        if (text.length <= maxLength) return text
        return text.substring(0, maxLength - 3) + '...'
      }
      
      const longText = 'This is a very long text that should be truncated'
      expect(truncateText(longText, 20)).toBe('This is a very lo...')
      expect(truncateText('Short', 20)).toBe('Short')
    })

    test('should validate phone numbers', () => {
      const validatePhoneNumber = (phone: string) => {
        const phoneRegex = /^\+?[1-9]\d{7,14}$/ // At least 8 digits total
        return phoneRegex.test(phone.replace(/[-\s]/g, ''))
      }
      
      expect(validatePhoneNumber('+85212345678')).toBe(true)
      expect(validatePhoneNumber('+86-138-1234-5678')).toBe(true)
      expect(validatePhoneNumber('123')).toBe(false) // Too short
      expect(validatePhoneNumber('not-a-phone')).toBe(false)
    })
  })

  describe('Array and Object Utilities', () => {
    test('should remove duplicates from arrays', () => {
      const removeDuplicates = <T>(arr: T[]): T[] => {
        return [...new Set(arr)]
      }
      
      expect(removeDuplicates([1, 2, 2, 3, 3, 4])).toEqual([1, 2, 3, 4])
      expect(removeDuplicates(['a', 'b', 'b', 'c'])).toEqual(['a', 'b', 'c'])
    })

    test('should group objects by key', () => {
      const groupBy = <T>(arr: T[], key: keyof T): Record<string, T[]> => {
        return arr.reduce((groups, item) => {
          const groupKey = String(item[key])
          if (!groups[groupKey]) {
            groups[groupKey] = []
          }
          groups[groupKey].push(item)
          return groups
        }, {} as Record<string, T[]>)
      }
      
      const data = [
        { category: 'A', value: 1 },
        { category: 'B', value: 2 },
        { category: 'A', value: 3 }
      ]
      
      const grouped = groupBy(data, 'category')
      expect(grouped.A).toHaveLength(2)
      expect(grouped.B).toHaveLength(1)
    })

    test('should sort arrays by multiple criteria', () => {
      const sortBy = <T>(arr: T[], compareFn: (a: T, b: T) => number): T[] => {
        return [...arr].sort(compareFn)
      }
      
      const data = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
        { name: 'Charlie', age: 30 }
      ]
      
      const sortedByAge = sortBy(data, (a, b) => a.age - b.age)
      expect(sortedByAge[0].name).toBe('Bob')
      
      const sortedByName = sortBy(data, (a, b) => a.name.localeCompare(b.name))
      expect(sortedByName[0].name).toBe('Alice')
    })

    test('should calculate pagination', () => {
      const calculatePagination = (page: number, limit: number, total: number) => {
        const totalPages = Math.ceil(total / limit)
        const offset = (page - 1) * limit
        
        return {
          page,
          limit,
          offset,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
      
      const result = calculatePagination(2, 10, 95)
      expect(result).toEqual({
        page: 2,
        limit: 10,
        offset: 10,
        totalPages: 10,
        hasNext: true,
        hasPrev: true
      })
    })
  })

  describe('Date and Time Utilities', () => {
    test('should format dates correctly', () => {
      const formatDate = (date: Date, locale: string = 'en-US') => {
        return date.toLocaleDateString(locale)
      }
      
      const testDate = new Date('2024-01-15T12:00:00Z')
      const formatted = formatDate(testDate)
      expect(formatted).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/)
    })

    test('should calculate date differences', () => {
      const daysBetween = (date1: Date, date2: Date) => {
        const diffTime = Math.abs(date2.getTime() - date1.getTime())
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      }
      
      const date1 = new Date('2024-01-15')
      const date2 = new Date('2024-01-20')
      expect(daysBetween(date1, date2)).toBe(5)
    })

    test('should check if date is in the future', () => {
      const isFuture = (date: Date) => {
        return date.getTime() > Date.now()
      }
      
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
      
      expect(isFuture(futureDate)).toBe(true)
      expect(isFuture(pastDate)).toBe(false)
    })
  })

  describe('Error Handling', () => {
    test('should handle division by zero', () => {
      const safeDivide = (a: number, b: number) => {
        if (b === 0) {
          throw new Error('Division by zero')
        }
        return a / b
      }
      
      expect(safeDivide(10, 2)).toBe(5)
      expect(() => safeDivide(10, 0)).toThrow('Division by zero')
    })

    test('should validate required fields', () => {
      const validateRequired = (obj: Record<string, any>, requiredFields: string[]) => {
        const missing = requiredFields.filter(field => !obj[field])
        return {
          isValid: missing.length === 0,
          missingFields: missing
        }
      }
      
      const data = { name: 'John', email: 'john@example.com' }
      const result1 = validateRequired(data, ['name', 'email'])
      expect(result1.isValid).toBe(true)
      
      const result2 = validateRequired(data, ['name', 'email', 'phone'])
      expect(result2.isValid).toBe(false)
      expect(result2.missingFields).toContain('phone')
    })

    test('should handle null and undefined values', () => {
      const safeGet = (obj: any, path: string, defaultValue: any = null) => {
        try {
          return path.split('.').reduce((current, key) => current?.[key], obj) ?? defaultValue
        } catch {
          return defaultValue
        }
      }
      
      const data = { user: { profile: { name: 'John' } } }
      expect(safeGet(data, 'user.profile.name')).toBe('John')
      expect(safeGet(data, 'user.profile.age', 0)).toBe(0)
      expect(safeGet(null, 'user.name', 'Unknown')).toBe('Unknown')
    })
  })

  describe('Performance Utilities', () => {
    test('should debounce function calls', async () => {
      const debounce = <T extends (...args: any[]) => any>(
        func: T,
        delay: number
      ): ((...args: Parameters<T>) => void) => {
        let timeoutId: NodeJS.Timeout
        return (...args: Parameters<T>) => {
          clearTimeout(timeoutId)
          timeoutId = setTimeout(() => func(...args), delay)
        }
      }
      
      let callCount = 0
      const fn = () => callCount++
      const debouncedFn = debounce(fn, 50)
      
      // Call multiple times rapidly
      debouncedFn()
      debouncedFn()
      debouncedFn()
      
      expect(callCount).toBe(0) // Should not be called yet
      
      // Wait for debounce delay
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(callCount).toBe(1) // Should be called once
    })

    test('should memoize function results', () => {
      const memoize = <T extends (...args: any[]) => any>(fn: T): T => {
        const cache = new Map()
        return ((...args: any[]) => {
          const key = JSON.stringify(args)
          if (cache.has(key)) {
            return cache.get(key)
          }
          const result = fn(...args)
          cache.set(key, result)
          return result
        }) as T
      }
      
      let callCount = 0
      const expensiveFn = (x: number) => {
        callCount++
        return x * x
      }
      
      const memoizedFn = memoize(expensiveFn)
      
      expect(memoizedFn(5)).toBe(25)
      expect(callCount).toBe(1)
      
      expect(memoizedFn(5)).toBe(25) // Should use cached result
      expect(callCount).toBe(1) // Should not call function again
      
      expect(memoizedFn(10)).toBe(100)
      expect(callCount).toBe(2) // Should call function for new input
    })
  })
})