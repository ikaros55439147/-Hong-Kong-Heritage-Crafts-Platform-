import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import GoogleProvider from 'next-auth/providers/google'
import FacebookProvider from 'next-auth/providers/facebook'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/database'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    // Google OAuth
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    
    // Facebook OAuth
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID || '',
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '',
    }),
    
    // Email/Password 登入
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            include: {
              craftsmanProfile: true
            }
          })

          if (!user) {
            return null
          }

          const isValidPassword = await bcrypt.compare(
            credentials.password,
            user.passwordHash
          )

          if (!isValidPassword) {
            return null
          }

          return {
            id: user.id,
            email: user.email,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            role: user.role,
            preferredLanguage: user.preferredLanguage,
            craftsmanProfile: user.craftsmanProfile
          }
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      }
    })
  ],
  
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  
  callbacks: {
    async jwt({ token, user, account }) {
      // 首次登入時將用戶資訊加入 token
      if (user) {
        token.role = user.role
        token.preferredLanguage = user.preferredLanguage
        token.craftsmanProfile = user.craftsmanProfile
      }
      
      // 社交登入時的特殊處理
      if (account?.provider === 'google' || account?.provider === 'facebook') {
        // 檢查用戶是否已存在
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! },
          include: { craftsmanProfile: true }
        })
        
        if (existingUser) {
          token.role = existingUser.role
          token.preferredLanguage = existingUser.preferredLanguage
          token.craftsmanProfile = existingUser.craftsmanProfile
        }
      }
      
      return token
    },
    
    async session({ session, token }) {
      // 將 token 中的資訊傳遞到 session
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as string
        session.user.preferredLanguage = token.preferredLanguage as string
        session.user.craftsmanProfile = token.craftsmanProfile as any
      }
      
      return session
    },
    
    async signIn({ user, account, profile }) {
      // 社交登入時的用戶創建邏輯
      if (account?.provider === 'google' || account?.provider === 'facebook') {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! }
          })
          
          if (!existingUser) {
            // 創建新用戶
            const newUser = await prisma.user.create({
              data: {
                email: user.email!,
                passwordHash: '', // 社交登入不需要密碼
                role: 'LEARNER',
                preferredLanguage: 'zh-HK',
                firstName: user.name?.split(' ')[0] || '',
                lastName: user.name?.split(' ').slice(1).join(' ') || ''
              }
            })
            
            user.id = newUser.id
            user.role = newUser.role
          }
          
          return true
        } catch (error) {
          console.error('Social sign in error:', error)
          return false
        }
      }
      
      return true
    }
  },
  
  pages: {
    signIn: '/auth/login',
    signUp: '/auth/register',
    error: '/auth/error'
  },
  
  events: {
    async signIn({ user, account, isNewUser }) {
      console.log(`User ${user.email} signed in with ${account?.provider}`)
    },
    async createUser({ user }) {
      console.log(`New user created: ${user.email}`)
    }
  },
  
  debug: process.env.NODE_ENV === 'development'
}