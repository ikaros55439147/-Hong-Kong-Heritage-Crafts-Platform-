import { 
  User, 
  CraftsmanProfile, 
  Course, 
  Booking, 
  Product, 
  Order, 
  OrderItem, 
  MediaFile, 
  Follow,
  Notification,
  NotificationPreference,
  Comment,
  Like,
  Report,
  Event,
  EventRegistration,
  LearningMaterial,
  LearningProgress,
  Coupon,
  Promotion,
  ProductReview,
  ReviewHelpfulness,
  InventoryAlert,
  UserProductInteraction,
  ProductRecommendation,
  UserRole,
  VerificationStatus,
  CourseStatus,
  BookingStatus,
  ProductStatus,
  OrderStatus,
  PaymentStatus,
  LearningMaterialType,
  NotificationType,
  EntityType,
  ReportStatus,
  EventType,
  EventStatus,
  EventRegistrationStatus,
  DiscountType,
  PromotionType,
  AlertType,
  InteractionType,
  RecommendationType
} from '@prisma/client'
import { Prisma } from '@prisma/client'

// Re-export Prisma types
export type {
  User,
  CraftsmanProfile,
  Course,
  Booking,
  Product,
  Order,
  OrderItem,
  MediaFile,
  Follow,
  Notification,
  NotificationPreference,
  Comment,
  Like,
  Report,
  Event,
  EventRegistration,
  LearningMaterial,
  LearningProgress,
  Coupon,
  Promotion,
  ProductReview,
  ReviewHelpfulness,
  InventoryAlert,
  UserProductInteraction,
  ProductRecommendation,
  UserRole,
  VerificationStatus,
  CourseStatus,
  BookingStatus,
  ProductStatus,
  OrderStatus,
  PaymentStatus,
  LearningMaterialType,
  NotificationType,
  EntityType,
  ReportStatus,
  EventType,
  EventStatus,
  EventRegistrationStatus,
  DiscountType,
  PromotionType,
  AlertType,
  InteractionType,
  RecommendationType
}

// Common types for the application
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginationParams {
  page?: number
  limit?: number
}

