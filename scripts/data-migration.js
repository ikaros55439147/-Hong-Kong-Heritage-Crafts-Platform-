/**
 * 數據遷移和初始化腳本
 * Data Migration and Initialization Script
 */

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const fs = require('fs').promises
const path = require('path')

const prisma = new PrismaClient()

class DataMigration {
  constructor() {
    this.migrationLog = []
  }

  log(message) {
    const timestamp = new Date().toISOString()
    const logEntry = `[${timestamp}] ${message}`
    console.log(logEntry)
    this.migrationLog.push(logEntry)
  }

  async runMigration() {
    try {
      this.log('開始數據遷移和初始化...')
      
      // 1. 檢查數據庫連接
      await this.checkDatabaseConnection()
      
      // 2. 創建管理員帳戶
      await this.createAdminAccounts()
      
      // 3. 初始化基礎數據
      await this.initializeBaseData()
      
      // 4. 創建示範師傅檔案
      await this.createSampleCraftsmen()
      
      // 5. 創建示範課程
      await this.createSampleCourses()
      
      // 6. 創建示範產品
      await this.createSampleProducts()
      
      // 7. 初始化多語言內容
      await this.initializeMultilingualContent()
      
      // 8. 設置系統配置
      await this.setupSystemConfiguration()
      
      // 9. 創建測試數據（僅開發環境）
      if (process.env.NODE_ENV === 'development') {
        await this.createTestData()
      }
      
      // 10. 驗證數據完整性
      await this.validateDataIntegrity()
      
      this.log('數據遷移和初始化完成！')
      
      // 生成遷移報告
      await this.generateMigrationReport()
      
    } catch (error) {
      this.log(`遷移失敗: ${error.message}`)
      throw error
    } finally {
      await prisma.$disconnect()
    }
  }

  async checkDatabaseConnection() {
    this.log('檢查數據庫連接...')
    try {
      await prisma.$queryRaw`SELECT 1`
      this.log('數據庫連接正常')
    } catch (error) {
      throw new Error(`數據庫連接失敗: ${error.message}`)
    }
  }

  async createAdminAccounts() {
    this.log('創建管理員帳戶...')
    
    const adminAccounts = [
      {
        email: 'admin@hk-heritage-crafts.com',
        name: '系統管理員',
        role: 'admin'
      },
      {
        email: 'moderator@hk-heritage-crafts.com',
        name: '內容審核員',
        role: 'moderator'
      }
    ]

    for (const account of adminAccounts) {
      const existingUser = await prisma.user.findUnique({
        where: { email: account.email }
      })

      if (!existingUser) {
        const hashedPassword = await bcrypt.hash('AdminPass123!', 12)
        
        await prisma.user.create({
          data: {
            email: account.email,
            name: account.name,
            passwordHash: hashedPassword,
            role: account.role,
            emailVerified: true,
            preferredLanguage: 'zh-HK'
          }
        })
        
        this.log(`創建管理員帳戶: ${account.email}`)
      } else {
        this.log(`管理員帳戶已存在: ${account.email}`)
      }
    }
  }

