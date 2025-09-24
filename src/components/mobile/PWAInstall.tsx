'use client'

import React, { useState } from 'react'
import { usePWA } from '@/lib/hooks/usePWA'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface PWAInstallProps {
  className?: string
  showBanner?: boolean
}

export const PWAInstall: React.FC<PWAInstallProps> = ({
  className,
  showBanner = true
}) => {
  const { canInstall, isInstalled, installApp } = usePWA()
  const [isInstalling, setIsInstalling] = useState(false)
  const [showPrompt, setShowPrompt] = useState(showBanner && canInstall)

  const handleInstall = async () => {
    setIsInstalling(true)
    try {
      const success = await installApp()
      if (success) {
        setShowPrompt(false)
      }
    } catch (error) {
      console.error('Installation failed:', error)
    } finally {
      setIsInstalling(false)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    // Remember user dismissed the prompt
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())
  }

  // Don't show if already installed or can't install
  if (isInstalled || !canInstall) {
    return null
  }

  // Check if user previously dismissed
  React.useEffect(() => {
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed) {
      const dismissedTime = parseInt(dismissed)
      const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24)
      
      // Show again after 7 days
      if (daysSinceDismissed < 7) {
        setShowPrompt(false)
      }
    }
  }, [])

  if (!showPrompt) {
    return (
      <Button
        onClick={handleInstall}
        disabled={isInstalling}
        className={cn('min-h-[44px]', className)}
      >
        {isInstalling ? '安裝中...' : '安裝應用程式'}
      </Button>
    )
  }

  return (
    <div className={cn(
      'fixed bottom-20 left-4 right-4 z-40 bg-white rounded-lg shadow-lg border border-gray-200 p-4 md:hidden',
      className
    )}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900">
            安裝傳承平台應用程式
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            安裝到主畫面，享受更好的使用體驗
          </p>
          
          <div className="flex space-x-2 mt-3">
            <Button
              onClick={handleInstall}
              disabled={isInstalling}
              size="sm"
              className="flex-1"
            >
              {isInstalling ? '安裝中...' : '安裝'}
            </Button>
            <Button
              onClick={handleDismiss}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              稍後
            </Button>
          </div>
        </div>
        
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// PWA status indicator
export const PWAStatus: React.FC = () => {
  const { isOnline, isInstalled, isStandalone } = usePWA()

  return (
    <div className="flex items-center space-x-2 text-sm">
      {/* Online/Offline indicator */}
      <div className="flex items-center space-x-1">
        <div className={cn(
          'w-2 h-2 rounded-full',
          isOnline ? 'bg-green-500' : 'bg-red-500'
        )} />
        <span className="text-gray-600">
          {isOnline ? '線上' : '離線'}
        </span>
      </div>

      {/* PWA status */}
      {isInstalled && (
        <div className="flex items-center space-x-1">
          <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <span className="text-primary-600">
            {isStandalone ? '應用程式模式' : '已安裝'}
          </span>
        </div>
      )}
    </div>
  )
}