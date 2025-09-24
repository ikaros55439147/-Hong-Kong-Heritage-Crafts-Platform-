'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Alert } from '@/components/ui/Alert'
import { Loading } from '@/components/ui/Loading'

interface ContentTag {
  id: string
  name: string
  description?: string
  color?: string
  category?: string
  isSystemTag: boolean
  createdAt: string
}

interface ContentTagAssociation {
  id: string
  entityType: string
  entityId: string
  tagId: string
  confidenceScore?: number
  createdAt: string
  tag: ContentTag
}

interface ContentTagManagerProps {
  entityType: string
  entityId: string
  onTagsChange?: (tags: ContentTagAssociation[]) => void
}

export function ContentTagManager({ 
  entityType, 
  entityId, 
  onTagsChange 
}: ContentTagManagerProps) {
  const [allTags, setAllTags] = useState<ContentTag[]>([])
  const [entityTags, setEntityTags] = useState<ContentTagAssociation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showTagModal, setShowTagModal] = useState(false)
  const [showCreateTagModal, setShowCreateTagModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // Tag selection state
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')

  // Create tag form state
  const [newTagName, setNewTagName] = useState('')
  const [newTagDescription, setNewTagDescription] = useState('')
  const [newTagColor, setNewTagColor] = useState('#3B82F6')
  const [newTagCategory, setNewTagCategory] = useState('')

  useEffect(() => {
    fetchTags()
    fetchEntityTags()
  }, [entityType, entityId])

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/content-management/tags')
      if (!response.ok) throw new Error('Failed to fetch tags')
      const data = await response.json()
      setAllTags(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tags')
    }
  }

  const fetchEntityTags = async () => {
    try {
      setLoading(true)
      // This would need to be implemented in the API
      // For now, we'll simulate it
      setEntityTags([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch entity tags')
    } finally {
      setLoading(false)
    }
  }

  const createTag = async () => {
    try {
      setActionLoading(true)
      const response = await fetch('/api/content-management/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newTagName,
          description: newTagDescription || undefined,
          color: newTagColor,
          category: newTagCategory || undefined
        })
      })

      if (!response.ok) throw new Error('Failed to create tag')
      
      const newTag = await response.json()
      setAllTags(prev => [...prev, newTag])
      setShowCreateTagModal(false)
      
      // Reset form
      setNewTagName('')
      setNewTagDescription('')
      setNewTagColor('#3B82F6')
      setNewTagCategory('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tag')
    } finally {
      setActionLoading(false)
    }
  }

  const updateEntityTags = async () => {
    try {
      setActionLoading(true)
      const response = await fetch('/api/content-management/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          entityType,
          entityId,
          tagIds: selectedTagIds
        })
      })

      if (!response.ok) throw new Error('Failed to update tags')
      
      const associations = await response.json()
      setEntityTags(associations)
      setShowTagModal(false)
      onTagsChange?.(associations)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update tags')
    } finally {
      setActionLoading(false)
    }
  }

  const autoTagContent = async (contentData: Record<string, any>) => {
    try {
      setActionLoading(true)
      const response = await fetch('/api/content-management/tags/auto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          entityType,
          entityId,
          contentData
        })
      })

      if (!response.ok) throw new Error('Failed to auto-tag content')
      
      const autoTags = await response.json()
      setEntityTags(autoTags)
      onTagsChange?.(autoTags)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to auto-tag content')
    } finally {
      setActionLoading(false)
    }
  }

  const openTagModal = () => {
    setSelectedTagIds(entityTags.map(et => et.tagId))
    setShowTagModal(true)
  }

  const filteredTags = allTags.filter(tag => {
    const matchesSearch = tag.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !selectedCategory || tag.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const categories = [...new Set(allTags.map(tag => tag.category).filter(Boolean))]

  const getTagColor = (tag: ContentTag) => {
    return tag.color || '#6B7280'
  }

  if (loading) {
    return <Loading />
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">內容標籤</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => autoTagContent({})}
            disabled={actionLoading}
          >
            自動標籤
          </Button>
          <Button onClick={openTagModal}>
            管理標籤
          </Button>
        </div>
      </div>

      {error && (
        <Alert type="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Current Tags Display */}
      <div className="flex flex-wrap gap-2">
        {entityTags.map((association) => (
          <span
            key={association.id}
            className="inline-flex items-center px-3 py-1 rounded-full text-sm"
            style={{
              backgroundColor: `${getTagColor(association.tag)}20`,
              color: getTagColor(association.tag),
              border: `1px solid ${getTagColor(association.tag)}40`
            }}
          >
            {association.tag.name}
            {association.confidenceScore && (
              <span className="ml-1 text-xs opacity-75">
                ({Math.round(association.confidenceScore * 100)}%)
              </span>
            )}
          </span>
        ))}
      </div>

      {entityTags.length === 0 && (
        <div className="text-center py-4 text-gray-500">
          尚未設定標籤
        </div>
      )}

      {/* Tag Management Modal */}
      <Modal
        isOpen={showTagModal}
        onClose={() => setShowTagModal(false)}
        title="管理內容標籤"
        size="lg"
      >
        <div className="space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-2">
            <Input
              placeholder="搜尋標籤..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="">所有分類</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              onClick={() => setShowCreateTagModal(true)}
            >
              新增標籤
            </Button>
          </div>

          {/* Tag Selection */}
          <div className="max-h-64 overflow-y-auto space-y-2">
            {filteredTags.map((tag) => (
              <label
                key={tag.id}
                className="flex items-center p-2 border rounded-md hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedTagIds.includes(tag.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedTagIds(prev => [...prev, tag.id])
                    } else {
                      setSelectedTagIds(prev => prev.filter(id => id !== tag.id))
                    }
                  }}
                  className="mr-3"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getTagColor(tag) }}
                    />
                    <span className="font-medium">{tag.name}</span>
                    {tag.isSystemTag && (
                      <span className="px-1 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                        系統
                      </span>
                    )}
                  </div>
                  {tag.description && (
                    <p className="text-sm text-gray-600 mt-1">{tag.description}</p>
                  )}
                  {tag.category && (
                    <span className="text-xs text-gray-500">{tag.category}</span>
                  )}
                </div>
              </label>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowTagModal(false)}
            >
              取消
            </Button>
            <Button
              onClick={updateEntityTags}
              disabled={actionLoading}
            >
              更新標籤
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Tag Modal */}
      <Modal
        isOpen={showCreateTagModal}
        onClose={() => setShowCreateTagModal(false)}
        title="新增標籤"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">標籤名稱</label>
            <Input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="輸入標籤名稱"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">描述</label>
            <Input
              value={newTagDescription}
              onChange={(e) => setNewTagDescription(e.target.value)}
              placeholder="標籤描述（可選）"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">顏色</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={newTagColor}
                onChange={(e) => setNewTagColor(e.target.value)}
                className="w-10 h-10 border rounded"
              />
              <Input
                value={newTagColor}
                onChange={(e) => setNewTagColor(e.target.value)}
                placeholder="#3B82F6"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">分類</label>
            <Input
              value={newTagCategory}
              onChange={(e) => setNewTagCategory(e.target.value)}
              placeholder="標籤分類（可選）"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCreateTagModal(false)}
            >
              取消
            </Button>
            <Button
              onClick={createTag}
              disabled={!newTagName || actionLoading}
            >
              建立標籤
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}