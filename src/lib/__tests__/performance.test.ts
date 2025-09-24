import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import { performance } from 'perf_hooks'

const prisma = new PrismaClient()

describe('Performance Tests', () => {
  beforeAll(async () => {
    await prisma.$connect()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    // Clean up test data
    await prisma.orderItem.deleteMany()
    await prisma.order.deleteMany()
    await prisma.booking.deleteMany()
    await prisma.course.deleteMany()
    await prisma.product.deleteMany()
    await prisma.craftsmanProfile.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('Database Query Performance', () => {
    it('should handle large dataset pagination efficiently', async () => {
      // Create test data
      const craftsman = await prisma.user.create({
        data: {
          email: 'perf-craftsman@example.com',
          passwordHash: await hash('password123', 12),
          role: 'craftsman'
        }
      })

      const craftsmanProfile = await prisma.craftsmanProfile.create({
        data: {
          userId: craftsman.id,
          craftSpecialties: ['mahjong', 'woodcarving'],
          bio: { 'zh-HK': '性能測試師傅' },
          experienceYears: 15
        }
      })

      // Create 1000 products for performance testing
      const products = Array.from({ length: 1000 }, (_, i) => ({
        craftsmanId: craftsmanProfile.id,
        name: { 'zh-HK': `產品 ${i + 1}`, 'en': `Product ${i + 1}` },
        description: { 'zh-HK': `產品描述 ${i + 1}`, 'en': `Product description ${i + 1}` },
        price: Math.floor(Math.random() * 5000) + 500,
        inventoryQuantity: Math.floor(Math.random() * 50) + 1,
        craftCategory: i % 2 === 0 ? 'mahjong' : 'woodcarving'
      }))

      console.log('Creating 1000 products for performance testing...')
      await prisma.product.createMany({ data: products })

      // Test pagination performance
      const startTime = performance.now()
      
      const paginatedResults = await prisma.product.findMany({
        where: { craftCategory: 'mahjong' },
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0,
        include: {
          craftsman: {
            include: {
              user: true
            }
          }
        }
      })

      const endTime = performance.now()
      const queryTime = endTime - startTime

      console.log(`Pagination query took ${queryTime.toFixed(2)}ms`)

      expect(paginatedResults.length).toBe(20)
      expect(queryTime).toBeLessThan(500) // Should complete within 500ms
    })

    it('should handle complex search queries efficiently', async () => {
      // Create diverse test data
      const users = await Promise.all(
        Array.from({ length: 50 }, async (_, i) =>
          prisma.user.create({
            data: {
              email: `user${i}@example.com`,
              passwordHash: await hash('password123', 12),
              role: i < 25 ? 'craftsman' : 'learner'
            }
          })
        )
      )

      // Create craftsman profiles and courses
      for (let i = 0; i < 25; i++) {
        const profile = await prisma.craftsmanProfile.create({
          data: {
            userId: users[i].id,
            craftSpecialties: ['mahjong', 'woodcarving', 'pottery'],
            bio: { 
              'zh-HK': `師傅 ${i + 1} 專精於傳統工藝`,
              'en': `Craftsman ${i + 1} specializes in traditional crafts`
            },
            experienceYears: 5 + (i % 20)
          }
        })

        // Create multiple courses per craftsman
        await prisma.course.createMany({
          data: Array.from({ length: 5 }, (_, j) => ({
            craftsmanId: profile.id,
            title: { 
              'zh-HK': `${['手雕麻將', '木雕藝術', '陶藝製作'][j % 3]} 課程 ${j + 1}`,
              'en': `${['Mahjong Carving', 'Wood Art', 'Pottery'][j % 3]} Course ${j + 1}`
            },
            description: {
              'zh-HK': `學習傳統 ${['麻將雕刻', '木雕', '陶藝'][j % 3]} 技藝`,
              'en': `Learn traditional ${['mahjong carving', 'wood carving', 'pottery'][j % 3]} skills`
            },
            craftCategory: ['mahjong', 'woodcarving', 'pottery'][j % 3],
            maxParticipants: 8 + (j % 5),
            durationHours: 2 + (j % 4),
            price: 400 + (j * 100)
          }))
        })
      }

      // Test complex search performance
      const startTime = performance.now()
      
      const searchResults = await prisma.course.findMany({
        where: {
          OR: [
            {
              title: {
                path: ['zh-HK'],
                string_contains: '麻將'
              }
            },
            {
              description: {
                path: ['zh-HK'],
                string_contains: '雕刻'
              }
            },
            {
              craftCategory: 'mahjong'
            }
          ],
          AND: [
            {
              price: {
                gte: 400,
                lte: 800
              }
            },
            {
              maxParticipants: {
                gte: 8
              }
            }
          ]
        },
        include: {
          craftsman: {
            include: {
              user: true
            }
          },
          bookings: {
            where: {
              status: 'confirmed'
            }
          }
        },
        orderBy: [
          { price: 'asc' },
          { createdAt: 'desc' }
        ]
      })

      const endTime = performance.now()
      const queryTime = endTime - startTime

      console.log(`Complex search query took ${queryTime.toFixed(2)}ms`)
      console.log(`Found ${searchResults.length} matching courses`)

      expect(queryTime).toBeLessThan(1000) // Should complete within 1 second
      expect(searchResults.length).toBeGreaterThan(0)
    })

    it('should handle concurrent database operations', async () => {
      // Create test users
      const users = await Promise.all(
        Array.from({ length: 20 }, (_, i) =>
          prisma.user.create({
            data: {
              email: `concurrent${i}@example.com`,
              passwordHash: await hash('password123', 12),
              role: 'learner'
            }
          })
        )
      )

      const craftsman = await prisma.user.create({
        data: {
          email: 'concurrent-craftsman@example.com',
          passwordHash: await hash('password123', 12),
          role: 'craftsman'
        }
      })

      const craftsmanProfile = await prisma.craftsmanProfile.create({
        data: {
          userId: craftsman.id,
          craftSpecialties: ['mahjong'],
          bio: { 'zh-HK': '並發測試師傅' },
          experienceYears: 10
        }
      })

      const course = await prisma.course.create({
        data: {
          craftsmanId: craftsmanProfile.id,
          title: { 'zh-HK': '並發測試課程' },
          craftCategory: 'mahjong',
          maxParticipants: 5, // Limited capacity for testing
          price: 500
        }
      })

      // Test concurrent booking attempts
      const startTime = performance.now()
      
      const bookingPromises = users.map(user =>
        prisma.booking.create({
          data: {
            userId: user.id,
            courseId: course.id,
            status: 'confirmed'
          }
        }).catch(error => ({ error: error.message }))
      )

      const results = await Promise.all(bookingPromises)
      
      const endTime = performance.now()
      const operationTime = endTime - startTime

      console.log(`Concurrent operations took ${operationTime.toFixed(2)}ms`)

      const successful = results.filter(r => !r.error)
      const failed = results.filter(r => r.error)

      expect(successful.length).toBe(5) // Should match course capacity
      expect(failed.length).toBe(15) // Remaining should fail
      expect(operationTime).toBeLessThan(2000) // Should complete within 2 seconds
    })
  })

  describe('API Response Time Performance', () => {
    it('should respond to product listing within acceptable time', async () => {
      // Create test data
      const craftsman = await prisma.user.create({
        data: {
          email: 'api-perf@example.com',
          passwordHash: await hash('password123', 12),
          role: 'craftsman'
        }
      })

      const craftsmanProfile = await prisma.craftsmanProfile.create({
        data: {
          userId: craftsman.id,
          craftSpecialties: ['mahjong'],
          bio: { 'zh-HK': 'API性能測試' },
          experienceYears: 10
        }
      })

      // Create 200 products
      const products = Array.from({ length: 200 }, (_, i) => ({
        craftsmanId: craftsmanProfile.id,
        name: { 'zh-HK': `API測試產品 ${i + 1}` },
        price: 1000 + i,
        craftCategory: 'mahjong',
        inventoryQuantity: 10
      }))

      await prisma.product.createMany({ data: products })

      // Simulate API call performance
      const startTime = performance.now()
      
      const apiResponse = await prisma.product.findMany({
        take: 20,
        skip: 0,
        where: { craftCategory: 'mahjong' },
        include: {
          craftsman: {
            select: {
              id: true,
              craftSpecialties: true,
              user: {
                select: {
                  id: true,
                  email: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      const endTime = performance.now()
      const responseTime = endTime - startTime

      console.log(`API response time: ${responseTime.toFixed(2)}ms`)

      expect(apiResponse.length).toBe(20)
      expect(responseTime).toBeLessThan(300) // Should respond within 300ms
    })

    it('should handle search API performance', async () => {
      // Create multilingual content for search testing
      const craftsman = await prisma.user.create({
        data: {
          email: 'search-perf@example.com',
          passwordHash: await hash('password123', 12),
          role: 'craftsman'
        }
      })

      const craftsmanProfile = await prisma.craftsmanProfile.create({
        data: {
          userId: craftsman.id,
          craftSpecialties: ['mahjong', 'woodcarving'],
          bio: { 
            'zh-HK': '搜索性能測試師傅',
            'en': 'Search performance test craftsman'
          },
          experienceYears: 15
        }
      })

      // Create diverse content
      const courses = Array.from({ length: 100 }, (_, i) => ({
        craftsmanId: craftsmanProfile.id,
        title: { 
          'zh-HK': `${i % 2 === 0 ? '手雕麻將' : '木雕藝術'} 課程 ${i + 1}`,
          'en': `${i % 2 === 0 ? 'Mahjong Carving' : 'Wood Art'} Course ${i + 1}`
        },
        description: {
          'zh-HK': `學習傳統${i % 2 === 0 ? '麻將雕刻' : '木雕'}技藝`,
          'en': `Learn traditional ${i % 2 === 0 ? 'mahjong carving' : 'wood carving'} skills`
        },
        craftCategory: i % 2 === 0 ? 'mahjong' : 'woodcarving',
        maxParticipants: 10,
        price: 500 + (i * 10)
      }))

      await prisma.course.createMany({ data: courses })

      // Test search performance
      const startTime = performance.now()
      
      const searchResults = await prisma.course.findMany({
        where: {
          OR: [
            {
              title: {
                path: ['zh-HK'],
                string_contains: '麻將'
              }
            },
            {
              title: {
                path: ['en'],
                string_contains: 'Mahjong'
              }
            },
            {
              craftCategory: 'mahjong'
            }
          ]
        },
        include: {
          craftsman: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true
                }
              }
            }
          }
        }
      })

      const endTime = performance.now()
      const searchTime = endTime - startTime

      console.log(`Search API response time: ${searchTime.toFixed(2)}ms`)
      console.log(`Search found ${searchResults.length} results`)

      expect(searchTime).toBeLessThan(500) // Should complete within 500ms
      expect(searchResults.length).toBeGreaterThan(0)
    })
  })

  describe('Memory Usage Performance', () => {
    it('should handle large result sets without memory issues', async () => {
      const initialMemory = process.memoryUsage()
      
      // Create large dataset
      const craftsman = await prisma.user.create({
        data: {
          email: 'memory-test@example.com',
          passwordHash: await hash('password123', 12),
          role: 'craftsman'
        }
      })

      const craftsmanProfile = await prisma.craftsmanProfile.create({
        data: {
          userId: craftsman.id,
          craftSpecialties: ['mahjong'],
          bio: { 'zh-HK': '記憶體測試' },
          experienceYears: 10
        }
      })

      // Create 500 products
      const products = Array.from({ length: 500 }, (_, i) => ({
        craftsmanId: craftsmanProfile.id,
        name: { 'zh-HK': `記憶體測試產品 ${i + 1}` },
        description: { 'zh-HK': `這是一個用於測試記憶體使用的產品描述 ${i + 1}` },
        price: 1000 + i,
        craftCategory: 'mahjong',
        inventoryQuantity: 10
      }))

      await prisma.product.createMany({ data: products })

      // Query large dataset
      const largeResults = await prisma.product.findMany({
        include: {
          craftsman: {
            include: {
              user: true
            }
          }
        }
      })

      const finalMemory = process.memoryUsage()
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed

      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`)
      console.log(`Loaded ${largeResults.length} records`)

      expect(largeResults.length).toBe(500)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024) // Should use less than 100MB
    })
  })

  describe('Load Testing Simulation', () => {
    it('should handle multiple concurrent read operations', async () => {
      // Setup test data
      const craftsman = await prisma.user.create({
        data: {
          email: 'load-test@example.com',
          passwordHash: await hash('password123', 12),
          role: 'craftsman'
        }
      })

      const craftsmanProfile = await prisma.craftsmanProfile.create({
        data: {
          userId: craftsman.id,
          craftSpecialties: ['mahjong'],
          bio: { 'zh-HK': '負載測試' },
          experienceYears: 10
        }
      })

      await prisma.product.createMany({
        data: Array.from({ length: 100 }, (_, i) => ({
          craftsmanId: craftsmanProfile.id,
          name: { 'zh-HK': `負載測試產品 ${i + 1}` },
          price: 1000,
          craftCategory: 'mahjong',
          inventoryQuantity: 10
        }))
      })

      // Simulate 50 concurrent read requests
      const startTime = performance.now()
      
      const readPromises = Array.from({ length: 50 }, () =>
        prisma.product.findMany({
          take: 10,
          where: { craftCategory: 'mahjong' },
          include: {
            craftsman: {
              include: {
                user: true
              }
            }
          }
        })
      )

      const results = await Promise.all(readPromises)
      
      const endTime = performance.now()
      const totalTime = endTime - startTime

      console.log(`50 concurrent reads took ${totalTime.toFixed(2)}ms`)

      expect(results.length).toBe(50)
      expect(results.every(r => r.length === 10)).toBe(true)
      expect(totalTime).toBeLessThan(3000) // Should complete within 3 seconds
    })
  })
})