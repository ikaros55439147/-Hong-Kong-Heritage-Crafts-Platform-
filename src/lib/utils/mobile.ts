// Mobile device detection and utilities

export interface DeviceInfo {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isIOS: boolean
  isAndroid: boolean
  isSafari: boolean
  isChrome: boolean
  hasTouch: boolean
  orientation: 'portrait' | 'landscape'
  screenSize: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

export const getDeviceInfo = (): DeviceInfo => {
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isIOS: false,
      isAndroid: false,
      isSafari: false,
      isChrome: false,
      hasTouch: false,
      orientation: 'landscape',
      screenSize: 'lg'
    }
  }

  const userAgent = navigator.userAgent
  const width = window.innerWidth
  const height = window.innerHeight

  // Device type detection
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) || width < 768
  const isTablet = /iPad|Android/i.test(userAgent) && width >= 768 && width < 1024
  const isDesktop = !isMobile && !isTablet

  // OS detection
  const isIOS = /iPad|iPhone|iPod/.test(userAgent)
  const isAndroid = /Android/.test(userAgent)

  // Browser detection
  const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent)
  const isChrome = /Chrome/.test(userAgent)

  // Touch support
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0

  // Orientation
  const orientation = height > width ? 'portrait' : 'landscape'

  // Screen size
  let screenSize: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'md'
  if (width < 480) screenSize = 'xs'
  else if (width < 640) screenSize = 'sm'
  else if (width < 768) screenSize = 'md'
  else if (width < 1024) screenSize = 'lg'
  else screenSize = 'xl'

  return {
    isMobile,
    isTablet,
    isDesktop,
    isIOS,
    isAndroid,
    isSafari,
    isChrome,
    hasTouch,
    orientation,
    screenSize
  }
}

// Haptic feedback utilities
export const hapticFeedback = {
  light: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10)
    }
  },
  medium: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50)
    }
  },
  heavy: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 30, 100])
    }
  },
  success: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 25, 50])
    }
  },
  error: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100, 50, 100])
    }
  }
}

// Touch gesture utilities
export interface TouchGesture {
  startX: number
  startY: number
  endX: number
  endY: number
  deltaX: number
  deltaY: number
  distance: number
  direction: 'up' | 'down' | 'left' | 'right' | 'none'
  duration: number
}

export const detectSwipeGesture = (
  startTouch: Touch,
  endTouch: Touch,
  startTime: number,
  endTime: number,
  threshold: number = 50
): TouchGesture => {
  const deltaX = endTouch.clientX - startTouch.clientX
  const deltaY = endTouch.clientY - startTouch.clientY
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
  const duration = endTime - startTime

  let direction: TouchGesture['direction'] = 'none'
  
  if (distance > threshold) {
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      direction = deltaX > 0 ? 'right' : 'left'
    } else {
      direction = deltaY > 0 ? 'down' : 'up'
    }
  }

  return {
    startX: startTouch.clientX,
    startY: startTouch.clientY,
    endX: endTouch.clientX,
    endY: endTouch.clientY,
    deltaX,
    deltaY,
    distance,
    direction,
    duration
  }
}

// Viewport utilities
export const getViewportInfo = () => {
  if (typeof window === 'undefined') {
    return {
      width: 1024,
      height: 768,
      availableHeight: 768,
      safeAreaTop: 0,
      safeAreaBottom: 0
    }
  }

  const width = window.innerWidth
  const height = window.innerHeight
  const availableHeight = window.screen.availHeight

  // Safe area detection for devices with notches
  const safeAreaTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-top') || '0')
  const safeAreaBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom') || '0')

  return {
    width,
    height,
    availableHeight,
    safeAreaTop,
    safeAreaBottom
  }
}

// Performance utilities for mobile
export const mobilePerformance = {
  // Debounce function for touch events
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout
    return (...args: Parameters<T>) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => func(...args), wait)
    }
  },

  // Throttle function for scroll events
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args)
        inThrottle = true
        setTimeout(() => inThrottle = false, limit)
      }
    }
  },

  // Lazy loading for images
  lazyLoad: (selector: string = 'img[data-src]') => {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement
            img.src = img.dataset.src || ''
            img.classList.remove('lazy')
            imageObserver.unobserve(img)
          }
        })
      })

      document.querySelectorAll(selector).forEach(img => {
        imageObserver.observe(img)
      })
    }
  },

  // Preload critical resources
  preloadResource: (href: string, as: string = 'fetch') => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.href = href
    link.as = as
    document.head.appendChild(link)
  }
}

// Network utilities
export const networkUtils = {
  // Get connection info
  getConnectionInfo: () => {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
    
    if (!connection) {
      return {
        effectiveType: 'unknown',
        downlink: 0,
        rtt: 0,
        saveData: false
      }
    }

    return {
      effectiveType: connection.effectiveType || 'unknown',
      downlink: connection.downlink || 0,
      rtt: connection.rtt || 0,
      saveData: connection.saveData || false
    }
  },

  // Check if connection is slow
  isSlowConnection: () => {
    const connection = networkUtils.getConnectionInfo()
    return connection.effectiveType === 'slow-2g' || 
           connection.effectiveType === '2g' || 
           connection.saveData
  },

  // Adaptive loading based on connection
  shouldLoadHighQuality: () => {
    const connection = networkUtils.getConnectionInfo()
    return connection.effectiveType === '4g' && 
           !connection.saveData && 
           connection.downlink > 1.5
  }
}

// Accessibility utilities for mobile
export const a11yUtils = {
  // Announce to screen readers
  announce: (message: string) => {
    const announcement = document.createElement('div')
    announcement.setAttribute('aria-live', 'polite')
    announcement.setAttribute('aria-atomic', 'true')
    announcement.className = 'sr-only'
    announcement.textContent = message
    
    document.body.appendChild(announcement)
    
    setTimeout(() => {
      document.body.removeChild(announcement)
    }, 1000)
  },

  // Focus management
  trapFocus: (element: HTMLElement) => {
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus()
            e.preventDefault()
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus()
            e.preventDefault()
          }
        }
      }
    }

    element.addEventListener('keydown', handleTabKey)
    firstElement?.focus()

    return () => {
      element.removeEventListener('keydown', handleTabKey)
    }
  }
}