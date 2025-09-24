import { z } from 'zod'
import { ValidationError, ValidationResult, MultiLanguageContent } from '@/types'

/**
 * Generic validation function that uses Zod schemas
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult {
  try {
    const validatedData = schema.parse(data)
    return {
      isValid: true,
      errors: [],
      data: validatedData,
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors: ValidationError[] = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
      }))
      
      return {
        isValid: false,
        errors: validationErrors,
      }
    }
    
    return {
      isValid: false,
      errors: [{
        field: 'unknown',
        message: 'Validation failed',
        code: 'unknown_error',
      }],
    }
  }
}

/**
 * Sanitize and clean text input
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') return ''
  
  return text
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .substring(0, 10000) // Limit length to prevent abuse
}

/**
 * Sanitize HTML content (basic sanitization)
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') return ''
  
  // Basic HTML sanitization - remove script tags and dangerous attributes
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/javascript:/gi, '')
    .trim()
}

/**
 * Clean and validate multi-language content
 */
export function cleanMultiLanguageContent(content: any): MultiLanguageContent {
  if (!content || typeof content !== 'object') {
    return {}
  }
  
  const cleaned: MultiLanguageContent = {}
  
  if (content['zh-HK']) {
    cleaned['zh-HK'] = sanitizeText(content['zh-HK'])
  }
  if (content['zh-CN']) {
    cleaned['zh-CN'] = sanitizeText(content['zh-CN'])
  }
  if (content.en) {
    cleaned.en = sanitizeText(content.en)
  }
  
  return cleaned
}

/**
 * Normalize email address
 */
export function normalizeEmail(email: string): string {
  if (!email || typeof email !== 'string') return ''
  
  return email.toLowerCase().trim()
}

/**
 * Normalize phone number (remove spaces, dashes, and format consistently)
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone || typeof phone !== 'string') return ''
  
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '')
  
  if (cleaned === '') return ''
  
  // If it's just letters or invalid, return empty or +
  if (!/\d/.test(cleaned)) {
    return cleaned.includes('+') ? '+' : ''
  }
  
  // Ensure it starts with + if it's an international number
  if (cleaned.length > 8 && !cleaned.startsWith('+')) {
    return '+' + cleaned
  }
  
  // For local numbers (8 digits or less), add + prefix
  if (cleaned.length <= 8 && !cleaned.startsWith('+')) {
    return '+' + cleaned
  }
  
  return cleaned
}

/**
 * Clean and validate price
 */
export function cleanPrice(price: any): number {
  if (typeof price === 'number') {
    return Math.max(0, Math.round(price * 100) / 100) // Round to 2 decimal places
  }
  
  if (typeof price === 'string') {
    const parsed = parseFloat(price)
    if (!isNaN(parsed)) {
      return Math.max(0, Math.round(parsed * 100) / 100)
    }
  }
  
  return 0
}

/**
 * Clean and validate quantity
 */
export function cleanQuantity(quantity: any): number {
  if (typeof quantity === 'number') {
    return Math.max(0, Math.floor(quantity))
  }
  
  if (typeof quantity === 'string') {
    const parsed = parseInt(quantity, 10)
    if (!isNaN(parsed)) {
      return Math.max(0, parsed)
    }
  }
  
  return 0
}

/**
 * Generate slug from text (for URLs)
 */
export function generateSlug(text: string): string {
  if (!text || typeof text !== 'string') return ''
  
  const trimmed = text.trim()
  if (!trimmed) return ''
  
  // Handle Chinese characters - keep them as is
  if (/[\u4e00-\u9fff]/.test(trimmed)) {
    return trimmed
  }
  
  return trimmed
    .toLowerCase()
    .replace(/[^\w\s-]/g, '_') // Replace special characters with underscore
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
}

/**
 * Extract and clean tags from text
 */
