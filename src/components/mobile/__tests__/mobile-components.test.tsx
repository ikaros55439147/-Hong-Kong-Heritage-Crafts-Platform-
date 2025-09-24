import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

import { MobileNavigation } from '../MobileNavigation'
import { TouchButton, SwipeableCard, PullToRefresh } from '../TouchOptimized'
import { PWAInstall } from '../PWAInstall'
import { MobileSelect, MobileTextarea } from '../MobileForms'

// Mock navigation items for testing
const mockNavItems = [
  {
    href: '/',
    label: '首頁',
    icon: <div data-testid="home-icon">Home</div>
  },
  {
    href: '/courses',
    label: '課程',
    icon: <div data-testid="courses-icon">Courses</div>,
    badge: 3
  }
]

import { vi } from 'vitest'
import { it } from 'node:test'
import { describe } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { beforeEach } from 'node:test'
import { describe } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { describe } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { describe } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { describe } from 'node:test'
import { it } from 'node:test'
import { describe } from 'node:test'
import { it } from 'node:test'
import { describe } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { describe } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { describe } from 'node:test'
import { describe } from 'node:test'

// Mock PWA hooks
vi.mock('@/lib/hooks/usePWA', () => ({
  usePWA: () => ({
    canInstall: true,
    isInstalled: false,
    installApp: vi.fn().mockResolvedValue(true)
  })
}))

// Mock Next.js router
vi.mock('next/navigation', () => ({
  usePathname: () => '/'
}))

