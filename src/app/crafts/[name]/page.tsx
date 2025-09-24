'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui'

export default function CraftDetailPage() {
  const params = useParams()
  const craftName = params.name as string

  const craftDetails = {
    '手雕麻將': {
      title: '手雕麻將',
      description: '傳統手工雕刻麻將技藝，每一顆麻將都是藝術品',
      history: '手雕麻將是香港傳統工藝之一，需要精湛的雕刻技術和豐富的經驗。',
      process: [
        '選材：選用優質象牙或竹材',
        '設計：繪製麻將圖案',
        '雕刻：精細手工雕刻',
        '拋光：細緻打磨拋光',
        '檢驗：品質檢查'
      ]
    },
    '吹糖': {
      title: '吹糖',
      description: '街頭傳統糖藝表演，將糖漿吹製成各種動物造型',
      history: '吹糖是香港街頭傳統技藝，師傅用嘴吹氣將熱糖漿塑造成動物形狀。',
      process: [
        '熬糖：將糖熬製成適當濃度',
        '調溫：控制糖漿溫度',
        '吹製：用嘴吹氣塑形',
        '造型：雕刻細節',
        '冷卻：自然冷卻定型'
      ]
    },
    '竹編': {
      title: '竹編',
      description: '精緻竹製品編織工藝，製作各種實用竹器',
      history: '竹編工藝在香港有悠久歷史，師傅們製作籃子、帽子等日用品。',
      process: [
        '選竹：挑選優質竹材',
        '處理：削竹、劈竹',
        '編織：按圖案編織',
        '收邊：整理邊緣',
        '完工：最終檢查'
      ]
    },
    '打鐵': {
      title: '打鐵',
      description: '傳統鐵器製作技術，鍛造各種工具和器具',
      history: '打鐵是香港重要的傳統手工業，師傅們製作農具、廚具等鐵器。',
      process: [
        '選材：選擇合適鐵材',
        '加熱：爐火加熱鐵材',
        '鍛打：錘打成型',
        '淬火：快速冷卻',
        '回火：調整硬度'
      ]
    }
  }

  const craft = craftDetails[craftName as keyof typeof craftDetails]

  if (!craft) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">工藝未找到</h1>
          <p className="text-gray-600 mb-6">抱歉，找不到相關的工藝資訊。</p>
          <Link href="/">
            <Button>返回首頁</Button>
          </Link>
        </div>
      </div>
    )
  }

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
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white p-8">
            <h1 className="text-3xl font-bold mb-4">{craft.title}</h1>
            <p className="text-xl opacity-90">{craft.description}</p>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* History */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">歷史背景</h2>
              <p className="text-gray-700 leading-relaxed">{craft.history}</p>
            </section>

            {/* Process */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">製作工序</h2>
              <div className="space-y-3">
                {craft.process.map((step, index) => (
                  <div key={index} className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-4">
                      {index + 1}
                    </div>
                    <p className="text-gray-700 pt-1">{step}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
              <Link href="/courses" className="flex-1">
                <Button className="w-full">
                  學習相關課程
                </Button>
              </Link>
              <Link href="/craftsmen" className="flex-1">
                <Button variant="outline" className="w-full">
                  尋找相關師傅
                </Button>
              </Link>
              <Link href="/products" className="flex-1">
                <Button variant="outline" className="w-full">
                  購買相關產品
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}