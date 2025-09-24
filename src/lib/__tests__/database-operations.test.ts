import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

describe('Database Operations Tests', () => {
  beforeAll(async () => {
    await prisma.$connect()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    // Clean up test data before each test
    await prisma.orderItem.deleteMany()
    await prisma.order.deleteMany()
    await prisma.cartItem.deleteMany()
    await prisma.cart.deleteMany()
    await prisma.booking.deleteMany()
    await prisma.course.deleteMany()
    await prisma.product.deleteMany()
    await prisma.craftsmanProfile.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('User Operations', () => {
    it('should create user with encrypted password', async () => {
      const userData = {
        email: 'test@example.com',
        passwordHash: await hash('password123', 12),
        role: 'learner',
        preferredLanguage: 'zh-HK'
      }

      const user = await prisma.user.create({
        data: userData
      })

      expect(user.id).toBeDefined()
      expect(user.email).toBe(userData.email)
      expect(user.passwordHash).not.toBe('password123') // Should be hashed
      expect(user.role).toBe('learner')
    })

    it('should enforce unique email constraint', async () => {
      const userData = {
        email: 'duplicate@example.com',
        passwordHash: await hash('password123', 12),
        role: 'learner'
      }

      await prisma.user.create({ data: userData })

      // Should throw error for duplicate email
      await expect(
        prisma.user.create({ data: userData })
      ).rejects.toThrow()
    })

    it('should cascade delete user data', async () => {
      // Create user with related data
      const user = await prisma.user.create({
        data: {
          email: 'cascade@example.com',
          passwordHash: await hash('password123', 12),
          role: 'craftsman'
        }
      })

      const craftsmanProfile = await prisma.craftsmanProfile.create({
        data: {
          userId: user.id,
          craftSpecialties: ['mahjong'],
          bio: { 'zh-HK': '測試師傅' },
          experienceYears: 10
        }
      })

      const course = await prisma.course.create({
        data: {
          craftsmanId: craftsmanProfile.id,
          title: { 'zh-HK': '測試課程' },
          craftCategory: 'mahjong',
          maxParticipants: 10,
          price: 500
        }
      })

      // Delete user should cascade
      await prisma.user.delete({ where: { id: user.id } })

      // Related data should be deleted
      const deletedProfile = await prisma.craftsmanProfile.findUnique({
        where: { id: craftsmanProfile.id }
      })
      expect(deletedProfile).toBeNull()

      const deletedCourse = await prisma.course.findUnique({
        where: { id: course.id }
      })
      expect(deletedCourse).toBeNull()
    })
  })

  describe('Course and Booking Operations', () => {
    let craftsman: any
    let learner: any
    let course: any

    beforeEach(async () => {
      // Setup test data
      craftsman = await prisma.user.create({
        data: {
          email: 'craftsman@example.com',
          passwordHash: await hash('password123', 12),
          role: 'craftsman'
        }
      })

      const craftsmanProfile = await prisma.craftsmanProfile.create({
        data: {
          userId: craftsman.id,
          craftSpecialties: ['mahjong'],
          bio: { 'zh-HK': '專業師傅' },
          experienceYears: 15
        }
      })

      learner = await prisma.user.create({
        data: {
          email: 'learner@example.com',
          passwordHash: await hash('password123', 12),
          role: 'learner'
        }
      })

      course = await prisma.course.create({
        data: {
          craftsmanId: craftsmanProfile.id,
          title: { 'zh-HK': '手雕麻將課程' },
          description: { 'zh-HK': '學習傳統手雕技藝' },
          craftCategory: 'mahjong',
          maxParticipants: 2,
          durationHours: 3,
          price: 500
        }
      })
    })

    it('should handle concurrent booking requests', async () => {
      // Create multiple learners
      const learners = await Promise.all([
        prisma.user.create({
          data: {
            email: 'learner1@example.com',
            passwordHash: await hash('password123', 12),
            role: 'learner'
          }
        }),
        prisma.user.create({
          data: {
            email: 'learner2@example.com',
            passwordHash: await hash('password123', 12),
            role: 'learner'
          }
        }),
        prisma.user.create({
          data: {
            email: 'learner3@example.com',
            passwordHash: await hash('password123', 12),
            role: 'learner'
          }
        })
      ])

      // Attempt concurrent bookings
      const bookingPromises = learners.map(learner =>
        prisma.booking.create({
          data: {
            userId: learner.id,
            courseId: course.id,
            status: 'confirmed'
          }
        }).catch(error => ({ error }))
      )

      const results = await Promise.all(bookingPromises)
      
      // Should have 2 successful bookings and 1 failure (due to capacity)
      const successful = results.filter(r => !r.error)
      const failed = results.filter(r => r.error)
      
      expect(successful.length).toBe(2)
      expect(failed.length).toBe(1)
    })

    it('should manage waitlist correctly', async () => {
      // Fill course to capacity
      await prisma.booking.createMany({
        data: [
          { userId: learner.id, courseId: course.id, status: 'confirmed' },
          { 
            userId: (await prisma.user.create({
              data: {
                email: 'learner2@example.com',
                passwordHash: await hash('password123', 12),
                role: 'learner'
              }
            })).id, 
            courseId: course.id, 
            status: 'confirmed' 
          }
        ]
      })

      // Next booking should be waitlisted
      const waitlistUser = await prisma.user.create({
        data: {
          email: 'waitlist@example.com',
          passwordHash: await hash('password123', 12),
          role: 'learner'
        }
      })

      const waitlistBooking = await prisma.booking.create({
        data: {
          userId: waitlistUser.id,
          courseId: course.id,
          status: 'waitlisted'
        }
      })

      expect(waitlistBooking.status).toBe('waitlisted')

      // Cancel a confirmed booking
      await prisma.booking.updateMany({
        where: { courseId: course.id, status: 'confirmed' },
        data: { status: 'cancelled' }
      })

      // Promote waitlisted booking
      await prisma.booking.update({
        where: { id: waitlistBooking.id },
        data: { status: 'confirmed' }
      })

      const updatedBooking = await prisma.booking.findUnique({
        where: { id: waitlistBooking.id }
      })

      expect(updatedBooking?.status).toBe('confirmed')
    })
  })

  describe('E-commerce Operations', () => {
    let craftsman: any
    let customer: any
    let product: any

    beforeEach(async () => {
      craftsman = await prisma.user.create({
        data: {
          email: 'seller@example.com',
          passwordHash: await hash('password123', 12),
          role: 'craftsman'
        }
      })

      const craftsmanProfile = await prisma.craftsmanProfile.create({
        data: {
          userId: craftsman.id,
          craftSpecialties: ['mahjong'],
          bio: { 'zh-HK': '專業工藝師' },
          experienceYears: 20
        }
      })

      customer = await prisma.user.create({
        data: {
          email: 'customer@example.com',
          passwordHash: await hash('password123', 12),
          role: 'learner'
        }
      })

      product = await prisma.product.create({
        data: {
          craftsmanId: craftsmanProfile.id,
          name: { 'zh-HK': '手工麻將' },
          description: { 'zh-HK': '純手工雕刻' },
          price: 2000,
          inventoryQuantity: 5,
          craftCategory: 'mahjong'
        }
      })
    })

    it('should handle inventory management correctly', async () => {
      // Create order that reduces inventory
      const order = await prisma.order.create({
        data: {
          userId: customer.id,
          totalAmount: 4000,
          status: 'pending',
          shippingAddress: {
            name: '測試客戶',
            address: '香港中環',
            phone: '12345678'
          }
        }
      })

      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          productId: product.id,
          quantity: 2,
          price: 2000
        }
      })

      // Update inventory
      await prisma.product.update({
        where: { id: product.id },
        data: {
          inventoryQuantity: {
            decrement: 2
          }
        }
      })

      const updatedProduct = await prisma.product.findUnique({
        where: { id: product.id }
      })

      expect(updatedProduct?.inventoryQuantity).toBe(3)
    })

    it('should handle order status transitions', async () => {
      const order = await prisma.order.create({
        data: {
          userId: customer.id,
          totalAmount: 2000,
          status: 'pending',
          paymentStatus: 'pending'
        }
      })

      // Process payment
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'completed',
          status: 'processing'
        }
      })

      // Ship order
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'shipped',
          shippingTrackingNumber: 'TRACK123'
        }
      })

      // Complete order
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'completed',
          completedAt: new Date()
        }
      })

      const finalOrder = await prisma.order.findUnique({
        where: { id: order.id }
      })

      expect(finalOrder?.status).toBe('completed')
      expect(finalOrder?.paymentStatus).toBe('completed')
      expect(finalOrder?.completedAt).toBeDefined()
    })
  })

  describe('Search and Indexing Operations', () => {
    it('should handle multilingual content search', async () => {
      // Create products with multilingual content
      const craftsman = await prisma.user.create({
        data: {
          email: 'multilingual@example.com',
          passwordHash: await hash('password123', 12),
          role: 'craftsman'
        }
      })

      const craftsmanProfile = await prisma.craftsmanProfile.create({
        data: {
          userId: craftsman.id,
          craftSpecialties: ['mahjong', 'woodcarving'],
          bio: { 
            'zh-HK': '多語言工藝師',
            'en': 'Multilingual Craftsman'
          },
          experienceYears: 15
        }
      })

      await prisma.product.createMany({
        data: [
          {
            craftsmanId: craftsmanProfile.id,
            name: { 
              'zh-HK': '手雕麻將',
              'en': 'Hand-carved Mahjong'
            },
            description: {
              'zh-HK': '傳統手工雕刻麻將',
              'en': 'Traditional handcrafted mahjong'
            },
            price: 2000,
            craftCategory: 'mahjong'
          },
          {
            craftsmanId: craftsmanProfile.id,
            name: {
              'zh-HK': '木雕藝品',
              'en': 'Wood Carving Art'
            },
            description: {
              'zh-HK': '精美木雕工藝品',
              'en': 'Exquisite wood carving artwork'
            },
            price: 1500,
            craftCategory: 'woodcarving'
          }
        ]
      })

      // Search in Chinese
      const chineseResults = await prisma.product.findMany({
        where: {
          OR: [
            {
              name: {
                path: ['zh-HK'],
                string_contains: '麻將'
              }
            },
            {
              description: {
                path: ['zh-HK'],
                string_contains: '麻將'
              }
            }
          ]
        }
      })

      expect(chineseResults.length).toBe(1)

      // Search in English
      const englishResults = await prisma.product.findMany({
        where: {
          OR: [
            {
              name: {
                path: ['en'],
                string_contains: 'Mahjong'
              }
            },
            {
              description: {
                path: ['en'],
                string_contains: 'mahjong'
              }
            }
          ]
        }
      })

      expect(englishResults.length).toBe(1)
    })
  })

  describe('Performance Tests', () => {
    it('should handle large dataset queries efficiently', async () => {
      // Create large dataset
      const craftsman = await prisma.user.create({
        data: {
          email: 'performance@example.com',
          passwordHash: await hash('password123', 12),
          role: 'craftsman'
        }
      })

      const craftsmanProfile = await prisma.craftsmanProfile.create({
        data: {
          userId: craftsman.id,
          craftSpecialties: ['mahjong'],
          bio: { 'zh-HK': '性能測試師傅' },
          experienceYears: 10
        }
      })

      // Create 100 products
      const products = Array.from({ length: 100 }, (_, i) => ({
        craftsmanId: craftsmanProfile.id,
        name: { 'zh-HK': `產品 ${i + 1}` },
        price: Math.floor(Math.random() * 5000) + 500,
        craftCategory: 'mahjong',
        inventoryQuantity: Math.floor(Math.random() * 20) + 1
      }))

      await prisma.product.createMany({ data: products })

      // Test pagination performance
      const startTime = Date.now()
      
      const paginatedResults = await prisma.product.findMany({
        where: { craftCategory: 'mahjong' },
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0
      })

      const endTime = Date.now()
      const queryTime = endTime - startTime

      expect(paginatedResults.length).toBe(20)
      expect(queryTime).toBeLessThan(1000) // Should complete within 1 second
    })

    it('should handle complex joins efficiently', async () => {
      // Create test data with relationships
      const users = await Promise.all(
        Array.from({ length: 10 }, async (_, i) =>
          prisma.user.create({
            data: {
              email: `user${i}@example.com`,
              passwordHash: await hash('password123', 12),
              role: i < 5 ? 'craftsman' : 'learner'
            }
          })
        )
      )

      // Create craftsman profiles and courses
      for (let i = 0; i < 5; i++) {
        const profile = await prisma.craftsmanProfile.create({
          data: {
            userId: users[i].id,
            craftSpecialties: ['mahjong'],
            bio: { 'zh-HK': `師傅 ${i + 1}` },
            experienceYears: 10 + i
          }
        })

        await prisma.course.create({
          data: {
            craftsmanId: profile.id,
            title: { 'zh-HK': `課程 ${i + 1}` },
            craftCategory: 'mahjong',
            maxParticipants: 10,
            price: 500 + i * 100
          }
        })
      }

      // Complex query with joins
      const startTime = Date.now()
      
      const complexResults = await prisma.course.findMany({
        include: {
          craftsman: {
            include: {
              user: true
            }
          },
          bookings: {
            include: {
              user: true
            }
          }
        },
        where: {
          craftCategory: 'mahjong'
        }
      })

      const endTime = Date.now()
      const queryTime = endTime - startTime

      expect(complexResults.length).toBe(5)
      expect(queryTime).toBeLessThan(2000) // Should complete within 2 seconds
    })
  })
})