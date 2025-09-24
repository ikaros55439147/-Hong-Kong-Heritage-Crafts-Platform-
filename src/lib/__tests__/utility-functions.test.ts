/**
 * Utility Functions Unit Tests
 * Tests all utility functions, helpers, and data processing functions
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { setupTestEnvironment, cleanupTestEnvironment } from '@/lib/test-utils'

describe('Utility Functions Tests', () => {
  beforeEach(() => {
    setupTestEnvironment()
  })

  afterEach(() => {
    cleanupTestEnvironment()
  })

  describe('Data Utilities', () => {
    test('should format currency correctly', async () => {
      const { formatCurrency } = await import('@/lib/data-utils')
      
      expect(formatCurrency(1000, 'HKD')).toBe('HK$1,000.00')
      expect(formatCurrency(1234.56, 'HKD')).toBe('HK$1,234.56')
      expect(formatCurrency(0, 'HKD')).toBe('HK$0.00')
      expect(formatCurrency(1000000, 'HKD')).toBe('HK$1,000,000.00')
    })

    test('should format dates correctly', async () => {
      const { formatDate, formatDateTime, formatRelativeTime } = await import('@/lib/data-utils')
      
      const testDate = new Date('2024-01-15T14:30:00Z')
      
      expect(formatDate(testDate, 'zh-HK')).toBe('2024年1月15日')
      expect(formatDate(testDate, 'en')).toBe('January 15, 2024')
      
      expect(formatDateTime(testDate, 'zh-HK')).toContain('2024年1月15日')
      expect(formatDateTime(testDate, 'en')).toContain('January 15, 2024')
      
      // Test relative time
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      expect(formatRelativeTime(oneHourAgo, 'en')).toContain('hour')
    })

    test('should truncate text correctly', async () => {
      const { truncateText } = await import('@/lib/data-utils')
      
      const longText = 'This is a very long text that should be truncated at some point'
      
      expect(truncateText(longText, 20)).toBe('This is a very long...')
      expect(truncateText(longText, 100)).toBe(longText) // Shorter than limit
      expect(truncateText('', 20)).toBe('')
      expect(truncateText('Short', 20)).toBe('Short')
    })

    test('should generate slugs correctly', async () => {
      const { generateSlug } = await import('@/lib/data-utils')
      
      expect(generateSlug('Hello World')).toBe('hello-world')
      expect(generateSlug('手雕麻將課程')).toBe('手雕麻將課程')
      expect(generateSlug('Special!@#$%Characters')).toBe('specialcharacters')
      expect(generateSlug('  Multiple   Spaces  ')).toBe('multiple-spaces')
      expect(generateSlug('')).toBe('')
    })

    test('should validate and format phone numbers', async () => {
      const { formatPhoneNumber, validatePhoneNumber } = await import('@/lib/data-utils')
      
      // Valid phone numbers
      expect(validatePhoneNumber('+852-12345678')).toBe(true)
      expect(validatePhoneNumber('+86-13812345678')).toBe(true)
      expect(validatePhoneNumber('+1-555-123-4567')).toBe(true)
      
      // Invalid phone numbers
      expect(validatePhoneNumber('123')).toBe(false)
      expect(validatePhoneNumber('not-a-phone')).toBe(false)
      expect(validatePhoneNumber('')).toBe(false)
      
      // Format phone numbers
      expect(formatPhoneNumber('85212345678')).toBe('+852-1234-5678')
      expect(formatPhoneNumber('+852 1234 5678')).toBe('+852-1234-5678')
    })

    test('should calculate pagination correctly', async () => {
      const { calculatePagination } = await import('@/lib/data-utils')
      
      const result1 = calculatePagination(1, 10, 95)
      expect(result1).toEqual({
        page: 1,
        limit: 10,
        offset: 0,
        totalPages: 10,
        hasNext: true,
        hasPrev: false
      })
      
      const result2 = calculatePagination(5, 10, 95)
      expect(result2).toEqual({
        page: 5,
        limit: 10,
        offset: 40,
        totalPages: 10,
        hasNext: true,
        hasPrev: true
      })
      
      const result3 = calculatePagination(10, 10, 95)
      expect(result3).toEqual({
        page: 10,
        limit: 10,
        offset: 90,
        totalPages: 10,
        hasNext: false,
        hasPrev: true
      })
    })

    test('should sort arrays by multiple criteria', async () => {
      const { sortBy } = await import('@/lib/data-utils')
      
      const data = [
        { name: 'Alice', age: 30, score: 85 },
        { name: 'Bob', age: 25, score: 90 },
        { name: 'Charlie', age: 30, score: 80 }
      ]
      
      // Sort by single field
      const sortedByAge = sortBy(data, [{ field: 'age', order: 'asc' }])
      expect(sortedByAge[0].name).toBe('Bob')
      
      // Sort by multiple fields
      const sortedMultiple = sortBy(data, [
        { field: 'age', order: 'desc' },
        { field: 'score', order: 'desc' }
      ])
      expect(sortedMultiple[0].name).toBe('Alice') // Age 30, score 85
      expect(sortedMultiple[1].name).toBe('Charlie') // Age 30, score 80
    })

    test('should group arrays by key', async () => {
      const { groupBy } = await import('@/lib/data-utils')
      
      const data = [
        { category: 'A', value: 1 },
        { category: 'B', value: 2 },
        { category: 'A', value: 3 },
        { category: 'C', value: 4 }
      ]
      
      const grouped = groupBy(data, 'category')
      
      expect(grouped.A).toHaveLength(2)
      expect(grouped.B).toHaveLength(1)
      expect(grouped.C).toHaveLength(1)
      expect(grouped.A[0].value).toBe(1)
      expect(grouped.A[1].value).toBe(3)
    })

    test('should deep clone objects', async () => {
      const { deepClone } = await import('@/lib/data-utils')
      
      const original = {
        name: 'Test',
        nested: {
          array: [1, 2, 3],
          object: { key: 'value' }
        },
        date: new Date('2024-01-01')
      }
      
      const cloned = deepClone(original)
      
      expect(cloned).toEqual(original)
      expect(cloned).not.toBe(original)
      expect(cloned.nested).not.toBe(original.nested)
      expect(cloned.nested.array).not.toBe(original.nested.array)
      
      // Modify clone shouldn't affect original
      cloned.nested.array.push(4)
      expect(original.nested.array).toHaveLength(3)
      expect(cloned.nested.array).toHaveLength(4)
    })

    test('should merge objects deeply', async () => {
      const { deepMerge } = await import('@/lib/data-utils')
      
      const obj1 = {
        a: 1,
        b: {
          c: 2,
          d: 3
        },
        e: [1, 2]
      }
      
      const obj2 = {
        b: {
          d: 4,
          f: 5
        },
        e: [3, 4],
        g: 6
      }
      
      const merged = deepMerge(obj1, obj2)
      
      expect(merged).toEqual({
        a: 1,
        b: {
          c: 2,
          d: 4,
          f: 5
        },
        e: [3, 4],
        g: 6
      })
    })
  })

  describe('String Utilities', () => {
    test('should capitalize strings correctly', async () => {
      const { capitalize, capitalizeWords } = await import('@/lib/data-utils')
      
      expect(capitalize('hello')).toBe('Hello')
      expect(capitalize('HELLO')).toBe('Hello')
      expect(capitalize('')).toBe('')
      
      expect(capitalizeWords('hello world')).toBe('Hello World')
      expect(capitalizeWords('the quick brown fox')).toBe('The Quick Brown Fox')
    })

    test('should convert case correctly', async () => {
      const { toCamelCase, toSnakeCase, toKebabCase } = await import('@/lib/data-utils')
      
      expect(toCamelCase('hello_world')).toBe('helloWorld')
      expect(toCamelCase('hello-world')).toBe('helloWorld')
      expect(toCamelCase('Hello World')).toBe('helloWorld')
      
      expect(toSnakeCase('helloWorld')).toBe('hello_world')
      expect(toSnakeCase('HelloWorld')).toBe('hello_world')
      expect(toSnakeCase('hello-world')).toBe('hello_world')
      
      expect(toKebabCase('helloWorld')).toBe('hello-world')
      expect(toKebabCase('HelloWorld')).toBe('hello-world')
      expect(toKebabCase('hello_world')).toBe('hello-world')
    })

    test('should extract and validate URLs', async () => {
      const { extractUrls, isValidUrl } = await import('@/lib/data-utils')
      
      const text = 'Visit https://example.com and http://test.org for more info'
      const urls = extractUrls(text)
      
      expect(urls).toEqual(['https://example.com', 'http://test.org'])
      
      expect(isValidUrl('https://example.com')).toBe(true)
      expect(isValidUrl('http://test.org')).toBe(true)
      expect(isValidUrl('ftp://files.com')).toBe(false)
      expect(isValidUrl('not-a-url')).toBe(false)
      expect(isValidUrl('javascript:alert(1)')).toBe(false)
    })

    test('should generate random strings', async () => {
      const { generateRandomString, generateUUID } = await import('@/lib/data-utils')
      
      const randomStr1 = generateRandomString(10)
      const randomStr2 = generateRandomString(10)
      
      expect(randomStr1).toHaveLength(10)
      expect(randomStr2).toHaveLength(10)
      expect(randomStr1).not.toBe(randomStr2)
      
      const uuid1 = generateUUID()
      const uuid2 = generateUUID()
      
      expect(uuid1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
      expect(uuid1).not.toBe(uuid2)
    })
  })

  describe('Array Utilities', () => {
    test('should remove duplicates correctly', async () => {
      const { removeDuplicates, removeDuplicatesBy } = await import('@/lib/data-utils')
      
      expect(removeDuplicates([1, 2, 2, 3, 3, 4])).toEqual([1, 2, 3, 4])
      expect(removeDuplicates(['a', 'b', 'b', 'c'])).toEqual(['a', 'b', 'c'])
      
      const objects = [
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
        { id: 1, name: 'A' },
        { id: 3, name: 'C' }
      ]
      
      const unique = removeDuplicatesBy(objects, 'id')
      expect(unique).toHaveLength(3)
      expect(unique.map(o => o.id)).toEqual([1, 2, 3])
    })

    test('should chunk arrays correctly', async () => {
      const { chunk } = await import('@/lib/data-utils')
      
      expect(chunk([1, 2, 3, 4, 5, 6], 2)).toEqual([[1, 2], [3, 4], [5, 6]])
      expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
      expect(chunk([], 2)).toEqual([])
      expect(chunk([1], 2)).toEqual([[1]])
    })

    test('should flatten arrays correctly', async () => {
      const { flatten, flattenDeep } = await import('@/lib/data-utils')
      
      expect(flatten([1, [2, 3], 4])).toEqual([1, 2, 3, 4])
      expect(flattenDeep([1, [2, [3, [4]]]])).toEqual([1, 2, 3, 4])
    })

    test('should find intersections and differences', async () => {
      const { intersection, difference, union } = await import('@/lib/data-utils')
      
      const arr1 = [1, 2, 3, 4]
      const arr2 = [3, 4, 5, 6]
      
      expect(intersection(arr1, arr2)).toEqual([3, 4])
      expect(difference(arr1, arr2)).toEqual([1, 2])
      expect(union(arr1, arr2)).toEqual([1, 2, 3, 4, 5, 6])
    })
  })

  describe('Number Utilities', () => {
    test('should format numbers correctly', async () => {
      const { formatNumber, formatPercentage } = await import('@/lib/data-utils')
      
      expect(formatNumber(1234.567)).toBe('1,234.567')
      expect(formatNumber(1000000)).toBe('1,000,000')
      expect(formatNumber(0)).toBe('0')
      
      expect(formatPercentage(0.1234)).toBe('12.34%')
      expect(formatPercentage(1)).toBe('100%')
      expect(formatPercentage(0)).toBe('0%')
    })

    test('should clamp numbers correctly', async () => {
      const { clamp } = await import('@/lib/data-utils')
      
      expect(clamp(5, 0, 10)).toBe(5)
      expect(clamp(-5, 0, 10)).toBe(0)
      expect(clamp(15, 0, 10)).toBe(10)
    })

    test('should generate random numbers in range', async () => {
      const { randomInt, randomFloat } = await import('@/lib/data-utils')
      
      for (let i = 0; i < 100; i++) {
        const int = randomInt(1, 10)
        expect(int).toBeGreaterThanOrEqual(1)
        expect(int).toBeLessThanOrEqual(10)
        expect(Number.isInteger(int)).toBe(true)
        
        const float = randomFloat(1, 10)
        expect(float).toBeGreaterThanOrEqual(1)
        expect(float).toBeLessThan(10)
      }
    })

    test('should calculate statistics correctly', async () => {
      const { mean, median, mode, standardDeviation } = await import('@/lib/data-utils')
      
      const data = [1, 2, 3, 4, 5]
      
      expect(mean(data)).toBe(3)
      expect(median(data)).toBe(3)
      expect(median([1, 2, 3, 4])).toBe(2.5)
      
      expect(mode([1, 2, 2, 3, 3, 3])).toBe(3)
      
      const stdDev = standardDeviation(data)
      expect(stdDev).toBeCloseTo(1.58, 1)
    })
  })

  describe('Date Utilities', () => {
    test('should add and subtract time correctly', async () => {
      const { addDays, addHours, addMinutes, subtractDays } = await import('@/lib/data-utils')
      
      const baseDate = new Date('2024-01-15T12:00:00Z')
      
      expect(addDays(baseDate, 5)).toEqual(new Date('2024-01-20T12:00:00Z'))
      expect(addHours(baseDate, 3)).toEqual(new Date('2024-01-15T15:00:00Z'))
      expect(addMinutes(baseDate, 30)).toEqual(new Date('2024-01-15T12:30:00Z'))
      expect(subtractDays(baseDate, 2)).toEqual(new Date('2024-01-13T12:00:00Z'))
    })

    test('should calculate date differences correctly', async () => {
      const { daysBetween, hoursBetween, minutesBetween } = await import('@/lib/data-utils')
      
      const date1 = new Date('2024-01-15T12:00:00Z')
      const date2 = new Date('2024-01-20T15:30:00Z')
      
      expect(daysBetween(date1, date2)).toBe(5)
      expect(hoursBetween(date1, date2)).toBe(123.5)
      expect(minutesBetween(date1, date2)).toBe(7410)
    })

    test('should check date relationships correctly', async () => {
      const { isSameDay, isToday, isFuture, isPast } = await import('@/lib/data-utils')
      
      const today = new Date()
      const tomorrow = addDays(today, 1)
      const yesterday = subtractDays(today, 1)
      
      expect(isSameDay(today, new Date())).toBe(true)
      expect(isSameDay(today, tomorrow)).toBe(false)
      
      expect(isToday(today)).toBe(true)
      expect(isToday(tomorrow)).toBe(false)
      
      expect(isFuture(tomorrow)).toBe(true)
      expect(isFuture(yesterday)).toBe(false)
      
      expect(isPast(yesterday)).toBe(true)
      expect(isPast(tomorrow)).toBe(false)
    })

    test('should get date ranges correctly', async () => {
      const { getWeekRange, getMonthRange, getYearRange } = await import('@/lib/data-utils')
      
      const testDate = new Date('2024-01-15T12:00:00Z') // Monday
      
      const weekRange = getWeekRange(testDate)
      expect(weekRange.start.getDay()).toBe(1) // Monday
      expect(weekRange.end.getDay()).toBe(0) // Sunday
      
      const monthRange = getMonthRange(testDate)
      expect(monthRange.start.getDate()).toBe(1)
      expect(monthRange.end.getMonth()).toBe(testDate.getMonth())
      
      const yearRange = getYearRange(testDate)
      expect(yearRange.start.getMonth()).toBe(0) // January
      expect(yearRange.end.getMonth()).toBe(11) // December
    })
  })

  describe('File Utilities', () => {
    test('should get file extensions correctly', async () => {
      const { getFileExtension, getFileName, getMimeType } = await import('@/lib/data-utils')
      
      expect(getFileExtension('image.jpg')).toBe('jpg')
      expect(getFileExtension('document.pdf')).toBe('pdf')
      expect(getFileExtension('file')).toBe('')
      expect(getFileExtension('archive.tar.gz')).toBe('gz')
      
      expect(getFileName('path/to/image.jpg')).toBe('image.jpg')
      expect(getFileName('/absolute/path/document.pdf')).toBe('document.pdf')
      
      expect(getMimeType('image.jpg')).toBe('image/jpeg')
      expect(getMimeType('document.pdf')).toBe('application/pdf')
      expect(getMimeType('unknown.xyz')).toBe('application/octet-stream')
    })

    test('should format file sizes correctly', async () => {
      const { formatFileSize } = await import('@/lib/data-utils')
      
      expect(formatFileSize(1024)).toBe('1.0 KB')
      expect(formatFileSize(1024 * 1024)).toBe('1.0 MB')
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.0 GB')
      expect(formatFileSize(500)).toBe('500 B')
      expect(formatFileSize(0)).toBe('0 B')
    })

    test('should validate file types correctly', async () => {
      const { isImageFile, isVideoFile, isDocumentFile } = await import('@/lib/data-utils')
      
      expect(isImageFile('image.jpg')).toBe(true)
      expect(isImageFile('photo.png')).toBe(true)
      expect(isImageFile('document.pdf')).toBe(false)
      
      expect(isVideoFile('movie.mp4')).toBe(true)
      expect(isVideoFile('clip.avi')).toBe(true)
      expect(isVideoFile('image.jpg')).toBe(false)
      
      expect(isDocumentFile('document.pdf')).toBe(true)
      expect(isDocumentFile('text.txt')).toBe(true)
      expect(isDocumentFile('image.jpg')).toBe(false)
    })
  })

  describe('Color Utilities', () => {
    test('should convert color formats correctly', async () => {
      const { hexToRgb, rgbToHex, hexToHsl } = await import('@/lib/data-utils')
      
      expect(hexToRgb('#FF0000')).toEqual({ r: 255, g: 0, b: 0 })
      expect(hexToRgb('#00FF00')).toEqual({ r: 0, g: 255, b: 0 })
      
      expect(rgbToHex(255, 0, 0)).toBe('#FF0000')
      expect(rgbToHex(0, 255, 0)).toBe('#00FF00')
      
      const hsl = hexToHsl('#FF0000')
      expect(hsl.h).toBe(0)
      expect(hsl.s).toBe(100)
      expect(hsl.l).toBe(50)
    })

    test('should generate color variations correctly', async () => {
      const { lightenColor, darkenColor, getContrastColor } = await import('@/lib/data-utils')
      
      const lightened = lightenColor('#FF0000', 0.2)
      expect(lightened).not.toBe('#FF0000')
      
      const darkened = darkenColor('#FF0000', 0.2)
      expect(darkened).not.toBe('#FF0000')
      
      expect(getContrastColor('#FFFFFF')).toBe('#000000')
      expect(getContrastColor('#000000')).toBe('#FFFFFF')
    })
  })

  describe('Performance Utilities', () => {
    test('should debounce function calls', async () => {
      const { debounce } = await import('@/lib/data-utils')
      
      let callCount = 0
      const fn = () => callCount++
      const debouncedFn = debounce(fn, 100)
      
      // Call multiple times rapidly
      debouncedFn()
      debouncedFn()
      debouncedFn()
      
      expect(callCount).toBe(0) // Should not be called yet
      
      // Wait for debounce delay
      await new Promise(resolve => setTimeout(resolve, 150))
      
      expect(callCount).toBe(1) // Should be called once
    })

    test('should throttle function calls', async () => {
      const { throttle } = await import('@/lib/data-utils')
      
      let callCount = 0
      const fn = () => callCount++
      const throttledFn = throttle(fn, 100)
      
      // Call multiple times
      throttledFn() // Should execute immediately
      throttledFn() // Should be throttled
      throttledFn() // Should be throttled
      
      expect(callCount).toBe(1)
      
      // Wait for throttle period
      await new Promise(resolve => setTimeout(resolve, 150))
      
      throttledFn() // Should execute again
      expect(callCount).toBe(2)
    })

    test('should memoize function results', async () => {
      const { memoize } = await import('@/lib/data-utils')
      
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