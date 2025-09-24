import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'
import { JwtService, JwtPayload } from './jwt'

export interface AuthenticatedRequest extends NextRequest {
  user?: JwtPayload
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = 'Insufficient permissions') {
    super(message)
    this.name = 'AuthorizationError'
  }
}

/**
 * Extract JWT token from request headers
 */
export function extractTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader) {
    return null
  }

  // Support both "Bearer token" and "token" formats
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  return authHeader
}

/**
 * Authenticate user from JWT token
 */
export function authenticateToken(token: string): JwtPayload {
  if (!token) {
    throw new AuthenticationError('No token provided')
  }

  try {
    return JwtService.verifyAccessToken(token)
  } catch (error) {
    throw new AuthenticationError('Invalid or expired token')
  }
}

/**
 * Middleware to authenticate requests
 */
export function withAuth(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const token = extractTokenFromRequest(request)
      
      if (!token) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      const user = authenticateToken(token)
      
      // Add user to request object
      const authenticatedRequest = request as AuthenticatedRequest
      authenticatedRequest.user = user

      return handler(authenticatedRequest)
    } catch (error) {
      if (error instanceof AuthenticationError) {
        return NextResponse.json(
          { error: error.message },
          { status: 401 }
        )
      }

      console.error('Authentication middleware error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * Middleware to check user roles
 */
export function withRole(
  allowedRoles: UserRole[],
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withAuth(async (request: AuthenticatedRequest): Promise<NextResponse> => {
    try {
      const user = request.user!
      
      if (!allowedRoles.includes(user.role)) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }

      return handler(request)
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        )
      }

      console.error('Authorization middleware error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}

/**
 * Middleware for admin-only routes
 */
export function withAdmin(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withRole([UserRole.ADMIN], handler)
}

/**
 * Middleware for craftsman-only routes
 */
export function withCraftsman(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withRole([UserRole.CRAFTSMAN, UserRole.ADMIN], handler)
}

/**
 * Check if user owns resource or is admin
 */
export function checkResourceOwnership(
  user: JwtPayload,
  resourceUserId: string
): boolean {
  return user.role === UserRole.ADMIN || user.userId === resourceUserId
}

/**
 * Middleware to check resource ownership
 */
export function withOwnership(
  getResourceUserId: (request: AuthenticatedRequest) => Promise<string>,
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withAuth(async (request: AuthenticatedRequest): Promise<NextResponse> => {
    try {
      const user = request.user!
      const resourceUserId = await getResourceUserId(request)
      
      if (!checkResourceOwnership(user, resourceUserId)) {
        return NextResponse.json(
          { error: 'Access denied: You can only access your own resources' },
          { status: 403 }
        )
      }

      return handler(request)
    } catch (error) {
      console.error('Ownership middleware error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}