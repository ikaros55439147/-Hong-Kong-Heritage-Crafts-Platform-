'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export function useAuth() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const logout = async () => {
    await signOut({ callbackUrl: '/' })
  }

  const requireAuth = () => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
      return false
    }
    return true
  }

  const requireRole = (requiredRole: string) => {
    if (!session?.user || session.user.role !== requiredRole) {
      router.push('/auth/login')
      return false
    }
    return true
  }

  return {
    user: session?.user,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    logout,
    requireAuth,
    requireRole
  }
}