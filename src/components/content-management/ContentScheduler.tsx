'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Alert } from '@/components/ui/Alert'
import { Loading } from '@/components/ui/Loading'

interface ContentSchedule {
  id: string
  entityType: string
  entityId: string
  actionType: 'publish' | 'unpublish' | 'update'
  scheduledAt: string
  status: string
  executedAt?: string
  errorMessage?: string
  createdAt: string
  creator: {
    id: string
    email: string
    role: string
  }
}

interface ContentSchedulerProps {
  entityType: string
  entityId: string
}

export function ContentScheduler({ entityType, entityId }: ContentSchedulerProps) {
  const [schedules, setSchedules] = useState<ContentSchedule[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // Form state
  const [actionType, setActionType] = useState<'publish' | 'unpublish' | 'update'>('publish')
  const [scheduledAt, setScheduledAt] = useState('')
  const [contentData, setContentData] = useState('')

  useEffect(() => {
    if (entityType && entityId) {
      fetchSchedules()
    }
  }, [entityType, entityId])

  const fetchSchedules = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/content-management/schedules')
      
      if (!response.ok) {
        throw new Error('Failed to fetch schedules')
      }
      
      const data = await response.json()
      // Filter schedules for this entity
      const entitySchedules = data.filter((schedule: ContentSchedule) => 
        schedule.entityType === entityType && schedule.entityId === entityId
      )
      setSchedules(entitySchedules)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const createSchedule = async () => {
    try {
      setActionLoading(true)
      
      const scheduleData: any = {
        entityType,
        entityId,
        actionType,
        scheduledAt
      }

      if (contentData.trim()) {
        try {
          scheduleData.contentData = JSON.parse(contentData)
        } catch {
          throw new Error('Invalid JSON in content data')
        }
      }

      const response = await fetch('/api/content-management/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(scheduleData)
      })

      if (!response.ok) {
        throw new Error('Failed to create schedule')
      }

      const newSchedule = await response.json()
      setSchedules(prev => [newSchedule, ...prev])
      setShowScheduleModal(false)
      
      // Reset form
      setActionType('publish')
      setScheduledAt('')
      setContentData('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create schedule')
    } finally {
      setActionLoading(false)
    }
  }

  const executeSchedule = async (scheduleId: string) => {
    try {
      setActionLoading(true)
      const response = await fetch(`/api/content-management/schedules/${scheduleId}/execute`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to execute schedule')
      }

      await fetchSchedules()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute schedule')
    } finally {
      setActionLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-HK')
  }

  const getActionTypeLabel = (actionType: string) => {
    switch (actionType) {
      case 'publish': return '發布'
      case 'unpublish': return '取消發布'
      case 'update': return '更新'
      default: return actionType
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return '待執行'
      case 'executed': return '已執行'
      case 'failed': return '執行失敗'
      case 'cancelled': return '已取消'
      default: return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      case 'executed': return 'text-green-600 bg-green-100'
      case 'failed': return 'text-red-600 bg-red-100'
      case 'cancelled': return 'text-gray-600 bg-gray-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">內容排程</h3>
        <Button onClick={() => setShowScheduleModal(true)}>
          新增排程
        </Button>
      </div>

      {error && (
        <Alert type="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Loading />
      ) : (
        <div className="space-y-2">
          {schedules.map((schedule) => (
            <div key={schedule.id} className="p-4 border rounded-lg">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {getActionTypeLabel(schedule.actionType)}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded ${getStatusColor(schedule.status)}`}>
                      {getStatusLabel(schedule.status)}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 mt-1">
                    排程時間：{formatDate(schedule.scheduledAt)}
                  </div>
                  
                  {schedule.executedAt && (
                    <div className="text-sm text-gray-600">
                      執行時間：{formatDate(schedule.executedAt)}
                    </div>
                  )}
                  
                  {schedule.errorMessage && (
                    <div className="text-sm text-red-600 mt-1">
                      錯誤：{schedule.errorMessage}
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500 mt-2">
                    建立於 {formatDate(schedule.createdAt)} by {schedule.creator.email}
                  </div>
                </div>

                <div className="flex gap-2">
                  {schedule.status === 'pending' && new Date(schedule.scheduledAt) <= new Date() && (
                    <Button
                      size="sm"
                      onClick={() => executeSchedule(schedule.id)}
                      disabled={actionLoading}
                    >
                      立即執行
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {schedules.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          尚無排程記錄
        </div>
      )}

      {/* Schedule Creation Modal */}
      <Modal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        title="新增內容排程"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">動作類型</label>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value as any)}
              className="w-full p-2 border rounded-md"
            >
              <option value="publish">發布</option>
              <option value="unpublish">取消發布</option>
              <option value="update">更新</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">排程時間</label>
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              內容資料 (JSON, 可選)
            </label>
            <textarea
              value={contentData}
              onChange={(e) => setContentData(e.target.value)}
              placeholder='{"key": "value"}'
              className="w-full p-2 border rounded-md h-24 font-mono text-sm"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowScheduleModal(false)}
            >
              取消
            </Button>
            <Button
              onClick={createSchedule}
              disabled={!scheduledAt || actionLoading}
            >
              建立排程
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}