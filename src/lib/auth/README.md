# Authentication and Authorization System

This directory contains a comprehensive authentication and authorization system for the Hong Kong Heritage Crafts Platform.

## Features

- **JWT-based Authentication**: Secure token-based authentication with access and refresh tokens
- **Password Security**: Strong password hashing with bcrypt and password strength validation
- **Role-based Access Control**: Granular permission system with three user roles (Learner, Craftsman, Admin)
- **Middleware Protection**: Easy-to-use middleware for protecting API routes
- **Comprehensive Testing**: Full test coverage for all authentication components

## Components

### 1. JWT Service (`jwt.ts`)
Handles JWT token generation, verification, and management.

```typescript
import { JwtService } from '@/lib/auth'

// Generate tokens
const tokens = JwtService.generateTokenPair({
  userId: 'user-123',
  email: 'user@example.com',
  role: UserRole.LEARNER
})

// Verify token
const payload = JwtService.verifyAccessToken(token)
```

### 2. Password Service (`password.ts`)
Manages password hashing, verification, and strength validation.

```typescript
import { PasswordService } from '@/lib/auth'

// Hash password
const hash = await PasswordService.hashPassword('MyPassword123!')

// Verify password
const isValid = await PasswordService.verifyPassword('MyPassword123!', hash)

// Validate password strength
const validation = PasswordService.validatePasswordStrength('MyPassword123!')
```

### 3. Authentication Service (`auth.service.ts`)
Core service for user registration, login, and profile management.

```typescript
import { AuthService } from '@/lib/auth'

const authService = new AuthService(prisma)

// Register user
const result = await authService.registerUser({
  email: 'user@example.com',
  password: 'MyPassword123!',
  role: UserRole.LEARNER
})

// Login user
const loginResult = await authService.loginUser({
  email: 'user@example.com',
  password: 'MyPassword123!'
})
```

### 4. Middleware (`middleware.ts`)
Provides authentication and authorization middleware for API routes.

```typescript
import { withAuth, withRole, withAdmin } from '@/lib/auth'

// Basic authentication
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  const userId = request.user!.userId
  // Handle authenticated request
})

// Role-based protection
export const POST = withRole([UserRole.CRAFTSMAN], async (request) => {
  // Only craftsmen can access this endpoint
})

// Admin-only protection
export const DELETE = withAdmin(async (request) => {
  // Only admins can access this endpoint
})
```

### 5. Permission System (`permissions.ts`)
Granular permission system for fine-grained access control.

```typescript
import { Permission, PermissionService } from '@/lib/auth'

// Check if user has permission
const canCreate = PermissionService.hasPermission(
  UserRole.CRAFTSMAN,
  Permission.CREATE_COURSE
)

// Check resource ownership
const canAccess = PermissionService.canAccessResource(
  userRole,
  userId,
  resourceUserId,
  Permission.READ_OWN_PROFILE,
  Permission.READ_ANY_PROFILE
)
```

## API Endpoints

### Authentication Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/profile` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/change-password` - Change password

### Example Usage

```typescript
// Register a new user
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'craftsman@example.com',
    password: 'SecurePassword123!',
    role: 'CRAFTSMAN'
  })
})

// Login
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'craftsman@example.com',
    password: 'SecurePassword123!'
  })
})

const { data } = await loginResponse.json()
const { token, refreshToken } = data

// Use token for authenticated requests
const profileResponse = await fetch('/api/auth/profile', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

## User Roles and Permissions

### Learner
- View content (courses, products, craftsman profiles)
- Make bookings and orders
- Manage own profile
- Follow craftsmen
- Upload and manage own media

### Craftsman
- All learner permissions
- Create and manage craftsman profile
- Create and manage courses
- Create and manage products
- Manage course bookings
- Process payments for own products

### Admin
- All permissions
- User management
- Content moderation
- System administration
- Analytics and reporting

## Environment Variables

Add these to your `.env` file:

```env
JWT_SECRET="your-jwt-secret-key-here-make-it-long-and-secure"
JWT_REFRESH_SECRET="your-jwt-refresh-secret-key-here-make-it-different"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
```

## Testing

Run the authentication tests:

```bash
npm run test:run src/lib/auth/__tests__
```

The test suite includes:
- Password hashing and verification
- JWT token generation and validation
- Permission system validation
- Authentication service functionality
- All edge cases and error conditions

## Security Considerations

1. **Strong Password Requirements**: Enforced password complexity rules
2. **Secure Token Storage**: Use secure HTTP-only cookies in production
3. **Token Expiration**: Short-lived access tokens with refresh mechanism
4. **Rate Limiting**: Implement rate limiting on authentication endpoints
5. **HTTPS Only**: Always use HTTPS in production
6. **Environment Variables**: Keep secrets in environment variables, not code

## Integration with Frontend

For frontend integration, consider using a state management solution to handle authentication state:

```typescript
// Example with React context
const AuthContext = createContext<{
  user: UserProfile | null
  token: string | null
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
}>()

// Usage in components
const { user, token } = useContext(AuthContext)

// Protected route component
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user } = useContext(AuthContext)
  
  if (!user) return <LoginPage />
  if (requiredRole && user.role !== requiredRole) return <UnauthorizedPage />
  
  return children
}
```

This authentication system provides a solid foundation for secure user management in the Hong Kong Heritage Crafts Platform.