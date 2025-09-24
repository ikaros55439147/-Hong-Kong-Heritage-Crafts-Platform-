'use client'

import Link from 'next/link'
import { Button } from '@/components/ui'

export default function HelpPage() {
  const faqItems = [
    {
      question: '如何註冊成為平台用戶？',
      answer: '點擊右上角的「註冊」按鈕，填寫基本資料即可完成註冊。註冊後可以預約課程、購買產品等。'
    },
    {
      question: '如何成為認證師傅？',
      answer: '註冊後在個人資料中申請成為師傅，填寫專業技能和經驗，我們會進行審核。審核通過後即可開設課程和販售作品。'
    },
    {
      question: '如何預約課程？',
      answer: '瀏覽課程頁面，選擇感興趣的課程，點擊「立即預約」按鈕，選擇時間並完成付款即可。'
    },
    {
      question: '課程可以取消嗎？',
      answer: '可以的。在課程開始前24小時可以免費取消，系統會自動退款。24小時內取消需要收取手續費。'
    },
    {
      question: '如何購買工藝品？',
      answer: '瀏覽產品頁面，選擇喜歡的工藝品加入購物車，填寫收貨地址並完成付款即可。'
    },
    {
      question: '支持哪些付款方式？',
      answer: '我們支持信用卡、PayPal、支付寶、微信支付等多種付款方式。'
    },
    {
      question: '如何聯絡師傅？',
      answer: '在師傅個人頁面點擊「聯絡師傅」按鈕，可以發送私訊或查看聯絡方式。'
    },
    {
      question: '平台收費嗎？',
      answer: '註冊和瀏覽完全免費。預約課程和購買產品需要付費，平台會收取少量手續費用於維護運營。'
    }
  ]

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

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">幫助中心</h1>
          <p className="text-lg text-gray-600">
            常見問題解答，幫助您更好地使用平台
          </p>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">常見問題</h2>
            <div className="space-y-6">
              {faqItems.map((item, index) => (
                <div key={index} className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    {item.question}
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div className="mt-12 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">還有其他問題？</h2>
          <p className="text-gray-700 mb-6">
            如果您的問題沒有在上面找到答案，歡迎聯絡我們的客服團隊。
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/contact">
              <Button className="w-full sm:w-auto">
                聯絡客服
              </Button>
            </Link>
            <Link href="mailto:support@hk-heritage-crafts.com">
              <Button variant="outline" className="w-full sm:w-auto">
                發送郵件
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}