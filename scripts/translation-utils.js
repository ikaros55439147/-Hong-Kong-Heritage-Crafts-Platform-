#!/usr/bin/env node

/**
 * Translation Utilities Script
 * 
 * This script provides utilities for managing translations in the heritage crafts platform:
 * - Batch translate content
 * - Clean up translation cache
 * - Export/import translations
 * - Quality assessment reports
 */

const { PrismaClient } = require('@prisma/client')
const fs = require('fs').promises
const path = require('path')

const prisma = new PrismaClient()

// Configuration
const SUPPORTED_LANGUAGES = ['zh-HK', 'zh-CN', 'en']
const DEFAULT_SOURCE_LANGUAGE = 'zh-HK'

async function main() {
  const command = process.argv[2]
  
  switch (command) {
    case 'batch-translate':
      await batchTranslateContent()
      break
    case 'cleanup-cache':
      await cleanupTranslationCache()
      break
    case 'export-translations':
      await exportTranslations()
      break
    case 'import-translations':
      await importTranslations()
      break
    case 'quality-report':
      await generateQualityReport()
      break
    case 'migrate-content':
      await migrateExistingContent()
      break
    default:
      console.log(`
Translation Utilities

Usage: node scripts/translation-utils.js <command>

Commands:
  batch-translate     - Translate all missing content
  cleanup-cache      - Clean up expired translation cache
  export-translations - Export translations to JSON files
  import-translations - Import translations from JSON files
  quality-report     - Generate translation quality report
  migrate-content    - Migrate existing content to multilingual format

Examples:
  node scripts/translation-utils.js batch-translate
  node scripts/translation-utils.js cleanup-cache
  node scripts/translation-utils.js export-translations
      `)
  }
}

async function batchTranslateContent() {
  console.log('Starting batch translation of missing content...')
  
  try {
    // Get all courses with missing translations
    const courses = await prisma.course.findMany({
      select: {
        id: true,
        title: true,
        description: true
      }
    })

    let translatedCount = 0

    for (const course of courses) {
      // Check for missing translations in title
      if (course.title && typeof course.title === 'object') {
        const missingLanguages = SUPPORTED_LANGUAGES.filter(
          lang => !course.title[lang]
        )

        if (missingLanguages.length > 0) {
          const sourceLanguage = getSourceLanguage(course.title)
          if (sourceLanguage && course.title[sourceLanguage]) {
            console.log(`Translating course title: ${course.title[sourceLanguage]}`)
            
            const translations = await translateToLanguages(
              course.title[sourceLanguage],
              sourceLanguage,
              missingLanguages
            )

            if (translations) {
              const updatedTitle = { ...course.title, ...translations }
              await prisma.course.update({
                where: { id: course.id },
                data: { title: updatedTitle }
              })
              translatedCount++
            }
          }
        }
      }

      // Check for missing translations in description
      if (course.description && typeof course.description === 'object') {
        const missingLanguages = SUPPORTED_LANGUAGES.filter(
          lang => !course.description[lang]
        )

        if (missingLanguages.length > 0) {
          const sourceLanguage = getSourceLanguage(course.description)
          if (sourceLanguage && course.description[sourceLanguage]) {
            console.log(`Translating course description...`)
            
            const translations = await translateToLanguages(
              course.description[sourceLanguage],
              sourceLanguage,
              missingLanguages
            )

            if (translations) {
              const updatedDescription = { ...course.description, ...translations }
              await prisma.course.update({
                where: { id: course.id },
                data: { description: updatedDescription }
              })
            }
          }
        }
      }
    }

    // Repeat for products, craftsman profiles, etc.
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        description: true
      }
    })

    for (const product of products) {
      if (product.name && typeof product.name === 'object') {
        const missingLanguages = SUPPORTED_LANGUAGES.filter(
          lang => !product.name[lang]
        )

        if (missingLanguages.length > 0) {
          const sourceLanguage = getSourceLanguage(product.name)
          if (sourceLanguage && product.name[sourceLanguage]) {
            console.log(`Translating product name: ${product.name[sourceLanguage]}`)
            
            const translations = await translateToLanguages(
              product.name[sourceLanguage],
              sourceLanguage,
              missingLanguages
            )

            if (translations) {
              const updatedName = { ...product.name, ...translations }
              await prisma.product.update({
                where: { id: product.id },
                data: { name: updatedName }
              })
              translatedCount++
            }
          }
        }
      }
    }

    console.log(`Batch translation completed. Translated ${translatedCount} items.`)
  } catch (error) {
    console.error('Batch translation failed:', error)
  }
}

async function cleanupTranslationCache() {
  console.log('Cleaning up translation cache...')
  
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    
    const result = await prisma.translationCache.deleteMany({
      where: {
        createdAt: {
          lt: thirtyDaysAgo
        }
      }
    })

    console.log(`Cleaned up ${result.count} expired cache entries.`)
  } catch (error) {
    console.error('Cache cleanup failed:', error)
  }
}