  async initializeBaseData() {
    this.log('初始化基礎數據...')
    
    // 工藝分類
    const craftCategories = [
      { name: '手雕麻將', nameEn: 'Mahjong Carving', description: '傳統手工雕刻麻將技藝' },
      { name: '竹編', nameEn: 'Bamboo Weaving', description: '傳統竹編工藝' },
      { name: '打鐵', nameEn: 'Blacksmithing', description: '傳統鐵器製作技藝' },
      { name: '吹糖', nameEn: 'Sugar Blowing', description: '傳統糖藝製作' },
      { name: '木雕', nameEn: 'Wood Carving', description: '傳統木雕工藝' },
      { name: '陶瓷', nameEn: 'Ceramics', description: '傳統陶瓷製作' },
      { name: '刺繡', nameEn: 'Embroidery', description: '傳統刺繡工藝' },
      { name: '紙紮', nameEn: 'Paper Crafts', description: '傳統紙紮工藝' }
    ]

    for (const category of craftCategories) {
      const existing = await prisma.craftCategory.findFirst({
        where: { name: category.name }
      })

      if (!existing) {
        await prisma.craftCategory.create({
          data: {
            name: category.name,
            nameEn: category.nameEn,
            description: category.description
          }
        })
        this.log(`創建工藝分類: ${category.name}`)
      }
    }

    // 地區數據
    const regions = [
      { name: '香港島', nameEn: 'Hong Kong Island' },
      { name: '九龍', nameEn: 'Kowloon' },
      { name: '新界', nameEn: 'New Territories' }
    ]

    for (const region of regions) {
      const existing = await prisma.region.findFirst({
        where: { name: region.name }
      })

      if (!existing) {
        await prisma.region.create({
          data: {
            name: region.name,
            nameEn: region.nameEn
          }
        })
        this.log(`創建地區: ${region.name}`)
      }
    }
  }

  async createSampleCraftsmen() {
    this.log('創建示範師傅檔案...')
    
    const sampleCraftsmen = [
      {
        email: 'li.master@example.com',
        name: '李師傅',
        craft: '手雕麻將',
        bio: '擁有40年手雕麻將經驗，師承傳統工藝世家',
        experienceYears: 40,
        location: '深水埗'
      },
      {
        email: 'wong.master@example.com',
        name: '黃師傅',
        craft: '竹編',
        bio: '三代竹編世家傳人，專精各種竹編技法',
        experienceYears: 35,
        location: '元朗'
      },
      {
        email: 'chan.master@example.com',
        name: '陳師傅',
        craft: '打鐵',
        bio: '傳統打鐵工藝保持者，製作各種傳統鐵器',
        experienceYears: 30,
        location: '觀塘'
      }
    ]

    for (const craftsman of sampleCraftsmen) {
      const existingUser = await prisma.user.findUnique({
        where: { email: craftsman.email }
      })

      if (!existingUser) {
        const hashedPassword = await bcrypt.hash('CraftsmanPass123!', 12)
        
        const user = await prisma.user.create({
          data: {
            email: craftsman.email,
            name: craftsman.name,
            passwordHash: hashedPassword,
            role: 'craftsman',
            emailVerified: true,
            preferredLanguage: 'zh-HK'
          }
        })

        await prisma.craftsmanProfile.create({
          data: {
            userId: user.id,
            craftSpecialties: [craftsman.craft],
            bio: {
              'zh-HK': craftsman.bio,
              'en': `Master ${craftsman.name} - ${craftsman.craft} specialist`
            },
            experienceYears: craftsman.experienceYears,
            workshopLocation: craftsman.location,
            verificationStatus: 'verified',
            contactInfo: {
              phone: '+852-1234-5678',
              email: craftsman.email
            }
          }
        })
        
        this.log(`創建示範師傅: ${craftsman.name}`)
      }
    }
  }

  async createSampleCourses() {
    this.log('創建示範課程...')
    
    const craftsmen = await prisma.craftsmanProfile.findMany({
      include: { user: true }
    })

    const sampleCourses = [
      {
        craftsmanEmail: 'li.master@example.com',
        title: {
          'zh-HK': '手雕麻將入門班',
          'en': 'Beginner Mahjong Carving Class'
        },
        description: {
          'zh-HK': '學習傳統手雕麻將的基本技法，包括選材、雕刻、拋光等工序',
          'en': 'Learn basic mahjong carving techniques including material selection, carving, and polishing'
        },
        price: 800,
        duration: 4,
        maxParticipants: 6
      },
      {
        craftsmanEmail: 'wong.master@example.com',
        title: {
          'zh-HK': '竹編工藝體驗班',
          'en': 'Bamboo Weaving Workshop'
        },
        description: {
          'zh-HK': '體驗傳統竹編工藝，製作實用的竹編用品',
          'en': 'Experience traditional bamboo weaving and create practical bamboo products'
        },
        price: 600,
        duration: 3,
        maxParticipants: 8
      }
    ]

    for (const course of sampleCourses) {
      const craftsman = craftsmen.find(c => c.user.email === course.craftsmanEmail)
      
      if (craftsman) {
        const existingCourse = await prisma.course.findFirst({
          where: {
            craftsmanId: craftsman.id,
            title: { path: ['zh-HK'], equals: course.title['zh-HK'] }
          }
        })

        if (!existingCourse) {
          await prisma.course.create({
            data: {
              craftsmanId: craftsman.id,
              title: course.title,
              description: course.description,
              craftCategory: craftsman.craftSpecialties[0],
              price: course.price,
              durationHours: course.duration,
              maxParticipants: course.maxParticipants,
              status: 'active'
            }
          })
          
          this.log(`創建示範課程: ${course.title['zh-HK']}`)
        }
      }
    }
  }

