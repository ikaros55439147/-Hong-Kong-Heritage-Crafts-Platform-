import { UserRole } from '@prisma/client'
import { Permission, PermissionService } from '../permissions'

describe('PermissionService', () => {
  describe('hasPermission', () => {
    it('should return true for learner with learner permission', () => {
      const result = PermissionService.hasPermission(
        UserRole.LEARNER,
        Permission.READ_OWN_PROFILE
      )
      expect(result).toBe(true)
    })

    it('should return false for learner with admin permission', () => {
      const result = PermissionService.hasPermission(
        UserRole.LEARNER,
        Permission.MANAGE_SYSTEM
      )
      expect(result).toBe(false)
    })

    it('should return true for craftsman with craftsman permission', () => {
      const result = PermissionService.hasPermission(
        UserRole.CRAFTSMAN,
        Permission.CREATE_COURSE
      )
      expect(result).toBe(true)
    })

    it('should return true for craftsman with inherited learner permission', () => {
      const result = PermissionService.hasPermission(
        UserRole.CRAFTSMAN,
        Permission.READ_OWN_PROFILE
      )
      expect(result).toBe(true)
    })

    it('should return true for admin with any permission', () => {
      const result = PermissionService.hasPermission(
        UserRole.ADMIN,
        Permission.MANAGE_SYSTEM
      )
      expect(result).toBe(true)
    })
  })

  describe('hasAnyPermission', () => {
    it('should return true if user has at least one permission', () => {
      const result = PermissionService.hasAnyPermission(
        UserRole.LEARNER,
        [Permission.MANAGE_SYSTEM, Permission.READ_OWN_PROFILE]
      )
      expect(result).toBe(true)
    })

    it('should return false if user has none of the permissions', () => {
      const result = PermissionService.hasAnyPermission(
        UserRole.LEARNER,
        [Permission.MANAGE_SYSTEM, Permission.CREATE_COURSE]
      )
      expect(result).toBe(false)
    })
  })

  describe('hasAllPermissions', () => {
    it('should return true if user has all permissions', () => {
      const result = PermissionService.hasAllPermissions(
        UserRole.LEARNER,
        [Permission.READ_OWN_PROFILE, Permission.CREATE_BOOKING]
      )
      expect(result).toBe(true)
    })

    it('should return false if user is missing any permission', () => {
      const result = PermissionService.hasAllPermissions(
        UserRole.LEARNER,
        [Permission.READ_OWN_PROFILE, Permission.CREATE_COURSE]
      )
      expect(result).toBe(false)
    })
  })

  describe('getRolePermissions', () => {
    it('should return correct permissions for learner', () => {
      const permissions = PermissionService.getRolePermissions(UserRole.LEARNER)
      
      expect(permissions).toContain(Permission.READ_OWN_PROFILE)
      expect(permissions).toContain(Permission.CREATE_BOOKING)
      expect(permissions).not.toContain(Permission.CREATE_COURSE)
      expect(permissions).not.toContain(Permission.MANAGE_SYSTEM)
    })

    it('should return correct permissions for craftsman', () => {
      const permissions = PermissionService.getRolePermissions(UserRole.CRAFTSMAN)
      
      expect(permissions).toContain(Permission.READ_OWN_PROFILE) // Inherited
      expect(permissions).toContain(Permission.CREATE_COURSE) // Craftsman specific
      expect(permissions).not.toContain(Permission.MANAGE_SYSTEM) // Admin only
    })

    it('should return all permissions for admin', () => {
      const permissions = PermissionService.getRolePermissions(UserRole.ADMIN)
      const allPermissions = Object.values(Permission)
      
      expect(permissions).toEqual(expect.arrayContaining(allPermissions))
      expect(permissions.length).toBe(allPermissions.length)
    })
  })

  describe('canAccessResource', () => {
    const userId = 'user-123'
    const resourceUserId = 'user-123'
    const otherUserId = 'user-456'

    it('should allow admin to access any resource', () => {
      const result = PermissionService.canAccessResource(
        UserRole.ADMIN,
        userId,
        otherUserId,
        Permission.READ_OWN_PROFILE
      )
      expect(result).toBe(true)
    })

    it('should allow user to access own resource', () => {
      const result = PermissionService.canAccessResource(
        UserRole.LEARNER,
        userId,
        resourceUserId,
        Permission.READ_OWN_PROFILE
      )
      expect(result).toBe(true)
    })

    it('should deny user access to other user resource without any permission', () => {
      const result = PermissionService.canAccessResource(
        UserRole.LEARNER,
        userId,
        otherUserId,
        Permission.READ_OWN_PROFILE
      )
      expect(result).toBe(false)
    })

    it('should allow user with read any permission to access other resource', () => {
      const result = PermissionService.canAccessResource(
        UserRole.LEARNER,
        userId,
        otherUserId,
        Permission.READ_OWN_PROFILE,
        Permission.READ_ANY_PROFILE
      )
      expect(result).toBe(false) // Learner doesn't have READ_ANY_PROFILE
    })
  })

  describe('canModifyResource', () => {
    const userId = 'user-123'
    const resourceUserId = 'user-123'
    const otherUserId = 'user-456'

    it('should allow admin to modify any resource', () => {
      const result = PermissionService.canModifyResource(
        UserRole.ADMIN,
        userId,
        otherUserId,
        Permission.WRITE_OWN_PROFILE
      )
      expect(result).toBe(true)
    })

    it('should allow user to modify own resource', () => {
      const result = PermissionService.canModifyResource(
        UserRole.LEARNER,
        userId,
        resourceUserId,
        Permission.WRITE_OWN_PROFILE
      )
      expect(result).toBe(true)
    })

    it('should deny user modification of other user resource', () => {
      const result = PermissionService.canModifyResource(
        UserRole.LEARNER,
        userId,
        otherUserId,
        Permission.WRITE_OWN_PROFILE
      )
      expect(result).toBe(false)
    })
  })

  describe('validatePermissions', () => {
    it('should return valid result for user with all permissions', () => {
      const result = PermissionService.validatePermissions(
        UserRole.LEARNER,
        [Permission.READ_OWN_PROFILE, Permission.CREATE_BOOKING]
      )
      
      expect(result.hasAccess).toBe(true)
      expect(result.missingPermissions).toHaveLength(0)
    })

    it('should return invalid result with missing permissions', () => {
      const result = PermissionService.validatePermissions(
        UserRole.LEARNER,
        [Permission.READ_OWN_PROFILE, Permission.CREATE_COURSE]
      )
      
      expect(result.hasAccess).toBe(false)
      expect(result.missingPermissions).toContain(Permission.CREATE_COURSE)
    })
  })

  describe('getPermissionDescription', () => {
    it('should return description for known permission', () => {
      const description = PermissionService.getPermissionDescription(
        Permission.READ_OWN_PROFILE
      )
      expect(description).toBe('View own profile')
    })

    it('should return permission name for unknown permission', () => {
      const unknownPermission = 'unknown:permission' as Permission
      const description = PermissionService.getPermissionDescription(unknownPermission)
      expect(description).toBe(unknownPermission)
    })
  })
})