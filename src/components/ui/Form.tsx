import React from 'react'
import { cn } from '@/lib/utils'

interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode
}

export const Form: React.FC<FormProps> = ({
  children,
  className,
  ...props
}) => {
  return (
    <form className={cn('space-y-6', className)} {...props}>
      {children}
    </form>
  )
}

interface FormFieldProps {
  children: React.ReactNode
  className?: string
}

export const FormField: React.FC<FormFieldProps> = ({
  children,
  className
}) => {
  return (
    <div className={cn('space-y-1', className)}>
      {children}
    </div>
  )
}

interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode
  required?: boolean
}

export const FormLabel: React.FC<FormLabelProps> = ({
  children,
  required,
  className,
  ...props
}) => {
  return (
    <label
      className={cn(
        'block text-sm font-medium text-gray-700',
        className
      )}
      {...props}
    >
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  )
}

interface FormErrorProps {
  children: React.ReactNode
  className?: string
}

export const FormError: React.FC<FormErrorProps> = ({
  children,
  className
}) => {
  return (
    <p className={cn('text-sm text-red-600', className)}>
      {children}
    </p>
  )
}

interface FormHelperTextProps {
  children: React.ReactNode
  className?: string
}

export const FormHelperText: React.FC<FormHelperTextProps> = ({
  children,
  className
}) => {
  return (
    <p className={cn('text-sm text-gray-500', className)}>
      {children}
    </p>
  )
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className, id, ...props }, ref) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`
    
    return (
      <FormField>
        {label && <FormLabel htmlFor={textareaId}>{label}</FormLabel>}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            'block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
            'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
            'sm:text-sm resize-vertical',
            error && 'border-red-300 focus:ring-red-500 focus:border-red-500',
            className
          )}
          {...props}
        />
        {error && <FormError>{error}</FormError>}
        {helperText && !error && <FormHelperText>{helperText}</FormHelperText>}
      </FormField>
    )
  }
)

Textarea.displayName = 'Textarea'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  helperText?: string
  placeholder?: string
  options?: Array<{ value: string; label: string; disabled?: boolean }>
  children?: React.ReactNode
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, placeholder, options, children, className, id, ...props }, ref) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`
    
    return (
      <FormField>
        {label && <FormLabel htmlFor={selectId}>{label}</FormLabel>}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
            'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
            'sm:text-sm',
            error && 'border-red-300 focus:ring-red-500 focus:border-red-500',
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options?.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
          {children}
        </select>
        {error && <FormError>{error}</FormError>}
        {helperText && !error && <FormHelperText>{helperText}</FormHelperText>}
      </FormField>
    )
  }
)

Select.displayName = 'Select'

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  description?: string
  error?: string
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, error, className, ...props }, ref) => {
    return (
      <FormField>
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              ref={ref}
              type="checkbox"
              className={cn(
                'h-4 w-4 text-primary-600 border-gray-300 rounded',
                'focus:ring-2 focus:ring-primary-500',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                error && 'border-red-300',
                className
              )}
              {...props}
            />
          </div>
          <div className="ml-3 text-sm">
            <label className="font-medium text-gray-700">
              {label}
            </label>
            {description && (
              <p className="text-gray-500">{description}</p>
            )}
          </div>
        </div>
        {error && <FormError>{error}</FormError>}
      </FormField>
    )
  }
)

Checkbox.displayName = 'Checkbox'

interface RadioGroupProps {
  label?: string
  name: string
  options: Array<{ value: string; label: string; description?: string }>
  value?: string
  onChange?: (value: string) => void
  error?: string
  className?: string
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  label,
  name,
  options,
  value,
  onChange,
  error,
  className
}) => {
  return (
    <FormField className={className}>
      {label && <FormLabel>{label}</FormLabel>}
      <div className="space-y-3">
        {options.map((option) => (
          <div key={option.value} className="flex items-start">
            <div className="flex items-center h-5">
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={value === option.value}
                onChange={(e) => onChange?.(e.target.value)}
                className={cn(
                  'h-4 w-4 text-primary-600 border-gray-300',
                  'focus:ring-2 focus:ring-primary-500',
                  error && 'border-red-300'
                )}
              />
            </div>
            <div className="ml-3 text-sm">
              <label className="font-medium text-gray-700">
                {option.label}
              </label>
              {option.description && (
                <p className="text-gray-500">{option.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
      {error && <FormError>{error}</FormError>}
    </FormField>
  )
}