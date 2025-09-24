import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from './jwt'
import { PermissionService, Permission } from './permissions'
import { UserRole } from '@prisma/client'

export interface AdminUser {
  id: string
  email: string
  role: UserRole
}

/**
 * Middleware to verify admin authentication and permissions
 */
export async function verifyAdminAuth(
  request: NextRequest,
  requiredPermissions: Permission[] = []
): Promise<{ user: AdminUser; error?: never } | { user?: never; error: string }> {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { error: 'Missing or invalid authorization header' }
    }

    const token = authHeader.substring(7)
    const payload = await verifyToken(token)
    
    if (!payload || !payload.userId) {
      return { error: 'Invalid token' }
    }

    // Check if user has admin role
    if (payload.role !== UserRole.ADMIN) {
      return { error: 'Admin access required' }
    }

    // Check specific permissions if provided
    if (requiredPermissions.length > 0) {
      const hasPermissions = PermissionService.hasAllPermissions(
        payload.role,
        requiredPermissions
      )
      
      if (!hasPermissions) {
        return { error: 'Insufficient permissions' }
      }
    }

    return {
      user: {
        id: payload.userId,
        email: payload.email,
        role: payload.role
      }
    }
  } catch (error) {
    console.error('Admin auth verification error:', error)
    return { error: 'Authentication failed' }
  }
}

/**
 * Create admin middleware for API routes
 */
export function createAdminMiddleware(requiredPermissions: Permission[] = []) {
  return async (request: NextRequest) => {
    const authResult = await verifyAdminAuth(request, requiredPermissions)
    
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      )
    }

    // Add user info to request headers for downstream handlers
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-admin-user-id', authResult.user.id)
    requestHeaders.set('x-admin-user-email', authResult.user.email)
    requestHeaders.set('x-admin-user-role', authResult.user.role)

    return NextResponse.next({
      request: {
        headers: requestHeaders
      }
    })
  }
}

/**
 * Extract admin user from request headers (after middleware)
 */
export function getAdminUserFromHeaders(request: NextRequest): AdminUser | null {
  const userId = request.headers.get('x-admin-user-id')
  const email = request.headers.get('x-admin-user-email')
  const role = request.headers.get('x-admin-user-role') as UserRole

  if (!userId || !email || !role) {
    return null
  }

  return { id: userId, email, role }
}