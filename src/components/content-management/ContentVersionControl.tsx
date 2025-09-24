'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Alert } from '@/components/ui/Alert'
import { Loading } from '@/components/ui/Loading'

interface ContentVersion {
  id: string
  versionNumber: number
  contentData: Record<string, any>
  changeSummary?: string
  isPublished: boolean
  publishedAt?: string
  createdAt: string
  creator: {
    id: string
    email: string
    role: string
  }
}

interface ContentVersionControlProps {
  entityType: string
  entityId: string
  onVersionChange?: (version: ContentVersion) => void
}

export function ContentVersionControl({ 
  entityType, 
  entityId, 
  onVersionChange 
}: ContentVersionControlProps) {
  const [versions, setVersions] = useState<ContentVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedVersion, setSelectedVersion] = useState<ContentVersion | null>(null)
  const [showVersionModal, setShowVersionModal] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchVersions()
  }, [entityType, entityId])

  const fetchVersions = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/content-management/versions?entityType=${entityType}&entityId=${entityId}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch versions')
      }
      
      const data = await response.json()
      setVersions(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const createVersion = async (contentData: Record<string, any>, changeSummary?: string) => {
    try {
      setActionLoading('create')
      const response = await fetch('/api/content-management/versions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          entityType,
          entityId,
          contentData,
          changeSummary
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create version')
      }

      const newVersion = await response.json()
      setVersions(prev => [newVersion, ...prev])
      onVersionChange?.(newVersion)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create version')
    } finally {
      setActionLoading(null)
    }
  }

  const publishVersion = async (versionId: string) => {
    try {
      setActionLoading('publish')
      const response = await fetch(`/api/content-management/versions/${versionId}/publish`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to publish version')
      }

      await fetchVersions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish version')
    } finally {
      setActionLoading(null)
    }
  }

  const revertToVersion = async (versionId: string) => {
    try {
      setActionLoading('revert')
      const response = await fetch(`/api/content-management/versions/${versionId}/revert`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to revert to version')
      }

      const newVersion = await response.json()
      await fetchVersions()
      onVersionChange?.(newVersion)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revert to version')
    } finally {
      setActionLoading(null)
    }
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
        <h3 className="text-lg font-semibold">版本控制</h3>
        <Button
          onClick={() => {
            // This would typically be called when content is saved
            // For demo purposes, we'll create a version with current timestamp
            createVersion(
              { timestamp: new Date().toISOString() },
              '手動建立版本'
            )
          }}
          disabled={!!actionLoading}
        >
          建立新版本
        </Button>
      </div>

      {error && (
        <Alert type="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <div className="space-y-2">
        {versions.map((version) => (
          <div
            key={version.id}
            className={`p-4 border rounded-lg ${
              version.isPublished ? 'border-green-500 bg-green-50' : 'border-gray-200'
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">版本 {version.versionNumber}</span>
                  {version.isPublished && (
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                      已發布
                    </span>
                  )}
                </div>
                
                {version.changeSummary && (
                  <p className="text-sm text-gray-600 mt-1">{version.changeSummary}</p>
                )}
                
                <div className="text-xs text-gray-500 mt-2">
                  建立於 {formatDate(version.createdAt)} by {version.creator.email}
                  {version.publishedAt && (
                    <span> • 發布於 {formatDate(version.publishedAt)}</span>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedVersion(version)
                    setShowVersionModal(true)
                  }}
                >
                  查看
                </Button>
                
                {!version.isPublished && (
                  <Button
                    size="sm"
                    onClick={() => publishVersion(version.id)}
                    disabled={actionLoading === 'publish'}
                  >
                    發布
                  </Button>
                )}
                
                {!version.isPublished && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => revertToVersion(version.id)}
                    disabled={actionLoading === 'revert'}
                  >
                    回復到此版本
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {versions.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          尚無版本記錄
        </div>
      )}

      {/* Version Detail Modal */}
      <Modal
        isOpen={showVersionModal}
        onClose={() => setShowVersionModal(false)}
        title={`版本 ${selectedVersion?.versionNumber} 詳情`}
      >
        {selectedVersion && (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">版本資訊</h4>
              <div className="text-sm space-y-1">
                <p><strong>版本號：</strong>{selectedVersion.versionNumber}</p>
                <p><strong>建立時間：</strong>{formatDate(selectedVersion.createdAt)}</p>
                <p><strong>建立者：</strong>{selectedVersion.creator.email}</p>
                {selectedVersion.changeSummary && (
                  <p><strong>變更摘要：</strong>{selectedVersion.changeSummary}</p>
                )}
                <p><strong>狀態：</strong>
                  {selectedVersion.isPublished ? '已發布' : '草稿'}
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">內容資料</h4>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-64">
                {JSON.stringify(selectedVersion.contentData, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}