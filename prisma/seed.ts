import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Hash password for demo users
  const hashedPassword = await bcrypt.hash('demo123456', 10)

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@hk-heritage-crafts.com' },
    update: {},
    create: {
      email: 'admin@hk-heritage-crafts.com',
      passwordHash: hashedPassword,
      role: 'ADMIN',
      preferredLanguage: 'zh-HK',
    },
  })

  console.log('✅ Created admin user:', adminUser.email)

  // Create sample craftsman users
  const craftsmanUsers = await Promise.all([
    prisma.user.upsert({
      where: { email: 'master.mahjong@example.com' },
      update: {},
      create: {
        email: 'master.mahjong@example.com',
        passwordHash: hashedPassword,
        role: 'CRAFTSMAN',
        preferredLanguage: 'zh-HK',
      },
    }),
    prisma.user.upsert({
      where: { email: 'master.bamboo@example.com' },
      update: {},
      create: {
        email: 'master.bamboo@example.com',
        passwordHash: hashedPassword,
        role: 'CRAFTSMAN',
        preferredLanguage: 'zh-HK',
      },
    }),
    prisma.user.upsert({
      where: { email: 'master.sugar@example.com' },
      update: {},
      create: {
        email: 'master.sugar@example.com',
        passwordHash: hashedPassword,
        role: 'CRAFTSMAN',
        preferredLanguage: 'zh-HK',
      },
    }),
  ])

  console.log('✅ Created craftsman users')

  // Create sample learner users
  const learnerUsers = await Promise.all([
    prisma.user.upsert({
      where: { email: 'learner1@example.com' },
      update: {},
      create: {
        email: 'learner1@example.com',
        passwordHash: hashedPassword,
        role: 'LEARNER',
        preferredLanguage: 'zh-HK',
      },
    }),
    prisma.user.upsert({
      where: { email: 'learner2@example.com' },
      update: {},
      create: {
        email: 'learner2@example.com',
        passwordHash: hashedPassword,
        role: 'LEARNER',
        preferredLanguage: 'en',
      },
    }),
  ])

  console.log('✅ Created learner users')

  // Create craftsman profiles
  const craftsmanProfiles = await Promise.all([
    prisma.craftsmanProfile.upsert({
      where: { userId: craftsmanUsers[0].id },
      update: {},
      create: {
        userId: craftsmanUsers[0].id,
        craftSpecialties: ['手雕麻將', '傳統雕刻'],
        bio: {
          'zh-HK': '資深手雕麻將師傅，擁有30年經驗，專精於傳統手工雕刻技藝。曾為多個知名麻將品牌製作精美麻將牌。',
          'zh-CN': '资深手雕麻将师傅，拥有30年经验，专精于传统手工雕刻技艺。曾为多个知名麻将品牌制作精美麻将牌。',
          en: 'Senior hand-carved mahjong craftsman with 30 years of experience, specializing in traditional hand-carving techniques. Has created exquisite mahjong sets for several renowned brands.',
        },
        experienceYears: 30,
        workshopLocation: '香港九龍深水埗',
        contactInfo: {
          phone: '+852-9876-5432',
          whatsapp: '+852-9876-5432',
          email: 'master.mahjong@example.com',
        },
        verificationStatus: 'VERIFIED',
      },
    }),
    prisma.craftsmanProfile.upsert({
      where: { userId: craftsmanUsers[1].id },
      update: {},
      create: {
        userId: craftsmanUsers[1].id,
        craftSpecialties: ['竹編', '籐編', '傳統編織'],
        bio: {
          'zh-HK': '第三代竹編工藝師，承傳家族百年竹編技藝。專門製作各種竹製品，包括籃子、家具和裝飾品。',
          'zh-CN': '第三代竹编工艺师，承传家族百年竹编技艺。专门制作各种竹制品，包括篮子、家具和装饰品。',
          en: 'Third-generation bamboo weaving craftsman, inheriting century-old family bamboo weaving techniques. Specializes in creating various bamboo products including baskets, furniture, and decorative items.',
        },
        experienceYears: 25,
        workshopLocation: '香港新界元朗',
        contactInfo: {
          phone: '+852-9876-5433',
          whatsapp: '+852-9876-5433',
          email: 'master.bamboo@example.com',
        },
        verificationStatus: 'VERIFIED',
      },
    }),
    prisma.craftsmanProfile.upsert({
      where: { userId: craftsmanUsers[2].id },
      update: {},
      create: {
        userId: craftsmanUsers[2].id,
        craftSpecialties: ['吹糖', '糖藝', '傳統小食'],
        bio: {
          'zh-HK': '傳統吹糖師傅，掌握失傳的吹糖技藝。能夠製作各種動物和人物造型的糖藝作品。',
          'zh-CN': '传统吹糖师傅，掌握失传的吹糖技艺。能够制作各种动物和人物造型的糖艺作品。',
          en: 'Traditional sugar blowing craftsman, mastering the nearly lost art of sugar blowing. Can create various animal and character-shaped sugar art pieces.',
        },
        experienceYears: 20,
        workshopLocation: '香港島中環',
        contactInfo: {
          phone: '+852-9876-5434',
          email: 'master.sugar@example.com',
        },
        verificationStatus: 'VERIFIED',
      },
    }),
  ])

  console.log('✅ Created craftsman profiles')

  // Create sample courses
  const courses = await Promise.all([
    prisma.course.create({
      data: {
        craftsmanId: craftsmanProfiles[0].id,
        title: {
          'zh-HK': '手雕麻將入門班',
          'zh-CN': '手雕麻将入门班',
          en: 'Hand-carved Mahjong Beginner Class',
        },
        description: {
          'zh-HK': '學習傳統手雕麻將的基本技巧，包括選材、雕刻工具使用和基本雕刻技法。',
          'zh-CN': '学习传统手雕麻将的基本技巧，包括选材、雕刻工具使用和基本雕刻技法。',
          en: 'Learn the basic techniques of traditional hand-carved mahjong, including material selection, carving tool usage, and fundamental carving methods.',
        },
        craftCategory: '手雕麻將',
        maxParticipants: 8,
        durationHours: 4,
        price: 800,
        status: 'ACTIVE',
      },
    }),
    prisma.course.create({
      data: {
        craftsmanId: craftsmanProfiles[1].id,
        title: {
          'zh-HK': '竹編籃子製作工作坊',
          'zh-CN': '竹编篮子制作工作坊',
          en: 'Bamboo Basket Weaving Workshop',
        },
        description: {
          'zh-HK': '親手製作傳統竹編籃子，學習基本編織技法和竹材處理方法。',
          'zh-CN': '亲手制作传统竹编篮子，学习基本编织技法和竹材处理方法。',
          en: 'Create traditional bamboo baskets by hand, learning basic weaving techniques and bamboo material processing methods.',
        },
        craftCategory: '竹編',
        maxParticipants: 6,
        durationHours: 3,
        price: 600,
        status: 'ACTIVE',
      },
    }),
    prisma.course.create({
      data: {
        craftsmanId: craftsmanProfiles[2].id,
        title: {
          'zh-HK': '吹糖藝術體驗班',
          'zh-CN': '吹糖艺术体验班',
          en: 'Sugar Blowing Art Experience Class',
        },
        description: {
          'zh-HK': '體驗傳統吹糖技藝，學習製作簡單的動物造型糖藝作品。',
          'zh-CN': '体验传统吹糖技艺，学习制作简单的动物造型糖艺作品。',
          en: 'Experience traditional sugar blowing techniques and learn to create simple animal-shaped sugar art pieces.',
        },
        craftCategory: '吹糖',
        maxParticipants: 10,
        durationHours: 2,
        price: 300,
        status: 'ACTIVE',
      },
    }),
  ])

  console.log('✅ Created sample courses')

  // Create sample products
  const products = await Promise.all([
    prisma.product.create({
      data: {
        craftsmanId: craftsmanProfiles[0].id,
        name: {
          'zh-HK': '手雕象牙色麻將',
          'zh-CN': '手雕象牙色麻将',
          en: 'Hand-carved Ivory-colored Mahjong Set',
        },
        description: {
          'zh-HK': '純手工雕刻的象牙色麻將，採用優質材料製作，雕工精細，適合收藏和使用。',
          'zh-CN': '纯手工雕刻的象牙色麻将，采用优质材料制作，雕工精细，适合收藏和使用。',
          en: 'Hand-carved ivory-colored mahjong set made with premium materials, featuring exquisite craftsmanship, perfect for collection and use.',
        },
        price: 2800,
        inventoryQuantity: 5,
        isCustomizable: true,
        craftCategory: '手雕麻將',
        status: 'ACTIVE',
      },
    }),
    prisma.product.create({
      data: {
        craftsmanId: craftsmanProfiles[1].id,
        name: {
          'zh-HK': '傳統竹編菜籃',
          'zh-CN': '传统竹编菜篮',
          en: 'Traditional Bamboo Vegetable Basket',
        },
        description: {
          'zh-HK': '手工編織的傳統竹籃，透氣性佳，適合存放蔬菜水果，環保實用。',
          'zh-CN': '手工编织的传统竹篮，透气性佳，适合存放蔬菜水果，环保实用。',
          en: 'Hand-woven traditional bamboo basket with excellent breathability, perfect for storing vegetables and fruits, eco-friendly and practical.',
        },
        price: 180,
        inventoryQuantity: 20,
        isCustomizable: false,
        craftCategory: '竹編',
        status: 'ACTIVE',
      },
    }),
    prisma.product.create({
      data: {
        craftsmanId: craftsmanProfiles[2].id,
        name: {
          'zh-HK': '十二生肖糖藝套裝',
          'zh-CN': '十二生肖糖艺套装',
          en: 'Twelve Zodiac Sugar Art Set',
        },
        description: {
          'zh-HK': '手工吹製的十二生肖糖藝作品，每個造型精美，適合作為禮品或收藏。',
          'zh-CN': '手工吹制的十二生肖糖艺作品，每个造型精美，适合作为礼品或收藏。',
          en: 'Hand-blown twelve zodiac sugar art pieces, each with exquisite design, perfect as gifts or collectibles.',
        },
        price: 480,
        inventoryQuantity: 10,
        isCustomizable: true,
        craftCategory: '吹糖',
        status: 'ACTIVE',
      },
    }),
  ])

  console.log('✅ Created sample products')

  // Create sample bookings
  const bookings = await Promise.all([
    prisma.booking.create({
      data: {
        userId: learnerUsers[0].id,
        courseId: courses[0].id,
        status: 'CONFIRMED',
        notes: '初學者，希望能學到基本技巧',
      },
    }),
    prisma.booking.create({
      data: {
        userId: learnerUsers[1].id,
        courseId: courses[1].id,
        status: 'PENDING',
        notes: 'Interested in learning traditional crafts',
      },
    }),
  ])

  console.log('✅ Created sample bookings')

  // Create sample orders
  const orders = await Promise.all([
    prisma.order.create({
      data: {
        userId: learnerUsers[0].id,
        totalAmount: 180,
        status: 'DELIVERED',
        paymentStatus: 'COMPLETED',
        shippingAddress: {
          recipientName: '張小明',
          phone: '+852-9123-4567',
          addressLine1: '香港島中環德輔道中123號',
          addressLine2: '15樓A室',
          city: '香港',
          district: '中西區',
          country: '香港',
        },
        orderItems: {
          create: [
            {
              productId: products[1].id,
              quantity: 1,
              price: 180,
            },
          ],
        },
      },
    }),
  ])

  console.log('✅ Created sample orders')

  // Create follow relationships
  await Promise.all([
    prisma.follow.create({
      data: {
        followerId: learnerUsers[0].id,
        followingId: craftsmanUsers[0].id,
      },
    }),
    prisma.follow.create({
      data: {
        followerId: learnerUsers[1].id,
        followingId: craftsmanUsers[1].id,
      },
    }),
  ])

  console.log('✅ Created follow relationships')

  console.log('🎉 Database seeding completed successfully!')
  console.log('\n📋 Summary:')
  console.log(`- Created 1 admin user`)
  console.log(`- Created 3 craftsman users with profiles`)
  console.log(`- Created 2 learner users`)
  console.log(`- Created 3 sample courses`)
  console.log(`- Created 3 sample products`)
  console.log(`- Created 2 sample bookings`)
  console.log(`- Created 1 sample order`)
  console.log(`- Created 2 follow relationships`)
  console.log('\n🔑 Demo Login Credentials:')
  console.log('Admin: admin@hk-heritage-crafts.com / demo123456')
  console.log('Craftsman: master.mahjong@example.com / demo123456')
  console.log('Learner: learner1@example.com / demo123456')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })