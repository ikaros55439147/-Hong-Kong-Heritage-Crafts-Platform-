// JWT utilities
export { JwtService, type JwtPayload, type TokenPair } from './jwt'

// Password utilities
export { PasswordService } from './password'

// Authentication service
export { AuthService } from './auth.service'

// Middleware
export {
  withAuth,
  withRole,
  withAdmin,
  withCraftsman,
  withOwnership,
  extractTokenFromRequest,
  authenticateToken,
  checkResourceOwnership,
  AuthenticationError,
  AuthorizationError,
  type AuthenticatedRequest
} from './middleware'

// Permission system
export {
  Permission,
  PermissionService
} from './permissions'

// Permission middleware
export {
  withPermission,
  withResourcePermission,
  withCraftsmanPermission,
  withAdminPermission,
  withModerationPermission,
  createPermissionChecker
} from './permission-middleware'