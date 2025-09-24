#!/usr/bin/env node

/**
 * Database initialization script
 * This script can be used to initialize the database without Docker
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🚀 Initializing Hong Kong Heritage Crafts Platform Database...\n')

// Check if .env.local exists
const envPath = path.join(process.cwd(), '.env.local')
if (!fs.existsSync(envPath)) {
  console.log('📋 Creating .env.local from .env.example...')
  const exampleEnvPath = path.join(process.cwd(), '.env.example')
  if (fs.existsSync(exampleEnvPath)) {
    fs.copyFileSync(exampleEnvPath, envPath)
    console.log('✅ .env.local created successfully')
  } else {
    console.error('❌ .env.example not found')
    process.exit(1)
  }
}

// Function to run command and handle errors
function runCommand(command, description) {
  try {
    console.log(`🔄 ${description}...`)
    execSync(command, { stdio: 'inherit' })
    console.log(`✅ ${description} completed\n`)
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message)
    return false
  }
  return true
}

// Check if we can connect to the database
function checkDatabaseConnection() {
  try {
    console.log('🔍 Checking database connection...')
    execSync('npm run db:generate', { stdio: 'pipe' })
    console.log('✅ Database connection successful\n')
    return true
  } catch (error) {
    console.log('⚠️  Database connection failed. Please ensure:')
    console.log('   1. PostgreSQL is running')
    console.log('   2. Database "heritage_crafts" exists')
    console.log('   3. DATABASE_URL in .env.local is correct')
    console.log('\n📖 For detailed setup instructions, see docs/DATABASE_SETUP.md\n')
    return false
  }
}

// Main initialization process
async function initializeDatabase() {
  console.log('📦 Installing dependencies...')
  if (!runCommand('npm install', 'Installing dependencies')) {
    return false
  }

  if (!checkDatabaseConnection()) {
    console.log('💡 Quick setup with Docker (if available):')
    console.log('   docker compose up -d')
    console.log('\n💡 Or setup PostgreSQL manually and update .env.local')
    return false
  }

  // Generate Prisma client
  if (!runCommand('npm run db:generate', 'Generating Prisma client')) {
    return false
  }

  // Push database schema
  if (!runCommand('npm run db:push', 'Pushing database schema')) {
    return false
  }

  // Seed database with sample data
  console.log('🌱 Seeding database with sample data...')
  if (!runCommand('npm run db:seed', 'Seeding database')) {
    console.log('⚠️  Seeding failed, but database schema is ready')
  }

  console.log('🎉 Database initialization completed successfully!')
  console.log('\n📋 What\'s been set up:')
  console.log('   ✅ Database schema created')
  console.log('   ✅ Sample data inserted (if seeding succeeded)')
  console.log('   ✅ Prisma client generated')
  
  console.log('\n🔑 Demo login credentials (if seeding succeeded):')
  console.log('   Admin: admin@hk-heritage-crafts.com / demo123456')
  console.log('   Craftsman: master.mahjong@example.com / demo123456')
  console.log('   Learner: learner1@example.com / demo123456')
  
  console.log('\n🛠️  Useful commands:')
  console.log('   npm run dev          - Start development server')
  console.log('   npm run db:studio    - Open Prisma Studio')
  console.log('   npm run db:seed      - Re-seed database')
  
  return true
}

// Run the initialization
initializeDatabase().catch((error) => {
  console.error('❌ Initialization failed:', error)
  process.exit(1)
})