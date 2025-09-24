import { z } from 'zod'
import { UserRole, VerificationStatus, CourseStatus, BookingStatus, ProductStatus, OrderStatus, PaymentStatus } from '@prisma/client'

// Common validation schemas
export const multiLanguageContentSchema = z.object({
  'zh-HK': z.string().optional(),
  'zh-CN': z.string().optional(),
  en: z.string().optional(),
}).refine(
  (data) => Object.values(data).some(value => value && value.trim().length > 0),
  { message: "At least one language content is required" }
)

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
})

export const searchParamsSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  language: z.enum(['zh-HK', 'zh-CN', 'en']).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

// User validation schemas
export const userRegistrationSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  role: z.nativeEnum(UserRole).default(UserRole.LEARNER),
  preferredLanguage: z.enum(['zh-HK', 'zh-CN', 'en']).default('zh-HK'),
})

export const loginCredentialsSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
})

export const userUpdateSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  preferredLanguage: z.enum(['zh-HK', 'zh-CN', 'en']).optional(),
})

// Craftsman validation schemas
export const contactInfoSchema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format').optional(),
  whatsapp: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid WhatsApp number format').optional(),
  wechat: z.string().min(1).max(50).optional(),
  email: z.string().email('Invalid email format').optional(),
  website: z.string().url('Invalid website URL').optional(),
})

export const craftsmanProfileSchema = z.object({
  craftSpecialties: z.array(z.string().min(1)).min(1, 'At least one craft specialty is required'),
  bio: multiLanguageContentSchema.optional(),
  experienceYears: z.number().int().min(0).max(100).optional(),
  workshopLocation: z.string().min(1).max(255).optional(),
  contactInfo: contactInfoSchema.optional(),
})

export const craftsmanProfileUpdateSchema = craftsmanProfileSchema.partial()

// Course validation schemas
export const courseSchema = z.object({
  title: multiLanguageContentSchema,
  description: multiLanguageContentSchema.optional(),
  craftCategory: z.string().min(1, 'Craft category is required'),
  maxParticipants: z.number().int().min(1).max(100).optional(),
  durationHours: z.number().min(0.5).max(24).optional(),
  price: z.number().min(0).optional(),
  status: z.nativeEnum(CourseStatus).default(CourseStatus.ACTIVE),
})

export const courseUpdateSchema = courseSchema.partial()

export const bookingSchema = z.object({
  notes: z.string().max(500).optional(),
})

// Product validation schemas
export const productSchema = z.object({
  name: multiLanguageContentSchema,
  description: multiLanguageContentSchema.optional(),
  price: z.number().min(0, 'Price must be non-negative'),
  inventoryQuantity: z.number().int().min(0).default(0),
  isCustomizable: z.boolean().default(false),
  craftCategory: z.string().min(1, 'Craft category is required'),
  status: z.nativeEnum(ProductStatus).default(ProductStatus.ACTIVE),
})

export const productUpdateSchema = productSchema.partial()

// Order validation schemas
export const shippingAddressSchema = z.object({
  recipientName: z.string().min(1, 'Recipient name is required').max(100),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
  addressLine1: z.string().min(1, 'Address line 1 is required').max(255),
  addressLine2: z.string().max(255).optional(),
  city: z.string().min(1, 'City is required').max(100),
  district: z.string().min(1, 'District is required').max(100),
  postalCode: z.string().max(20).optional(),
  country: z.string().min(1, 'Country is required').max(100),
})

export const orderItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  customizationNotes: z.string().max(1000).optional(),
})

export const orderSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
  shippingAddress: shippingAddressSchema,
})

// Payment validation schemas
export const paymentSchema = z.object({
  method: z.enum(['stripe', 'paypal', 'alipay', 'wechat_pay']),
  amount: z.number().min(0, 'Amount must be non-negative'),
  currency: z.string().length(3, 'Currency must be 3 characters'),
  metadata: z.record(z.any()).optional(),
})

