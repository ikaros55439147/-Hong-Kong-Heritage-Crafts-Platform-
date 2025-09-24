'use client'

import { useState, useEffect } from 'react'
import { offlineService } from '@/lib/services/offline.service'

export const useOffline = () => {
  const [isOnline, setIsOnline] = useState(true)
  const [pendingActions, setPendingActions] = useState(0)

  useEffect(() => {
    // Initialize online status
    setIsOnline(offlineService.getOnlineStatus())

    // Update stats
    const updateStats = () => {
      const stats = offlineService.getOfflineStats()
      setIsOnline(stats.isOnline)
      setPendingActions(stats.pendingActions)
    }

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true)
      updateStats()
    }

    const handleOffline = () => {
      setIsOnline(false)
      updateStats()
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Update stats periodically
    const interval = setInterval(updateStats, 5000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [])

  const queueAction = (type: string, data: any) => {
    const actionId = offlineService.queueAction(type, data)
    setPendingActions(prev => prev + 1)
    return actionId
  }

  const storeOfflineData = (key: string, data: any, ttlMinutes?: number) => {
    offlineService.storeOfflineData(key, data, ttlMinutes)
  }

  const getOfflineData = (key: string) => {
    return offlineService.getOfflineData(key)
  }

  return {
    isOnline,
    pendingActions,
    queueAction,
    storeOfflineData,
    getOfflineData
  }
}