import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('請輸入有效的電子郵件'),
  password: z.string().min(1, '請輸入密碼')
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // 驗證輸入數據
    const { email, password } = loginSchema.parse(body)
    
    // 查找用戶
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        craftsmanProfile: true
      }
    })
    
    if (!user) {
      return NextResponse.json(
        { message: '電子郵件或密碼錯誤' },
        { status: 401 }
      )
    }
    
    // 驗證密碼
    const isValidPassword = await bcrypt.compare(password, user.passwordHash)
    
    if (!isValidPassword) {
      return NextResponse.json(
        { message: '電子郵件或密碼錯誤' },
        { status: 401 }
      )
    }
    
    // 生成JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    )
    
    // 創建響應
    const response = NextResponse.json({
      message: '登入成功',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
        craftsmanProfile: user.craftsmanProfile
      }
    })
    
    // 設置HTTP-only cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    })
    
    return response
    
  } catch (error) {
    console.error('Login error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.errors[0].message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { message: '登入時發生錯誤，請稍後再試' },
      { status: 500 }
    )
  }
}