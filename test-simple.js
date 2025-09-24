// Simple test to check if basic dependencies work
console.log('Testing basic setup...')

try {
  const React = require('react')
  console.log('✓ React loaded')
  
  const NextJS = require('next')
  console.log('✓ Next.js loaded')
  
  const i18next = require('react-i18next')
  console.log('✓ react-i18next loaded')
  
  console.log('All basic dependencies are working!')
} catch (error) {
  console.error('Error:', error.message)
}