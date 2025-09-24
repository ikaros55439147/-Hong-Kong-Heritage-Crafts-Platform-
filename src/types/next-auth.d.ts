import { DefaultSession, DefaultUser } from 'next-auth'
import { JWT, DefaultJWT } from 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
      preferredLanguage: string
      craftsmanProfile?: any
    } & DefaultSession['user']
  }

  interface User extends DefaultUser {
    role: string
    preferredLanguage: string
    craftsmanProfile?: any
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    role: string
    preferredLanguage: string
    craftsmanProfile?: any
  }
}