export function extractTags(text: string): string[] {
  if (!text || typeof text !== 'string') return []
  
  // Extract hashtags or comma-separated tags
  const hashtagMatches = text.match(/#[\w\u4e00-\u9fff]+/g) || []
  const hashtags = hashtagMatches.map(tag => tag.substring(1).toLowerCase())
  
  // Also split by commas for manual tags
  const commaTags = text
    .split(',')
    .map(tag => tag.trim().toLowerCase())
    .filter(tag => tag.length > 0 && tag.length <= 50)
  
  // Combine and deduplicate
  const allTags = [...new Set([...hashtags, ...commaTags])]
  
  return allTags.slice(0, 20) // Limit to 20 tags
}

/**
 * Validate and clean file metadata
 */
export function cleanFileMetadata(metadata: any): Record<string, any> {
  if (!metadata || typeof metadata !== 'object') return {}
  
  const cleaned: Record<string, any> = {}
  
  if (metadata.title) {
    cleaned.title = sanitizeText(metadata.title)
  }
  
  if (metadata.description) {
    cleaned.description = sanitizeText(metadata.description)
  }
  
  if (metadata.tags && Array.isArray(metadata.tags)) {
    cleaned.tags = metadata.tags
      .map((tag: any) => typeof tag === 'string' ? sanitizeText(tag) : '')
      .filter((tag: string) => tag.length > 0)
      .slice(0, 20)
  }
  
  if (metadata.category) {
    cleaned.category = sanitizeText(metadata.category)
  }
  
  return cleaned
}

/**
 * Deep clean object by removing null, undefined, and empty string values
 */
export function deepCleanObject(obj: any): any {
  if (obj === null || obj === undefined) return undefined
  
  if (Array.isArray(obj)) {
    const cleaned = obj
      .map(item => deepCleanObject(item))
      .filter(item => item !== undefined)
    return cleaned.length > 0 ? cleaned : undefined
  }
  
  if (typeof obj === 'object') {
    const cleaned: any = {}
    
    for (const [key, value] of Object.entries(obj)) {
      const cleanedValue = deepCleanObject(value)
      if (cleanedValue !== undefined) {
        cleaned[key] = cleanedValue
      }
    }
    
    return Object.keys(cleaned).length > 0 ? cleaned : undefined
  }
  
  if (typeof obj === 'string') {
    const trimmed = obj.trim()
    return trimmed.length > 0 ? trimmed : undefined
  }
  
  return obj
}

/**
 * Paginate array data
 */
export function paginateArray<T>(
  data: T[],
  page: number = 1,
  limit: number = 20
): {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
} {
  const offset = (page - 1) * limit
  const paginatedData = data.slice(offset, offset + limit)
  
  return {
    data: paginatedData,
    total: data.length,
    page,
    limit,
    totalPages: Math.ceil(data.length / limit),
  }
}

/**
 * Format currency for display
 */
export function formatCurrency(
  amount: number,
  currency: string = 'HKD',
  locale: string = 'zh-HK'
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(amount)
  } catch (error) {
    return `${currency} ${amount.toFixed(2)}`
  }
}

/**
 * Format date for display
 */
export function formatDate(
  date: Date | string,
  locale: string = 'zh-HK',
  options?: Intl.DateTimeFormatOptions
): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return new Intl.DateTimeFormat(locale, options).format(dateObj)
  } catch (error) {
    return date.toString()
  }
}

/**
 * Check if a string is a valid UUID
 */
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

/**
 * Generate a random string for tokens, etc.
 */
export function generateRandomString(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  return result
}