export interface PaginationResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface SearchParams {
  query?: string
  category?: string
  language?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// Multi-language content type - compatible with Prisma JSON
export interface MultiLanguageContent extends Record<string, string | undefined> {
  'zh-HK'?: string
  'zh-CN'?: string
  en?: string
}

// Type alias for Prisma JSON compatibility
export type MultiLanguageContentInput = Prisma.InputJsonValue

// User types
export interface UserProfile {
  id: string
  email: string
  role: UserRole
  preferredLanguage: string
  createdAt: Date
  updatedAt: Date
}

export interface UserRegistrationData {
  email: string
  password: string
  role?: UserRole
  preferredLanguage?: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthResult {
  user: UserProfile
  token: string
  refreshToken?: string
}

// Craftsman types
export interface CraftsmanProfileData {
  craftSpecialties: string[]
  bio?: MultiLanguageContent
  experienceYears?: number
  workshopLocation?: string
  contactInfo?: ContactInfo
}

// Craftsman input type for Prisma operations
export interface CraftsmanProfileCreateInput {
  craftSpecialties: string[]
  bio?: MultiLanguageContentInput
  experienceYears?: number
  workshopLocation?: string
  contactInfo?: Prisma.InputJsonValue
}

export interface CraftsmanProfileUpdateInput {
  craftSpecialties?: string[]
  bio?: MultiLanguageContentInput
  experienceYears?: number
  workshopLocation?: string
  contactInfo?: Prisma.InputJsonValue
}

export interface ContactInfo {
  phone?: string
  whatsapp?: string
  wechat?: string
  email?: string
  website?: string
}

export interface CraftsmanProfileWithUser extends CraftsmanProfile {
  user: User
}

// Course types
export interface CourseData {
  title: MultiLanguageContent
  description?: MultiLanguageContent
  craftCategory: string
  maxParticipants?: number
  durationHours?: number
  price?: number
  status?: CourseStatus
}

// Course input type for Prisma operations
export interface CourseCreateInput {
  title: MultiLanguageContentInput
  description?: MultiLanguageContentInput
  craftCategory: string
  maxParticipants?: number
  durationHours?: number
  price?: number
  status?: CourseStatus
}

export interface CourseUpdateInput {
  title?: MultiLanguageContentInput
  description?: MultiLanguageContentInput
  craftCategory?: string
  maxParticipants?: number
  durationHours?: number
  price?: number
  status?: CourseStatus
}

export interface CourseWithCraftsman extends Course {
  craftsman: CraftsmanProfileWithUser
}

export interface BookingData {
  notes?: string
}

export interface BookingWithDetails extends Booking {
  user: User
  course: CourseWithCraftsman
}

// Product types
export interface ProductData {
  name: MultiLanguageContent
  description?: MultiLanguageContent
  price: number
  inventoryQuantity?: number
  isCustomizable?: boolean
  craftCategory: string
  status?: ProductStatus
}

// Product input type for Prisma operations
export interface ProductCreateInput {
  name: MultiLanguageContentInput
  description?: MultiLanguageContentInput
  price: number
  inventoryQuantity?: number
  isCustomizable?: boolean
  craftCategory: string
  status?: ProductStatus
}

export interface ProductUpdateInput {
  name?: MultiLanguageContentInput
  description?: MultiLanguageContentInput
  price?: number
  inventoryQuantity?: number
  isCustomizable?: boolean
  craftCategory?: string
  status?: ProductStatus
}

export interface ProductWithCraftsman extends Product {
  craftsman: CraftsmanProfileWithUser
}

// Prisma include types for better type safety
export type ProductWithCraftsmanInclude = Prisma.ProductGetPayload<{
  include: {
    craftsman: {
      include: {
        user: true
      }
    }
  }
}>

export type CourseWithCraftsmanInclude = Prisma.CourseGetPayload<{
  include: {
    craftsman: {
      include: {
        user: true
      }
    }
  }
}>

export type BookingWithDetailsInclude = Prisma.BookingGetPayload<{
  include: {
    user: true
    course: {
      include: {
        craftsman: {
          include: {
            user: true
          }
        }
      }
    }
  }
}>

export type OrderWithDetailsInclude = Prisma.OrderGetPayload<{
  include: {
    user: true
    orderItems: {
      include: {
        product: {
          include: {
            craftsman: {
              include: {
                user: true
              }
            }
          }
        }
      }
    }
  }
}>

// Order types
export interface OrderData {
  items: OrderItemData[]
  shippingAddress: ShippingAddress
}

export interface OrderItemData {
  productId: string
  quantity: number
  customizationNotes?: string
}

export interface ShippingAddress {
  recipientName: string
  phone: string
  addressLine1: string
  addressLine2?: string
  city: string
  district: string
  postalCode?: string
  country: string
}

export interface OrderWithDetails extends Order {
  user: User
  orderItems: (OrderItem & {
    product: ProductWithCraftsman
  })[]
}

// Payment types
export interface PaymentData {
  method: 'stripe' | 'paypal' | 'alipay' | 'wechat_pay'
  amount: number
  currency: string
  metadata?: Record<string, any>
}

export interface PaymentResult {
  success: boolean
  transactionId?: string
  error?: string
}

// Media types
export interface MediaMetadata {
  title?: string
  description?: string
  tags?: string[]
  category?: string
  language?: string
}

export interface MediaUploadData {
  file: File
  metadata?: MediaMetadata
}

// Search types
export interface SearchQuery {
  query: string
  filters?: SearchFilters
  pagination?: PaginationParams
  sort?: SortOptions
}

export interface SearchFilters {
  category?: string[]
  priceRange?: {
    min?: number
    max?: number
  }
  location?: string
  language?: string
  craftsman?: string
  availability?: boolean
}

export interface SortOptions {
  field: string
  order: 'asc' | 'desc'
}

export interface SearchResult<T> {
  items: T[]
  total: number
  facets?: SearchFacets
}

export interface SearchFacets {
  categories: { name: string; count: number }[]
  priceRanges: { range: string; count: number }[]
  locations: { name: string; count: number }[]
}

// Learning material types
export interface LearningMaterialData {
  title: MultiLanguageContent
  description?: MultiLanguageContent
  type: LearningMaterialType
  content?: LearningMaterialContent
  mediaFileId?: string
  orderIndex?: number
  isRequired?: boolean
}

// Learning material input type for Prisma operations
export interface LearningMaterialCreateInput {
  title: MultiLanguageContentInput
  description?: MultiLanguageContentInput
  type: LearningMaterialType
  content?: Prisma.InputJsonValue
  mediaFileId?: string
  orderIndex?: number
  isRequired?: boolean
}

export interface LearningMaterialUpdateInput {
  title?: MultiLanguageContentInput
  description?: MultiLanguageContentInput
  type?: LearningMaterialType
  content?: Prisma.InputJsonValue
  mediaFileId?: string
  orderIndex?: number
  isRequired?: boolean
}

export interface LearningMaterialContent {
  // For STEP_BY_STEP type
  steps?: {
    title: MultiLanguageContent
    description: MultiLanguageContent
    imageUrl?: string
    videoUrl?: string
    orderIndex: number
  }[]
  
