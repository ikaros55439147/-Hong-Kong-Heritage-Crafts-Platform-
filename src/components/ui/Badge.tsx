import React from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  children,
  className,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center font-medium rounded-full'
  
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800',
    primary: 'bg-primary-100 text-primary-800',
    secondary: 'bg-secondary-100 text-secondary-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800'
  }
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-sm',
    lg: 'px-3 py-1 text-base'
  }
  
  return (
    <span
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'pending' | 'completed' | 'cancelled'
  className?: string
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className
}) => {
  const statusConfig = {
    active: { variant: 'success' as const, label: '活躍' },
    inactive: { variant: 'default' as const, label: '非活躍' },
    pending: { variant: 'warning' as const, label: '待處理' },
    completed: { variant: 'success' as const, label: '已完成' },
    cancelled: { variant: 'error' as const, label: '已取消' }
  }
  
  const config = statusConfig[status]
  
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  )
}