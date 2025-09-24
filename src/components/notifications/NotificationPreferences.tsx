'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Loading } from '@/components/ui/Loading'

interface NotificationPreference {
  id: string
  userId: string
  emailNotifications: boolean
  pushNotifications: boolean
  newFollowerNotify: boolean
  courseUpdateNotify: boolean
  productUpdateNotify: boolean
  orderStatusNotify: boolean
  craftsmanStatusNotify: boolean
  eventNotify: boolean
  commentNotify: boolean
  likeNotify: boolean
  reminderNotify: boolean
  marketingNotify: boolean
}

interface PreferenceGroup {
  title: string
  description: string
  preferences: Array<{
    key: keyof NotificationPreference
    label: string
    description: string
  }>
}

const NotificationPreferences: React.FC = () => {
  const [preferences, setPreferences] = useState<NotificationPreference | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const preferenceGroups: PreferenceGroup[] = [
    {
      title: '通知方式',
      description: '選擇您希望接收通知的方式',
      preferences: [
        {
          key: 'emailNotifications',
          label: '電子郵件通知',
          description: '透過電子郵件接收通知'
        },
        {
          key: 'pushNotifications',
          label: '推送通知',
          description: '在瀏覽器或應用程式中接收即時推送通知'
        }
      ]
    },
    {
      title: '社交互動',
      description: '管理與其他用戶互動相關的通知',
      preferences: [
        {
          key: 'newFollowerNotify',
          label: '新關注者',
          description: '當有人關注您時接收通知'
        },
        {
          key: 'commentNotify',
          label: '評論通知',
          description: '當有人評論您的內容時接收通知'
        },
        {
          key: 'likeNotify',
          label: '點讚通知',
          description: '當有人點讚您的內容時接收通知'
        }
      ]
    },
    {
      title: '課程和產品',
      description: '管理課程和產品相關的通知',
      preferences: [
        {
          key: 'courseUpdateNotify',
          label: '課程更新',
          description: '當關注的師傅發布新課程或課程有更新時接收通知'
        },
        {
          key: 'productUpdateNotify',
          label: '產品更新',
          description: '當關注的師傅發布新產品或產品有更新時接收通知'
        },
        {
          key: 'reminderNotify',
          label: '提醒通知',
          description: '接收課程開始提醒和其他重要提醒'
        }
      ]
    },
    {
      title: '訂單和交易',
      description: '管理訂單和支付相關的通知',
      preferences: [
        {
          key: 'orderStatusNotify',
          label: '訂單狀態',
          description: '當訂單狀態變更時接收通知'
        }
      ]
    },
    {
      title: '師傅相關',
      description: '管理師傅認證和狀態相關的通知',
      preferences: [
        {
          key: 'craftsmanStatusNotify',
          label: '師傅狀態變更',
          description: '當師傅認證狀態變更時接收通知'
        }
      ]
    },
    {
      title: '活動和其他',
      description: '管理活動和其他通知',
      preferences: [
        {
          key: 'eventNotify',
          label: '活動通知',
          description: '接收平台活動和展覽相關通知'
        },
        {
          key: 'marketingNotify',
          label: '行銷通知',
          description: '接收促銷活動和行銷相關通知'
        }
      ]
    }
  ]

  useEffect(() => {
    fetchPreferences()
  }, [])

  const fetchPreferences = async () => {
    try {
      const response = await fetch('/api/notifications/preferences')
      const data = await response.json()
      
      if (data.success) {
        setPreferences(data.data)
      } else {
        setMessage({ type: 'error', text: '載入通知偏好設定失敗' })
      }
    } catch (error) {
      console.error('Failed to fetch preferences:', error)
      setMessage({ type: 'error', text: '載入通知偏好設定失敗' })
    } finally {
      setLoading(false)
    }
  }

  const updatePreference = (key: keyof NotificationPreference, value: boolean) => {
    if (!preferences) return
    
    setPreferences({
      ...preferences,
      [key]: value
    })
  }

  const savePreferences = async () => {
    if (!preferences) return
    
    setSaving(true)
    setMessage(null)
    
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preferences)
      })
      
      const data = await response.json()
      
      if (data.success) {
        setMessage({ type: 'success', text: '通知偏好設定已更新' })
      } else {
        setMessage({ type: 'error', text: data.error || '更新失敗' })
      }
    } catch (error) {
      console.error('Failed to save preferences:', error)
      setMessage({ type: 'error', text: '更新通知偏好設定失敗' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <Loading />
  }

  if (!preferences) {
    return (
      <Alert type="error">
        無法載入通知偏好設定
      </Alert>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">通知偏好設定</h1>
        <p className="text-gray-600">
          自訂您希望接收的通知類型和方式
        </p>
      </div>

      {message && (
        <Alert type={message.type} className="mb-6">
          {message.text}
        </Alert>
      )}

      <div className="space-y-8">
        {preferenceGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-1">
                {group.title}
              </h2>
              <p className="text-gray-600 text-sm">
                {group.description}
              </p>
            </div>
            
            <div className="space-y-4">
              {group.preferences.map((pref) => (
                <div key={pref.key} className="flex items-start justify-between py-3 border-b border-gray-100 last:border-b-0">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      {pref.label}
                    </label>
                    <p className="text-sm text-gray-600">
                      {pref.description}
                    </p>
                  </div>
                  <div className="ml-4">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={preferences[pref.key] as boolean}
                        onChange={(e) => updatePreference(pref.key, e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-end">
        <Button
          onClick={savePreferences}
          disabled={saving}
          className="px-6 py-2"
        >
          {saving ? '儲存中...' : '儲存設定'}
        </Button>
      </div>
    </div>
  )
}

export default NotificationPreferences