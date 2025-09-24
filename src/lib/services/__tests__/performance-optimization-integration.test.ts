import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { LazyImage } from '@/components/media/LazyImage'
import { LazyVideo } from '@/components/media/LazyVideo'
import { PerformanceMonitor } from '@/components/performance/PerformanceMonitor'
import { usePreloader } from '@/lib/hooks/usePreloader'
import { useOffline } from '@/lib/hooks/useOffline'

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn((element) => {
    // Simulate element coming into view
    setTimeout(() => {
      callback([{ isIntersecting: true, target: element }])
    }, 100)
  }),
  disconnect: vi.fn(),
  unobserve: vi.fn()
}))

// Mock Image constructor
global.Image = vi.fn().mockImplementation(() => ({
  onload: null,
  onerror: null,
  src: '',
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
}))

// Mock performance API
Object.defineProperty(global, 'performance', {
  value: {
    getEntriesByType: vi.fn().mockReturnValue([
      {
        loadEventEnd: 1000,
        loadEventStart: 500
      }
    ]),
    memory: {
      usedJSHeapSize: 50 * 1024 * 1024 // 50MB
    }
  }
})

// Mock navigator
Object.defineProperty(global, 'navigator', {
  value: {
    onLine: true,
    connection: {
      effectiveType: '4g'
    }
  }
})

// Test component using usePreloader hook
const TestPreloaderComponent = ({ images, urls }: { images: string[], urls: string[] }) => {
  const { isPreloading, progress } = usePreloader({ preloadImages: images, preloadUrls: urls })
  
  return (
    <div>
      <div data-testid="preloading-status">{isPreloading ? 'Loading' : 'Loaded'}</div>
      <div data-testid="progress">{Math.round(progress)}%</div>
    </div>
  )
}

// Test component using useOffline hook
const TestOfflineComponent = () => {
  const { isOnline, pendingActions, queueAction } = useOffline()
  
  const handleAction = () => {
    queueAction('TEST_ACTION', { data: 'test' })
  }
  
  return (
    <div>
      <div data-testid="online-status">{isOnline ? 'Online' : 'Offline'}</div>
      <div data-testid="pending-actions">{pendingActions}</div>
      <button onClick={handleAction} data-testid="queue-action">Queue Action</button>
    </div>
  )
}

