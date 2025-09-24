'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button, Input, Form, FormField, FormLabel, FormError, Alert, Select } from '@/components/ui'
import { LanguageSwitcher } from '@/components/language/LanguageSwitcher'

interface RegisterForm {
  email: string
  password: string
  confirmPassword: string
  firstName: string
  lastName: string
  role: 'learner' | 'craftsman'
  phone?: string
  agreeToTerms: boolean
}

interface FormErrors {
  email?: string
  password?: string
  confirmPassword?: string
  firstName?: string
  lastName?: string
  phone?: string
  agreeToTerms?: string
}

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<RegisterForm>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    role: 'learner',
    phone: '',
    agreeToTerms: false
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [generalError, setGeneralError] = useState('')

  const handleInputChange = (field: keyof RegisterForm, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.firstName.trim()) {
      newErrors.firstName = '請輸入名字'
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = '請輸入姓氏'
    }

    if (!formData.email) {
      newErrors.email = '請輸入電子郵件'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = '請輸入有效的電子郵件格式'
    }

    if (!formData.password) {
      newErrors.password = '請輸入密碼'
    } else if (formData.password.length < 8) {
      newErrors.password = '密碼至少需要8個字符'
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '密碼確認不匹配'
    }

    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = '請同意服務條款'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsLoading(true)
    setGeneralError('')

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: formData.role,
          phone: formData.phone
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || '註冊失敗')
      }

      // Redirect to login with success message
      router.push('/auth/login?message=registration-success')
    } catch (error) {
      setGeneralError(error instanceof Error ? error.message : '註冊時發生錯誤')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-between items-center mb-6">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            香港弱勢行業傳承平台
          </Link>
          <LanguageSwitcher variant="dropdown" />
        </div>
        
        <h2 className="text-center text-3xl font-extrabold text-gray-900">
          創建新帳戶
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          已有帳戶？{' '}
          <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500">
            立即登入
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {generalError && (
            <Alert variant="error" className="mb-6">
              {generalError}
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <FormField>
                <FormLabel htmlFor="firstName">名字</FormLabel>
                <Input
                  id="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  placeholder="名字"
                  className={errors.firstName ? 'border-red-500' : ''}
                />
                {errors.firstName && <FormError>{errors.firstName}</FormError>}
              </FormField>

              <FormField>
                <FormLabel htmlFor="lastName">姓氏</FormLabel>
                <Input
                  id="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  placeholder="姓氏"
                  className={errors.lastName ? 'border-red-500' : ''}
                />
                {errors.lastName && <FormError>{errors.lastName}</FormError>}
              </FormField>
            </div>

            <FormField>
              <FormLabel htmlFor="email">電子郵件</FormLabel>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="請輸入您的電子郵件"
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && <FormError>{errors.email}</FormError>}
            </FormField>

            <FormField>
              <FormLabel htmlFor="phone">電話號碼（可選）</FormLabel>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="請輸入您的電話號碼"
              />
            </FormField>

            <FormField>
              <FormLabel htmlFor="role">帳戶類型</FormLabel>
              <Select
                id="role"
                value={formData.role}
                onChange={(e) => handleInputChange('role', e.target.value as 'learner' | 'craftsman')}
              >
                <option value="learner">學習者</option>
                <option value="craftsman">工藝師傅</option>
              </Select>
            </FormField>

            <FormField>
              <FormLabel htmlFor="password">密碼</FormLabel>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="請輸入密碼（至少8個字符）"
                className={errors.password ? 'border-red-500' : ''}
              />
              {errors.password && <FormError>{errors.password}</FormError>}
            </FormField>

            <FormField>
              <FormLabel htmlFor="confirmPassword">確認密碼</FormLabel>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                placeholder="請再次輸入密碼"
                className={errors.confirmPassword ? 'border-red-500' : ''}
              />
              {errors.confirmPassword && <FormError>{errors.confirmPassword}</FormError>}
            </FormField>

            <div className="flex items-center">
              <input
                id="agreeToTerms"
                name="agreeToTerms"
                type="checkbox"
                checked={formData.agreeToTerms}
                onChange={(e) => handleInputChange('agreeToTerms', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="agreeToTerms" className="ml-2 block text-sm text-gray-900">
                我同意{' '}
                <Link href="/terms" className="text-blue-600 hover:text-blue-500">
                  服務條款
                </Link>
                {' '}和{' '}
                <Link href="/privacy" className="text-blue-600 hover:text-blue-500">
                  私隱政策
                </Link>
              </label>
            </div>
            {errors.agreeToTerms && <FormError>{errors.agreeToTerms}</FormError>}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? '註冊中...' : '創建帳戶'}
            </Button>
          </Form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">或</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button variant="outline" className="w-full">
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </Button>
              
              <Button variant="outline" className="w-full">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Facebook
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}