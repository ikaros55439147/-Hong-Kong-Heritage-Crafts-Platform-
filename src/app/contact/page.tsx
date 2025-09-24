'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button, Input, Form } from '@/components/ui'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // 模擬提交
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setSubmitted(true)
    setIsSubmitting(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="text-green-600 text-5xl mb-4">✓</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">訊息已發送</h2>
            <p className="text-gray-600 mb-6">
              感謝您的聯絡，我們會在24小時內回覆您。
            </p>
            <Link href="/">
              <Button>返回首頁</Button>
            </Link>
          </div>
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
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">聯絡我們</h1>
          <p className="text-lg text-gray-600">
            有任何問題或建議，歡迎與我們聯絡
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">發送訊息</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  姓名 *
                </label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="請輸入您的姓名"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  電子郵件 *
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="請輸入您的電子郵件"
                />
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                  主題 *
                </label>
                <Input
                  id="subject"
                  name="subject"
                  type="text"
                  required
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder="請輸入訊息主題"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                  訊息內容 *
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={6}
                  required
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="請詳細描述您的問題或建議"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting ? '發送中...' : '發送訊息'}
              </Button>
            </form>
          </div>

          {/* Contact Information */}
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">聯絡資訊</h2>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 text-blue-600 mt-1">
                    📧
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">電子郵件</p>
                    <p className="text-gray-600">support@hk-heritage-crafts.com</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 text-blue-600 mt-1">
                    📞
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">電話</p>
                    <p className="text-gray-600">+852 1234 5678</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 text-blue-600 mt-1">
                    📍
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">地址</p>
                    <p className="text-gray-600">
                      香港中環皇后大道中1號<br />
                      傳承大廈10樓
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 text-blue-600 mt-1">
                    🕒
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">服務時間</p>
                    <p className="text-gray-600">
                      週一至週五：9:00 - 18:00<br />
                      週六：10:00 - 16:00<br />
                      週日及公眾假期：休息
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">其他聯絡方式</h3>
              <div className="space-y-3">
                <a href="#" className="flex items-center text-blue-600 hover:text-blue-800">
                  <span className="mr-2">📘</span>
                  Facebook 專頁
                </a>
                <a href="#" className="flex items-center text-blue-600 hover:text-blue-800">
                  <span className="mr-2">📷</span>
                  Instagram
                </a>
                <a href="#" className="flex items-center text-blue-600 hover:text-blue-800">
                  <span className="mr-2">💬</span>
                  WhatsApp: +852 9876 5432
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}