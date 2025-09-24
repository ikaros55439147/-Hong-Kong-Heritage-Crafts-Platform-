import { UserRole } from '@prisma/client'

export enum Permission {
  // User management
  READ_USERS = 'read:users',
  WRITE_USERS = 'write:users',
  DELETE_USERS = 'delete:users',
  
  // Profile management
  READ_OWN_PROFILE = 'read:own_profile',
  WRITE_OWN_PROFILE = 'write:own_profile',
  READ_ANY_PROFILE = 'read:any_profile',
  WRITE_ANY_PROFILE = 'write:any_profile',
  
  // Craftsman profiles
  CREATE_CRAFTSMAN_PROFILE = 'create:craftsman_profile',
  READ_CRAFTSMAN_PROFILES = 'read:craftsman_profiles',
  WRITE_OWN_CRAFTSMAN_PROFILE = 'write:own_craftsman_profile',
  WRITE_ANY_CRAFTSMAN_PROFILE = 'write:any_craftsman_profile',
  VERIFY_CRAFTSMAN = 'verify:craftsman',
  
  // Courses
  CREATE_COURSE = 'create:course',
  READ_COURSES = 'read:courses',
  WRITE_OWN_COURSE = 'write:own_course',
  WRITE_ANY_COURSE = 'write:any_course',
  DELETE_OWN_COURSE = 'delete:own_course',
  DELETE_ANY_COURSE = 'delete:any_course',
  
  // Bookings
  CREATE_BOOKING = 'create:booking',
  READ_OWN_BOOKINGS = 'read:own_bookings',
  READ_ANY_BOOKINGS = 'read:any_bookings',
  MANAGE_COURSE_BOOKINGS = 'manage:course_bookings',
  CANCEL_OWN_BOOKING = 'cancel:own_booking',
  CANCEL_ANY_BOOKING = 'cancel:any_booking',
  
  // Products
  CREATE_PRODUCT = 'create:product',
  READ_PRODUCTS = 'read:products',
  WRITE_OWN_PRODUCT = 'write:own_product',
  WRITE_ANY_PRODUCT = 'write:any_product',
  DELETE_OWN_PRODUCT = 'delete:own_product',
  DELETE_ANY_PRODUCT = 'delete:any_product',
  
  // Orders
  CREATE_ORDER = 'create:order',
  READ_OWN_ORDERS = 'read:own_orders',
  READ_ANY_ORDERS = 'read:any_orders',
  MANAGE_PRODUCT_ORDERS = 'manage:product_orders',
  PROCESS_PAYMENTS = 'process:payments',
  
  // Media
  UPLOAD_MEDIA = 'upload:media',
  READ_MEDIA = 'read:media',
  DELETE_OWN_MEDIA = 'delete:own_media',
  DELETE_ANY_MEDIA = 'delete:any_media',
  
  // Social features
  FOLLOW_USERS = 'follow:users',
  CREATE_COMMENTS = 'create:comments',
  MODERATE_CONTENT = 'moderate:content',
  
  // Admin features
  VIEW_ANALYTICS = 'view:analytics',
  MANAGE_SYSTEM = 'manage:system',
  EXPORT_DATA = 'export:data',
}

// Define learner permissions first
const LEARNER_PERMISSIONS: Permission[] = [
  // Profile management
  Permission.READ_OWN_PROFILE,
  Permission.WRITE_OWN_PROFILE,
  
  // Viewing content
  Permission.READ_CRAFTSMAN_PROFILES,
  Permission.READ_COURSES,
  Permission.READ_PRODUCTS,
  Permission.READ_MEDIA,
  
  // Bookings and orders
  Permission.CREATE_BOOKING,
  Permission.READ_OWN_BOOKINGS,
  Permission.CANCEL_OWN_BOOKING,
  Permission.CREATE_ORDER,
  Permission.READ_OWN_ORDERS,
  
  // Social features
  Permission.FOLLOW_USERS,
  Permission.CREATE_COMMENTS,
  
  // Media
  Permission.UPLOAD_MEDIA,
  Permission.DELETE_OWN_MEDIA,
]

// Define craftsman permissions (includes learner permissions)
const CRAFTSMAN_PERMISSIONS: Permission[] = [
  // All learner permissions
  ...LEARNER_PERMISSIONS,
  
  // Craftsman profile management
  Permission.CREATE_CRAFTSMAN_PROFILE,
  Permission.WRITE_OWN_CRAFTSMAN_PROFILE,
  
  // Course management
  Permission.CREATE_COURSE,
  Permission.WRITE_OWN_COURSE,
  Permission.DELETE_OWN_COURSE,
  Permission.MANAGE_COURSE_BOOKINGS,
  
  // Product management
  Permission.CREATE_PRODUCT,
  Permission.WRITE_OWN_PRODUCT,
  Permission.DELETE_OWN_PRODUCT,
  Permission.MANAGE_PRODUCT_ORDERS,
  
  // Enhanced permissions
  Permission.READ_ANY_BOOKINGS, // For their own courses
  Permission.PROCESS_PAYMENTS, // For their own products
]

// Role-based permission mapping
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.LEARNER]: LEARNER_PERMISSIONS,
  [UserRole.CRAFTSMAN]: CRAFTSMAN_PERMISSIONS,
  [UserRole.ADMIN]: Object.values(Permission), // All permissions
}

export class PermissionService {
  /**
   * Check if a role has a specific permission
   */
  static hasPermission(role: UserRole, permission: Permission): boolean {
    const rolePermissions = ROLE_PERMISSIONS[role] || []
    return rolePermissions.includes(permission)
  }

