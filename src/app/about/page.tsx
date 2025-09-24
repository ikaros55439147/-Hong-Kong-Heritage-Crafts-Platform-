'use client'

import Link from 'next/link'
import { Button } from '@/components/ui'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-xl font-bold text-gray-900">
              香港弱勢行業傳承平台
            </Link>
            <Link href="/">
              <Button variant="outline" size="sm">
                返回首頁
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              關於我們
            </h1>
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
              致力於保護和傳承香港珍貴的傳統工藝文化
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Mission */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">我們的使命</h2>
          <div className="bg-white rounded-lg shadow-md p-8">
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              香港弱勢行業傳承平台致力於保護和傳承香港珍貴的傳統手工藝文化。我們相信，這些技藝不僅是香港文化遺產的重要組成部分，更是連接過去與未來的橋樑。
            </p>
            <p className="text-lg text-gray-700 leading-relaxed">
              通過數字化平台，我們為傳統工藝師傅提供展示技藝的舞台，為學習者提供接觸傳統文化的機會，為社會大眾提供了解和支持傳統工藝的渠道。
            </p>
          </div>
        </section>

        {/* Values */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">我們的價值觀</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-blue-600 text-4xl mb-4">🏛️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">文化傳承</h3>
              <p className="text-gray-700">
                保護和傳承香港傳統工藝，讓珍貴的文化技藝得以延續。
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-green-600 text-4xl mb-4">🤝</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">社群連結</h3>
              <p className="text-gray-700">
                建立師傅與學習者之間的橋樑，促進知識和技能的交流。
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-purple-600 text-4xl mb-4">💡</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">創新發展</h3>
              <p className="text-gray-700">
                運用現代科技手段，為傳統工藝注入新的活力和發展機會。
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-orange-600 text-4xl mb-4">🌟</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">品質追求</h3>
              <p className="text-gray-700">
                堅持高品質的服務標準，為用戶提供最佳的學習和購物體驗。
              </p>
            </div>
          </div>
        </section>

        {/* What We Do */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">我們的服務</h2>
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="space-y-6">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-4 mt-1">
                  1
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">師傅檔案展示</h3>
                  <p className="text-gray-700">為傳統工藝師傅提供專業的線上展示平台，展示技藝和作品。</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-4 mt-1">
                  2
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">技藝學習課程</h3>
                  <p className="text-gray-700">提供多樣化的傳統工藝學習課程，讓更多人接觸和學習傳統技藝。</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-4 mt-1">
                  3
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">工藝品銷售</h3>
                  <p className="text-gray-700">為師傅提供銷售渠道，讓精美的手工藝品得到更廣泛的認知和支持。</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-4 mt-1">
                  4
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">文化記錄保存</h3>
                  <p className="text-gray-700">系統性地記錄和保存傳統工藝的歷史、技法和文化背景。</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">我們的團隊</h2>
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              我們的團隊由文化保護專家、技術開發人員、設計師和傳統工藝愛好者組成。
              每個成員都對香港傳統文化充滿熱情，致力於通過科技手段保護和傳承珍貴的文化遺產。
            </p>
            <p className="text-lg text-gray-700 leading-relaxed">
              我們與多位資深工藝師傅、文化機構和教育組織合作，
              共同推動香港傳統工藝的保護和發展事業。
            </p>
          </div>
        </section>

        {/* Contact CTA */}
        <section className="text-center">
          <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white rounded-lg p-8">
            <h2 className="text-2xl font-bold mb-4">加入我們的使命</h2>
            <p className="text-lg mb-6">
              無論您是傳統工藝師傅、學習者還是文化愛好者，
              我們都歡迎您加入我們的社群。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/register">
                <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
                  立即註冊
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600">
                  聯絡我們
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}