  // For DOCUMENT type
  text?: MultiLanguageContent
  
  // For QUIZ type
  questions?: {
    question: MultiLanguageContent
    options: MultiLanguageContent[]
    correctAnswer: number
    explanation?: MultiLanguageContent
  }[]
  
  // For ASSIGNMENT type
  instructions?: MultiLanguageContent
  submissionFormat?: string
  maxScore?: number
  
  // Generic metadata
  duration?: number // in minutes
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  tags?: string[]
}

export interface LearningMaterialWithMedia extends LearningMaterial {
  mediaFile?: MediaFile
}

export interface LearningProgressData {
  completed: boolean
  notes?: string
}

export interface LearningProgressWithMaterial extends LearningProgress {
  learningMaterial: LearningMaterialWithMedia
}

export interface CourseProgress {
  courseId: string
  totalMaterials: number
  completedMaterials: number
  progressPercentage: number
  lastAccessedAt?: Date
  materials: LearningProgressWithMaterial[]
}

// Follow and Activity types
export interface FollowData {
  followingId: string
}

export interface ActivityFeedItem {
  id: string
  type: 'new_course' | 'new_product' | 'profile_update' | 'new_follower'
  userId: string
  user: User
  title: string
  description?: string
  metadata?: Record<string, any>
  createdAt: Date
}

// Notification types
export interface NotificationData {
  type: NotificationType
  title: MultiLanguageContent
  message: MultiLanguageContent
  metadata?: Record<string, any>
}

// Notification input type for Prisma operations
export interface NotificationCreateInput {
  type: NotificationType
  title: MultiLanguageContentInput
  message: MultiLanguageContentInput
  metadata?: Prisma.InputJsonValue
}

export interface NotificationPreferenceData {
  emailNotifications?: boolean
  pushNotifications?: boolean
  newFollowerNotify?: boolean
  courseUpdateNotify?: boolean
  productUpdateNotify?: boolean
  orderStatusNotify?: boolean
}

// Comment and interaction types
export interface CommentData {
  content: string
  parentId?: string
}

export interface CommentWithDetails extends Comment {
  user: User
  replies?: CommentWithDetails[]
  likesCount: number
  isLikedByUser?: boolean
  repliesCount: number
}

export interface ReportData {
  reason: string
  description?: string
}

export interface ReportWithDetails extends Report {
  reporter: User
  reviewer?: User
  comment?: Comment & { user: User }
}

// Event types
export interface EventData {
  title: MultiLanguageContent
  description?: MultiLanguageContent
  eventType: EventType
  category: string
  startDateTime: Date
  endDateTime: Date
  timezone?: string
  location?: EventLocation
  maxParticipants?: number
  registrationFee?: number
  isPublic?: boolean
  tags?: string[]
  requirements?: MultiLanguageContent
  materials?: EventMaterial[]
}

// Event input type for Prisma operations
export interface EventCreateInput {
  title: MultiLanguageContentInput
  description?: MultiLanguageContentInput
  eventType: EventType
  category: string
  startDateTime: Date
  endDateTime: Date
  timezone?: string
  location?: Prisma.InputJsonValue
  maxParticipants?: number
  registrationFee?: number
  isPublic?: boolean
  tags?: string[]
  requirements?: MultiLanguageContentInput
  materials?: Prisma.InputJsonValue
}

export interface EventLocation {
  type: 'physical' | 'virtual' | 'hybrid'
  address?: string
  venue?: string
  city?: string
  district?: string
  virtualUrl?: string
  virtualPlatform?: string
  instructions?: MultiLanguageContent
}

export interface EventMaterial {
  name: MultiLanguageContent
  description?: MultiLanguageContent
  isRequired: boolean
  providedByOrganizer: boolean
  estimatedCost?: number
}

export interface EventWithDetails extends Event {
  organizer: User
  registrations?: EventRegistrationWithUser[]
  registrationCount: number
  isRegistered?: boolean
  userRegistration?: EventRegistration
}

export interface EventRegistrationWithUser extends EventRegistration {
  user: User
}

export interface EventRegistrationData {
  notes?: string
}

export interface EventSearchFilters {
  eventType?: EventType[]
  category?: string[]
  startDate?: Date
  endDate?: Date
  location?: string
  priceRange?: {
    min?: number
    max?: number
  }
  tags?: string[]
  status?: EventStatus[]
}

// Validation error types
export interface ValidationError {
  field: string
  message: string
  code: string
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  data?: any
}// E-commerce Enhancement Types

// Coupon types
export interface CouponData {
  code: string
  name: MultiLanguageContent
  description?: MultiLanguageContent
  discountType: DiscountType
  discountValue: number
  minimumOrderAmount?: number
  maximumDiscountAmount?: number
  usageLimit?: number
  validFrom: string | Date
  validUntil: string | Date
  applicableCategories?: string[]
  applicableCraftsmen?: string[]
}

// Coupon input type for Prisma operations
export interface CouponCreateInput {
  code: string
  name: MultiLanguageContentInput
  description?: MultiLanguageContentInput
  discountType: DiscountType
  discountValue: number
  minimumOrderAmount?: number
  maximumDiscountAmount?: number
  usageLimit?: number
  validFrom: Date
  validUntil: Date
  applicableCategories?: string[]
  applicableCraftsmen?: string[]
}

export interface CouponWithUsage extends Coupon {
  creator?: User
  orders: Order[]
}

// Product Review types
export interface ProductReviewData {
  productId: string
  orderId?: string
  rating: number
  title?: string
  comment?: string
  images?: string[]
}

export interface ProductReviewWithDetails extends ProductReview {
  user: {
    id: string
    email: string
    role: UserRole
  }
  product: ProductWithCraftsman
  order?: Order
  helpfulnessVotes: ReviewHelpfulness[]
}

// Inventory Alert types
export interface InventoryAlertData {
  productId: string
  craftsmanId: string
  alertType: AlertType
  thresholdQuantity?: number
  currentQuantity: number
}

export interface InventoryAlertWithDetails extends InventoryAlert {
  product: ProductWithCraftsman
  craftsman: CraftsmanProfile & {
    user: User
  }
}

// Product Recommendation types
export interface ProductRecommendationData {
  userId?: string
  productId: string
  recommendedProductId: string
  recommendationType: RecommendationType
  score?: number
}

export interface ProductRecommendationWithDetails extends ProductRecommendation {
  user?: User
  product: ProductWithCraftsman
  recommendedProduct: ProductWithCraftsman
}

// Enhanced Product types with reviews and ratings
export interface ProductWithReviews extends ProductWithCraftsman {
  reviews: ProductReviewWithDetails[]
  reviewStats: {
    totalReviews: number
    averageRating: number
    ratingDistribution: { rating: number; count: number }[]
    verifiedPurchaseCount: number
  }
}

// Promotion types
export interface PromotionData {
  name: MultiLanguageContent
  description?: MultiLanguageContent
  promotionType: PromotionType
  discountPercentage?: number
  buyQuantity?: number
  getQuantity?: number
  applicableCategories?: string[]
  applicableProducts?: string[]
  validFrom: string | Date
  validUntil: string | Date
}

// Promotion input type for Prisma operations
export interface PromotionCreateInput {
  name: MultiLanguageContentInput
  description?: MultiLanguageContentInput
  promotionType: PromotionType
  discountPercentage?: number
  buyQuantity?: number
  getQuantity?: number
  applicableCategories?: string[]
  validFrom: Date
  validUntil: Date
}

export interface PromotionWithDetails extends Promotion {
  creator?: User
  promotionProducts: {
    id: string
    product: ProductWithCraftsman
  }[]
}

// Cross-sell and recommendation types
export interface CrossSellRecommendation {
  products: ProductWithCraftsman[]
  reason: string
  confidence: number
}

export interface RecommendationSection {
  title: string
  products: ProductWithCraftsman[]
  type: RecommendationType
}

// Enhanced order types with coupons and promotions
export interface OrderWithDiscounts extends OrderWithDetails {
  coupon?: CouponWithUsage
  appliedPromotions?: PromotionWithDetails[]
  originalAmount: number
  totalDiscount: number
}

// Analytics and statistics types
export interface EcommerceAnalytics {
  totalRevenue: number
  totalOrders: number
  averageOrderValue: number
  topSellingProducts: {
    product: ProductWithCraftsman
    totalSold: number
    revenue: number
  }[]
  couponUsage: {
    totalCouponsUsed: number
    totalDiscountGiven: number
    topCoupons: {
      coupon: CouponWithUsage
      usageCount: number
      totalDiscount: number
    }[]
  }
  reviewMetrics: {
    totalReviews: number
    averageRating: number
    reviewsThisMonth: number
  }
}

// Inventory management types
export interface InventoryStatus {
  productId: string
  productName: MultiLanguageContent
  currentStock: number
  lowStockThreshold: number
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  lastRestocked?: Date
  averageSalesPerWeek: number
  estimatedStockoutDate?: Date
}

export interface RestockRecommendation {
  productId: string
  productName: MultiLanguageContent
  currentStock: number
  recommendedQuantity: number
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  reason: string
}