// Media validation schemas
export const mediaMetadataSchema = z.object({
  title: z.string().max(255).optional(),
  description: z.string().max(1000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  category: z.string().max(100).optional(),
  language: z.enum(['zh-HK', 'zh-CN', 'en']).optional(),
})

// Search validation schemas
export const searchFiltersSchema = z.object({
  category: z.array(z.string()).optional(),
  priceRange: z.object({
    min: z.number().min(0).optional(),
    max: z.number().min(0).optional(),
  }).optional(),
  location: z.string().optional(),
  language: z.enum(['zh-HK', 'zh-CN', 'en']).optional(),
  craftsman: z.string().uuid().optional(),
  availability: z.boolean().optional(),
})

export const searchQuerySchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  filters: searchFiltersSchema.optional(),
  pagination: paginationSchema.optional(),
  sort: z.object({
    field: z.string(),
    order: z.enum(['asc', 'desc']),
  }).optional(),
})

// File upload validation
export const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
export const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg']
export const allowedDocumentTypes = ['application/pdf', 'text/plain']

export const fileUploadSchema = z.object({
  file: z.any().refine(
    (file) => file instanceof File,
    'Invalid file'
  ).refine(
    (file) => file.size <= 50 * 1024 * 1024, // 50MB
    'File size must be less than 50MB'
  ),
  metadata: mediaMetadataSchema.optional(),
})

// ID validation schemas
export const uuidSchema = z.string().uuid('Invalid UUID format')
export const emailSchema = z.string().email('Invalid email format')

// Utility validation functions
export function validateUUID(id: string): boolean {
  return uuidSchema.safeParse(id).success
}

export function validateEmail(email: string): boolean {
  return emailSchema.safeParse(email).success
}

export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type)
}

export function validateImageFile(file: File): boolean {
  return validateFileType(file, allowedImageTypes) && file.size <= 10 * 1024 * 1024 // 10MB for images
}

export function validateVideoFile(file: File): boolean {
  return validateFileType(file, allowedVideoTypes) && file.size <= 100 * 1024 * 1024 // 100MB for videos
}

export function validateDocumentFile(file: File): boolean {
  return validateFileType(file, allowedDocumentTypes) && file.size <= 5 * 1024 * 1024 // 5MB for documents
}

// Validation result type
export interface ValidationResult {
  isValid: boolean
  errors: { field: string; message: string; code: string }[]
  data?: any
}

// Course validation functions
export function validateCourseData(data: any, isPartial: boolean = false): ValidationResult {
  const schema = isPartial ? courseUpdateSchema : courseSchema
  const result = schema.safeParse(data)
  
  if (result.success) {
    return {
      isValid: true,
      errors: [],
      data: result.data
    }
  }
  
  return {
    isValid: false,
    errors: result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }))
  }
}

// User validation functions
export function validateUserRegistration(data: any): ValidationResult {
  const result = userRegistrationSchema.safeParse(data)
  
  if (result.success) {
    return {
      isValid: true,
      errors: [],
      data: result.data
    }
  }
  
  return {
    isValid: false,
    errors: result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }))
  }
}

export function validateLoginCredentials(data: any): ValidationResult {
  const result = loginCredentialsSchema.safeParse(data)
  
  if (result.success) {
    return {
      isValid: true,
      errors: [],
      data: result.data
    }
  }
  
  return {
    isValid: false,
    errors: result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }))
  }
}

// Craftsman validation functions
export function validateCraftsmanProfile(data: any, isPartial: boolean = false): ValidationResult {
  const schema = isPartial ? craftsmanProfileUpdateSchema : craftsmanProfileSchema
  const result = schema.safeParse(data)
  
  if (result.success) {
    return {
      isValid: true,
      errors: [],
      data: result.data
    }
  }
  
  return {
    isValid: false,
    errors: result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }))
  }
}

// Product validation functions
export function validateProductData(data: any, isPartial: boolean = false): ValidationResult {
  const schema = isPartial ? productUpdateSchema : productSchema
  const result = schema.safeParse(data)
  
  if (result.success) {
    return {
      isValid: true,
      errors: [],
      data: result.data
    }
  }
  
  return {
    isValid: false,
    errors: result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }))
  }
}

