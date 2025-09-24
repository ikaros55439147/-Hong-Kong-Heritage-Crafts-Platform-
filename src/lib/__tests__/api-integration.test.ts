import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import { createServer } from 'http'
import { NextApiHandler } from 'next'
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import jwt from 'jsonwebtoken'

// Mock Next.js API routes for testing
const mockApp = createServer()
const prisma = new PrismaClient()

describe('API Integration Tests', () => {
  let authToken: string
  let craftsmanToken: string
  let testUserId: string
  let testCraftsmanId: string

  beforeAll(async () => {
    // Setup test database
    await prisma.$connect()
    
    // Create test users
    const hashedPassword = await hash('testpassword', 12)
    
    const testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        passwordHash: hashedPassword,
        role: 'learner',
        preferredLanguage: 'zh-HK'
      }
    })
    testUserId = testUser.id

    const testCraftsman = await prisma.user.create({
      data: {
        email: 'craftsman@example.com',
        passwordHash: hashedPassword,
        role: 'craftsman',
        preferredLanguage: 'zh-HK'
      }
    })
    testCraftsmanId = testCraftsman.id

    // Create auth tokens
    authToken = jwt.sign(
      { userId: testUserId, role: 'learner' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    )

    craftsmanToken = jwt.sign(
      { userId: testCraftsmanId, role: 'craftsman' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    )
  })

  afterAll(async () => {
    // Cleanup test data
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['test@example.com', 'craftsman@example.com']
        }
      }
    })
    await prisma.$disconnect()
  })

  describe('Authentication Flow', () => {
    it('should register a new user', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        role: 'learner',
        preferredLanguage: 'zh-HK'
      }

      // Mock API call
      const response = await request(mockApp)
        .post('/api/auth/register')
        .send(userData)
        .expect(201)

      expect(response.body).toHaveProperty('user')
      expect(response.body).toHaveProperty('token')
      expect(response.body.user.email).toBe(userData.email)
    })

    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'testpassword'
      }

      // Mock API call
      const response = await request(mockApp)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200)

      expect(response.body).toHaveProperty('token')
      expect(response.body).toHaveProperty('user')
    })

    it('should reject invalid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      }

      await request(mockApp)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401)
    })
  })

  describe('Course Management Integration', () => {
    let courseId: string

    it('should create a course as craftsman', async () => {
      const courseData = {
        title: { 'zh-HK': '手雕麻將課程', 'en': 'Hand-carved Mahjong Course' },
        description: { 'zh-HK': '學習傳統手雕麻將技藝', 'en': 'Learn traditional hand-carved mahjong craft' },
        craftCategory: 'mahjong',
        maxParticipants: 10,
        durationHours: 3,
        price: 500
      }

      const response = await request(mockApp)
        .post('/api/courses')
        .set('Authorization', `Bearer ${craftsmanToken}`)
        .send(courseData)
        .expect(201)

      expect(response.body).toHaveProperty('id')
      expect(response.body.title).toEqual(courseData.title)
      courseId = response.body.id
    })

    it('should book a course as learner', async () => {
      const bookingData = {
        courseId,
        notes: '初學者，希望學習基礎技巧'
      }

      const response = await request(mockApp)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bookingData)
        .expect(201)

      expect(response.body).toHaveProperty('id')
      expect(response.body.status).toBe('confirmed')
    })

    it('should handle course capacity limits', async () => {
      // Create a course with 1 participant limit
      const limitedCourse = await request(mockApp)
        .post('/api/courses')
        .set('Authorization', `Bearer ${craftsmanToken}`)
        .send({
          title: { 'zh-HK': '限額課程' },
          craftCategory: 'test',
          maxParticipants: 1,
          price: 100
        })
        .expect(201)

      // First booking should succeed
      await request(mockApp)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ courseId: limitedCourse.body.id })
        .expect(201)

      // Second booking should be waitlisted
      const secondBooking = await request(mockApp)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ courseId: limitedCourse.body.id })
        .expect(201)

      expect(secondBooking.body.status).toBe('waitlisted')
    })
  })

  describe('Product and Order Integration', () => {
    let productId: string
    let orderId: string

    it('should create a product as craftsman', async () => {
      const productData = {
        name: { 'zh-HK': '手工麻將', 'en': 'Handmade Mahjong' },
        description: { 'zh-HK': '純手工雕刻麻將', 'en': 'Pure handcrafted mahjong' },
        price: 2000,
        inventoryQuantity: 5,
        craftCategory: 'mahjong'
      }

      const response = await request(mockApp)
        .post('/api/products')
        .set('Authorization', `Bearer ${craftsmanToken}`)
        .send(productData)
        .expect(201)

      expect(response.body).toHaveProperty('id')
      expect(response.body.name).toEqual(productData.name)
      productId = response.body.id
    })

    it('should add product to cart', async () => {
      const cartData = {
        productId,
        quantity: 2
      }

      const response = await request(mockApp)
        .post('/api/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .send(cartData)
        .expect(200)

      expect(response.body.items).toHaveLength(1)
      expect(response.body.items[0].quantity).toBe(2)
    })

    it('should create order from cart', async () => {
      const orderData = {
        shippingAddress: {
          name: '測試用戶',
          address: '香港中環皇后大道中1號',
          phone: '12345678'
        }
      }

      const response = await request(mockApp)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData)
        .expect(201)

      expect(response.body).toHaveProperty('id')
      expect(response.body.status).toBe('pending')
      expect(response.body.totalAmount).toBeGreaterThan(0)
      orderId = response.body.id
    })

    it('should process payment for order', async () => {
      const paymentData = {
        orderId,
        paymentMethod: 'stripe',
        amount: 4000
      }

      const response = await request(mockApp)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(200)

      expect(response.body.status).toBe('completed')
    })
  })

  describe('Search Integration', () => {
    it('should search courses by category', async () => {
      const response = await request(mockApp)
        .get('/api/courses?category=mahjong')
        .expect(200)

      expect(response.body.courses).toBeInstanceOf(Array)
      expect(response.body.courses.length).toBeGreaterThan(0)
    })

    it('should search products with multilingual support', async () => {
      const response = await request(mockApp)
        .get('/api/search/multilingual?q=麻將&type=products')
        .set('Accept-Language', 'zh-HK')
        .expect(200)

      expect(response.body.results).toBeInstanceOf(Array)
    })
  })

  describe('File Upload Integration', () => {
    it('should upload media file', async () => {
      const response = await request(mockApp)
        .post('/api/upload')
        .set('Authorization', `Bearer ${craftsmanToken}`)
        .attach('file', Buffer.from('test file content'), 'test.jpg')
        .expect(200)

      expect(response.body).toHaveProperty('fileUrl')
      expect(response.body).toHaveProperty('fileId')
    })

    it('should validate file type and size', async () => {
      await request(mockApp)
        .post('/api/upload')
        .set('Authorization', `Bearer ${craftsmanToken}`)
        .attach('file', Buffer.alloc(10 * 1024 * 1024), 'large.exe') // 10MB exe file
        .expect(400)
    })
  })
})