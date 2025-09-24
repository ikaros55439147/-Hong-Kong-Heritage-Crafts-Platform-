'use client'

import Link from 'next/link'
import { Button } from '@/components/ui'

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-xl font-bold text-gray-900">
              香港弱勢行業傳承平台
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/profile">
                <Button variant="outline" size="sm">
                  個人資料
                </Button>
              </Link>
              <Button variant="outline" size="sm">
                登出
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">歡迎回來！</h1>
          <p className="text-lg text-gray-600">
            您的個人儀表板
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Link href="/courses">
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="text-blue-600 text-3xl mb-4">📚</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">瀏覽課程</h3>
              <p className="text-gray-600">發現新的學習機會</p>
            </div>
          </Link>

          <Link href="/craftsmen">
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="text-green-600 text-3xl mb-4">👨‍🎨</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">尋找師傅</h3>
              <p className="text-gray-600">聯絡專業工藝師傅</p>
            </div>
          </Link>

          <Link href="/products">
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="text-purple-600 text-3xl mb-4">🛍️</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">購買作品</h3>
              <p className="text-gray-600">探索精美工藝品</p>
            </div>
          </Link>

          <Link href="/profile">
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="text-orange-600 text-3xl mb-4">⚙️</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">個人設定</h3>
              <p className="text-gray-600">管理您的帳戶</p>
            </div>
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">最近活動</h2>
          <div className="space-y-4">
            <div className="flex items-center p-4 bg-gray-50 rounded-lg">
              <div className="text-blue-600 text-xl mr-4">📚</div>
              <div>
                <p className="font-medium text-gray-900">歡迎加入平台！</p>
                <p className="text-sm text-gray-600">開始探索香港傳統工藝的世界</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}