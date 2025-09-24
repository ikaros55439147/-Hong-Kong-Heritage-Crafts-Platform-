import React from 'react'
import { cn } from '@/lib/utils'

interface ResponsiveProps {
  children: React.ReactNode
  className?: string
}

// Responsive container that adapts to screen size
export const ResponsiveContainer: React.FC<ResponsiveProps> = ({
  children,
  className
}) => {
  return (
    <div className={cn('w-full mx-auto px-4 sm:px-6 lg:px-8', className)}>
      {children}
    </div>
  )
}

// Responsive grid that changes columns based on screen size
interface ResponsiveGridProps extends ResponsiveProps {
  cols?: {
    default: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
  gap?: 'sm' | 'md' | 'lg'
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  cols = { default: 1 },
  gap = 'md',
  className
}) => {
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6'
  }

  const gridClasses = [
    `grid-cols-${cols.default}`,
    cols.sm && `sm:grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`
  ].filter(Boolean).join(' ')

  return (
    <div className={cn('grid', gridClasses, gapClasses[gap], className)}>
      {children}
    </div>
  )
}

// Mobile-optimized card grid
interface MobileCardGridProps extends ResponsiveProps {
  itemMinWidth?: string
  gap?: 'sm' | 'md' | 'lg'
}

export const MobileCardGrid: React.FC<MobileCardGridProps> = ({
  children,
  itemMinWidth = '280px',
  gap = 'md',
  className
}) => {
  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6'
  }

  return (
    <div 
      className={cn(
        'grid auto-fit-grid',
        gapClasses[gap],
        className
      )}
      style={{
        gridTemplateColumns: `repeat(auto-fit, minmax(min(${itemMinWidth}, 100%), 1fr))`
      }}
    >
      {children}
    </div>
  )
}

// Mobile-first responsive layout
interface MobileFirstLayoutProps extends ResponsiveProps {
  sidebar?: React.ReactNode
  sidebarPosition?: 'left' | 'right'
  sidebarWidth?: string
  collapsible?: boolean
}

export const MobileFirstLayout: React.FC<MobileFirstLayoutProps> = ({
  children,
  sidebar,
  sidebarPosition = 'left',
  sidebarWidth = '280px',
  collapsible = true,
  className
}) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const { isMobile } = useResponsive()

  React.useEffect(() => {
    if (!isMobile) {
      setSidebarOpen(false)
    }
  }, [isMobile])

  if (!sidebar) {
    return <div className={className}>{children}</div>
  }

  return (
    <div className={cn('flex h-full', className)}>
      {/* Mobile sidebar overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'bg-white border-r border-gray-200 z-50',
          isMobile
            ? cn(
                'fixed top-0 h-full transform transition-transform duration-300 ease-in-out',
                sidebarPosition === 'left' ? 'left-0' : 'right-0',
                sidebarOpen ? 'translate-x-0' : sidebarPosition === 'left' ? '-translate-x-full' : 'translate-x-full'
              )
            : 'relative',
          sidebarPosition === 'right' && 'order-2'
        )}
        style={{ width: isMobile ? sidebarWidth : sidebarWidth }}
      >
        {sidebar}
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {/* Mobile header with sidebar toggle */}
        {isMobile && collapsible && (
          <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        )}
        
        <div className="h-full overflow-auto">
          {children}
        </div>
      </main>
    </div>
  )
}

// Responsive text that changes size based on screen
interface ResponsiveTextProps extends ResponsiveProps {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span'
  size?: {
    default: string
    sm?: string
    md?: string
    lg?: string
  }
}

export const ResponsiveText: React.FC<ResponsiveTextProps> = ({
  children,
  as: Component = 'p',
  size = { default: 'text-base' },
  className
}) => {
  const sizeClasses = [
    size.default,
    size.sm && `sm:${size.sm}`,
    size.md && `md:${size.md}`,
    size.lg && `lg:${size.lg}`
  ].filter(Boolean).join(' ')

  return (
    <Component className={cn(sizeClasses, className)}>
      {children}
    </Component>
  )
}

// Mobile-first responsive utilities
export const useResponsive = () => {
  const [screenSize, setScreenSize] = React.useState<'sm' | 'md' | 'lg' | 'xl'>('md')
  const [isHydrated, setIsHydrated] = React.useState(false)

  React.useEffect(() => {
    setIsHydrated(true)
    
    const updateScreenSize = () => {
      const width = window.innerWidth
      if (width < 640) setScreenSize('sm')
      else if (width < 768) setScreenSize('md')
      else if (width < 1024) setScreenSize('lg')
      else setScreenSize('xl')
    }

    updateScreenSize()
    window.addEventListener('resize', updateScreenSize)
    return () => window.removeEventListener('resize', updateScreenSize)
  }, [])

  // During SSR, assume desktop to avoid hydration mismatch
  const currentScreenSize = isHydrated ? screenSize : 'lg'

  return {
    screenSize: currentScreenSize,
    isMobile: currentScreenSize === 'sm',
    isTablet: currentScreenSize === 'md',
    isDesktop: currentScreenSize === 'lg' || currentScreenSize === 'xl',
    isHydrated
  }
}

// Responsive image component
interface ResponsiveImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
  sizes?: string
  priority?: boolean
}

export const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  src,
  alt,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  className,
  ...props
}) => {
  return (
    <img
      src={src}
      alt={alt}
      className={cn('w-full h-auto object-cover', className)}
      loading="lazy"
      {...props}
    />
  )
}

// Responsive spacing utilities
export const responsiveSpacing = {
  // Padding
  p: {
    sm: 'p-2 sm:p-3 md:p-4 lg:p-6',
    md: 'p-4 sm:p-6 md:p-8 lg:p-10',
    lg: 'p-6 sm:p-8 md:p-12 lg:p-16'
  },
  // Margin
  m: {
    sm: 'm-2 sm:m-3 md:m-4 lg:m-6',
    md: 'm-4 sm:m-6 md:m-8 lg:m-10',
    lg: 'm-6 sm:m-8 md:m-12 lg:m-16'
  },
  // Gap
  gap: {
    sm: 'gap-2 sm:gap-3 md:gap-4 lg:gap-6',
    md: 'gap-4 sm:gap-6 md:gap-8 lg:gap-10',
    lg: 'gap-6 sm:gap-8 md:gap-12 lg:gap-16'
  }
}

// Responsive breakpoint utilities
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
}

// Media query hook
export const useMediaQuery = (query: string) => {
  const [matches, setMatches] = React.useState(false)

  React.useEffect(() => {
    const media = window.matchMedia(query)
    if (media.matches !== matches) {
      setMatches(media.matches)
    }
    
    const listener = () => setMatches(media.matches)
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [matches, query])

  return matches
}