// Booking validation functions
export function validateBookingData(data: any): ValidationResult {
  const result = bookingSchema.safeParse(data)
  
  if (result.success) {
    return {
      isValid: true,
      errors: [],
      data: result.data
    }
  }
  
  return {
    isValid: false,
    errors: result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }))
  }
}

// Learning material validation schemas
export const learningMaterialContentSchema = z.object({
  steps: z.array(z.object({
    title: multiLanguageContentSchema,
    description: multiLanguageContentSchema,
    imageUrl: z.string().url().optional(),
    videoUrl: z.string().url().optional(),
    orderIndex: z.number().int().min(0)
  })).optional(),
  text: multiLanguageContentSchema.optional(),
  questions: z.array(z.object({
    question: multiLanguageContentSchema,
    options: z.array(multiLanguageContentSchema),
    correctAnswer: z.number().int().min(0),
    explanation: multiLanguageContentSchema.optional()
  })).optional(),
  instructions: multiLanguageContentSchema.optional(),
  submissionFormat: z.string().optional(),
  maxScore: z.number().min(0).optional(),
  duration: z.number().min(0).optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  tags: z.array(z.string()).optional()
})

export const learningMaterialSchema = z.object({
  title: multiLanguageContentSchema,
  description: multiLanguageContentSchema.optional(),
  type: z.enum(['VIDEO', 'DOCUMENT', 'IMAGE', 'STEP_BY_STEP', 'QUIZ', 'ASSIGNMENT']),
  content: learningMaterialContentSchema.optional(),
  mediaFileId: z.string().uuid().optional(),
  orderIndex: z.number().int().min(0).optional(),
  isRequired: z.boolean().default(true)
})

export const learningMaterialUpdateSchema = learningMaterialSchema.partial()

export const learningProgressSchema = z.object({
  completed: z.boolean(),
  notes: z.string().max(1000).optional()
})

// Order validation functions
export function validateOrderData(data: any): ValidationResult {
  const result = orderSchema.safeParse(data)
  
  if (result.success) {
    return {
      isValid: true,
      errors: [],
      data: result.data
    }
  }
  
  return {
    isValid: false,
    errors: result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }))
  }
}

// Payment validation functions
export function validatePaymentData(data: any): ValidationResult {
  const result = paymentSchema.safeParse(data)
  
  if (result.success) {
    return {
      isValid: true,
      errors: [],
      data: result.data
    }
  }
  
  return {
    isValid: false,
    errors: result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }))
  }
}

export function validateShippingAddress(data: any): ValidationResult {
  const result = shippingAddressSchema.safeParse(data)
  
  if (result.success) {
    return {
      isValid: true,
      errors: [],
      data: result.data
    }
  }
  
  return {
    isValid: false,
    errors: result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }))
  }
}

// Learning material validation functions
export function validateLearningMaterialData(data: any, isPartial: boolean = false): ValidationResult {
  const schema = isPartial ? learningMaterialUpdateSchema : learningMaterialSchema
  const result = schema.safeParse(data)
  
  if (result.success) {
    return {
      isValid: true,
      errors: [],
      data: result.data
    }
  }
  
  return {
    isValid: false,
    errors: result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }))
  }
}

export function validateLearningProgressData(data: any): ValidationResult {
  const result = learningProgressSchema.safeParse(data)
  
  if (result.success) {
    return {
      isValid: true,
      errors: [],
      data: result.data
    }
  }
  
  return {
    isValid: false,
    errors: result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }))
  }
}

// E-commerce Enhancement Validation Schemas