  /**
   * Check if a role has any of the specified permissions
   */
  static hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(role, permission))
  }

  /**
   * Check if a role has all of the specified permissions
   */
  static hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(role, permission))
  }

  /**
   * Get all permissions for a role
   */
  static getRolePermissions(role: UserRole): Permission[] {
    return ROLE_PERMISSIONS[role] || []
  }

  /**
   * Check if user can access resource based on ownership
   */
  static canAccessResource(
    userRole: UserRole,
    userId: string,
    resourceUserId: string,
    readPermission: Permission,
    readAnyPermission?: Permission
  ): boolean {
    // Admin can access anything
    if (userRole === UserRole.ADMIN) {
      return true
    }

    // Check if user owns the resource
    if (userId === resourceUserId) {
      return this.hasPermission(userRole, readPermission)
    }

    // Check if user has permission to read any resource
    if (readAnyPermission) {
      return this.hasPermission(userRole, readAnyPermission)
    }

    return false
  }

  /**
   * Check if user can modify resource based on ownership
   */
  static canModifyResource(
    userRole: UserRole,
    userId: string,
    resourceUserId: string,
    writePermission: Permission,
    writeAnyPermission?: Permission
  ): boolean {
    // Admin can modify anything
    if (userRole === UserRole.ADMIN) {
      return true
    }

    // Check if user owns the resource
    if (userId === resourceUserId) {
      return this.hasPermission(userRole, writePermission)
    }

    // Check if user has permission to modify any resource
    if (writeAnyPermission) {
      return this.hasPermission(userRole, writeAnyPermission)
    }

    return false
  }

  /**
   * Validate multiple permissions for a role
   */
  static validatePermissions(
    role: UserRole,
    requiredPermissions: Permission[]
  ): { hasAccess: boolean; missingPermissions: Permission[] } {
    const missingPermissions = requiredPermissions.filter(
      permission => !this.hasPermission(role, permission)
    )

    return {
      hasAccess: missingPermissions.length === 0,
      missingPermissions
    }
  }

  /**
   * Get permission description for UI display
   */
  static getPermissionDescription(permission: Permission): string {
    const descriptions: Record<Permission, string> = {
      [Permission.READ_USERS]: 'View user accounts',
      [Permission.WRITE_USERS]: 'Edit user accounts',
      [Permission.DELETE_USERS]: 'Delete user accounts',
      [Permission.READ_OWN_PROFILE]: 'View own profile',
      [Permission.WRITE_OWN_PROFILE]: 'Edit own profile',
      [Permission.READ_ANY_PROFILE]: 'View any user profile',
      [Permission.WRITE_ANY_PROFILE]: 'Edit any user profile',
      [Permission.CREATE_CRAFTSMAN_PROFILE]: 'Create craftsman profile',
      [Permission.READ_CRAFTSMAN_PROFILES]: 'View craftsman profiles',
      [Permission.WRITE_OWN_CRAFTSMAN_PROFILE]: 'Edit own craftsman profile',
      [Permission.WRITE_ANY_CRAFTSMAN_PROFILE]: 'Edit any craftsman profile',
      [Permission.VERIFY_CRAFTSMAN]: 'Verify craftsman accounts',
      [Permission.CREATE_COURSE]: 'Create courses',
      [Permission.READ_COURSES]: 'View courses',
      [Permission.WRITE_OWN_COURSE]: 'Edit own courses',
      [Permission.WRITE_ANY_COURSE]: 'Edit any course',
      [Permission.DELETE_OWN_COURSE]: 'Delete own courses',
      [Permission.DELETE_ANY_COURSE]: 'Delete any course',
      [Permission.CREATE_BOOKING]: 'Make course bookings',
      [Permission.READ_OWN_BOOKINGS]: 'View own bookings',
      [Permission.READ_ANY_BOOKINGS]: 'View any bookings',
      [Permission.MANAGE_COURSE_BOOKINGS]: 'Manage course bookings',
      [Permission.CANCEL_OWN_BOOKING]: 'Cancel own bookings',
      [Permission.CANCEL_ANY_BOOKING]: 'Cancel any booking',
      [Permission.CREATE_PRODUCT]: 'Create products',
      [Permission.READ_PRODUCTS]: 'View products',
      [Permission.WRITE_OWN_PRODUCT]: 'Edit own products',
      [Permission.WRITE_ANY_PRODUCT]: 'Edit any product',
      [Permission.DELETE_OWN_PRODUCT]: 'Delete own products',
      [Permission.DELETE_ANY_PRODUCT]: 'Delete any product',
      [Permission.CREATE_ORDER]: 'Place orders',
      [Permission.READ_OWN_ORDERS]: 'View own orders',
      [Permission.READ_ANY_ORDERS]: 'View any orders',
      [Permission.MANAGE_PRODUCT_ORDERS]: 'Manage product orders',
      [Permission.PROCESS_PAYMENTS]: 'Process payments',
      [Permission.UPLOAD_MEDIA]: 'Upload media files',
      [Permission.READ_MEDIA]: 'View media files',
      [Permission.DELETE_OWN_MEDIA]: 'Delete own media files',
      [Permission.DELETE_ANY_MEDIA]: 'Delete any media files',
      [Permission.FOLLOW_USERS]: 'Follow other users',
      [Permission.CREATE_COMMENTS]: 'Create comments',
      [Permission.MODERATE_CONTENT]: 'Moderate content',
      [Permission.VIEW_ANALYTICS]: 'View analytics',
      [Permission.MANAGE_SYSTEM]: 'Manage system settings',
      [Permission.EXPORT_DATA]: 'Export data',
    }

    return descriptions[permission] || permission
  }
}