'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
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
  
  // Metrics
  viewCount: number
  likeCount: number
  commentCount: number
  shareCount: number
  completionRate: number
  
  // Quality flags
  hasDescription: boolean
  hasImages: boolean
  hasVideos: boolean
  hasMultilingualContent: boolean
  
  lastCalculatedAt: string
  createdAt: string
  updatedAt: string
}

interface ContentQualityScoreProps {
  entityType: string
  entityId: string
  onScoreUpdate?: (score: QualityScore) => void
}

export function ContentQualityScore({ 
  entityType, 
  entityId, 
  onScoreUpdate 
}: ContentQualityScoreProps) {
  const [qualityScore, setQualityScore] = useState<QualityScore | null>(null)
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchQualityScore()
  }, [entityType, entityId])

  const fetchQualityScore = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/content-management/quality?entityType=${entityType}&entityId=${entityId}`
      )
      
      if (response.ok) {
        const data = await response.json()
        if (data.length > 0) {
          setQualityScore(data[0])
        }
      }
    } catch (err) {
      console.error('Error fetching quality score:', err)
    } finally {
      setLoading(false)
    }
  }

  const calculateQualityScore = async () => {
    try {
      setCalculating(true)
      const response = await fetch('/api/content-management/quality', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          entityType,
          entityId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to calculate quality score')
      }

      const newScore = await response.json()
      setQualityScore(newScore)
      onScoreUpdate?.(newScore)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate quality score')
    } finally {
      setCalculating(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600'
    if (score >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 0.8) return '優秀'
    if (score >= 0.6) return '良好'
    if (score >= 0.4) return '普通'
    return '需改善'
  }

  const formatScore = (score: number) => {
    return Math.round(score * 100)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-HK')
  }

  if (loading) {
    return <Loading />
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">內容品質評分</h3>
        <Button
          onClick={calculateQualityScore}
          disabled={calculating}
        >
          {calculating ? '計算中...' : '重新計算'}
        </Button>
      </div>

      {error && (
        <Alert type="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {qualityScore ? (
        <div className="space-y-4">
          {/* Overall Score */}
          <div className="bg-white p-6 rounded-lg border">
            <div className="text-center">
              <div className={`text-4xl font-bold ${getScoreColor(qualityScore.overallScore)}`}>
                {formatScore(qualityScore.overallScore)}
              </div>
              <div className="text-lg text-gray-600">
                整體評分 ({getScoreLabel(qualityScore.overallScore)})
              </div>
              <div className="text-sm text-gray-500 mt-2">
                最後更新：{formatDate(qualityScore.lastCalculatedAt)}
              </div>
            </div>
          </div>

          {/* Detailed Scores */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-sm text-gray-600">完整性</div>
              <div className={`text-2xl font-semibold ${getScoreColor(qualityScore.completenessScore)}`}>
                {formatScore(qualityScore.completenessScore)}%
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border">
              <div className="text-sm text-gray-600">準確性</div>
              <div className={`text-2xl font-semibold ${getScoreColor(qualityScore.accuracyScore)}`}>
                {formatScore(qualityScore.accuracyScore)}%
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border">
              <div className="text-sm text-gray-600">互動性</div>
              <div className={`text-2xl font-semibold ${getScoreColor(qualityScore.engagementScore)}`}>
                {formatScore(qualityScore.engagementScore)}%
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border">
              <div className="text-sm text-gray-600">多媒體</div>
              <div className={`text-2xl font-semibold ${getScoreColor(qualityScore.multimediaScore)}`}>
                {formatScore(qualityScore.multimediaScore)}%
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border">
              <div className="text-sm text-gray-600">語言品質</div>
              <div className={`text-2xl font-semibold ${getScoreColor(qualityScore.languageQualityScore)}`}>
                {formatScore(qualityScore.languageQualityScore)}%
              </div>
            </div>
          </div>

          {/* Engagement Metrics */}
          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-medium mb-3">互動指標</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-semibold text-blue-600">
                  {qualityScore.viewCount.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">瀏覽次數</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-semibold text-red-600">
                  {qualityScore.likeCount.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">按讚數</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-semibold text-green-600">
                  {qualityScore.commentCount.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">評論數</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-semibold text-purple-600">
                  {formatScore(qualityScore.completionRate)}%
                </div>
                <div className="text-sm text-gray-600">完成率</div>
              </div>
            </div>
          </div>

          {/* Quality Flags */}
          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-medium mb-3">內容特徵</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  qualityScore.hasDescription ? 'bg-green-500' : 'bg-gray-300'
                }`} />
                <span className="text-sm">有描述</span>
              </div>
              
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  qualityScore.hasImages ? 'bg-green-500' : 'bg-gray-300'
                }`} />
                <span className="text-sm">有圖片</span>
              </div>
              
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  qualityScore.hasVideos ? 'bg-green-500' : 'bg-gray-300'
                }`} />
                <span className="text-sm">有影片</span>
              </div>
              
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  qualityScore.hasMultilingualContent ? 'bg-green-500' : 'bg-gray-300'
                }`} />
                <span className="text-sm">多語言</span>
              </div>
            </div>
          </div>

          {/* Improvement Suggestions */}
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h4 className="font-medium mb-2 text-yellow-800">改善建議</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              {!qualityScore.hasDescription && (
                <li>• 添加詳細的內容描述可提升完整性評分</li>
              )}
              {!qualityScore.hasImages && (
                <li>• 添加相關圖片可提升多媒體評分</li>
              )}
              {!qualityScore.hasVideos && (
                <li>• 添加教學影片可大幅提升多媒體評分</li>
              )}
              {!qualityScore.hasMultilingualContent && (
                <li>• 提供多語言版本可提升語言品質評分</li>
              )}
              {qualityScore.engagementScore < 0.5 && (
                <li>• 增加互動元素可提升用戶參與度</li>
              )}
            </ul>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-gray-500 mb-4">尚未計算品質評分</div>
          <Button onClick={calculateQualityScore} disabled={calculating}>
            開始計算
          </Button>
        </div>
      )}
    </div>
  )
}