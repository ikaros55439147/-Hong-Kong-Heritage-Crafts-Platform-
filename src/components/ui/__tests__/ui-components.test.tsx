import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { Button } from '../Button'
import { Input } from '../Input'
import { Card, CardHeader, CardTitle, CardContent } from '../Card'
import { Alert } from '../Alert'
import { Badge } from '../Badge'
import { LoadingSpinner, LoadingButton } from '../Loading'
import { Modal, ModalHeader, ModalBody } from '../Modal'
import { Form, FormField, FormLabel, Textarea, Select } from '../Form'

describe('UI Components', () => {
  describe('Button', () => {
    it('renders with default props', () => {
      render(<Button>Click me</Button>)
      const button = screen.getByRole('button', { name: /click me/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveClass('bg-primary-600')
    })

    it('renders different variants', () => {
      const { rerender } = render(<Button variant="secondary">Secondary</Button>)
      expect(screen.getByRole('button')).toHaveClass('bg-secondary-600')

      rerender(<Button variant="outline">Outline</Button>)
      expect(screen.getByRole('button')).toHaveClass('border-gray-300')

      rerender(<Button variant="destructive">Delete</Button>)
      expect(screen.getByRole('button')).toHaveClass('bg-red-600')
    })

    it('renders different sizes', () => {
      const { rerender } = render(<Button size="sm">Small</Button>)
      expect(screen.getByRole('button')).toHaveClass('px-3', 'py-2', 'text-sm')

      rerender(<Button size="lg">Large</Button>)
      expect(screen.getByRole('button')).toHaveClass('px-6', 'py-3', 'text-lg')
    })

    it('renders with icons', () => {
      const leftIcon = <span data-testid="left-icon">←</span>
      const rightIcon = <span data-testid="right-icon">→</span>
      
      render(
        <Button leftIcon={leftIcon} rightIcon={rightIcon}>
          With Icons
        </Button>
      )
      
      expect(screen.getByTestId('left-icon')).toBeInTheDocument()
      expect(screen.getByTestId('right-icon')).toBeInTheDocument()
    })

    it('handles click events', () => {
      const handleClick = vi.fn()
      render(<Button onClick={handleClick}>Click me</Button>)
      
      fireEvent.click(screen.getByRole('button'))
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('is disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled</Button>)
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(button).toHaveClass('disabled:opacity-50')
    })
  })

  describe('Input', () => {
    it('renders with label', () => {
      render(<Input label="Email" />)
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
    })

    it('displays error message', () => {
      render(<Input label="Email" error="Invalid email" />)
      expect(screen.getByText('Invalid email')).toBeInTheDocument()
      expect(screen.getByLabelText('Email')).toHaveClass('border-red-300')
    })

    it('displays helper text', () => {
      render(<Input label="Password" helperText="Must be at least 8 characters" />)
      expect(screen.getByText('Must be at least 8 characters')).toBeInTheDocument()
    })

    it('renders with icons', () => {
      const leftIcon = <span data-testid="left-icon">@</span>
      const rightIcon = <span data-testid="right-icon">👁</span>
      
      render(<Input leftIcon={leftIcon} rightIcon={rightIcon} />)
      
      expect(screen.getByTestId('left-icon')).toBeInTheDocument()
      expect(screen.getByTestId('right-icon')).toBeInTheDocument()
    })
  })

  describe('Card', () => {
    it('renders card with content', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Card content</p>
          </CardContent>
        </Card>
      )
      
      expect(screen.getByText('Card Title')).toBeInTheDocument()
      expect(screen.getByText('Card content')).toBeInTheDocument()
    })

    it('renders different variants', () => {
      const { rerender } = render(<Card variant="elevated" data-testid="card">Content</Card>)
      const cardElement = screen.getByTestId('card')
      expect(cardElement).toHaveClass('shadow-lg')

      rerender(<Card variant="outlined" data-testid="card">Content</Card>)
      const outlinedCardElement = screen.getByTestId('card')
      expect(outlinedCardElement).toHaveClass('border-2')
    })
  })

  describe('Alert', () => {
    it('renders different variants', () => {
      const { rerender } = render(<Alert variant="success">Success message</Alert>)
      // Find the alert container (the outermost div with the background color)
      const successAlert = screen.getByText('Success message').closest('[class*="bg-green-50"]')
      expect(successAlert).toBeInTheDocument()

      rerender(<Alert variant="error">Error message</Alert>)
      const errorAlert = screen.getByText('Error message').closest('[class*="bg-red-50"]')
      expect(errorAlert).toBeInTheDocument()

      rerender(<Alert variant="warning">Warning message</Alert>)
      const warningAlert = screen.getByText('Warning message').closest('[class*="bg-yellow-50"]')
      expect(warningAlert).toBeInTheDocument()
    })

    it('renders with title', () => {
      render(<Alert title="Alert Title" variant="info">Alert content</Alert>)
      expect(screen.getByText('Alert Title')).toBeInTheDocument()
      expect(screen.getByText('Alert content')).toBeInTheDocument()
    })

    it('handles close button', () => {
      const handleClose = vi.fn()
      render(<Alert onClose={handleClose}>Closable alert</Alert>)
      
      const closeButton = screen.getByRole('button')
      fireEvent.click(closeButton)
      expect(handleClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Badge', () => {
    it('renders with different variants', () => {
      const { rerender } = render(<Badge variant="primary">Primary</Badge>)
      expect(screen.getByText('Primary')).toHaveClass('bg-primary-100')

      rerender(<Badge variant="success">Success</Badge>)
      expect(screen.getByText('Success')).toHaveClass('bg-green-100')
    })

    it('renders different sizes', () => {
      const { rerender } = render(<Badge size="sm">Small</Badge>)
      expect(screen.getByText('Small')).toHaveClass('text-xs')

      rerender(<Badge size="lg">Large</Badge>)
      expect(screen.getByText('Large')).toHaveClass('text-base')
    })
  })

  describe('Loading Components', () => {
    it('renders loading spinner', () => {
      render(<LoadingSpinner data-testid="spinner" />)
      expect(screen.getByTestId('spinner')).toHaveClass('animate-spin')
    })

    it('renders loading button', () => {
      const { rerender } = render(<LoadingButton>Submit</LoadingButton>)
      expect(screen.getByText('Submit')).toBeInTheDocument()

      rerender(<LoadingButton isLoading loadingText="Submitting...">Submit</LoadingButton>)
      expect(screen.getByText('Submitting...')).toBeInTheDocument()
      expect(screen.getByRole('button')).toBeDisabled()
    })
  })

  describe('Modal', () => {
    it('renders when open', () => {
      render(
        <Modal isOpen onClose={() => {}}>
          <ModalHeader>Modal Title</ModalHeader>
          <ModalBody>Modal content</ModalBody>
        </Modal>
      )
      
      expect(screen.getByText('Modal Title')).toBeInTheDocument()
      expect(screen.getByText('Modal content')).toBeInTheDocument()
    })

    it('does not render when closed', () => {
      render(
        <Modal isOpen={false} onClose={() => {}}>
          <ModalBody>Modal content</ModalBody>
        </Modal>
      )
      
      expect(screen.queryByText('Modal content')).not.toBeInTheDocument()
    })

    it('calls onClose when overlay is clicked', () => {
      const handleClose = vi.fn()
      render(
        <Modal isOpen onClose={handleClose}>
          <ModalBody>Modal content</ModalBody>
        </Modal>
      )
      
      // Click on overlay (the backdrop)
      const overlay = document.querySelector('.bg-black.bg-opacity-50')
      if (overlay) {
        fireEvent.click(overlay)
        expect(handleClose).toHaveBeenCalledTimes(1)
      }
    })
  })

  describe('Form Components', () => {
    it('renders form with fields', () => {
      render(
        <Form>
          <FormField>
            <FormLabel>Name</FormLabel>
            <Input />
          </FormField>
        </Form>
      )
      
      expect(screen.getByText('Name')).toBeInTheDocument()
    })

    it('renders textarea', () => {
      render(<Textarea label="Description" placeholder="Enter description" />)
      expect(screen.getByLabelText('Description')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter description')).toBeInTheDocument()
    })

    it('renders select with options', () => {
      const options = [
        { value: 'option1', label: 'Option 1' },
        { value: 'option2', label: 'Option 2' }
      ]
      
      render(<Select label="Choose option" options={options} />)
      expect(screen.getByLabelText('Choose option')).toBeInTheDocument()
      expect(screen.getByText('Option 1')).toBeInTheDocument()
      expect(screen.getByText('Option 2')).toBeInTheDocument()
    })
  })
})