'use client'

import React, { useState } from 'react'
import { ExtendedCraftsmanProfileData } from '@/lib/services/craftsman.service'

interface CraftsmanFormProps {
  initialData?: Partial<ExtendedCraftsmanProfileData>
  onSubmit: (data: ExtendedCraftsmanProfileData) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  isEdit?: boolean
}

export function CraftsmanForm({ 
  initialData, 
  onSubmit, 
  onCancel, 
  isLoading = false,
  isEdit = false 
}: CraftsmanFormProps) {
  const [formData, setFormData] = useState<ExtendedCraftsmanProfileData>({
    craftSpecialties: initialData?.craftSpecialties || [],
    bio: initialData?.bio || { 'zh-HK': '', 'en': '' },
    experienceYears: initialData?.experienceYears || 0,
    workshopLocation: initialData?.workshopLocation || '',
    contactInfo: initialData?.contactInfo || {
      phone: '',
      email: '',
      whatsapp: '',
      wechat: '',
      website: ''
    }
  })

  const [newSpecialty, setNewSpecialty] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Basic validation
    const newErrors: Record<string, string> = {}
    
    if (formData.craftSpecialties.length === 0) {
      newErrors.craftSpecialties = '請至少選擇一項專長技藝'
    }
    
    if (formData.experienceYears < 0 || formData.experienceYears > 100) {
      newErrors.experienceYears = '經驗年數必須在 0-100 年之間'
    }

    if (formData.contactInfo?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactInfo.email)) {
      newErrors.contactEmail = '請輸入有效的電子郵件地址'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      await onSubmit(formData)
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  const addSpecialty = () => {
    if (newSpecialty.trim() && !formData.craftSpecialties.includes(newSpecialty.trim())) {
      setFormData(prev => ({
        ...prev,
        craftSpecialties: [...prev.craftSpecialties, newSpecialty.trim()]
      }))
      setNewSpecialty('')
    }
  }

  const removeSpecialty = (index: number) => {
    setFormData(prev => ({
      ...prev,
      craftSpecialties: prev.craftSpecialties.filter((_, i) => i !== index)
    }))
  }

  const updateBio = (language: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      bio: {
        ...prev.bio,
        [language]: value
      }
    }))
  }

  const updateContactInfo = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      contactInfo: {
        ...prev.contactInfo,
        [field]: value
      }
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Craft Specialties */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          專長技藝 *
        </label>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newSpecialty}
            onChange={(e) => setNewSpecialty(e.target.value)}
            placeholder="輸入技藝名稱"
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialty())}
          />
          <button
            type="button"
            onClick={addSpecialty}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            添加
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mb-2">
          {formData.craftSpecialties.map((specialty, index) => (
            <span
              key={index}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
            >
              {specialty}
              <button
                type="button"
                onClick={() => removeSpecialty(index)}
                className="ml-2 text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        {errors.craftSpecialties && (
          <p className="text-red-600 text-sm">{errors.craftSpecialties}</p>
        )}
      </div>

      {/* Bio */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          師傅介紹
        </label>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">繁體中文</label>
            <textarea
              value={formData.bio?.['zh-HK'] || ''}
              onChange={(e) => updateBio('zh-HK', e.target.value)}
              rows={4}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="請用繁體中文介紹您的技藝背景和經驗..."
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">English</label>
            <textarea
              value={formData.bio?.en || ''}
              onChange={(e) => updateBio('en', e.target.value)}
              rows={4}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Please introduce your craft background and experience in English..."
            />
          </div>
        </div>
      </div>

      {/* Experience Years */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          經驗年數
        </label>
        <input
          type="number"
          min="0"
          max="100"
          value={formData.experienceYears}
          onChange={(e) => setFormData(prev => ({ ...prev, experienceYears: parseInt(e.target.value) || 0 }))}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="0"
        />
        {errors.experienceYears && (
          <p className="text-red-600 text-sm mt-1">{errors.experienceYears}</p>
        )}
      </div>

      {/* Workshop Location */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          工作室地點
        </label>
        <input
          type="text"
          value={formData.workshopLocation}
          onChange={(e) => setFormData(prev => ({ ...prev, workshopLocation: e.target.value }))}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="例：香港九龍深水埗"
        />
      </div>

      {/* Contact Information */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-4">
          聯絡資訊
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">電話</label>
            <input
              type="tel"
              value={formData.contactInfo?.phone || ''}
              onChange={(e) => updateContactInfo('phone', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="+852 1234 5678"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">電子郵件</label>
            <input
              type="email"
              value={formData.contactInfo?.email || ''}
              onChange={(e) => updateContactInfo('email', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="craftsman@example.com"
            />
            {errors.contactEmail && (
              <p className="text-red-600 text-xs mt-1">{errors.contactEmail}</p>
            )}
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">WhatsApp</label>
            <input
              type="tel"
              value={formData.contactInfo?.whatsapp || ''}
              onChange={(e) => updateContactInfo('whatsapp', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="+852 1234 5678"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">微信</label>
            <input
              type="text"
              value={formData.contactInfo?.wechat || ''}
              onChange={(e) => updateContactInfo('wechat', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="wechat_id"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">個人網站</label>
            <input
              type="url"
              value={formData.contactInfo?.website || ''}
              onChange={(e) => updateContactInfo('website', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://www.example.com"
            />
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex gap-4 pt-6 border-t border-gray-200">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-md font-medium hover:bg-gray-200 transition-colors"
            disabled={isLoading}
          >
            取消
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? '處理中...' : (isEdit ? '更新檔案' : '創建檔案')}
        </button>
      </div>
    </form>
  )
}

export default CraftsmanForm