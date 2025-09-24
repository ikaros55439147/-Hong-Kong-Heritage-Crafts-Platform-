import React, { useState } from 'react'
import { cn } from '@/lib/utils'

interface NavigationProps {
  children: React.ReactNode
  className?: string
}

export const Navigation: React.FC<NavigationProps> = ({
  children,
  className
}) => {
  return (
    <nav className={cn('bg-white shadow-sm border-b border-gray-200', className)}>
      {children}
    </nav>
  )
}

interface NavbarProps {
  brand?: React.ReactNode
  children?: React.ReactNode
  className?: string
}

export const Navbar: React.FC<NavbarProps> = ({
  brand,
  children,
  className
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  return (
    <div className={cn('max-w-7xl mx-auto px-4 sm:px-6 lg:px-8', className)}>
      <div className="flex justify-between items-center h-16">
        {/* Brand */}
        {brand && (
          <div className="flex-shrink-0">
            {brand}
          </div>
        )}
        
        {/* Desktop Navigation */}
        <div className="hidden md:block">
          <div className="ml-10 flex items-baseline space-x-4">
            {children}
          </div>
        </div>
        
        {/* Mobile menu button */}
        <div className="md:hidden">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
          >
            <span className="sr-only">開啟主選單</span>
            {isMobileMenuOpen ? (
              <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>
      
      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200">
            {children}
          </div>
        </div>
      )}
    </div>
  )
}

interface NavLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  children: React.ReactNode
  active?: boolean
  mobile?: boolean
}

export const NavLink: React.FC<NavLinkProps> = ({
  children,
  active = false,
  mobile = false,
  className,
  ...props
}) => {
  const baseClasses = 'font-medium transition-colors duration-200'
  
  const desktopClasses = active
    ? 'text-primary-600 border-b-2 border-primary-600 pb-1'
    : 'text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300 pb-1'
    
  const mobileClasses = active
    ? 'bg-primary-50 border-primary-500 text-primary-700 block px-3 py-2 rounded-md text-base border-l-4'
    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800 block px-3 py-2 rounded-md text-base'
  
  return (
    <a
      className={cn(
        baseClasses,
        mobile ? mobileClasses : desktopClasses,
        className
      )}
      {...props}
    >
      {children}
    </a>
  )
}

interface BreadcrumbProps {
  items: Array<{
    label: string
    href?: string
    current?: boolean
  }>
  className?: string
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  className
}) => {
  return (
    <nav className={cn('flex', className)} aria-label="麵包屑導航">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        {items.map((item, index) => (
          <li key={index} className="inline-flex items-center">
            {index > 0 && (
              <svg
                className="w-6 h-6 text-gray-400 mx-1"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            {item.href && !item.current ? (
              <a
                href={item.href}
                className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-primary-600"
              >
                {item.label}
              </a>
            ) : (
              <span
                className={cn(
                  'inline-flex items-center text-sm font-medium',
                  item.current ? 'text-gray-500' : 'text-gray-700'
                )}
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}