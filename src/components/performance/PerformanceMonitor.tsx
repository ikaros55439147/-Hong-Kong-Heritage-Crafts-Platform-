'use client'

import React, { useEffect, useState } from 'react'
import { useOffline } from '@/lib/hooks/useOffline'

interface PerformanceMetrics {
  loadTime: number
  renderTime: number
  memoryUsage?: number
  connectionType?: string
}

export const PerformanceMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [showMonitor, setShowMonitor] = useState(false)
  const { isOnline, pendingActions } = useOffline()

  useEffect(() => {
    // Only show in development or when explicitly enabled
    const shouldShow = process.env.NODE_ENV === 'development' || 
                      localStorage.getItem('show_performance_monitor') === 'true'
    setShowMonitor(shouldShow)

    if (!shouldShow) return

    const measurePerformance = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const paint = performance.getEntriesByType('paint')
      
      const loadTime = navigation.loadEventEnd - navigation.loadEventStart
      const renderTime = paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0

      const metrics: PerformanceMetrics = {
        loadTime,
        renderTime
      }

      // Add memory usage if available
      if ('memory' in performance) {
        const memory = (performance as any).memory
        metrics.memoryUsage = memory.usedJSHeapSize / 1024 / 1024 // MB
      }

      // Add connection info if available
      if ('connection' in navigator) {
        const connection = (navigator as any).connection
        metrics.connectionType = connection.effectiveType
      }

      setMetrics(metrics)
    }

    // Measure after page load
    if (document.readyState === 'complete') {
      measurePerformance()
    } else {
      window.addEventListener('load', measurePerformance)
      return () => window.removeEventListener('load', measurePerformance)
    }
  }, [])

  if (!showMonitor || !metrics) return null

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-80 text-white text-xs p-3 rounded-lg font-mono z-50">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold">性能監控</span>
        <button
          onClick={() => setShowMonitor(false)}
          className="text-gray-400 hover:text-white ml-2"
        >
          ×
        </button>
      </div>
      
      <div className="space-y-1">
        <div className="flex justify-between">
          <span>載入時間:</span>
          <span className={metrics.loadTime > 3000 ? 'text-red-400' : 'text-green-400'}>
            {metrics.loadTime.toFixed(0)}ms
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>渲染時間:</span>
          <span className={metrics.renderTime > 2000 ? 'text-red-400' : 'text-green-400'}>
            {metrics.renderTime.toFixed(0)}ms
          </span>
        </div>
        
        {metrics.memoryUsage && (
          <div className="flex justify-between">
            <span>記憶體:</span>
            <span className={metrics.memoryUsage > 50 ? 'text-yellow-400' : 'text-green-400'}>
              {metrics.memoryUsage.toFixed(1)}MB
            </span>
          </div>
        )}
        
        <div className="flex justify-between">
          <span>連線狀態:</span>
          <span className={isOnline ? 'text-green-400' : 'text-red-400'}>
            {isOnline ? '線上' : '離線'}
          </span>
        </div>
        
        {pendingActions > 0 && (
          <div className="flex justify-between">
            <span>待處理:</span>
            <span className="text-yellow-400">{pendingActions}</span>
          </div>
        )}
        
        {metrics.connectionType && (
          <div className="flex justify-between">
            <span>網路:</span>
            <span className="text-blue-400">{metrics.connectionType}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// Component for showing loading states with performance info
export const PerformanceAwareLoader: React.FC<{
  isLoading: boolean
  children: React.ReactNode
  fallback?: React.ReactNode
}> = ({ isLoading, children, fallback }) => {
  const [startTime] = useState(Date.now())
  const [loadTime, setLoadTime] = useState<number | null>(null)

  useEffect(() => {
    if (!isLoading && loadTime === null) {
      setLoadTime(Date.now() - startTime)
    }
  }, [isLoading, startTime, loadTime])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        {fallback || (
          <>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <div className="text-sm text-gray-500">載入中...</div>
          </>
        )}
      </div>
    )
  }

  return (
    <>
      {children}
      {process.env.NODE_ENV === 'development' && loadTime && (
        <div className="text-xs text-gray-400 mt-2">
          載入時間: {loadTime}ms
        </div>
      )}
    </>
  )
}