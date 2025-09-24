import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi } from 'vitest'

import { TouchButton } from '../TouchOptimized'
import { MobileSelect } from '../MobileForms'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  usePathname: () => '/'
}))

describe('Mobile Basic Components', () => {
  describe('TouchButton', () => {
    it('renders correctly with mobile-optimized classes', () => {
      render(
        <TouchButton data-testid="touch-button">
          Test Button
        </TouchButton>
      )
      
      const button = screen.getByTestId('touch-button')
      expect(button).toBeInTheDocument()
      expect(button).toHaveClass('min-h-[44px]') // Touch-friendly minimum height
    })

    it('applies correct size classes', () => {
      render(
        <TouchButton size="lg" data-testid="large-button">
          Large Button
        </TouchButton>
      )
      
      const button = screen.getByTestId('large-button')
      expect(button).toHaveClass('min-h-[48px]')
    })
  })

  describe('MobileSelect', () => {
    const options = [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' }
    ]

    it('renders with placeholder', () => {
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

    it('displays selected value', () => {
      render(
        <MobileSelect
          options={options}
          value="option1"
          onChange={vi.fn()}
        />
      )
      
      expect(screen.getByText('Option 1')).toBeInTheDocument()
    })
  })
})

describe('Mobile Responsive Features', () => {
  it('applies touch-friendly minimum heights', () => {
    render(
      <div>
        <TouchButton data-testid="button">Button</TouchButton>
        <input 
          className="min-h-[44px]" 
          data-testid="input"
        />
      </div>
    )
    
    const button = screen.getByTestId('button')
    const input = screen.getByTestId('input')
    
    expect(button).toHaveClass('min-h-[44px]')
    expect(input).toHaveClass('min-h-[44px]')
  })
})