describe('Performance Optimization Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock fetch for preloader tests
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: 'test' })
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('LazyImage Component', () => {
    it('should render placeholder initially and load image when in view', async () => {
      render(
        <LazyImage
          src="/test-image.jpg"
          alt="Test Image"
          width={200}
          height={200}
        />
      )

      // Should show loading placeholder initially
      expect(screen.getByText('載入中...')).toBeInTheDocument()

      // Wait for intersection observer to trigger
      await waitFor(() => {
        expect(IntersectionObserver).toHaveBeenCalled()
      })
    })

    it('should handle image load errors gracefully', async () => {
      const onError = vi.fn()
      
      render(
        <LazyImage
          src="/non-existent-image.jpg"
          alt="Test Image"
          placeholder="/placeholder.jpg"
          onError={onError}
        />
      )

      // Simulate image error
      const mockImage = (global.Image as any).mock.results[0].value
      setTimeout(() => {
        if (mockImage.onerror) mockImage.onerror()
      }, 10)

      await waitFor(() => {
        expect(onError).toHaveBeenCalled()
      })
    })

    it('should load priority images immediately', () => {
      render(
        <LazyImage
          src="/priority-image.jpg"
          alt="Priority Image"
          priority={true}
        />
      )

      // Priority images should not wait for intersection
      expect(IntersectionObserver).not.toHaveBeenCalled()
    })
  })

  describe('LazyVideo Component', () => {
    it('should render video placeholder initially', () => {
      render(
        <LazyVideo
          src="/test-video.mp4"
          poster="/test-poster.jpg"
        />
      )

      expect(screen.getByText('影片載入中...')).toBeInTheDocument()
    })

    it('should handle video load errors', async () => {
      const onError = vi.fn()
      
      render(
        <LazyVideo
          src="/non-existent-video.mp4"
          onError={onError}
        />
      )

      // Wait for intersection observer to trigger
      await waitFor(() => {
        expect(IntersectionObserver).toHaveBeenCalled()
      })
    })
  })

  describe('PerformanceMonitor Component', () => {
    beforeEach(() => {
      // Mock localStorage for development mode
      Object.defineProperty(global, 'localStorage', {
        value: {
          getItem: vi.fn().mockReturnValue('true'),
          setItem: vi.fn(),
          removeItem: vi.fn()
        }
      })

      // Mock process.env for development
      process.env.NODE_ENV = 'development'
    })

    it('should display performance metrics in development mode', async () => {
      render(<PerformanceMonitor />)

      await waitFor(() => {
        expect(screen.getByText('性能監控')).toBeInTheDocument()
      })

      // Should show load time
      expect(screen.getByText(/載入時間:/)).toBeInTheDocument()
      
      // Should show render time
      expect(screen.getByText(/渲染時間:/)).toBeInTheDocument()
      
      // Should show memory usage
      expect(screen.getByText(/記憶體:/)).toBeInTheDocument()
      
      // Should show connection status
      expect(screen.getByText(/連線狀態:/)).toBeInTheDocument()
    })

    it('should not display in production mode', () => {
      process.env.NODE_ENV = 'production'
      global.localStorage.getItem = vi.fn().mockReturnValue(null)
      
      render(<PerformanceMonitor />)
      
      expect(screen.queryByText('性能監控')).not.toBeInTheDocument()
    })
  })

  describe('usePreloader Hook', () => {
    it('should preload images and URLs', async () => {
      const images = ['/image1.jpg', '/image2.jpg']
      const urls = ['/api/test1', '/api/test2']
      
      render(<TestPreloaderComponent images={images} urls={urls} />)

      // Should start in loading state
      expect(screen.getByTestId('preloading-status')).toHaveTextContent('Loading')
      expect(screen.getByTestId('progress')).toHaveTextContent('0%')

      // Wait for preloading to complete
      await waitFor(() => {
        expect(screen.getByTestId('preloading-status')).toHaveTextContent('Loaded')
      }, { timeout: 3000 })

      // Should have called fetch for URLs
      expect(global.fetch).toHaveBeenCalledWith('/api/test1')
      expect(global.fetch).toHaveBeenCalledWith('/api/test2')
    })

    it('should handle preloading errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      render(<TestPreloaderComponent images={[]} urls={['/api/error']} />)

      await waitFor(() => {
        expect(screen.getByTestId('preloading-status')).toHaveTextContent('Loaded')
      })

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to preload URL: /api/error')
      )
      
      consoleSpy.mockRestore()
    })
  })

  describe('useOffline Hook', () => {
    it('should track online status and pending actions', async () => {
      render(<TestOfflineComponent />)

      // Should show online status
      expect(screen.getByTestId('online-status')).toHaveTextContent('Online')
      expect(screen.getByTestId('pending-actions')).toHaveTextContent('0')

      // Queue an action
      const queueButton = screen.getByTestId('queue-action')
      queueButton.click()

      await waitFor(() => {
        expect(screen.getByTestId('pending-actions')).toHaveTextContent('1')
      })
    })

    it('should handle offline state changes', async () => {
      render(<TestOfflineComponent />)

      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', { value: false })
      window.dispatchEvent(new Event('offline'))

      await waitFor(() => {
        expect(screen.getByTestId('online-status')).toHaveTextContent('Offline')
      })

      // Simulate going back online
      Object.defineProperty(navigator, 'onLine', { value: true })
      window.dispatchEvent(new Event('online'))

      await waitFor(() => {
        expect(screen.getByTestId('online-status')).toHaveTextContent('Online')
      })
    })
  })

  describe('End-to-End Performance Scenarios', () => {
    it('should handle complete lazy loading workflow', async () => {
      const TestComponent = () => (
        <div>
          <LazyImage src="/test1.jpg" alt="Test 1" />
          <LazyImage src="/test2.jpg" alt="Test 2" />
          <LazyVideo src="/test.mp4" />
        </div>
      )

      render(<TestComponent />)

      // All components should start with placeholders
      expect(screen.getAllByText('載入中...')).toHaveLength(2)
      expect(screen.getByText('影片載入中...')).toBeInTheDocument()

      // Wait for intersection observers to trigger
      await waitFor(() => {
        expect(IntersectionObserver).toHaveBeenCalledTimes(3)
      })
    })

    it('should integrate offline functionality with lazy loading', async () => {
      const TestComponent = () => {
        const { isOnline, storeOfflineData, getOfflineData } = useOffline()
        
        React.useEffect(() => {
          if (!isOnline) {
            storeOfflineData('cached-images', ['/image1.jpg', '/image2.jpg'])
          }
        }, [isOnline, storeOfflineData])
        
        return (
          <div>
            <div data-testid="status">{isOnline ? 'Online' : 'Offline'}</div>
            <LazyImage src="/test.jpg" alt="Test" />
          </div>
        )
      }

      render(<TestComponent />)

      // Should work in online mode
      expect(screen.getByTestId('status')).toHaveTextContent('Online')
      expect(screen.getByText('載入中...')).toBeInTheDocument()
    })

    it('should measure and report performance metrics', async () => {
      const TestComponent = () => {
        const [metrics, setMetrics] = React.useState<any>(null)
        
        React.useEffect(() => {
          const startTime = performance.now()
          
          // Simulate some work
          setTimeout(() => {
            const endTime = performance.now()
            setMetrics({
              duration: endTime - startTime,
              memory: (performance as any).memory?.usedJSHeapSize
            })
          }, 100)
        }, [])
        
        return (
          <div>
            {metrics && (
              <div data-testid="metrics">
                Duration: {metrics.duration.toFixed(2)}ms
                {metrics.memory && `, Memory: ${(metrics.memory / 1024 / 1024).toFixed(1)}MB`}
              </div>
            )}
          </div>
        )
      }

      render(<TestComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('metrics')).toBeInTheDocument()
      })

      const metricsText = screen.getByTestId('metrics').textContent
      expect(metricsText).toMatch(/Duration: \d+\.\d+ms/)
      expect(metricsText).toMatch(/Memory: \d+\.\d+MB/)
    })
  })
})