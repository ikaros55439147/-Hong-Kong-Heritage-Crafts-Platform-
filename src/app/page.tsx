'use client'

import { Navigation } from '@/components/ui'
import { LanguageSwitcher } from '@/components/language/LanguageSwitcher'
import { Button } from '@/components/ui'
import { MobileLayout } from '@/components/layout/MobileLayout'
import { ResponsiveContainer, ResponsiveGrid, useResponsive } from '@/components/ui/Responsive'
import { useAuth } from '@/lib/hooks/useAuth'
import Link from 'next/link'

export default function Home() {
  const { isMobile } = useResponsive()
  const { user, isAuthenticated, logout } = useAuth()

  if (isMobile) {
    return (
      <MobileLayout>
        <HomePage />
      </MobileLayout>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Navigation */}
      <Navigation className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-gray-900">
                香港弱勢行業傳承平台
              </Link>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/craftsmen" className="text-gray-700 hover:text-gray-900">
                師傅檔案
              </Link>
              <Link href="/courses" className="text-gray-700 hover:text-gray-900">
                課程學習
              </Link>
              <Link href="/products" className="text-gray-700 hover:text-gray-900">
                工藝品商店
              </Link>
              <Link href="/about" className="text-gray-700 hover:text-gray-900">
                關於我們
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              <LanguageSwitcher variant="dropdown" />
              <Link href="/auth/login">
                <Button variant="outline" size="sm">
                  登入
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button size="sm">
                  註冊
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Navigation>
      <HomePage />
    </div>
  )
}

function HomePage() {
  const { isMobile } = useResponsive()

  return (
    <>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-blue-600 to-purple-700 text-white">
        <ResponsiveContainer className="py-12 md:py-24">
          <div className="text-center">
            <h1 className="text-2xl md:text-4xl lg:text-6xl font-bold mb-4 md:mb-6 px-4">
              保護和傳承香港傳統手工藝
            </h1>
            <p className="text-base md:text-xl lg:text-2xl mb-6 md:mb-8 max-w-3xl mx-auto px-4">
              連接傳統工藝師傅與學習者，通過數字化方式記錄、展示和傳承珍貴的文化技藝
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center px-4">
              <Link href="/courses">
                <Button 
                  size={isMobile ? "md" : "lg"} 
                  className="bg-white text-blue-600 hover:bg-gray-100 w-full sm:w-auto min-h-[44px]"
                >
                  開始學習
                </Button>
              </Link>
              <Link href="/craftsmen">
                <Button 
                  size={isMobile ? "md" : "lg"} 
                  variant="outline" 
                  className="border-white text-white hover:bg-white hover:text-blue-600 w-full sm:w-auto min-h-[44px]"
                >
                  探索師傅
                </Button>
              </Link>
            </div>
          </div>
        </ResponsiveContainer>
      </section>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-blue-600 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              保護和傳承香港傳統手工藝
            </h1>
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
              連接傳統工藝師傅與學習者，通過數字化方式記錄、展示和傳承珍貴的文化技藝
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/courses">
                <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
                  開始學習
                </Button>
              </Link>
              <Link href="/craftsmen">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600">
                  探索師傅
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Crafts Section */}
      <section className="py-8 md:py-16">
        <ResponsiveContainer>
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 md:mb-4">
              特色傳統工藝
            </h2>
            <p className="text-base md:text-lg text-gray-600">
              探索香港豐富的傳統手工藝文化
            </p>
          </div>

          <ResponsiveGrid
            cols={{
              default: 1,
              sm: 2,
              lg: 4
            }}
            gap="md"
          >
            {[
              { name: '手雕麻將', image: '/images/mahjong.jpg', description: '傳統手工雕刻麻將技藝' },
              { name: '吹糖', image: '/images/sugar-blowing.jpg', description: '街頭傳統糖藝表演' },
              { name: '竹編', image: '/images/bamboo-weaving.jpg', description: '精緻竹製品編織工藝' },
              { name: '打鐵', image: '/images/blacksmith.jpg', description: '傳統鐵器製作技術' }
            ].map((craft, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow touch-manipulation">
                <div className="h-40 md:h-48 bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500">圖片佔位</span>
                </div>
                <div className="p-4 md:p-6">
                  <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">
                    {craft.name}
                  </h3>
                  <p className="text-sm md:text-base text-gray-600 mb-4">
                    {craft.description}
                  </p>
                  <Link href={`/crafts/${craft.name}`}>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full min-h-[44px]"
                    >
                      了解更多
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </ResponsiveGrid>
        </ResponsiveContainer>
      </section>

      {/* Stats Section */}
      <section className="bg-blue-50 py-8 md:py-16">
        <ResponsiveContainer>
          <ResponsiveGrid
            cols={{
              default: 1,
              md: 3
            }}
            gap="md"
            className="text-center"
          >
            <div className="py-4">
              <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-2">50+</div>
              <div className="text-base md:text-lg text-gray-700">認證師傅</div>
            </div>
            <div className="py-4">
              <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-2">200+</div>
              <div className="text-base md:text-lg text-gray-700">學習課程</div>
            </div>
            <div className="py-4">
              <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-2">1000+</div>
              <div className="text-base md:text-lg text-gray-700">學習者</div>
            </div>
          </ResponsiveGrid>
        </ResponsiveContainer>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 md:py-12">
        <ResponsiveContainer>
          <ResponsiveGrid
            cols={{
              default: 1,
              sm: 2,
              md: 4
            }}
            gap="md"
          >
            <div className="mb-6 md:mb-0">
              <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">香港弱勢行業傳承平台</h3>
              <p className="text-sm md:text-base text-gray-400">
                致力於保護和傳承香港傳統手工藝文化
              </p>
            </div>
            <div className="mb-6 md:mb-0">
              <h4 className="text-sm md:text-md font-semibold mb-3 md:mb-4">快速連結</h4>
              <ul className="space-y-2 text-sm md:text-base text-gray-400">
                <li><Link href="/craftsmen" className="hover:text-white touch-manipulation">師傅檔案</Link></li>
                <li><Link href="/courses" className="hover:text-white touch-manipulation">課程學習</Link></li>
                <li><Link href="/products" className="hover:text-white touch-manipulation">工藝品商店</Link></li>
              </ul>
            </div>
            <div className="mb-6 md:mb-0">
              <h4 className="text-sm md:text-md font-semibold mb-3 md:mb-4">支援</h4>
              <ul className="space-y-2 text-sm md:text-base text-gray-400">
                <li><Link href="/help" className="hover:text-white touch-manipulation">幫助中心</Link></li>
                <li><Link href="/contact" className="hover:text-white touch-manipulation">聯絡我們</Link></li>
                <li><Link href="/privacy" className="hover:text-white touch-manipulation">私隱政策</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm md:text-md font-semibold mb-3 md:mb-4">關注我們</h4>
              <div className="flex space-x-4 text-sm md:text-base">
                <a href="#" className="text-gray-400 hover:text-white touch-manipulation">Facebook</a>
                <a href="#" className="text-gray-400 hover:text-white touch-manipulation">Instagram</a>
              </div>
            </div>
          </ResponsiveGrid>
          <div className="border-t border-gray-800 mt-6 md:mt-8 pt-6 md:pt-8 text-center text-gray-400">
            <p className="text-sm md:text-base">&copy; 2024 香港弱勢行業傳承平台. 版權所有.</p>
          </div>
        </ResponsiveContainer>
      </footer>
    </>
  )
}