  async createSampleProducts() {
    this.log('創建示範產品...')
    
    const craftsmen = await prisma.craftsmanProfile.findMany({
      include: { user: true }
    })

    const sampleProducts = [
      {
        craftsmanEmail: 'li.master@example.com',
        name: {
          'zh-HK': '手雕麻將套裝',
          'en': 'Hand-carved Mahjong Set'
        },
        description: {
          'zh-HK': '純手工雕刻麻將，採用優質象牙果製作',
          'en': 'Pure hand-carved mahjong set made from premium ivory nut'
        },
        price: 2800,
        inventory: 5
      },
      {
        craftsmanEmail: 'wong.master@example.com',
        name: {
          'zh-HK': '竹編茶具籃',
          'en': 'Bamboo Tea Set Basket'
        },
        description: {
          'zh-HK': '傳統竹編工藝製作的茶具收納籃',
          'en': 'Traditional bamboo woven tea set storage basket'
        },
        price: 450,
        inventory: 10
      }
    ]

    for (const product of sampleProducts) {
      const craftsman = craftsmen.find(c => c.user.email === product.craftsmanEmail)
      
      if (craftsman) {
        const existingProduct = await prisma.product.findFirst({
          where: {
            craftsmanId: craftsman.id,
            name: { path: ['zh-HK'], equals: product.name['zh-HK'] }
          }
        })

        if (!existingProduct) {
          await prisma.product.create({
            data: {
              craftsmanId: craftsman.id,
              name: product.name,
              description: product.description,
              price: product.price,
              inventoryQuantity: product.inventory,
              craftCategory: craftsman.craftSpecialties[0],
              status: 'active'
            }
          })
          
          this.log(`創建示範產品: ${product.name['zh-HK']}`)
        }
      }
    }
  }

  async initializeMultilingualContent() {
    this.log('初始化多語言內容...')
    
    const multilingualContents = [
      {
        type: 'craft_category_description',
        key: 'mahjong_carving',
        content: {
          'zh-HK': '手雕麻將是香港傳統工藝之一，需要精湛的雕刻技巧和豐富的經驗。',
          'zh-CN': '手雕麻将是香港传统工艺之一，需要精湛的雕刻技巧和丰富的经验。',
          'en': 'Hand-carved mahjong is one of Hong Kong\'s traditional crafts, requiring exquisite carving skills and rich experience.'
        }
      },
      {
        type: 'craft_category_description',
        key: 'bamboo_weaving',
        content: {
          'zh-HK': '竹編工藝歷史悠久，是中華文化的重要組成部分，在香港有著深厚的傳統。',
          'zh-CN': '竹编工艺历史悠久，是中华文化的重要组成部分，在香港有着深厚的传统。',
          'en': 'Bamboo weaving has a long history and is an important part of Chinese culture, with deep traditions in Hong Kong.'
        }
      }
    ]

    for (const content of multilingualContents) {
      const existing = await prisma.multilingualContent.findFirst({
        where: {
          type: content.type,
          key: content.key
        }
      })

      if (!existing) {
        await prisma.multilingualContent.create({
          data: {
            type: content.type,
            key: content.key,
            content: content.content
          }
        })
        
        this.log(`創建多語言內容: ${content.key}`)
      }
    }
  }