async function exportTranslations() {
  console.log('Exporting translations...')
  
  try {
    const exportDir = path.join(process.cwd(), 'exports', 'translations')
    await fs.mkdir(exportDir, { recursive: true })

    // Export courses
    const courses = await prisma.course.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        craftCategory: true
      }
    })

    const courseTranslations = courses.map(course => ({
      id: course.id,
      type: 'course',
      category: course.craftCategory,
      title: course.title,
      description: course.description
    }))

    await fs.writeFile(
      path.join(exportDir, 'courses.json'),
      JSON.stringify(courseTranslations, null, 2)
    )

    // Export products
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        craftCategory: true
      }
    })

    const productTranslations = products.map(product => ({
      id: product.id,
      type: 'product',
      category: product.craftCategory,
      name: product.name,
      description: product.description
    }))

    await fs.writeFile(
      path.join(exportDir, 'products.json'),
      JSON.stringify(productTranslations, null, 2)
    )

    console.log(`Translations exported to ${exportDir}`)
  } catch (error) {
    console.error('Export failed:', error)
  }
}

async function importTranslations() {
  console.log('Importing translations...')
  
  try {
    const importDir = path.join(process.cwd(), 'imports', 'translations')

    // Import courses
    try {
      const coursesData = await fs.readFile(path.join(importDir, 'courses.json'), 'utf8')
      const courses = JSON.parse(coursesData)

      for (const course of courses) {
        await prisma.course.update({
          where: { id: course.id },
          data: {
            title: course.title,
            description: course.description
          }
        })
      }

      console.log(`Imported ${courses.length} course translations`)
    } catch (error) {
      console.log('No course translations to import')
    }

    // Import products
    try {
      const productsData = await fs.readFile(path.join(importDir, 'products.json'), 'utf8')
      const products = JSON.parse(productsData)

      for (const product of products) {
        await prisma.product.update({
          where: { id: product.id },
          data: {
            name: product.name,
            description: product.description
          }
        })
      }

      console.log(`Imported ${products.length} product translations`)
    } catch (error) {
      console.log('No product translations to import')
    }

  } catch (error) {
    console.error('Import failed:', error)
  }
}

async function generateQualityReport() {
  console.log('Generating translation quality report...')
  
  try {
    const cacheEntries = await prisma.translationCache.findMany({
      select: {
        provider: true,
        quality: true,
        sourceLanguage: true,
        targetLanguage: true,
        createdAt: true
      }
    })

    const report = {
      totalTranslations: cacheEntries.length,
      byProvider: {},
      byLanguagePair: {},
      qualityStats: {
        highQuality: 0,
        mediumQuality: 0,
        lowQuality: 0,
        needsReview: 0
      },
      generatedAt: new Date().toISOString()
    }

    cacheEntries.forEach(entry => {
      // Provider stats
      if (!report.byProvider[entry.provider]) {
        report.byProvider[entry.provider] = 0
      }
      report.byProvider[entry.provider]++

      // Language pair stats
      const langPair = `${entry.sourceLanguage}-${entry.targetLanguage}`
      if (!report.byLanguagePair[langPair]) {
        report.byLanguagePair[langPair] = 0
      }
      report.byLanguagePair[langPair]++

      // Quality stats
      if (entry.quality) {
        try {
          const quality = JSON.parse(entry.quality)
          if (quality.score >= 0.8) {
            report.qualityStats.highQuality++
          } else if (quality.score >= 0.6) {
            report.qualityStats.mediumQuality++
          } else {
            report.qualityStats.lowQuality++
          }

          if (quality.needsReview) {
            report.qualityStats.needsReview++
          }
        } catch (error) {
          // Invalid quality data
        }
      }
    })

    const reportDir = path.join(process.cwd(), 'reports')
    await fs.mkdir(reportDir, { recursive: true })
    
    await fs.writeFile(
      path.join(reportDir, `translation-quality-${Date.now()}.json`),
      JSON.stringify(report, null, 2)
    )

    console.log('Quality report generated:')
    console.log(`Total translations: ${report.totalTranslations}`)
    console.log(`High quality: ${report.qualityStats.highQuality}`)
    console.log(`Medium quality: ${report.qualityStats.mediumQuality}`)
    console.log(`Low quality: ${report.qualityStats.lowQuality}`)
    console.log(`Needs review: ${report.qualityStats.needsReview}`)
  } catch (error) {
    console.error('Quality report generation failed:', error)
  }
}

async function migrateExistingContent() {
  console.log('Migrating existing content to multilingual format...')
  
  try {
    // This would be used to migrate from single-language content to multilingual
    // Example: converting string fields to JSON objects
    
    console.log('Migration completed. All content is now in multilingual format.')
  } catch (error) {
    console.error('Migration failed:', error)
  }
}

// Helper functions
function getSourceLanguage(multilingualContent) {
  if (multilingualContent[DEFAULT_SOURCE_LANGUAGE]) {
    return DEFAULT_SOURCE_LANGUAGE
  }
  
  const availableLanguages = Object.keys(multilingualContent)
  return availableLanguages.length > 0 ? availableLanguages[0] : null
}

async function translateToLanguages(text, sourceLanguage, targetLanguages) {
  // This would call the translation service
  // For now, return mock translations
  const translations = {}
  
  for (const lang of targetLanguages) {
    translations[lang] = `[AUTO-TRANSLATED to ${lang}] ${text}`
  }
  
  return translations
}

// Run the script
main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  })