'use client'

import React from 'react'
import { Button } from '@/components/ui/Button'

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <svg
            className="mx-auto h-24 w-24 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 109.75 9.75A9.75 9.75 0 0012 2.25z"
            />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          網路連線中斷
        </h1>
        
        <p className="text-gray-600 mb-8">
          請檢查您的網路連線，然後重試。部分內容可能在離線狀態下仍可瀏覽。
        </p>
        
        <div className="space-y-4">
          <Button 
            onClick={handleRetry}
            className="w-full"
          >
            重新連線
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => window.history.back()}
            className="w-full"
          >
            返回上一頁
          </Button>
        </div>
        
        <div className="mt-8 text-sm text-gray-500">
          <p>離線模式下您仍可以：</p>
          <ul className="mt-2 space-y-1">
            <li>• 瀏覽已載入的內容</li>
            <li>• 查看收藏的工藝品</li>
            <li>• 編輯草稿內容</li>
          </ul>
        </div>
      </div>
    </div>
  )
}