  async setupSystemConfiguration() {
    this.log('設置系統配置...')
    
    const configurations = [
      { key: 'platform_name', value: '香港弱勢行業傳承平台' },
      { key: 'platform_name_en', value: 'Hong Kong Heritage Crafts Platform' },
      { key: 'max_file_size', value: '10485760' }, // 10MB
      { key: 'supported_languages', value: 'zh-HK,zh-CN,en' },
      { key: 'default_language', value: 'zh-HK' },
      { key: 'email_verification_required', value: 'true' },
      { key: 'craftsman_verification_required', value: 'true' },
      { key: 'max_course_participants', value: '20' },
      { key: 'booking_advance_days', value: '30' },
      { key: 'payment_methods', value: 'stripe,paypal,bank_transfer' }
    ]

    for (const config of configurations) {
      const existing = await prisma.systemConfiguration.findUnique({
        where: { key: config.key }
      })

      if (!existing) {
        await prisma.systemConfiguration.create({
          data: {
            key: config.key,
            value: config.value
          }
        })
        
        this.log(`設置系統配置: ${config.key}`)
      }
    }
  }

  async createTestData() {
    this.log('創建測試數據（開發環境）...')
    
    // 創建測試用戶
    const testUsers = [
      { email: 'test.learner@example.com', name: '測試學習者', role: 'learner' },
      { email: 'test.craftsman@example.com', name: '測試師傅', role: 'craftsman' }
    ]

    for (const testUser of testUsers) {
      const existing = await prisma.user.findUnique({
        where: { email: testUser.email }
      })

      if (!existing) {
        const hashedPassword = await bcrypt.hash('TestPass123!', 12)
        
        await prisma.user.create({
          data: {
            email: testUser.email,
            name: testUser.name,
            passwordHash: hashedPassword,
            role: testUser.role,
            emailVerified: true,
            preferredLanguage: 'zh-HK'
          }
        })
        
        this.log(`創建測試用戶: ${testUser.email}`)
      }
    }
  }

  async validateDataIntegrity() {
    this.log('驗證數據完整性...')
    
    // 檢查必要的數據是否存在
    const adminCount = await prisma.user.count({
      where: { role: 'admin' }
    })
    
    const categoryCount = await prisma.craftCategory.count()
    const craftsmanCount = await prisma.craftsmanProfile.count()
    const courseCount = await prisma.course.count()
    const productCount = await prisma.product.count()

    this.log(`數據統計:`)
    this.log(`- 管理員帳戶: ${adminCount}`)
    this.log(`- 工藝分類: ${categoryCount}`)
    this.log(`- 師傅檔案: ${craftsmanCount}`)
    this.log(`- 課程數量: ${courseCount}`)
    this.log(`- 產品數量: ${productCount}`)

    if (adminCount === 0) {
      throw new Error('缺少管理員帳戶')
    }
    
    if (categoryCount === 0) {
      throw new Error('缺少工藝分類數據')
    }

    this.log('數據完整性驗證通過')
  }

  async generateMigrationReport() {
    const reportPath = path.join(process.cwd(), 'migration-report.txt')
    const reportContent = this.migrationLog.join('\n')
    
    await fs.writeFile(reportPath, reportContent, 'utf8')
    this.log(`遷移報告已生成: ${reportPath}`)
  }
}

// 執行遷移
async function runMigration() {
  const migration = new DataMigration()
  
  try {
    await migration.runMigration()
    console.log('✅ 數據遷移成功完成')
    process.exit(0)
  } catch (error) {
    console.error('❌ 數據遷移失敗:', error.message)
    process.exit(1)
  }
}

// 如果直接執行此腳本
if (require.main === module) {
  runMigration()
}

module.exports = { DataMigration }