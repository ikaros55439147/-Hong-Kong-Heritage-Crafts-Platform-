'use client'

import { Inter } from 'next/font/google'
import './globals.css'
import { I18nextProvider } from 'react-i18next'
import i18n from '../lib/i18n/config'
import { PWAInstall } from '@/components/mobile/PWAInstall'
import { PerformanceMonitor } from '@/components/performance/PerformanceMonitor'
import { useEffect } from 'react'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration)
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError)
        })
    }
  }, [])

  return (
    <html lang="zh-HK">
      <head>
        {/* PWA Meta Tags */}
        <meta name="application-name" content="香港弱勢行業傳承平台" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="傳承平台" />
        <meta name="description" content="保護和傳承香港傳統手工藝和弱勢行業的數字平台" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/icons/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#2563eb" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="#2563eb" />

        {/* Viewport for mobile optimization */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover" />

        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />
        
        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/icon-192x192.png" />

        {/* Favicon */}
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-16x16.png" />
        <link rel="shortcut icon" href="/favicon.ico" />

        {/* Safe area CSS variables for devices with notches */}
        <style dangerouslySetInnerHTML={{
          __html: `
            :root {
              --safe-area-inset-top: env(safe-area-inset-top);
              --safe-area-inset-right: env(safe-area-inset-right);
              --safe-area-inset-bottom: env(safe-area-inset-bottom);
              --safe-area-inset-left: env(safe-area-inset-left);
            }
            
            /* Prevent zoom on input focus for iOS */
            @media screen and (-webkit-min-device-pixel-ratio: 0) {
              select, textarea, input[type="text"], input[type="password"], 
              input[type="datetime"], input[type="datetime-local"], 
              input[type="date"], input[type="month"], input[type="time"], 
              input[type="week"], input[type="number"], input[type="email"], 
              input[type="url"], input[type="search"], input[type="tel"], 
              input[type="color"] {
                font-size: 16px !important;
              }
            }
            
            /* Touch optimization */
            * {
              -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
              -webkit-touch-callout: none;
            }
            
            /* Smooth scrolling for mobile */
            html {
              -webkit-overflow-scrolling: touch;
            }
          `
        }} />
      </head>
      <body className={inter.className}>
        <I18nextProvider i18n={i18n}>
          <div className="min-h-screen bg-gray-50">
            {children}
            <PWAInstall />
            <PerformanceMonitor />
          </div>
        </I18nextProvider>
      </body>
    </html>
  )
}