// Coupon validation schemas
export const couponDataSchema = z.object({
  code: z.string()
    .min(3, 'Coupon code must be at least 3 characters')
    .max(50, 'Coupon code must not exceed 50 characters')
    .regex(/^[A-Z0-9_-]+$/, 'Coupon code can only contain uppercase letters, numbers, underscores, and hyphens'),
  name: multiLanguageContentSchema,
  description: multiLanguageContentSchema.optional(),
  discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
  discountValue: z.number()
    .positive('Discount value must be positive'),
  minimumOrderAmount: z.number().min(0, 'Minimum order amount cannot be negative').optional(),
  maximumDiscountAmount: z.number().positive('Maximum discount amount must be positive').optional(),
  usageLimit: z.number().int().positive('Usage limit must be a positive integer').optional(),
  validFrom: z.string().or(z.date()),
  validUntil: z.string().or(z.date()),
  applicableCategories: z.array(z.string()).optional(),
  applicableCraftsmen: z.array(z.string().uuid('Invalid craftsman ID')).optional(),
}).refine(
  (data) => new Date(data.validFrom) < new Date(data.validUntil),
  { message: "Valid from date must be before valid until date", path: ["validUntil"] }
)

// Product Review validation schemas
export const productReviewDataSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  orderId: z.string().uuid('Invalid order ID').optional(),
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
  title: z.string().max(200, 'Title cannot exceed 200 characters').optional(),
  comment: z.string().max(2000, 'Comment cannot exceed 2000 characters').optional(),
  images: z.array(z.string().url('Invalid image URL')).max(5, 'Cannot upload more than 5 images').optional(),
}).refine(
  (data) => data.title || data.comment,
  { message: "Either title or comment is required" }
)

// Inventory Alert validation schemas
export const inventoryAlertDataSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  craftsmanId: z.string().uuid('Invalid craftsman ID'),
  alertType: z.enum(['LOW_STOCK', 'OUT_OF_STOCK', 'RESTOCK_REMINDER']),
  thresholdQuantity: z.number().int().min(0, 'Threshold quantity cannot be negative').optional(),
  currentQuantity: z.number().int().min(0, 'Current quantity cannot be negative'),
})

// Promotion validation schemas
export const promotionDataSchema = z.object({
  name: multiLanguageContentSchema,
  description: multiLanguageContentSchema.optional(),
  promotionType: z.enum(['BUY_ONE_GET_ONE', 'BULK_DISCOUNT', 'CATEGORY_SALE', 'FLASH_SALE']),
  discountPercentage: z.number()
    .min(0, 'Discount percentage cannot be negative')
    .max(100, 'Discount percentage cannot exceed 100%')
    .optional(),
  buyQuantity: z.number().int().positive('Buy quantity must be positive').optional(),
  getQuantity: z.number().int().positive('Get quantity must be positive').optional(),
  applicableCategories: z.array(z.string()).optional(),
  applicableProducts: z.array(z.string().uuid('Invalid product ID')).optional(),
  validFrom: z.string().or(z.date()),
  validUntil: z.string().or(z.date()),
}).refine(
  (data) => new Date(data.validFrom) < new Date(data.validUntil),
  { message: "Valid from date must be before valid until date", path: ["validUntil"] }
).refine(
  (data) => {
    if (data.promotionType === 'BUY_ONE_GET_ONE') {
      return data.buyQuantity && data.getQuantity
    }
    if (data.promotionType === 'BULK_DISCOUNT' || data.promotionType === 'CATEGORY_SALE' || data.promotionType === 'FLASH_SALE') {
      return data.discountPercentage !== undefined
    }
    return true
  },
  { message: "Required fields missing for promotion type" }
)

// User Product Interaction validation schemas
export const userInteractionDataSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  interactionType: z.enum(['VIEW', 'LIKE', 'CART_ADD', 'PURCHASE', 'REVIEW']),
  interactionData: z.record(z.any()).optional(),
})

