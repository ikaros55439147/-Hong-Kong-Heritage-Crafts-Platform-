import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const registerSchema = z.object({
  email: z.string().email('請輸入有效的電子郵件'),
  password: z.string().min(8, '密碼至少需要8個字符'),
  firstName: z.string().min(1, '請輸入名字'),
  lastName: z.string().min(1, '請輸入姓氏'),
  role: z.enum(['learner', 'craftsman']).default('learner'),
  phone: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // 驗證輸入數據
    const validatedData = registerSchema.parse(body)
    
    // 檢查用戶是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })
    
    if (existingUser) {
      return NextResponse.json(
        { message: '此電子郵件已被註冊' },
        { status: 400 }
      )
    }
    
    // 加密密碼
    const hashedPassword = await bcrypt.hash(validatedData.password, 12)
    
    // 創建用戶
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        passwordHash: hashedPassword,
        role: validatedData.role.toUpperCase() as 'LEARNER' | 'CRAFTSMAN',
        preferredLanguage: 'zh-HK'
      }
    })
    
    // 如果是師傅角色，創建師傅檔案
    if (validatedData.role === 'craftsman') {
      await prisma.craftsmanProfile.create({
        data: {
          userId: user.id,
          craftSpecialties: [],
          verificationStatus: 'PENDING'
        }
      })
    }
    
    return NextResponse.json({
      message: '註冊成功',
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    })
    
  } catch (error) {
    console.error('Registration error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.errors[0].message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { message: '註冊時發生錯誤，請稍後再試' },
      { status: 500 }
    )
  }
}