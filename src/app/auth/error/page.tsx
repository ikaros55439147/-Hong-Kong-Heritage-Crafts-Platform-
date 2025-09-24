'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button, Alert } from '@/components/ui'

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case 'Configuration':
        return '服務器配置錯誤，請聯絡管理員'
      case 'AccessDenied':
        return '訪問被拒絕，您可能沒有權限訪問此應用程式'
      case 'Verification':
        return '驗證失敗，請檢查您的電子郵件'
      case 'OAuthSignin':
        return 'OAuth 登入錯誤，請稍後再試'
      case 'OAuthCallback':
        return 'OAuth 回調錯誤，請稍後再試'
      case 'OAuthCreateAccount':
        return '無法創建 OAuth 帳戶，請稍後再試'
      case 'EmailCreateAccount':
        return '無法創建電子郵件帳戶，請稍後再試'
      case 'Callback':
        return '回調錯誤，請稍後再試'
      case 'OAuthAccountNotLinked':
        return '此電子郵件已與其他登入方式關聯，請使用原來的登入方式'
      case 'EmailSignin':
        return '電子郵件登入錯誤，請檢查您的電子郵件'
      case 'CredentialsSignin':
        return '登入憑證錯誤，請檢查您的電子郵件和密碼'
      case 'SessionRequired':
        return '需要登入才能訪問此頁面'
      default:
        return '登入時發生未知錯誤，請稍後再試'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="block text-center text-2xl font-bold text-blue-600 mb-6">
          香港弱勢行業傳承平台
        </Link>
        
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center mb-6">
            <div className="text-red-600 text-5xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              登入失敗
            </h2>
          </div>

          <Alert variant="error" className="mb-6">
            {getErrorMessage(error)}
          </Alert>

          <div className="space-y-4">
            <Link href="/auth/login" className="block">
              <Button className="w-full">
                重新登入
              </Button>
            </Link>
            
            <Link href="/auth/register" className="block">
              <Button variant="outline" className="w-full">
                註冊新帳戶
              </Button>
            </Link>
            
            <Link href="/" className="block">
              <Button variant="ghost" className="w-full">
                返回首頁
              </Button>
            </Link>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              如果問題持續發生，請{' '}
              <Link href="/contact" className="text-blue-600 hover:text-blue-500">
                聯絡我們
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}