'use client'

import React, { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Tabs } from '@/components/ui/Tabs'
import { Alert } from '@/components/ui/Alert'
import { Loading } from '@/components/ui/Loading'

interface QualityScore {
  id: string
  entityType: string
  entityId: string
  overallScore: number
  completenessScore: number
  accuracyScore: number
  engagementScore: number
  multimediaScore: number
  languageQualityScore: number
  lastCalculatedAt: string
}

interface AuditLog {
  id: string
  entityType: string
  entityId: string
  action: string
  createdAt: string
  user?: {
    id: string
    email: string
    role: string
  }
}

interface ContentTag {
  id: string
  name: string
  description?: string
  color?: string
  category?: string
  isSystemTag: boolean
  createdAt: string
  associations?: Array<{
    entityType: string
    entityId: string
  }>
}

export default function ContentManagementPage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Quality Scores State
  const [qualityScores, setQualityScores] = useState<QualityScore[]>([])
  const [qualityFilter, setQualityFilter] = useState('')
  const [minScore, setMinScore] = useState('')

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [auditFilter, setAuditFilter] = useState('')

  // Tags State
  const [tags, setTags] = useState<ContentTag[]>([])
  const [tagFilter, setTagFilter] = useState('')

  useEffect(() => {
    if (activeTab === 'quality') {
      fetchQualityScores()
    } else if (activeTab === 'audit') {
      fetchAuditLogs()
    } else if (activeTab === 'tags') {
      fetchTags()
    }
  }, [activeTab])

  const fetchQualityScores = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (qualityFilter) params.append('entityType', qualityFilter)
      if (minScore) params.append('minScore', minScore)

      const response = await fetch(`/api/content-management/quality?${params}`)
      if (!response.ok) throw new Error('Failed to fetch quality scores')
      
      const data = await response.json()
      setQualityScores(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch quality scores')
    } finally {
      setLoading(false)
    }
  }

  const fetchAuditLogs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (auditFilter) params.append('entityType', auditFilter)

      const response = await fetch(`/api/content-management/audit?${params}`)
      if (!response.ok) throw new Error('Failed to fetch audit logs')
      
      const data = await response.json()
      setAuditLogs(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch audit logs')
    } finally {
      setLoading(false)
    }
  }

  const fetchTags = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/content-management/tags')
      if (!response.ok) throw new Error('Failed to fetch tags')
      
      const data = await response.json()
      setTags(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tags')
    } finally {
      setLoading(false)
    }
  }

  const batchCalculateQuality = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/content-management/batch?operation=calculate-quality', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          entityType: qualityFilter || undefined
        })
      })

      if (!response.ok) throw new Error('Failed to start batch calculation')
      
      const result = await response.json()
      setSuccess(`批量計算完成，處理了 ${result.processed} 個項目`)
      await fetchQualityScores()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate quality scores')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-HK')
  }

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600'
    if (score >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const formatScore = (score: number) => {
    return Math.round(score * 100)
  }

  const overviewTab = (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-2">品質評分統計</h3>
          <div className="text-3xl font-bold text-blue-600">
            {qualityScores.length}
          </div>
          <p className="text-gray-600">已評分項目</p>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-2">標籤統計</h3>
          <div className="text-3xl font-bold text-green-600">
            {tags.length}
          </div>
          <p className="text-gray-600">可用標籤</p>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-2">審計記錄</h3>
          <div className="text-3xl font-bold text-purple-600">
            {auditLogs.length}
          </div>
          <p className="text-gray-600">操作記錄</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">快速操作</h3>
        <div className="flex gap-4">
          <Button onClick={batchCalculateQuality} disabled={loading}>
            批量計算品質評分
          </Button>
          <Button variant="outline" onClick={() => setActiveTab('quality')}>
            查看品質報告
          </Button>
          <Button variant="outline" onClick={() => setActiveTab('audit')}>
            查看審計日誌
          </Button>
        </div>
      </div>
    </div>
  )

  const qualityTab = (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        <select
          value={qualityFilter}
          onChange={(e) => setQualityFilter(e.target.value)}
          className="px-3 py-2 border rounded-md"
        >
          <option value="">所有類型</option>
          <option value="course">課程</option>
          <option value="product">產品</option>
          <option value="learning_material">教學材料</option>
        </select>
        
        <Input
          type="number"
          placeholder="最低分數 (0-1)"
          value={minScore}
          onChange={(e) => setMinScore(e.target.value)}
          min="0"
          max="1"
          step="0.1"
        />
        
        <Button onClick={fetchQualityScores} disabled={loading}>
          篩選
        </Button>
      </div>

      {loading ? (
        <Loading />
      ) : (
        <div className="space-y-2">
          {qualityScores.map((score) => (
            <div key={score.id} className="bg-white p-4 rounded-lg border">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{score.entityType}</span>
                    <span className="text-gray-500">#{score.entityId.slice(0, 8)}</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    最後計算：{formatDate(score.lastCalculatedAt)}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className={`text-2xl font-bold ${getScoreColor(score.overallScore)}`}>
                    {formatScore(score.overallScore)}%
                  </div>
                  <div className="text-sm text-gray-600">整體評分</div>
                </div>
              </div>
              
              <div className="grid grid-cols-5 gap-4 mt-4 text-sm">
                <div>
                  <div className="text-gray-600">完整性</div>
                  <div className={getScoreColor(score.completenessScore)}>
                    {formatScore(score.completenessScore)}%
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">準確性</div>
                  <div className={getScoreColor(score.accuracyScore)}>
                    {formatScore(score.accuracyScore)}%
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">互動性</div>
                  <div className={getScoreColor(score.engagementScore)}>
                    {formatScore(score.engagementScore)}%
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">多媒體</div>
                  <div className={getScoreColor(score.multimediaScore)}>
                    {formatScore(score.multimediaScore)}%
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">語言品質</div>
                  <div className={getScoreColor(score.languageQualityScore)}>
                    {formatScore(score.languageQualityScore)}%
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {qualityScores.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          沒有找到品質評分記錄
        </div>
      )}
    </div>
  )

  const auditTab = (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        <select
          value={auditFilter}
          onChange={(e) => setAuditFilter(e.target.value)}
          className="px-3 py-2 border rounded-md"
        >
          <option value="">所有類型</option>
          <option value="course">課程</option>
          <option value="product">產品</option>
          <option value="learning_material">教學材料</option>
        </select>
        
        <Button onClick={fetchAuditLogs} disabled={loading}>
          篩選
        </Button>
      </div>

      {loading ? (
        <Loading />
      ) : (
        <div className="space-y-2">
          {auditLogs.map((log) => (
            <div key={log.id} className="bg-white p-4 rounded-lg border">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{log.action}</span>
                    <span className="text-gray-500">
                      {log.entityType}#{log.entityId.slice(0, 8)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {formatDate(log.createdAt)}
                    {log.user && ` by ${log.user.email}`}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {auditLogs.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          沒有找到審計記錄
        </div>
      )}
    </div>
  )

  const tagsTab = (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        <Input
          placeholder="搜尋標籤..."
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
        />
        <Button onClick={fetchTags} disabled={loading}>
          重新載入
        </Button>
      </div>

      {loading ? (
        <Loading />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tags
            .filter(tag => 
              tag.name.toLowerCase().includes(tagFilter.toLowerCase()) ||
              (tag.category && tag.category.toLowerCase().includes(tagFilter.toLowerCase()))
            )
            .map((tag) => (
              <div key={tag.id} className="bg-white p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: tag.color || '#6B7280' }}
                  />
                  <span className="font-medium">{tag.name}</span>
                  {tag.isSystemTag && (
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                      系統
                    </span>
                  )}
                </div>
                
                {tag.description && (
                  <p className="text-sm text-gray-600 mb-2">{tag.description}</p>
                )}
                
                {tag.category && (
                  <div className="text-xs text-gray-500 mb-2">
                    分類：{tag.category}
                  </div>
                )}
                
                <div className="text-xs text-gray-500">
                  使用次數：{tag.associations?.length || 0}
                </div>
              </div>
            ))}
        </div>
      )}

      {tags.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          沒有找到標籤
        </div>
      )}
    </div>
  )

  const tabs = [
    { id: 'overview', label: '總覽', content: overviewTab },
    { id: 'quality', label: '品質評分', content: qualityTab },
    { id: 'audit', label: '審計日誌', content: auditTab },
    { id: 'tags', label: '標籤管理', content: tagsTab }
  ]

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">內容管理系統</h1>
          <p className="text-gray-600">管理內容版本、排程、標籤和品質評分</p>
        </div>

        {error && (
          <Alert type="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert type="success" onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>
    </AdminLayout>
  )
}