describe('Mobile Components', () => {
  describe('MobileNavigation', () => {
    it('renders navigation items correctly', () => {
      render(<MobileNavigation items={mockNavItems} />)
      
      expect(screen.getByText('首頁')).toBeInTheDocument()
      expect(screen.getByText('課程')).toBeInTheDocument()
      expect(screen.getByTestId('home-icon')).toBeInTheDocument()
      expect(screen.getByTestId('courses-icon')).toBeInTheDocument()
    })

    it('displays badge when provided', () => {
      render(<MobileNavigation items={mockNavItems} />)
      
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('highlights active navigation item', () => {
      render(<MobileNavigation items={mockNavItems} />)
      
      const homeLink = screen.getByText('首頁').closest('a')
      expect(homeLink).toHaveClass('text-primary-600')
    })
  })

  describe('TouchButton', () => {
    it('renders with correct size classes', () => {
      render(
        <TouchButton size="lg" data-testid="touch-button">
          Test Button
        </TouchButton>
      )
      
      const button = screen.getByTestId('touch-button')
      expect(button).toHaveClass('min-h-[48px]')
    })

    it('handles touch events', async () => {
      const onTouchStart = vi.fn()
      const onTouchEnd = vi.fn()
      
      render(
        <TouchButton
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          data-testid="touch-button"
        >
          Test Button
        </TouchButton>
      )
      
      const button = screen.getByTestId('touch-button')
      
      fireEvent.touchStart(button)
      expect(onTouchStart).toHaveBeenCalled()
      
      fireEvent.touchEnd(button)
      expect(onTouchEnd).toHaveBeenCalled()
    })

    it('applies pressed state during touch', () => {
      render(
        <TouchButton data-testid="touch-button">
          Test Button
        </TouchButton>
      )
      
      const button = screen.getByTestId('touch-button')
      
      fireEvent.touchStart(button)
      expect(button).toHaveClass('scale-95')
      
      fireEvent.touchEnd(button)
      expect(button).not.toHaveClass('scale-95')
    })
  })

  describe('SwipeableCard', () => {
    it('handles swipe gestures', () => {
      const onSwipeLeft = vi.fn()
      const onSwipeRight = vi.fn()
      
      render(
        <SwipeableCard
          onSwipeLeft={onSwipeLeft}
          onSwipeRight={onSwipeRight}
          data-testid="swipeable-card"
        >
          <div>Swipeable Content</div>
        </SwipeableCard>
      )
      
      const card = screen.getByTestId('swipeable-card')
      
      // Simulate swipe right
      fireEvent.touchStart(card, {
        touches: [{ clientX: 0, clientY: 0 }]
      })
      fireEvent.touchMove(card, {
        touches: [{ clientX: 150, clientY: 0 }]
      })
      fireEvent.touchEnd(card)
      
      expect(onSwipeRight).toHaveBeenCalled()
    })
  })

  describe('PullToRefresh', () => {
    it('triggers refresh on pull down', async () => {
      const onRefresh = vi.fn().mockResolvedValue(undefined)
      
      render(
        <PullToRefresh onRefresh={onRefresh} data-testid="pull-refresh">
          <div>Content</div>
        </PullToRefresh>
      )
      
      const container = screen.getByTestId('pull-refresh')
      
      // Simulate pull down gesture
      fireEvent.touchStart(container, {
        touches: [{ clientY: 0 }]
      })
      fireEvent.touchMove(container, {
        touches: [{ clientY: 100 }]
      })
      fireEvent.touchEnd(container)
      
      await waitFor(() => {
        expect(onRefresh).toHaveBeenCalled()
      })
    })
  })

  describe('PWAInstall', () => {
    it('renders install prompt when installable', () => {
      render(<PWAInstall />)
      
      expect(screen.getByText('安裝傳承平台應用程式')).toBeInTheDocument()
      expect(screen.getByText('安裝到主畫面，享受更好的使用體驗')).toBeInTheDocument()
    })

    it('handles install button click', async () => {
      const user = userEvent.setup()
      
      render(<PWAInstall />)
      
      const installButton = screen.getByText('安裝')
      await user.click(installButton)
      
      expect(screen.getByText('安裝中...')).toBeInTheDocument()
    })
  })

  describe('MobileSelect', () => {
    const options = [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' }
    ]

    it('renders with placeholder when no value selected', () => {
      render(
        <MobileSelect
          options={options}
          value=""
          onChange={vi.fn()}
          placeholder="Select an option"
        />
      )
      
      expect(screen.getByText('Select an option')).toBeInTheDocument()
    })

    it('opens dropdown on click', async () => {
      const user = userEvent.setup()
      
      render(
        <MobileSelect
          options={options}
          value=""
          onChange={vi.fn()}
        />
      )
      
      const selectButton = screen.getByRole('button')
      await user.click(selectButton)
      
      expect(screen.getByText('Option 1')).toBeInTheDocument()
      expect(screen.getByText('Option 2')).toBeInTheDocument()
    })

    it('calls onChange when option selected', async () => {
      const onChange = vi.fn()
      const user = userEvent.setup()
      
      render(
        <MobileSelect
          options={options}
          value=""
          onChange={onChange}
        />
      )
      
      const selectButton = screen.getByRole('button')
      await user.click(selectButton)
      
      const option1 = screen.getByText('Option 1')
      await user.click(option1)
      
      expect(onChange).toHaveBeenCalledWith('option1')
    })
  })

  describe('MobileTextarea', () => {
    it('auto-resizes when autoResize is enabled', () => {
      render(
        <MobileTextarea
          autoResize={true}
          data-testid="mobile-textarea"
        />
      )
      
      const textarea = screen.getByTestId('mobile-textarea')
      
      // Simulate typing to trigger resize
      fireEvent.change(textarea, {
        target: { value: 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5' }
      })
      
      // Check that height style is applied
      expect(textarea.style.height).toBeTruthy()
    })

    it('displays error message when provided', () => {
      render(
        <MobileTextarea
          error="This field is required"
          data-testid="mobile-textarea"
        />
      )
      
      expect(screen.getByText('This field is required')).toBeInTheDocument()
    })
  })
})

// Responsive behavior tests
describe('Mobile Responsive Behavior', () => {
  beforeEach(() => {
    // Mock window.innerWidth for mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375
    })
    
    // Mock window.innerHeight for mobile viewport
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 667
    })
  })

  it('applies mobile-specific classes on small screens', () => {
    render(
      <div className="hidden md:block" data-testid="desktop-only">
        Desktop Only
      </div>
    )
    
    const element = screen.getByTestId('desktop-only')
    expect(element).toHaveClass('hidden', 'md:block')
  })

  it('handles touch events properly on mobile', () => {
    const onTouch = vi.fn()
    
    render(
      <div
        onTouchStart={onTouch}
        data-testid="touch-element"
      >
        Touch me
      </div>
    )
    
    const element = screen.getByTestId('touch-element')
    fireEvent.touchStart(element)
    
    expect(onTouch).toHaveBeenCalled()
  })
})

// Performance tests for mobile
describe('Mobile Performance', () => {
  it('debounces rapid touch events', async () => {
    vi.useFakeTimers()
    const callback = vi.fn()
    
    // Mock debounce function
    const debounce = (fn: Function, delay: number) => {
      let timeoutId: NodeJS.Timeout
      return (...args: any[]) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => fn(...args), delay)
      }
    }
    
    const debouncedCallback = debounce(callback, 100)
    
    // Trigger multiple rapid calls
    debouncedCallback()
    debouncedCallback()
    debouncedCallback()
    
    // Fast-forward time
    vi.advanceTimersByTime(100)
    
    // Should only be called once
    expect(callback).toHaveBeenCalledTimes(1)
    
    vi.useRealTimers()
  })
})