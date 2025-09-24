/**
 * 部署就緒檢查腳本
 * Deployment Readiness Check Script
 */

const { PreLaunchChecker } = require('./pre-launch-checklist')
const { FinalTestRunner } = require('./run-final-tests')
const { DataMigration } = require('./data-migration')
const fs = require('fs').promises
const path = require('path')

class DeploymentReadinessChecker {
  constructor() {
    this.results = {
      dataMigration: null,
      prelaunchChecks: null,
      finalTests: null,
      overallStatus: 'pending'
    }
    this.startTime = Date.now()
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString()
    const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${message}`
    console.log(logEntry)
  }

  async checkDeploymentReadiness() {
    this.log('🚀 開始部署就緒檢查...')
    
    try {
      // 階段1: 數據遷移和初始化
      await this.runDataMigration()
      
      // 階段2: 系統預檢查
      await this.runPrelaunchChecks()
      
      // 階段3: 最終測試
      await this.runFinalTests()
      
      // 階段4: 生成最終報告
      await this.generateFinalReport()
      
      // 階段5: 部署建議
      this.provideFinalRecommendation()
      
    } catch (error) {
      this.log(`❌ 部署就緒檢查失敗: ${error.message}`, 'error')
      this.results.overallStatus = 'failed'
      throw error
    }
  }

  async runDataMigration() {
    this.log('📊 階段1: 執行數據遷移和初始化...')
    
    try {
      const migration = new DataMigration()
      await migration.runMigration()
      
      this.results.dataMigration = {
        status: 'success',
        message: '數據遷移成功完成'
      }
      
      this.log('✅ 數據遷移完成')
      
    } catch (error) {
      this.results.dataMigration = {
        status: 'failed',
        message: error.message
      }
      
      this.log(`❌ 數據遷移失敗: ${error.message}`, 'error')
      throw new Error('數據遷移失敗，無法繼續部署檢查')
    }
  }

  async runPrelaunchChecks() {
    this.log('🔍 階段2: 執行上線前檢查...')
    
    try {
      const checker = new PreLaunchChecker()
      const report = await checker.runAllChecks()
      
      this.results.prelaunchChecks = {
        status: report.summary.errors === 0 ? 'success' : 'failed',
        summary: report.summary,
        errors: report.details.errors,
        warnings: report.details.warnings
      }
      
      if (report.summary.errors === 0) {
        this.log('✅ 上線前檢查通過')
      } else {
        this.log(`❌ 上線前檢查發現 ${report.summary.errors} 個錯誤`, 'error')
        throw new Error('上線前檢查未通過')
      }
      
    } catch (error) {
      this.results.prelaunchChecks = {
        status: 'failed',
        message: error.message
      }
      
      this.log(`❌ 上線前檢查失敗: ${error.message}`, 'error')
      throw error
    }
  }

  async runFinalTests() {
    this.log('🧪 階段3: 執行最終測試...')
    
    try {
      const testRunner = new FinalTestRunner()
      const report = await testRunner.runAllTests()
      
      this.results.finalTests = {
        status: report.summary.failed === 0 ? 'success' : 'failed',
        summary: report.summary,
        categories: report.categories
      }
      
      if (report.summary.failed === 0) {
        this.log('✅ 最終測試全部通過')
      } else {
        this.log(`❌ 最終測試發現 ${report.summary.failed} 個失敗`, 'error')
        
        // 如果只是少量測試失敗，可以考慮警告而不是阻止部署
        if (report.summary.failed <= 2 && report.summary.successRate >= 95) {
          this.log('⚠️  測試失敗數量較少，可考慮繼續部署但需要關注', 'warning')
        } else {
          throw new Error('最終測試失敗過多，不建議部署')
        }
      }
      
    } catch (error) {
      this.results.finalTests = {
        status: 'failed',
        message: error.message
      }
      
      this.log(`❌ 最終測試失敗: ${error.message}`, 'error')
      throw error
    }
  }

  async generateFinalReport() {
    this.log('📋 階段4: 生成最終部署報告...')
    
    const totalDuration = Date.now() - this.startTime
    
    const finalReport = {
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      results: this.results,
      deploymentReadiness: this.calculateDeploymentReadiness(),
      recommendations: this.generateRecommendations(),
      nextSteps: this.generateNextSteps()
    }

    // 生成HTML報告
    const htmlReport = this.generateHTMLReport(finalReport)
    const reportPath = path.join(process.cwd(), 'deployment-readiness-report.html')
    await fs.writeFile(reportPath, htmlReport, 'utf8')
    
    // 生成JSON報告
    const jsonReportPath = path.join(process.cwd(), 'deployment-readiness-report.json')
    await fs.writeFile(jsonReportPath, JSON.stringify(finalReport, null, 2), 'utf8')
    
    this.log(`✅ 最終報告已生成: ${reportPath}`)
    
    return finalReport
  }

  calculateDeploymentReadiness() {
    const checks = [
      this.results.dataMigration?.status === 'success',
      this.results.prelaunchChecks?.status === 'success',
      this.results.finalTests?.status === 'success'
    ]
    
    const passedChecks = checks.filter(Boolean).length
    const totalChecks = checks.length
    
    const readinessScore = (passedChecks / totalChecks) * 100
    
    let readinessLevel = 'not-ready'
    if (readinessScore === 100) {
      readinessLevel = 'ready'
    } else if (readinessScore >= 80) {
      readinessLevel = 'mostly-ready'
    } else if (readinessScore >= 60) {
      readinessLevel = 'partially-ready'
    }
    
    return {
      score: readinessScore,
      level: readinessLevel,
      passedChecks,
      totalChecks
    }
  }

  generateRecommendations() {
    const recommendations = []
    
    // 基於檢查結果生成建議
    if (this.results.dataMigration?.status !== 'success') {
      recommendations.push({
        priority: 'high',
        category: '數據遷移',
        message: '必須完成數據遷移才能部署',
        action: '檢查數據庫連接和遷移腳本'
      })
    }
    
    if (this.results.prelaunchChecks?.status !== 'success') {
      recommendations.push({
        priority: 'high',
        category: '系統檢查',
        message: '修復所有系統檢查錯誤',
        action: '查看pre-launch-report.html了解詳情'
      })
    }
    
    if (this.results.finalTests?.status !== 'success') {
      const testSummary = this.results.finalTests?.summary
      if (testSummary && testSummary.successRate >= 95) {
        recommendations.push({
          priority: 'medium',
          category: '測試',
          message: '少量測試失敗，可考慮部署後修復',
          action: '監控失敗的功能模塊'
        })
      } else {
        recommendations.push({
          priority: 'high',
          category: '測試',
          message: '測試失敗過多，建議修復後再部署',
          action: '查看final-test-report.html了解詳情'
        })
      }
    }
    
    // 通用建議
    recommendations.push({
      priority: 'medium',
      category: '監控',
      message: '部署後密切監控系統狀態',
      action: '設置監控警報和日誌收集'
    })
    
    recommendations.push({
      priority: 'low',
      category: '備份',
      message: '確保備份策略已就位',
      action: '驗證自動備份和恢復流程'
    })
    
    return recommendations
  }

  generateNextSteps() {
    const readiness = this.calculateDeploymentReadiness()
    
    switch (readiness.level) {
      case 'ready':
        return [
          '🎉 系統已準備好部署！',
          '1. 執行最終備份',
          '2. 通知相關團隊',
          '3. 執行部署腳本',
          '4. 驗證部署結果',
          '5. 監控系統狀態'
        ]
      
      case 'mostly-ready':
        return [
          '⚠️  系統基本準備就緒，但有少量問題',
          '1. 檢查並修復警告項目',
          '2. 考慮是否可以接受當前風險',
          '3. 準備應急方案',
          '4. 執行部署（如決定繼續）',
          '5. 密切監控並準備回滾'
        ]
      
      case 'partially-ready':
        return [
          '🔧 系統需要進一步準備',
          '1. 修復高優先級問題',
          '2. 重新執行檢查',
          '3. 考慮分階段部署',
          '4. 準備詳細的測試計劃'
        ]
      
      default:
        return [
          '❌ 系統尚未準備好部署',
          '1. 修復所有錯誤',
          '2. 重新執行完整檢查',
          '3. 考慮延後部署時間',
          '4. 檢討開發流程'
        ]
    }
  }

  provideFinalRecommendation() {
    const readiness = this.calculateDeploymentReadiness()
    
    console.log('\n' + '='.repeat(80))
    console.log('🚀 部署就緒檢查最終結果')
    console.log('='.repeat(80))
    
    console.log(`📊 就緒分數: ${readiness.score.toFixed(1)}%`)
    console.log(`📋 通過檢查: ${readiness.passedChecks}/${readiness.totalChecks}`)
    console.log(`⏱️  總耗時: ${Math.round((Date.now() - this.startTime) / 1000)}秒`)
    
    switch (readiness.level) {
      case 'ready':
        console.log('\n🎉 建議: 立即部署')
        console.log('✅ 所有檢查通過，系統已準備好上線')
        this.results.overallStatus = 'ready'
        break
        
      case 'mostly-ready':
        console.log('\n⚠️  建議: 謹慎部署')
        console.log('🟡 大部分檢查通過，可考慮部署但需要密切監控')
        this.results.overallStatus = 'mostly-ready'
        break
        
      case 'partially-ready':
        console.log('\n🔧 建議: 修復後部署')
        console.log('🟠 發現重要問題，建議修復後再部署')
        this.results.overallStatus = 'partially-ready'
        break
        
      default:
        console.log('\n❌ 建議: 暫緩部署')
        console.log('🔴 發現嚴重問題，不建議現在部署')
        this.results.overallStatus = 'not-ready'
        break
    }
    
    console.log('='.repeat(80))
  }

  generateHTMLReport(report) {
    const readiness = report.deploymentReadiness
    const statusColor = {
      'ready': '#4caf50',
      'mostly-ready': '#ff9800',
      'partially-ready': '#ff5722',
      'not-ready': '#f44336'
    }[readiness.level] || '#666'

    return `
<!DOCTYPE html>
<html lang="zh-HK">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>部署就緒檢查報告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 20px; text-align: center; }
        .readiness-score { font-size: 3em; font-weight: bold; margin: 10px 0; }
        .readiness-level { font-size: 1.2em; padding: 10px 20px; border-radius: 20px; display: inline-block; margin: 10px 0; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric { padding: 20px; border-radius: 10px; text-align: center; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .metric.success { background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); }
        .metric.warning { background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%); }
        .metric.error { background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%); }
        .section { margin: 20px 0; padding: 20px; border: 1px solid #ddd; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .check-item { margin: 10px 0; padding: 15px; border-left: 5px solid #ccc; border-radius: 5px; }
        .check-item.success { border-left-color: #4caf50; background: #f1f8e9; }
        .check-item.failed { border-left-color: #f44336; background: #ffebee; }
        .recommendation { margin: 10px 0; padding: 15px; border-radius: 8px; }
        .recommendation.high { background: #ffebee; border-left: 5px solid #f44336; }
        .recommendation.medium { background: #fff3e0; border-left: 5px solid #ff9800; }
        .recommendation.low { background: #e8f5e8; border-left: 5px solid #4caf50; }
        .next-steps { background: #f5f5f5; padding: 20px; border-radius: 10px; }
        .next-steps ol { margin: 10px 0; padding-left: 20px; }
        .timestamp { color: #666; font-size: 0.9em; }
        .progress-circle { width: 120px; height: 120px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto; font-size: 1.5em; font-weight: bold; color: white; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 部署就緒檢查報告</h1>
        <p class="timestamp">生成時間: ${report.timestamp}</p>
        <div class="progress-circle" style="background: conic-gradient(${statusColor} ${readiness.score}%, #e0e0e0 0%);">
            <span>${readiness.score.toFixed(0)}%</span>
        </div>
        <div class="readiness-level" style="background-color: ${statusColor};">
            ${readiness.level === 'ready' ? '✅ 準備就緒' : 
              readiness.level === 'mostly-ready' ? '⚠️ 基本就緒' :
              readiness.level === 'partially-ready' ? '🔧 需要修復' : '❌ 尚未就緒'}
        </div>
        <p>執行時間: ${Math.round(report.duration / 1000)}秒</p>
    </div>

    <div class="summary">
        <div class="metric ${report.results.dataMigration?.status === 'success' ? 'success' : 'error'}">
            <h3>📊 數據遷移</h3>
            <p style="font-size: 2em; margin: 0;">
                ${report.results.dataMigration?.status === 'success' ? '✅' : '❌'}
            </p>
            <p>${report.results.dataMigration?.status === 'success' ? '完成' : '失敗'}</p>
        </div>
        
        <div class="metric ${report.results.prelaunchChecks?.status === 'success' ? 'success' : 'error'}">
            <h3>🔍 系統檢查</h3>
            <p style="font-size: 2em; margin: 0;">
                ${report.results.prelaunchChecks?.status === 'success' ? '✅' : '❌'}
            </p>
            <p>${report.results.prelaunchChecks?.summary?.errors || 0} 錯誤</p>
        </div>
        
        <div class="metric ${report.results.finalTests?.status === 'success' ? 'success' : 'warning'}">
            <h3>🧪 最終測試</h3>
            <p style="font-size: 2em; margin: 0;">
                ${report.results.finalTests?.summary?.successRate || 0}%
            </p>
            <p>${report.results.finalTests?.summary?.failed || 0} 失敗</p>
        </div>
    </div>

    <div class="section">
        <h2>📋 檢查詳情</h2>
        
        <div class="check-item ${report.results.dataMigration?.status === 'success' ? 'success' : 'failed'}">
            <h4>數據遷移和初始化</h4>
            <p><strong>狀態:</strong> ${report.results.dataMigration?.status === 'success' ? '✅ 成功' : '❌ 失敗'}</p>
            <p><strong>說明:</strong> ${report.results.dataMigration?.message || '數據遷移執行完成'}</p>
        </div>
        
        <div class="check-item ${report.results.prelaunchChecks?.status === 'success' ? 'success' : 'failed'}">
            <h4>上線前系統檢查</h4>
            <p><strong>狀態:</strong> ${report.results.prelaunchChecks?.status === 'success' ? '✅ 通過' : '❌ 未通過'}</p>
            ${report.results.prelaunchChecks?.summary ? `
            <p><strong>檢查項目:</strong> ${report.results.prelaunchChecks.summary.totalChecks}</p>
            <p><strong>錯誤:</strong> ${report.results.prelaunchChecks.summary.errors}</p>
            <p><strong>警告:</strong> ${report.results.prelaunchChecks.summary.warnings}</p>
            ` : ''}
        </div>
        
        <div class="check-item ${report.results.finalTests?.status === 'success' ? 'success' : 'failed'}">
            <h4>最終測試執行</h4>
            <p><strong>狀態:</strong> ${report.results.finalTests?.status === 'success' ? '✅ 全部通過' : '⚠️ 部分失敗'}</p>
            ${report.results.finalTests?.summary ? `
            <p><strong>總測試:</strong> ${report.results.finalTests.summary.totalTests}</p>
            <p><strong>通過:</strong> ${report.results.finalTests.summary.passed}</p>
            <p><strong>失敗:</strong> ${report.results.finalTests.summary.failed}</p>
            <p><strong>成功率:</strong> ${report.results.finalTests.summary.successRate}%</p>
            ` : ''}
        </div>
    </div>

    <div class="section">
        <h2>💡 建議事項</h2>
        ${report.recommendations.map(rec => `
        <div class="recommendation ${rec.priority}">
            <h4>${rec.category} (${rec.priority === 'high' ? '高優先級' : rec.priority === 'medium' ? '中優先級' : '低優先級'})</h4>
            <p><strong>建議:</strong> ${rec.message}</p>
            <p><strong>行動:</strong> ${rec.action}</p>
        </div>
        `).join('')}
    </div>

    <div class="next-steps">
        <h2>📝 下一步行動</h2>
        <ol>
            ${report.nextSteps.map(step => `<li>${step}</li>`).join('')}
        </ol>
    </div>

    <div style="margin-top: 30px; padding: 20px; background: ${statusColor}; color: white; border-radius: 10px; text-align: center;">
        <h3>最終建議</h3>
        <p style="font-size: 1.2em; margin: 0;">
            ${readiness.level === 'ready' ? '🎉 系統已準備好部署！可以立即執行部署流程。' :
              readiness.level === 'mostly-ready' ? '⚠️ 系統基本準備就緒，可考慮謹慎部署並密切監控。' :
              readiness.level === 'partially-ready' ? '🔧 建議修復重要問題後再進行部署。' :
              '❌ 發現嚴重問題，強烈建議暫緩部署。'}
        </p>
    </div>
</body>
</html>
    `
  }
}

// 執行部署就緒檢查
async function checkDeploymentReadiness() {
  const checker = new DeploymentReadinessChecker()
  
  try {
    await checker.checkDeploymentReadiness()
    
    const status = checker.results.overallStatus
    
    if (status === 'ready') {
      console.log('\n🎉 系統已準備好部署！')
      process.exit(0)
    } else if (status === 'mostly-ready') {
      console.log('\n⚠️  系統基本準備就緒，請謹慎評估是否部署')
      process.exit(0)
    } else {
      console.log('\n❌ 系統尚未準備好部署，請修復問題後重新檢查')
      process.exit(1)
    }
  } catch (error) {
    console.error('\n💥 部署就緒檢查過程中發生錯誤:', error.message)
    process.exit(1)
  }
}

// 如果直接執行此腳本
if (require.main === module) {
  checkDeploymentReadiness()
}

module.exports = { DeploymentReadinessChecker }