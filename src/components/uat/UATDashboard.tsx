'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'

interface UATTestResult {
  testId: string
  testName: string
  requirement: string
  status: 'passed' | 'failed' | 'blocked' | 'running'
  issues: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical'
    description: string
    reproductionSteps: string[]
    expectedBehavior: string
    actualBehavior: string
    screenshot?: string
  }>
  executionTime: number
  notes?: string
}

interface FeedbackSummary {
  totalFeedback: number
  byCategory: Record<string, number>
  bySeverity: Record<string, number>
  byStatus: Record<string, number>
  averageResolutionTime: number
  userSatisfactionScore: number
}

export default function UATDashboard() {
  const [testResults, setTestResults] = useState<UATTestResult[]>([])
  const [feedbackSummary, setFeedbackSummary] = useState<FeedbackSummary | null>(null)
  const [isRunningTests, setIsRunningTests] = useState(false)
  const [selectedTest, setSelectedTest] = useState<UATTestResult | null>(null)

  useEffect(() => {
    loadTestResults()
    loadFeedbackSummary()
  }, [])

  const loadTestResults = async () => {
    try {
      // 這裡應該從API載入實際的測試結果
      // 目前使用模擬數據
      const mockResults: UATTestResult[] = [
        {
          testId: 'UAT-FLOW-001',
          testName: '新用戶完整購買流程',
          requirement: '需求 1, 6',
          status: 'passed',
          issues: [],
          executionTime: 45000,
          notes: '所有步驟都順利完成'
        },
        {
          testId: 'UAT-FLOW-002',
          testName: '師傅創建課程到學員預約流程',
          requirement: '需求 1, 2',
          status: 'failed',
          issues: [
            {
              severity: 'high',
              description: '預約確認頁面載入失敗',
              reproductionSteps: [
                '1. 師傅登入並創建課程',
                '2. 學員搜索並選擇課程',
                '3. 點擊預約按鈕',
                '4. 填寫預約表單',
                '5. 點擊確認預約'
              ],
              expectedBehavior: '顯示預約成功確認頁面',
              actualBehavior: '頁面顯示404錯誤'
            }
          ],
          executionTime: 38000,
          notes: '需要修復預約確認頁面的路由問題'
        },
        {
          testId: 'UAT-FLOW-003',
          testName: '多語言功能測試',
          requirement: '需求 5',
          status: 'passed',
          issues: [
            {
              severity: 'low',
              description: '部分翻譯文本顯示不完整',
              reproductionSteps: [
                '1. 切換到英文界面',
                '2. 瀏覽師傅檔案頁面',
                '3. 檢查所有文本是否正確翻譯'
              ],
              expectedBehavior: '所有文本都應該正確翻譯',
              actualBehavior: '部分按鈕文本仍顯示中文'
            }
          ],
          executionTime: 25000,
          notes: '整體功能正常，只需要完善翻譯'
        }
      ]
      setTestResults(mockResults)
    } catch (error) {
      console.error('Error loading test results:', error)
    }
  }

  const loadFeedbackSummary = async () => {
    try {
      const response = await fetch('/api/feedback')
      const data = await response.json()
      setFeedbackSummary(data.analytics)
    } catch (error) {
      console.error('Error loading feedback summary:', error)
    }
  }

  const runUATTests = async () => {
    setIsRunningTests(true)
    try {
      // 這裡應該觸發實際的UAT測試執行
      // 目前模擬測試執行過程
      await new Promise(resolve => setTimeout(resolve, 3000))
      await loadTestResults()
    } catch (error) {
      console.error('Error running UAT tests:', error)
    } finally {
      setIsRunningTests(false)
    }
  }

  const submitFeedback = async (testResult: UATTestResult) => {
    try {
      const feedbackItems = testResult.issues.map(issue => ({
        category: 'bug',
        title: `UAT Issue: ${testResult.testName}`,
        description: issue.description,
        severity: issue.severity,
        page: testResult.testId,
        reproductionSteps: issue.reproductionSteps,
        expectedBehavior: issue.expectedBehavior,
        actualBehavior: issue.actualBehavior
      }))

      await fetch('/api/feedback/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedbackList: feedbackItems })
      })

      alert('反饋已成功提交！')
    } catch (error) {
      console.error('Error submitting feedback:', error)
      alert('提交反饋時發生錯誤')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'text-green-600'
      case 'failed': return 'text-red-600'
      case 'blocked': return 'text-yellow-600'
      case 'running': return 'text-blue-600'
      default: return 'text-gray-600'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const passedTests = testResults.filter(t => t.status === 'passed').length
  const failedTests = testResults.filter(t => t.status === 'failed').length
  const totalIssues = testResults.reduce((sum, t) => sum + t.issues.length, 0)
  const criticalIssues = testResults.reduce((sum, t) => 
    sum + t.issues.filter(i => i.severity === 'critical').length, 0
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">用戶驗收測試 (UAT) 儀表板</h1>
        <Button 
          onClick={runUATTests} 
          disabled={isRunningTests}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isRunningTests ? '執行中...' : '執行 UAT 測試'}
        </Button>
      </div>

      {/* 測試概覽 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">總測試數</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{testResults.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">通過測試</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{passedTests}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">失敗測試</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{failedTests}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">嚴重問題</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalIssues}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tests" className="w-full">
        <TabsList>
          <TabsTrigger value="tests">測試結果</TabsTrigger>
          <TabsTrigger value="feedback">用戶反饋</TabsTrigger>
          <TabsTrigger value="requirements">需求驗證</TabsTrigger>
        </TabsList>

        <TabsContent value="tests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>測試執行結果</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {testResults.map((test) => (
                  <div key={test.testId} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold">{test.testName}</h3>
                        <p className="text-sm text-gray-600">
                          {test.testId} | {test.requirement}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`font-medium ${getStatusColor(test.status)}`}>
                          {test.status.toUpperCase()}
                        </span>
                        <span className="text-sm text-gray-500">
                          {(test.executionTime / 1000).toFixed(1)}s
                        </span>
                      </div>
                    </div>

                    {test.issues.length > 0 && (
                      <div className="mt-3">
                        <h4 className="font-medium mb-2">發現的問題 ({test.issues.length})</h4>
                        <div className="space-y-2">
                          {test.issues.map((issue, index) => (
                            <div key={index} className="bg-gray-50 p-3 rounded">
                              <div className="flex justify-between items-start mb-2">
                                <span className="font-medium">{issue.description}</span>
                                <span className={`px-2 py-1 rounded text-xs ${getSeverityColor(issue.severity)}`}>
                                  {issue.severity}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600">
                                <p><strong>預期行為：</strong>{issue.expectedBehavior}</p>
                                <p><strong>實際行為：</strong>{issue.actualBehavior}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-3 flex justify-between items-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTest(test)}
                      >
                        查看詳情
                      </Button>
                      {test.issues.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => submitFeedback(test)}
                        >
                          提交反饋
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feedback" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>用戶反饋統計</CardTitle>
            </CardHeader>
            <CardContent>
              {feedbackSummary ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">按類別分布</h4>
                    <div className="space-y-1">
                      {Object.entries(feedbackSummary.byCategory).map(([category, count]) => (
                        <div key={category} className="flex justify-between">
                          <span className="capitalize">{category}</span>
                          <span>{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">按嚴重程度分布</h4>
                    <div className="space-y-1">
                      {Object.entries(feedbackSummary.bySeverity).map(([severity, count]) => (
                        <div key={severity} className="flex justify-between">
                          <span className="capitalize">{severity}</span>
                          <span>{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">處理狀態</h4>
                    <div className="space-y-1">
                      {Object.entries(feedbackSummary.byStatus).map(([status, count]) => (
                        <div key={status} className="flex justify-between">
                          <span className="capitalize">{status}</span>
                          <span>{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p>載入反饋統計中...</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requirements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>需求驗證狀態</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { id: '需求 1', name: '工藝師傅檔案管理', status: 'verified', coverage: 95 },
                  { id: '需求 2', name: '技藝學習和教學', status: 'partial', coverage: 85 },
                  { id: '需求 3', name: '文化記錄和展示', status: 'verified', coverage: 90 },
                  { id: '需求 4', name: '社群互動功能', status: 'verified', coverage: 88 },
                  { id: '需求 5', name: '多語言支持', status: 'partial', coverage: 75 },
                  { id: '需求 6', name: '產品販賣和電商功能', status: 'verified', coverage: 92 },
                  { id: '需求 7', name: '行動裝置支援', status: 'verified', coverage: 87 }
                ].map((req) => (
                  <div key={req.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <h4 className="font-medium">{req.id}: {req.name}</h4>
                      <div className="flex items-center mt-1">
                        <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${req.coverage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">{req.coverage}%</span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded text-sm ${
                      req.status === 'verified' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {req.status === 'verified' ? '已驗證' : '部分驗證'}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 測試詳情模態框 */}
      {selectedTest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold">{selectedTest.testName}</h2>
                <Button
                  variant="outline"
                  onClick={() => setSelectedTest(null)}
                >
                  關閉
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">測試資訊</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>測試ID: {selectedTest.testId}</div>
                    <div>相關需求: {selectedTest.requirement}</div>
                    <div>執行時間: {(selectedTest.executionTime / 1000).toFixed(1)}秒</div>
                    <div>狀態: <span className={getStatusColor(selectedTest.status)}>{selectedTest.status}</span></div>
                  </div>
                </div>

                {selectedTest.issues.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2">問題詳情</h3>
                    <div className="space-y-3">
                      {selectedTest.issues.map((issue, index) => (
                        <div key={index} className="border rounded p-3">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium">{issue.description}</h4>
                            <span className={`px-2 py-1 rounded text-xs ${getSeverityColor(issue.severity)}`}>
                              {issue.severity}
                            </span>
                          </div>
                          
                          <div className="space-y-2 text-sm">
                            <div>
                              <strong>重現步驟：</strong>
                              <ol className="list-decimal list-inside mt-1 ml-4">
                                {issue.reproductionSteps.map((step, stepIndex) => (
                                  <li key={stepIndex}>{step}</li>
                                ))}
                              </ol>
                            </div>
                            <div><strong>預期行為：</strong>{issue.expectedBehavior}</div>
                            <div><strong>實際行為：</strong>{issue.actualBehavior}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedTest.notes && (
                  <div>
                    <h3 className="font-medium mb-2">備註</h3>
                    <p className="text-sm text-gray-600">{selectedTest.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}