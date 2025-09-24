'use client'

import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

interface PWAState {
  isInstallable: boolean
  isInstalled: boolean
  isOnline: boolean
  isStandalone: boolean
  canInstall: boolean
  installPrompt: BeforeInstallPromptEvent | null
}

export const usePWA = () => {
  const [pwaState, setPwaState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isOnline: true,
    isStandalone: false,
    canInstall: false,
    installPrompt: null
  })

  useEffect(() => {
    // Check if running in standalone mode (installed PWA)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://')

    // Check if already installed
    const isInstalled = isStandalone

    // Check online status
    const isOnline = navigator.onLine

    setPwaState(prev => ({
      ...prev,
      isStandalone,
      isInstalled,
      isOnline
    }))

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      const installEvent = e as BeforeInstallPromptEvent
      setPwaState(prev => ({
        ...prev,
        isInstallable: true,
        canInstall: true,
        installPrompt: installEvent
      }))
    }

    // Listen for app installed
    const handleAppInstalled = () => {
      setPwaState(prev => ({
        ...prev,
        isInstalled: true,
        canInstall: false,
        installPrompt: null
      }))
    }

    // Listen for online/offline status
    const handleOnline = () => {
      setPwaState(prev => ({ ...prev, isOnline: true }))
    }

    const handleOffline = () => {
      setPwaState(prev => ({ ...prev, isOnline: false }))
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const installApp = async (): Promise<boolean> => {
    if (!pwaState.installPrompt) return false

    try {
      await pwaState.installPrompt.prompt()
      const choiceResult = await pwaState.installPrompt.userChoice
      
      if (choiceResult.outcome === 'accepted') {
        setPwaState(prev => ({
          ...prev,
          canInstall: false,
          installPrompt: null
        }))
        return true
      }
      return false
    } catch (error) {
      console.error('Error installing PWA:', error)
      return false
    }
  }

  return {
    ...pwaState,
    installApp
  }
}

// Hook for managing offline data
export const useOfflineData = <T>(key: string, initialData: T) => {
  const [data, setData] = useState<T>(initialData)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Load data from localStorage on mount
    try {
      const stored = localStorage.getItem(`offline_${key}`)
      if (stored) {
        setData(JSON.parse(stored))
      }
    } catch (error) {
      console.error('Error loading offline data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [key])

  const updateData = (newData: T) => {
    setData(newData)
    try {
      localStorage.setItem(`offline_${key}`, JSON.stringify(newData))
    } catch (error) {
      console.error('Error saving offline data:', error)
    }
  }

  const clearData = () => {
    setData(initialData)
    try {
      localStorage.removeItem(`offline_${key}`)
    } catch (error) {
      console.error('Error clearing offline data:', error)
    }
  }

  return {
    data,
    updateData,
    clearData,
    isLoading
  }
}

// Hook for managing background sync
export const useBackgroundSync = () => {
  const [pendingActions, setPendingActions] = useState<any[]>([])

  useEffect(() => {
    // Load pending actions from localStorage
    try {
      const stored = localStorage.getItem('pending_actions')
      if (stored) {
        setPendingActions(JSON.parse(stored))
      }
    } catch (error) {
      console.error('Error loading pending actions:', error)
    }
  }, [])

  const addPendingAction = (action: any) => {
    const newActions = [...pendingActions, { ...action, id: Date.now() }]
    setPendingActions(newActions)
    
    try {
      localStorage.setItem('pending_actions', JSON.stringify(newActions))
      
      // Register background sync if supported
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        navigator.serviceWorker.ready.then(registration => {
          return registration.sync.register('background-sync')
        })
      }
    } catch (error) {
      console.error('Error saving pending action:', error)
    }
  }

  const removePendingAction = (actionId: number) => {
    const newActions = pendingActions.filter(action => action.id !== actionId)
    setPendingActions(newActions)
    
    try {
      localStorage.setItem('pending_actions', JSON.stringify(newActions))
    } catch (error) {
      console.error('Error removing pending action:', error)
    }
  }

  const clearPendingActions = () => {
    setPendingActions([])
    try {
      localStorage.removeItem('pending_actions')
    } catch (error) {
      console.error('Error clearing pending actions:', error)
    }
  }

  return {
    pendingActions,
    addPendingAction,
    removePendingAction,
    clearPendingActions
  }
}

// Hook for push notifications
export const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [permission, setPermission] = useState<NotificationPermission>('default')

  useEffect(() => {
    const checkSupport = () => {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
      setIsSupported(supported)
      setPermission(Notification.permission)
    }

    checkSupport()

    // Get existing subscription
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        return registration.pushManager.getSubscription()
      }).then(sub => {
        setSubscription(sub)
      })
    }
  }, [])

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) return false

    try {
      const permission = await Notification.requestPermission()
      setPermission(permission)
      return permission === 'granted'
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      return false
    }
  }

  const subscribe = async (): Promise<PushSubscription | null> => {
    if (!isSupported || permission !== 'granted') return null

    try {
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      })
      
      setSubscription(sub)
      return sub
    } catch (error) {
      console.error('Error subscribing to push notifications:', error)
      return null
    }
  }

  const unsubscribe = async (): Promise<boolean> => {
    if (!subscription) return false

    try {
      const success = await subscription.unsubscribe()
      if (success) {
        setSubscription(null)
      }
      return success
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error)
      return false
    }
  }

  return {
    isSupported,
    permission,
    subscription,
    requestPermission,
    subscribe,
    unsubscribe
  }
}