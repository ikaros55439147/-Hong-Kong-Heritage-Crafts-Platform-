'use client'

import React, { useState } from 'react'
import { Tabs } from '@/components/ui/Tabs'
import { ContentVersionControl } from './ContentVersionControl'
import { ContentScheduler } from './ContentScheduler'
import { ContentTagManager } from './ContentTagManager'
import { ContentQualityScore } from './ContentQualityScore'

interface ContentManagementDashboardProps {
  entityType: string
  entityId: string
  entityData?: Record<string, any>
}

export function ContentManagementDashboard({ 
  entityType, 
  entityId, 
  entityData 
}: ContentManagementDashboardProps) {
  const [activeTab, setActiveTab] = useState('version-control')

  const tabs = [
    {
      id: 'version-control',
      label: '版本控制',
      content: (
        <ContentVersionControl
          entityType={entityType}
          entityId={entityId}
          onVersionChange={(version) => {
            console.log('Version changed:', version)
          }}
        />
      )
    },
    {
      id: 'scheduler',
      label: '內容排程',
      content: (
        <ContentScheduler
          entityType={entityType}
          entityId={entityId}
        />
      )
    },
    {
      id: 'tags',
      label: '標籤管理',
      content: (
        <ContentTagManager
          entityType={entityType}
          entityId={entityId}
          onTagsChange={(tags) => {
            console.log('Tags changed:', tags)
          }}
        />
      )
    },
    {
      id: 'quality',
      label: '品質評分',
      content: (
        <ContentQualityScore
          entityType={entityType}
          entityId={entityId}
          onScoreUpdate={(score) => {
            console.log('Quality score updated:', score)
          }}
        />
      )
    }
  ]

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold">內容管理</h2>
        <p className="text-gray-600 mt-1">
          管理 {entityType} 的版本、排程、標籤和品質評分
        </p>
      </div>

      <div className="p-6">
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>
    </div>
  )
}