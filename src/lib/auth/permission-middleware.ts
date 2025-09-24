import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'
import { withAuth, AuthenticatedRequest } from './middleware'
import { Permission, PermissionService } from './permissions'

/**
 * Middleware to check specific permissions
 */
export function withPermission(
  requiredPermissions: Permission[],
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withAuth(async (request: AuthenticatedRequest): Promise<NextResponse> => {
    try {
      const user = request.user!
      
      const validation = PermissionService.validatePermissions(
        user.role,
        requiredPermissions
      )

      if (!validation.hasAccess) {
        return NextResponse.json(
          { 
            error: 'Insufficient permissions',
            missingPermissions: validation.missingPermissions
          },
          { status: 403 }
        )
      }

      return handler(request)
    } catch (error) {
      console.error('Permission middleware error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}

/**
 * Middleware to check resource ownership with permissions
 */
export function withResourcePermission(
  getResourceUserId: (request: AuthenticatedRequest) => Promise<string>,
  ownPermission: Permission,
  anyPermission?: Permission
) {
  return withAuth(async (request: AuthenticatedRequest): Promise<NextResponse> => {
    return async (handler: (request: AuthenticatedRequest) => Promise<NextResponse>) => {
      try {
        const user = request.user!
        const resourceUserId = await getResourceUserId(request)
        
        const canAccess = PermissionService.canAccessResource(
          user.role,
          user.userId,
          resourceUserId,
          ownPermission,
          anyPermission
        )

        if (!canAccess) {
          return NextResponse.json(
            { error: 'Access denied: Insufficient permissions for this resource' },
            { status: 403 }
          )
        }

        return handler(request)
      } catch (error) {
        console.error('Resource permission middleware error:', error)
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        )
      }
    }
  })
}

/**
 * Middleware for craftsman-only operations
 */
export function withCraftsmanPermission(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withPermission([Permission.CREATE_CRAFTSMAN_PROFILE], handler)
}

/**
 * Middleware for admin-only operations
 */
export function withAdminPermission(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withPermission([Permission.MANAGE_SYSTEM], handler)
}

/**
 * Middleware for content moderation
 */
export function withModerationPermission(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withPermission([Permission.MODERATE_CONTENT], handler)
}

/**
 * Create a permission checker function for use in components
 */
export function createPermissionChecker(userRole: UserRole, userId: string) {
  return {
    /**
     * Check if user has permission
     */
    hasPermission: (permission: Permission): boolean => {
      return PermissionService.hasPermission(userRole, permission)
    },

    /**
     * Check if user has any of the permissions
     */
    hasAnyPermission: (permissions: Permission[]): boolean => {
      return PermissionService.hasAnyPermission(userRole, permissions)
    },

    /**
     * Check if user has all permissions
     */
    hasAllPermissions: (permissions: Permission[]): boolean => {
      return PermissionService.hasAllPermissions(userRole, permissions)
    },

    /**
     * Check if user can access resource
     */
    canAccessResource: (
      resourceUserId: string,
      readPermission: Permission,
      readAnyPermission?: Permission
    ): boolean => {
      return PermissionService.canAccessResource(
        userRole,
        userId,
        resourceUserId,
        readPermission,
        readAnyPermission
      )
    },

    /**
     * Check if user can modify resource
     */
    canModifyResource: (
      resourceUserId: string,
      writePermission: Permission,
      writeAnyPermission?: Permission
    ): boolean => {
      return PermissionService.canModifyResource(
        userRole,
        userId,
        resourceUserId,
        writePermission,
        writeAnyPermission
      )
    },

    /**
     * Get all permissions for the user's role
     */
    getAllPermissions: (): Permission[] => {
      return PermissionService.getRolePermissions(userRole)
    },

    /**
     * Check if user is admin
     */
    isAdmin: (): boolean => {
      return userRole === UserRole.ADMIN
    },

    /**
     * Check if user is craftsman
     */
    isCraftsman: (): boolean => {
      return userRole === UserRole.CRAFTSMAN
    },

    /**
     * Check if user is learner
     */
    isLearner: (): boolean => {
      return userRole === UserRole.LEARNER
    }
  }
}