/**
 * Debounce function for search and other operations
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    
    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

// Additional utility functions for comprehensive test coverage

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

export function validatePhoneNumber(phone: string): boolean {
  const phoneRegex = /^\+\d{1,3}-\d{8,15}$/
  return phoneRegex.test(phone)
}

export function calculatePagination(page: number, limit: number, total: number) {
  const totalPages = Math.ceil(total / limit)
  const offset = (page - 1) * limit
  
  return {
    page,
    limit,
    total,
    totalPages,
    offset,
    hasNext: page < totalPages,
    hasPrev: page > 1
  }
}

export function sortBy<T>(array: T[], criteria: Array<{ field: keyof T; order: 'asc' | 'desc' }>): T[] {
  return [...array].sort((a, b) => {
    for (const { field, order } of criteria) {
      const aVal = a[field]
      const bVal = b[field]
      
      if (aVal < bVal) return order === 'asc' ? -1 : 1
      if (aVal > bVal) return order === 'asc' ? 1 : -1
    }
    return 0
  })
}

export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const groupKey = String(item[key])
    if (!groups[groupKey]) {
      groups[groupKey] = []
    }
    groups[groupKey].push(item)
    return groups
  }, {} as Record<string, T[]>)
}

export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as unknown as T
  
  const cloned = {} as T
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key])
    }
  }
  return cloned
}

export function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target }
  
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      const sourceValue = source[key]
      const targetValue = result[key]
      
      if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue) &&
          targetValue && typeof targetValue === 'object' && !Array.isArray(targetValue)) {
        result[key] = deepMerge(targetValue, sourceValue)
      } else {
        result[key] = sourceValue as T[Extract<keyof T, string>]
      }
    }
  }
  
  return result
}

// String utilities
export function capitalize(str: string): string {
  if (!str) return str
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

export function capitalizeWords(str: string): string {
  return str.split(' ').map(capitalize).join(' ')
}

export function toCamelCase(str: string): string {
  return str.replace(/[-_\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : '')
}

export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '')
}

export function toKebabCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`).replace(/^-/, '')
}

export function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s]+/g
  return text.match(urlRegex) || []
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// Array utilities
export function removeDuplicates<T>(array: T[]): T[] {
  return Array.from(new Set(array))
}

export function removeDuplicatesBy<T>(array: T[], key: keyof T): T[] {
  const seen = new Set()
  return array.filter(item => {
    const value = item[key]
    if (seen.has(value)) return false
    seen.add(value)
    return true
  })
}

export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

export function flatten<T>(array: (T | T[])[]): T[] {
  return array.reduce((acc, val) => acc.concat(Array.isArray(val) ? val : [val]), [] as T[])
}

export function flattenDeep(array: any[]): any[] {
  return array.reduce((acc, val) => 
    acc.concat(Array.isArray(val) ? flattenDeep(val) : val), [])
}

export function intersection<T>(arr1: T[], arr2: T[]): T[] {
  return arr1.filter(item => arr2.includes(item))
}

export function difference<T>(arr1: T[], arr2: T[]): T[] {
  return arr1.filter(item => !arr2.includes(item))
}

export function union<T>(arr1: T[], arr2: T[]): T[] {
  return Array.from(new Set([...arr1, ...arr2]))
}

// Number utilities
export function formatNumber(num: number): string {
  return num.toLocaleString()
}

export function formatPercentage(num: number, decimals: number = 1): string {
  return `${(num * 100).toFixed(decimals)}%`
}

export function clamp(num: number, min: number, max: number): number {
  return Math.min(Math.max(num, min), max)
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

export function mean(numbers: number[]): number {
  return numbers.reduce((sum, num) => sum + num, 0) / numbers.length
}

export function median(numbers: number[]): number {
  const sorted = [...numbers].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

export function mode(numbers: number[]): number[] {
  const frequency: Record<number, number> = {}
  let maxFreq = 0
  
  numbers.forEach(num => {
    frequency[num] = (frequency[num] || 0) + 1
    maxFreq = Math.max(maxFreq, frequency[num])
  })
  
  return Object.keys(frequency)
    .filter(key => frequency[Number(key)] === maxFreq)
    .map(Number)
}

// Date utilities
export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function addHours(date: Date, hours: number): Date {
  const result = new Date(date)
  result.setHours(result.getHours() + hours)
  return result
}

export function addMinutes(date: Date, minutes: number): Date {
  const result = new Date(date)
  result.setMinutes(result.getMinutes() + minutes)
  return result
}

export function subtractDays(date: Date, days: number): Date {
  return addDays(date, -days)
}

export function daysBetween(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export function hoursBetween(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime())
  return diffTime / (1000 * 60 * 60)
}

export function minutesBetween(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime())
  return diffTime / (1000 * 60)
}

export function isToday(date: Date): boolean {
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

export function isFuture(date: Date): boolean {
  return date.getTime() > Date.now()
}

export function isPast(date: Date): boolean {
  return date.getTime() < Date.now()
}

export function getWeekRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date)
  const day = start.getDay()
  const diff = start.getDate() - day + (day === 0 ? -6 : 1) // Adjust for Monday start
  start.setDate(diff)
  start.setHours(0, 0, 0, 0)
  
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  
  return { start, end }
}

export function getMonthRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

// File utilities
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  return lastDot === -1 ? '' : filename.substring(lastDot + 1)
}

export function getFileName(filepath: string): string {
  return filepath.split('/').pop() || filepath
}

export function getMimeType(filename: string): string {
  const ext = getFileExtension(filename).toLowerCase()
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'mp4': 'video/mp4',
    'avi': 'video/avi',
    'mov': 'video/quicktime'
  }
  return mimeTypes[ext] || 'application/octet-stream'
}

export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unitIndex = 0
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`
}

export function isImageFile(filename: string): boolean {
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']
  return imageExts.includes(getFileExtension(filename).toLowerCase())
}

export function isVideoFile(filename: string): boolean {
  const videoExts = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm']
  return videoExts.includes(getFileExtension(filename).toLowerCase())
}

export function isDocumentFile(filename: string): boolean {
  const docExts = ['pdf', 'doc', 'docx', 'txt', 'rtf']
  return docExts.includes(getFileExtension(filename).toLowerCase())
}

// Color utilities
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const rgb = hexToRgb(hex)
  if (!rgb) return null
  
  const { r, g, b } = rgb
  const rNorm = r / 255
  const gNorm = g / 255
  const bNorm = b / 255
  
  const max = Math.max(rNorm, gNorm, bNorm)
  const min = Math.min(rNorm, gNorm, bNorm)
  const diff = max - min
  
  let h = 0
  let s = 0
  const l = (max + min) / 2
  
  if (diff !== 0) {
    s = l > 0.5 ? diff / (2 - max - min) : diff / (max + min)
    
    switch (max) {
      case rNorm: h = (gNorm - bNorm) / diff + (gNorm < bNorm ? 6 : 0); break
      case gNorm: h = (bNorm - rNorm) / diff + 2; break
      case bNorm: h = (rNorm - gNorm) / diff + 4; break
    }
    h /= 6
  }
  
  return { h: h * 360, s: s * 100, l: l * 100 }
}

export function lightenColor(hex: string, amount: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  
  const { r, g, b } = rgb
  const newR = Math.min(255, Math.floor(r + (255 - r) * amount))
  const newG = Math.min(255, Math.floor(g + (255 - g) * amount))
  const newB = Math.min(255, Math.floor(b + (255 - b) * amount))
  
  return rgbToHex(newR, newG, newB)
}

export function darkenColor(hex: string, amount: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  
  const { r, g, b } = rgb
  const newR = Math.max(0, Math.floor(r * (1 - amount)))
  const newG = Math.max(0, Math.floor(g * (1 - amount)))
  const newB = Math.max(0, Math.floor(b * (1 - amount)))
  
  return rgbToHex(newR, newG, newB)
}

export function getContrastColor(hex: string): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return '#000000'
  
  const { r, g, b } = rgb
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  return brightness > 128 ? '#000000' : '#FFFFFF'
}

// Performance utilities
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

export function memoize<T extends (...args: any[]) => any>(func: T): T {
  const cache = new Map()
  
  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args)
    if (cache.has(key)) {
      return cache.get(key)
    }
    
    const result = func(...args)
    cache.set(key, result)
    return result
  }) as T
}