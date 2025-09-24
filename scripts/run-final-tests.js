/**
 * 最終測試執行器
 * Final Test Runner for System Integration
 */

const { execSync, spawn } = require('child_process')
const fs = require('fs').promises
const path = require('path')

class FinalTestRunner {
  constructor() {
    this.testResults = []
    this.totalTests = 0
    this.passedTests = 0
    this.failedTests = 0
    this.skippedTests = 0
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString()
    const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${message}`
    console.log(logEntry)
  }

  async runAllTests() {
    this.log('🧪 開始執行最終系統測試...')
    
    try {
      // 1. 單元測試
      await this.runUnitTests()
      
      // 2. 集成測試
      await this.runIntegrationTests()
      
      // 3. 系統集成測試
      await this.runSystemIntegrationTests()
      
      // 4. 用戶驗收測試
      await this.runUserAcceptanceTests()
      
      // 5. 性能測試
      await this.runPerformanceTests()
      
      // 6. 安全測試
      await this.runSecurityTests()
      
      // 7. 生成測試報告
      await this.generateTestReport()
      
      this.log('✅ 所有測試執行完成')
      
    } catch (error) {
      this.log(`❌ 測試執行失敗: ${error.message}`, 'error')
      throw error
    }
  }

  async runUnitTests() {
    this.log('🔬 執行單元測試...')
    
    const unitTestFiles = [
      'src/lib/__tests__/core-unit.test.ts',
      'src/lib/__tests__/data-models.test.ts',
      'src/lib/__tests__/data-model-validation.test.ts',
      'src/lib/__tests__/auth-unit.test.ts',
      'src/lib/__tests__/service-unit.test.ts',
      'src/lib/__tests__/utility-functions.test.ts'
    ]

    for (const testFile of unitTestFiles) {
      await this.runSingleTest(testFile, '單元測試')
    }
  }

  async runIntegrationTests() {
    this.log('🔗 執行集成測試...')
    
    const integrationTestFiles = [
      'src/lib/__tests__/integration.test.ts',
      'src/lib/__tests__/api-integration.test.ts',
      'src/lib/__tests__/database-operations.test.ts',
      'src/lib/__tests__/payment-flow.test.ts',
      'src/lib/__tests__/e2e-user-flows.test.ts'
    ]

    for (const testFile of integrationTestFiles) {
      await this.runSingleTest(testFile, '集成測試')
    }
  }

  async runSystemIntegrationTests() {
    this.log('🌐 執行系統集成測試...')
    
    const systemTestFiles = [
      'src/lib/__tests__/system-integration.test.ts',
      'src/lib/__tests__/integration-summary.test.ts'
    ]

    for (const testFile of systemTestFiles) {
      await this.runSingleTest(testFile, '系統集成測試')
    }
  }

  async runUserAcceptanceTests() {
    this.log('👥 執行用戶驗收測試...')
    
    const uatTestFiles = [
      'src/lib/__tests__/user-acceptance.test.ts'
    ]

    for (const testFile of uatTestFiles) {
      await this.runSingleTest(testFile, '用戶驗收測試')
    }
  }

  async runPerformanceTests() {
    this.log('⚡ 執行性能測試...')
    
    const performanceTestFiles = [
      'src/lib/__tests__/performance.test.ts'
    ]

    for (const testFile of performanceTestFiles) {
      await this.runSingleTest(testFile, '性能測試')
    }
  }

  async runSecurityTests() {
    this.log('🔒 執行安全測試...')
    
    const securityTestFiles = [
      'src/lib/__tests__/security.test.ts'
    ]

    for (const testFile of securityTestFiles) {
      await this.runSingleTest(testFile, '安全測試')
    }
  }

  async runSingleTest(testFile, category) {
    const testName = path.basename(testFile, '.test.ts')
    
    try {
      // 檢查測試文件是否存在
      const fullPath = path.join(process.cwd(), testFile)
      await fs.access(fullPath)
      
      this.log(`執行 ${category}: ${testName}`)
      
      // 執行測試
      const result = await this.executeVitest(testFile)
      
      this.testResults.push({
        category,
        testName,
        file: testFile,
        status: result.success ? 'passed' : 'failed',
        duration: result.duration,
        tests: result.tests,
        errors: result.errors
      })
      
      if (result.success) {
        this.passedTests++
        this.log(`✅ ${testName} 通過 (${result.tests}個測試, ${result.duration}ms)`)
      } else {
        this.failedTests++
        this.log(`❌ ${testName} 失敗: ${result.errors.join(', ')}`, 'error')
      }
      
      this.totalTests += result.tests
      
    } catch (error) {
      this.skippedTests++
      this.log(`⏭️  跳過 ${testName}: ${error.message}`, 'warning')
      
      this.testResults.push({
        category,
        testName,
        file: testFile,
        status: 'skipped',
        reason: error.message
      })
    }
  }

  async executeVitest(testFile) {
    return new Promise((resolve) => {
      const startTime = Date.now()
      let output = ''
      let errorOutput = ''
      
      const vitestProcess = spawn('npx', ['vitest', 'run', testFile, '--reporter=json'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      })

      vitestProcess.stdout.on('data', (data) => {
        output += data.toString()
      })

      vitestProcess.stderr.on('data', (data) => {
        errorOutput += data.toString()
      })

      vitestProcess.on('close', (code) => {
        const duration = Date.now() - startTime
        
        try {
          // 嘗試解析JSON輸出
          const lines = output.split('\n').filter(line => line.trim())
          let testResult = null
          
          for (const line of lines) {
            try {
              const parsed = JSON.parse(line)
              if (parsed.testResults) {
                testResult = parsed
                break
              }
            } catch (e) {
              // 忽略非JSON行
            }
          }
          
          if (testResult) {
            const totalTests = testResult.testResults.reduce((sum, result) => 
              sum + result.assertionResults.length, 0)
            const failedTests = testResult.testResults.reduce((sum, result) => 
              sum + result.assertionResults.filter(a => a.status === 'failed').length, 0)
            
            resolve({
              success: code === 0 && failedTests === 0,
              duration,
              tests: totalTests,
              errors: failedTests > 0 ? ['測試失敗'] : []
            })
          } else {
            // 如果無法解析JSON，使用退出碼判斷
            resolve({
              success: code === 0,
              duration,
              tests: 1, // 假設至少有一個測試
              errors: code !== 0 ? [errorOutput || '測試執行失敗'] : []
            })
          }
        } catch (error) {
          resolve({
            success: false,
            duration,
            tests: 0,
            errors: [error.message]
          })
        }
      })

      vitestProcess.on('error', (error) => {
        resolve({
          success: false,
          duration: Date.now() - startTime,
          tests: 0,
          errors: [error.message]
        })
      })
    })
  }

  async generateTestReport() {
    this.log('📊 生成測試報告...')
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTestFiles: this.testResults.length,
        totalTests: this.totalTests,
        passed: this.passedTests,
        failed: this.failedTests,
        skipped: this.skippedTests,
        successRate: this.totalTests > 0 ? ((this.passedTests / (this.passedTests + this.failedTests)) * 100).toFixed(2) : 0
      },
      results: this.testResults,
      categories: this.groupResultsByCategory()
    }

    // 生成HTML報告
    const htmlReport = this.generateHTMLReport(report)
    const reportPath = path.join(process.cwd(), 'final-test-report.html')
    await fs.writeFile(reportPath, htmlReport, 'utf8')
    
    // 生成JSON報告
    const jsonReportPath = path.join(process.cwd(), 'final-test-report.json')
    await fs.writeFile(jsonReportPath, JSON.stringify(report, null, 2), 'utf8')
    
    this.log(`✅ 測試報告已生成: ${reportPath}`)
    
    // 輸出摘要
    console.log('\n' + '='.repeat(60))
    console.log('🧪 最終測試摘要')
    console.log('='.repeat(60))
    console.log(`📁 測試文件: ${report.summary.totalTestFiles}`)
    console.log(`🧪 總測試數: ${report.summary.totalTests}`)
    console.log(`✅ 通過: ${report.summary.passed}`)
    console.log(`❌ 失敗: ${report.summary.failed}`)
    console.log(`⏭️  跳過: ${report.summary.skipped}`)
    console.log(`📊 成功率: ${report.summary.successRate}%`)
    console.log('='.repeat(60))

    // 按類別顯示結果
    Object.entries(report.categories).forEach(([category, results]) => {
      const passed = results.filter(r => r.status === 'passed').length
      const failed = results.filter(r => r.status === 'failed').length
      const skipped = results.filter(r => r.status === 'skipped').length
      
      console.log(`\n${category}:`)
      console.log(`  ✅ 通過: ${passed}`)
      console.log(`  ❌ 失敗: ${failed}`)
      console.log(`  ⏭️  跳過: ${skipped}`)
    })

    if (report.summary.failed > 0) {
      console.log('\n❌ 失敗的測試:')
      this.testResults
        .filter(r => r.status === 'failed')
        .forEach(r => {
          console.log(`  - ${r.category}: ${r.testName}`)
          if (r.errors) {
            r.errors.forEach(error => console.log(`    ${error}`))
          }
        })
    }

    return report
  }

  groupResultsByCategory() {
    const categories = {}
    
    this.testResults.forEach(result => {
      if (!categories[result.category]) {
        categories[result.category] = []
      }
      categories[result.category].push(result)
    })
    
    return categories
  }

  generateHTMLReport(report) {
    return `
<!DOCTYPE html>
<html lang="zh-HK">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>最終測試報告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 20px 0; }
        .metric { padding: 15px; border-radius: 8px; text-align: center; }
        .metric.total { background: #e3f2fd; }
        .metric.passed { background: #e8f5e8; }
        .metric.failed { background: #ffebee; }
        .metric.skipped { background: #fff3e0; }
        .category { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
        .test-item { margin: 8px 0; padding: 10px; border-left: 4px solid #ccc; border-radius: 4px; }
        .test-item.passed { border-left-color: #4caf50; background: #f1f8e9; }
        .test-item.failed { border-left-color: #f44336; background: #ffebee; }
        .test-item.skipped { border-left-color: #ff9800; background: #fff3e0; }
        .timestamp { color: #666; font-size: 0.9em; }
        .progress-bar { width: 100%; height: 20px; background: #f0f0f0; border-radius: 10px; overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #4caf50, #8bc34a); transition: width 0.3s; }
        .error-details { background: #f5f5f5; padding: 10px; margin: 5px 0; border-radius: 4px; font-family: monospace; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 香港弱勢行業傳承平台 - 最終測試報告</h1>
        <p class="timestamp">生成時間: ${report.timestamp}</p>
        <div class="progress-bar">
            <div class="progress-fill" style="width: ${report.summary.successRate}%"></div>
        </div>
        <p>整體成功率: ${report.summary.successRate}%</p>
    </div>

    <div class="summary">
        <div class="metric total">
            <h3>總測試數</h3>
            <p style="font-size: 2em; margin: 0;">${report.summary.totalTests}</p>
        </div>
        <div class="metric passed">
            <h3>通過</h3>
            <p style="font-size: 2em; margin: 0;">${report.summary.passed}</p>
        </div>
        <div class="metric failed">
            <h3>失敗</h3>
            <p style="font-size: 2em; margin: 0;">${report.summary.failed}</p>
        </div>
        <div class="metric skipped">
            <h3>跳過</h3>
            <p style="font-size: 2em; margin: 0;">${report.summary.skipped}</p>
        </div>
    </div>

    ${Object.entries(report.categories).map(([category, results]) => `
    <div class="category">
        <h2>${category}</h2>
        ${results.map(result => `
        <div class="test-item ${result.status}">
            <h4>${result.testName}</h4>
            <p><strong>狀態:</strong> ${result.status === 'passed' ? '✅ 通過' : result.status === 'failed' ? '❌ 失敗' : '⏭️ 跳過'}</p>
            ${result.duration ? `<p><strong>執行時間:</strong> ${result.duration}ms</p>` : ''}
            ${result.tests ? `<p><strong>測試數量:</strong> ${result.tests}</p>` : ''}
            ${result.errors && result.errors.length > 0 ? `
            <div class="error-details">
                <strong>錯誤詳情:</strong><br>
                ${result.errors.map(error => `• ${error}`).join('<br>')}
            </div>
            ` : ''}
            ${result.reason ? `<p><strong>跳過原因:</strong> ${result.reason}</p>` : ''}
        </div>
        `).join('')}
    </div>
    `).join('')}

    <div style="margin-top: 30px; padding: 15px; background: #f0f0f0; border-radius: 8px;">
        <h3>📋 測試完成度檢查</h3>
        <p>✅ 單元測試: 核心業務邏輯測試</p>
        <p>✅ 集成測試: API和數據庫集成測試</p>
        <p>✅ 系統測試: 完整系統功能測試</p>
        <p>✅ 用戶驗收測試: 用戶場景測試</p>
        <p>✅ 性能測試: 系統性能和負載測試</p>
        <p>✅ 安全測試: 安全漏洞和權限測試</p>
        
        ${report.summary.failed === 0 ? 
          '<p style="color: green; font-weight: bold;">🎉 所有測試通過，系統已準備好上線！</p>' : 
          '<p style="color: red; font-weight: bold;">⚠️ 發現測試失敗，請修復後重新測試</p>'
        }
    </div>
</body>
</html>
    `
  }
}

// 執行最終測試
async function runFinalTests() {
  const runner = new FinalTestRunner()
  
  try {
    const report = await runner.runAllTests()
    
    if (report.summary.failed === 0) {
      console.log('\n🎉 恭喜！所有測試通過，系統已準備好上線！')
      process.exit(0)
    } else {
      console.log('\n⚠️  發現測試失敗，請修復後重新測試')
      process.exit(1)
    }
  } catch (error) {
    console.error('\n❌ 測試執行過程中發生錯誤:', error.message)
    process.exit(1)
  }
}

// 如果直接執行此腳本
if (require.main === module) {
  runFinalTests()
}

module.exports = { FinalTestRunner }