import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { chromium, Browser, Page, BrowserContext } from '@playwright/test'

describe('End-to-End User Flows', () => {
  let browser: Browser
  let context: BrowserContext
  let page: Page
  const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000'

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true })
    context = await browser.newContext()
    page = await context.newPage()
  })

  afterAll(async () => {
    await browser.close()
  })

  describe('User Registration and Authentication Flow', () => {
    it('should complete user registration flow', async () => {
      // Navigate to registration page
      await page.goto(`${baseURL}/auth/register`)
      
      // Fill registration form
      await page.fill('[data-testid=email-input]', 'e2etest@example.com')
      await page.fill('[data-testid=password-input]', 'testpassword123')
      await page.selectOption('[data-testid=role-select]', 'learner')
      await page.selectOption('[data-testid=language-select]', 'zh-HK')
      
      // Submit form
      await page.click('[data-testid=register-button]')
      
      // Verify successful registration
      await expect(page.locator('[data-testid=success-message]')).toBeVisible()
      await expect(page).toHaveURL(`${baseURL}/dashboard`)
    })

    it('should login with valid credentials', async () => {
      // Navigate to login page
      await page.goto(`${baseURL}/auth/login`)
      
      // Fill login form
      await page.fill('[data-testid=email-input]', 'e2etest@example.com')
      await page.fill('[data-testid=password-input]', 'testpassword123')
      
      // Submit form
      await page.click('[data-testid=login-button]')
      
      // Verify successful login
      await expect(page).toHaveURL(`${baseURL}/dashboard`)
      await expect(page.locator('[data-testid=user-menu]')).toBeVisible()
    })

    it('should handle login with invalid credentials', async () => {
      await page.goto(`${baseURL}/auth/login`)
      
      await page.fill('[data-testid=email-input]', 'invalid@example.com')
      await page.fill('[data-testid=password-input]', 'wrongpassword')
      await page.click('[data-testid=login-button]')
      
      // Verify error message
      await expect(page.locator('[data-testid=error-message]')).toBeVisible()
      await expect(page.locator('[data-testid=error-message]')).toContainText('Invalid credentials')
    })
  })

  describe('Course Discovery and Booking Flow', () => {
    it('should complete course booking flow', async () => {
      // Login first
      await page.goto(`${baseURL}/auth/login`)
      await page.fill('[data-testid=email-input]', 'e2etest@example.com')
      await page.fill('[data-testid=password-input]', 'testpassword123')
      await page.click('[data-testid=login-button]')
      
      // Navigate to courses page
      await page.goto(`${baseURL}/courses`)
      
      // Search for specific craft
      await page.fill('[data-testid=search-input]', '手雕麻將')
      await page.click('[data-testid=search-button]')
      
      // Wait for search results
      await page.waitForSelector('[data-testid=course-card]')
      
      // Click on first course
      await page.click('[data-testid=course-card]:first-child')
      
      // Verify course details page
      await expect(page.locator('[data-testid=course-title]')).toBeVisible()
      await expect(page.locator('[data-testid=course-description]')).toBeVisible()
      
      // Book the course
      await page.click('[data-testid=book-course-button]')
      
      // Fill booking form
      await page.fill('[data-testid=booking-notes]', '我是初學者，希望學習基礎技巧')
      await page.click('[data-testid=confirm-booking-button]')
      
      // Verify booking success
      await expect(page.locator('[data-testid=booking-success]')).toBeVisible()
      await expect(page.locator('[data-testid=booking-confirmation]')).toContainText('預約成功')
    })

    it('should handle course with waitlist', async () => {
      // Navigate to a full course
      await page.goto(`${baseURL}/courses/full-course-id`)
      
      // Try to book
      await page.click('[data-testid=book-course-button]')
      
      // Should show waitlist option
      await expect(page.locator('[data-testid=waitlist-message]')).toBeVisible()
      await page.click('[data-testid=join-waitlist-button]')
      
      // Verify waitlist confirmation
      await expect(page.locator('[data-testid=waitlist-success]')).toBeVisible()
    })
  })

  describe('Product Purchase Flow', () => {
    it('should complete product purchase flow', async () => {
      // Navigate to products page
      await page.goto(`${baseURL}/products`)
      
      // Filter by category
      await page.selectOption('[data-testid=category-filter]', 'mahjong')
      
      // Click on a product
      await page.click('[data-testid=product-card]:first-child')
      
      // Verify product details
      await expect(page.locator('[data-testid=product-name]')).toBeVisible()
      await expect(page.locator('[data-testid=product-price]')).toBeVisible()
      
      // Add to cart
      await page.fill('[data-testid=quantity-input]', '2')
      await page.click('[data-testid=add-to-cart-button]')
      
      // Verify cart update
      await expect(page.locator('[data-testid=cart-count]')).toContainText('2')
      
      // Go to cart
      await page.click('[data-testid=cart-icon]')
      
      // Verify cart contents
      await expect(page.locator('[data-testid=cart-item]')).toBeVisible()
      
      // Proceed to checkout
      await page.click('[data-testid=checkout-button]')
      
      // Fill shipping information
      await page.fill('[data-testid=shipping-name]', '測試用戶')
      await page.fill('[data-testid=shipping-address]', '香港中環皇后大道中1號')
      await page.fill('[data-testid=shipping-phone]', '12345678')
      
      // Select payment method
      await page.selectOption('[data-testid=payment-method]', 'stripe')
      
      // Complete order
      await page.click('[data-testid=place-order-button]')
      
      // Verify order confirmation
      await expect(page.locator('[data-testid=order-success]')).toBeVisible()
      await expect(page.locator('[data-testid=order-number]')).toBeVisible()
    })

    it('should handle insufficient inventory', async () => {
      await page.goto(`${baseURL}/products/low-stock-product`)
      
      // Try to add more than available
      await page.fill('[data-testid=quantity-input]', '999')
      await page.click('[data-testid=add-to-cart-button]')
      
      // Should show error message
      await expect(page.locator('[data-testid=inventory-error]')).toBeVisible()
    })
  })

  describe('Craftsman Profile Management Flow', () => {
    it('should create and update craftsman profile', async () => {
      // Register as craftsman
      await page.goto(`${baseURL}/auth/register`)
      await page.fill('[data-testid=email-input]', 'craftsman-e2e@example.com')
      await page.fill('[data-testid=password-input]', 'testpassword123')
      await page.selectOption('[data-testid=role-select]', 'craftsman')
      await page.click('[data-testid=register-button]')
      
      // Navigate to profile setup
      await page.goto(`${baseURL}/craftsman/profile`)
      
      // Fill craftsman profile
      await page.fill('[data-testid=bio-input]', '我是一位有20年經驗的麻將雕刻師傅')
      await page.selectOption('[data-testid=specialty-select]', 'mahjong')
      await page.fill('[data-testid=experience-input]', '20')
      await page.fill('[data-testid=workshop-location]', '香港深水埗')
      
      // Upload profile image
      await page.setInputFiles('[data-testid=profile-image-input]', 'test-files/craftsman-photo.jpg')
      
      // Save profile
      await page.click('[data-testid=save-profile-button]')
      
      // Verify profile saved
      await expect(page.locator('[data-testid=profile-success]')).toBeVisible()
    })
  })

  describe('Social Features Flow', () => {
    it('should follow craftsman and receive updates', async () => {
      // Navigate to craftsman profile
      await page.goto(`${baseURL}/craftsmen/test-craftsman-id`)
      
      // Follow craftsman
      await page.click('[data-testid=follow-button]')
      
      // Verify follow status
      await expect(page.locator('[data-testid=unfollow-button]')).toBeVisible()
      
      // Check notifications
      await page.click('[data-testid=notifications-icon]')
      await expect(page.locator('[data-testid=notification-item]')).toBeVisible()
    })

    it('should post and interact with comments', async () => {
      await page.goto(`${baseURL}/courses/test-course-id`)
      
      // Post a comment
      await page.fill('[data-testid=comment-input]', '這個課程很有趣！')
      await page.click('[data-testid=post-comment-button]')
      
      // Verify comment posted
      await expect(page.locator('[data-testid=comment-item]')).toContainText('這個課程很有趣！')
      
      // Like the comment
      await page.click('[data-testid=like-button]:first-child')
      await expect(page.locator('[data-testid=like-count]:first-child')).toContainText('1')
    })
  })

  describe('Mobile Responsive Flow', () => {
    it('should work on mobile viewport', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      
      await page.goto(`${baseURL}`)
      
      // Check mobile navigation
      await page.click('[data-testid=mobile-menu-button]')
      await expect(page.locator('[data-testid=mobile-menu]')).toBeVisible()
      
      // Navigate using mobile menu
      await page.click('[data-testid=mobile-courses-link]')
      await expect(page).toHaveURL(`${baseURL}/courses`)
      
      // Test touch interactions
      await page.tap('[data-testid=course-card]:first-child')
      await expect(page.locator('[data-testid=course-title]')).toBeVisible()
    })
  })

  describe('Language Switching Flow', () => {
    it('should switch languages correctly', async () => {
      await page.goto(`${baseURL}`)
      
      // Switch to English
      await page.click('[data-testid=language-switcher]')
      await page.click('[data-testid=language-en]')
      
      // Verify English content
      await expect(page.locator('[data-testid=main-heading]')).toContainText('Heritage Crafts')
      
      // Switch to Traditional Chinese
      await page.click('[data-testid=language-switcher]')
      await page.click('[data-testid=language-zh-HK]')
      
      // Verify Chinese content
      await expect(page.locator('[data-testid=main-heading]')).toContainText('傳統工藝')
    })
  })

  describe('Error Handling Flow', () => {
    it('should handle network errors gracefully', async () => {
      // Simulate offline mode
      await context.setOffline(true)
      
      await page.goto(`${baseURL}/courses`)
      
      // Should show offline message
      await expect(page.locator('[data-testid=offline-message]')).toBeVisible()
      
      // Restore connection
      await context.setOffline(false)
      await page.reload()
      
      // Should work normally
      await expect(page.locator('[data-testid=courses-list]')).toBeVisible()
    })

    it('should handle 404 errors', async () => {
      await page.goto(`${baseURL}/non-existent-page`)
      
      await expect(page.locator('[data-testid=404-message]')).toBeVisible()
      await expect(page.locator('[data-testid=back-home-link]')).toBeVisible()
    })
  })
})