// Validation helper functions
export function validateCouponData(data: any, partial = false): { isValid: boolean; errors: any[]; data?: any } {
  try {
    // For partial validation, we need to create a new schema without the refinements
    const baseSchema = z.object({
      code: z.string()
        .min(3, 'Coupon code must be at least 3 characters')
        .max(50, 'Coupon code must not exceed 50 characters')
        .regex(/^[A-Z0-9_-]+$/, 'Coupon code can only contain uppercase letters, numbers, underscores, and hyphens'),
      name: multiLanguageContentSchema,
      description: multiLanguageContentSchema.optional(),
      discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
      discountValue: z.number().positive('Discount value must be positive'),
      minimumOrderAmount: z.number().min(0, 'Minimum order amount cannot be negative').optional(),
      maximumDiscountAmount: z.number().positive('Maximum discount amount must be positive').optional(),
      usageLimit: z.number().int().positive('Usage limit must be a positive integer').optional(),
      validFrom: z.string().or(z.date()),
      validUntil: z.string().or(z.date()),
      applicableCategories: z.array(z.string()).optional(),
      applicableCraftsmen: z.array(z.string().uuid('Invalid craftsman ID')).optional(),
    })
    
    const schema = partial ? baseSchema.partial() : couponDataSchema
    const result = schema.parse(data)
    return { isValid: true, errors: [], data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      }
    }
    return { isValid: false, errors: [{ field: 'unknown', message: 'Validation failed', code: 'unknown' }] }
  }
}

export function validateProductReviewData(data: any, partial = false): { isValid: boolean; errors: any[]; data?: any } {
  try {
    // For partial validation, create a base schema without refinements
    const baseSchema = z.object({
      productId: z.string().uuid('Invalid product ID'),
      orderId: z.string().uuid('Invalid order ID').optional(),
      rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
      title: z.string().max(200, 'Title cannot exceed 200 characters').optional(),
      comment: z.string().max(2000, 'Comment cannot exceed 2000 characters').optional(),
      images: z.array(z.string().url('Invalid image URL')).max(5, 'Cannot upload more than 5 images').optional(),
    })
    
    const schema = partial ? baseSchema.partial() : productReviewDataSchema
    const result = schema.parse(data)
    return { isValid: true, errors: [], data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      }
    }
    return { isValid: false, errors: [{ field: 'unknown', message: 'Validation failed', code: 'unknown' }] }
  }
}

export function validateInventoryAlertData(data: any): { isValid: boolean; errors: any[]; data?: any } {
  try {
    const result = inventoryAlertDataSchema.parse(data)
    return { isValid: true, errors: [], data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      }
    }
    return { isValid: false, errors: [{ field: 'unknown', message: 'Validation failed', code: 'unknown' }] }
  }
}

export function validatePromotionData(data: any, partial = false): { isValid: boolean; errors: any[]; data?: any } {
  try {
    // For partial validation, create a base schema without refinements
    const baseSchema = z.object({
      name: multiLanguageContentSchema,
      description: multiLanguageContentSchema.optional(),
      promotionType: z.enum(['BUY_ONE_GET_ONE', 'BULK_DISCOUNT', 'CATEGORY_SALE', 'FLASH_SALE']),
      discountPercentage: z.number()
        .min(0, 'Discount percentage cannot be negative')
        .max(100, 'Discount percentage cannot exceed 100%')
        .optional(),
      buyQuantity: z.number().int().positive('Buy quantity must be positive').optional(),
      getQuantity: z.number().int().positive('Get quantity must be positive').optional(),
      applicableCategories: z.array(z.string()).optional(),
      applicableProducts: z.array(z.string().uuid('Invalid product ID')).optional(),
      validFrom: z.string().or(z.date()),
      validUntil: z.string().or(z.date()),
    })
    
    const schema = partial ? baseSchema.partial() : promotionDataSchema
    const result = schema.parse(data)
    return { isValid: true, errors: [], data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      }
    }
    return { isValid: false, errors: [{ field: 'unknown', message: 'Validation failed', code: 'unknown' }] }
  }
}

export function validateUserInteractionData(data: any): { isValid: boolean; errors: any[]; data?: any } {
  try {
    const result = userInteractionDataSchema.parse(data)
    return { isValid: true, errors: [], data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      }
    }
    return { isValid: false, errors: [{ field: 'unknown', message: 'Validation failed', code: 'unknown' }] }
  }
}