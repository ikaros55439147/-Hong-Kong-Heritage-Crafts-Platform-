import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface DropdownProps {
  trigger: React.ReactNode
  children: React.ReactNode
  align?: 'left' | 'right'
  className?: string
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  children,
  align = 'left',
  className
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  return (
    <div className={cn('relative inline-block text-left', className)} ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>
      
      {isOpen && (
        <div
          className={cn(
            'absolute z-10 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          <div className="py-1">
            {children}
          </div>
        </div>
      )}
    </div>
  )
}

interface DropdownItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  icon?: React.ReactNode
  destructive?: boolean
}

export const DropdownItem: React.FC<DropdownItemProps> = ({
  children,
  icon,
  destructive = false,
  className,
  ...props
}) => {
  return (
    <button
      className={cn(
        'group flex items-center w-full px-4 py-2 text-sm text-left hover:bg-gray-100 focus:outline-none focus:bg-gray-100',
        destructive ? 'text-red-700 hover:bg-red-50 focus:bg-red-50' : 'text-gray-700',
        className
      )}
      {...props}
    >
      {icon && <span className="mr-3 h-5 w-5">{icon}</span>}
      {children}
    </button>
  )
}

interface DropdownSeparatorProps {
  className?: string
}

export const DropdownSeparator: React.FC<DropdownSeparatorProps> = ({
  className
}) => {
  return <div className={cn('border-t border-gray-100 my-1', className)} />
}