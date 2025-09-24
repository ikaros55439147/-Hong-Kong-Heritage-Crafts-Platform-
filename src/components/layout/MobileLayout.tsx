'use client'

import React from 'react'
import { MobileNavigation } from '@/components/mobile/MobileNavigation'
import { PWAStatus } from '@/components/mobile/PWAInstall'

const mobileNavItems = [
  {
    href: '/',
    label: '首頁',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    )
  },
  {
    href: '/craftsmen',
    label: '師傅',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    )
  },
  {
    href: '/courses',
    label: '課程',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    )
  },
  {
    href: '/products',
    label: '商品',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    )
  },
  {
    href: '/profile',
    label: '個人',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }
]

interface MobileLayoutProps {
  children: React.ReactNode
  showNavigation?: boolean
  showHeader?: boolean
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  showNavigation = true,
  showHeader = true
}) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      {showHeader && (
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30 md:hidden">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold text-gray-900">
                傳承平台
              </h1>
              <PWAStatus />
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className={showNavigation ? 'pb-20' : ''}>
        {children}
      </main>

      {/* Mobile Navigation */}
      {showNavigation && (
        <MobileNavigation items={mobileNavItems} />
      )}
    </div>
  )
}

// Mobile-specific page wrapper
interface MobilePageProps {
  children: React.ReactNode
  title?: string
  showBackButton?: boolean
  onBack?: () => void
  actions?: React.ReactNode
}

export const MobilePage: React.FC<MobilePageProps> = ({
  children,
  title,
  showBackButton = false,
  onBack,
  actions
}) => {
  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      window.history.back()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      {(title || showBackButton || actions) && (
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {showBackButton && (
                  <button
                    onClick={handleBack}
                    className="p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                {title && (
                  <h1 className="text-lg font-semibold text-gray-900 truncate">
                    {title}
                  </h1>
                )}
              </div>
              {actions && (
                <div className="flex items-center space-x-2">
                  {actions}
                </div>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Page Content */}
      <div className="flex-1">
        {children}
      </div>
    </div>
  )
}