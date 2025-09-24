/**
 * Test utilities for comprehensive testing
 */

import { vi } from 'vitest'
import type { 
  User, 
  CraftsmanProfile, 
  Course, 
  Product, 
  Order, 
  Booking,
  UserRole,
  VerificationStatus,
  CourseStatus,
  ProductStatus,
  OrderStatus,
  PaymentStatus,
  BookingStatus
} from '@/types'
import { Decimal } from '@prisma/client/runtime/library'

// Mock data factories
export const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-123',
  email: 'test@example.com',
  role: 'LEARNER' as UserRole,
  preferredLanguage: 'zh-HK',
  passwordHash: '$2b$10$hashedpassword',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

export const createMockCraftsman = (overrides: Partial<CraftsmanProfile> = {}): CraftsmanProfile => ({
  id: 'craftsman-123',
  userId: 'user-123',
  craftSpecialties: ['手雕麻將', '竹編'],
  bio: {
    'zh-HK': '資深師傅',
    'en': 'Senior craftsman'
  },
  experienceYears: 20,
  workshopLocation: '香港',
  contactInfo: {
    phone: '+852-12345678',
    email: 'craftsman@example.com'
  },
  verificationStatus: 'VERIFIED' as VerificationStatus,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

export const createMockCourse = (overrides: Partial<Course> = {}): Course => ({
  id: 'course-123',
  craftsmanId: 'craftsman-123',
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
  durationHours: new Decimal(3),
  price: new Decimal(500),
  status: 'ACTIVE' as CourseStatus,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

export const createMockProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'product-123',
  craftsmanId: 'craftsman-123',
  name: {
    'zh-HK': '手工麻將',
    'en': 'Handmade Mahjong Set'
  },
  description: {
    'zh-HK': '純手工雕刻麻將',
    'en': 'Hand-carved mahjong set'
  },
  price: new Decimal(2000),
  inventoryQuantity: 5,
  isCustomizable: true,
  craftCategory: '手雕麻將',
  status: 'ACTIVE' as ProductStatus,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

export const createMockOrder = (overrides: Partial<Order> = {}): Order => ({
  id: 'order-123',
  userId: 'user-123',
  totalAmount: new Decimal(2000),
  status: 'PENDING' as OrderStatus,
  shippingAddress: {
    recipientName: 'Test User',
    phone: '+852-12345678',
    addressLine1: '123 Test Street',
    city: 'Hong Kong',
    district: 'Central',
    postalCode: '00000',
    country: 'HK'
  },
  paymentStatus: 'PENDING' as PaymentStatus,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

export const createMockBooking = (overrides: Partial<Booking> = {}): Booking => ({
  id: 'booking-123',
  userId: 'user-123',
  courseId: 'course-123',
  status: 'CONFIRMED' as BookingStatus,
  notes: 'Looking forward to learning',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

// Database mocking utilities
export const mockPrismaClient = () => {
  return {
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    craftsmanProfile: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    course: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    product: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    order: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    booking: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
    $disconnect: vi.fn(),
  }
}

// API response mocking
export const mockApiResponse = <T>(data: T, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(data),
  text: () => Promise.resolve(JSON.stringify(data)),
})

// Error simulation utilities
export const simulateNetworkError = () => {
  throw new Error('Network error')
}

export const simulateValidationError = (field: string, message: string) => {
  const error = new Error(message)
  ;(error as any).field = field
  ;(error as any).type = 'validation'
  throw error
}

// Test environment setup
export const setupTestEnvironment = () => {
  // Mock console methods to reduce noise in tests
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})

  // Mock fetch globally
  global.fetch = vi.fn()

  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  }
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
  })

  // Mock sessionStorage
  const sessionStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  }
  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock,
  })
}

// Cleanup utilities
export const cleanupTestEnvironment = () => {
  vi.clearAllMocks()
  vi.resetAllMocks()
}

// Async testing utilities
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const waitForCondition = async (
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
) => {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return true
    }
    await waitFor(interval)
  }
  throw new Error(`Condition not met within ${timeout}ms`)
}

// Performance testing utilities
export const measureExecutionTime = async <T>(fn: () => Promise<T>): Promise<{ result: T; time: number }> => {
  const start = performance.now()
  const result = await fn()
  const time = performance.now() - start
  return { result, time }
}

// Memory usage testing
export const getMemoryUsage = () => {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    return process.memoryUsage()
  }
  return null
}