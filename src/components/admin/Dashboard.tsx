'use client'

import React, { useEffect, useState } from 'react'
import { 
  Users, 
  GraduationCap, 
  Package, 
  ShoppingCart, 
  AlertTriangle,
  TrendingUp,
  Activity
} from 'lucide-react'
import { AdminDashboardStats, AdminActivity } from '@/lib/services/admin.service'

interface StatCardProps {
  title: string
  value: number
  icon: React.ElementType
  color: string
}

function StatCard({ title, value, icon: Icon, color }: StatCardProps) {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Icon className={`h-6 w-6 ${color}`} />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd className="text-lg font-medium text-gray-900">{value.toLocaleString()}</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}

interface ActivityItemProps {
  activity: AdminActivity
}

function ActivityItem({ activity }: ActivityItemProps) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_registration':
        return <Users className="h-4 w-4 text-blue-500" />
      case 'course_created':
        return <GraduationCap className="h-4 w-4 text-green-500" />
      case 'order_placed':
        return <ShoppingCart className="h-4 w-4 text-purple-500" />
      case 'report_submitted':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const formatTime = (timestamp: Date) => {
    const now = new Date()
    const diff = now.getTime() - new Date(timestamp).getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    
    if (minutes < 60) {
      return `${minutes}分鐘前`
    } else if (minutes < 1440) {
      return `${Math.floor(minutes / 60)}小時前`
    } else {
      return `${Math.floor(minutes / 1440)}天前`
    }
  }

  return (
    <div className="flex items-start space-x-3 py-3">
      <div className="flex-shrink-0">
        {getActivityIcon(activity.type)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-900">{activity.description}</p>
        <p className="text-xs text-gray-500">{formatTime(activity.timestamp)}</p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats')
      }

      const data = await response.json()
      setStats(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-200 h-24 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">載入錯誤</h3>
            <p className="mt-2 text-sm text-red-700">{error}</p>
            <button
              onClick={fetchDashboardStats}
              className="mt-2 text-sm text-red-800 underline hover:text-red-900"
            >
              重試
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return <div>No data available</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">儀表板</h1>
        <p className="mt-1 text-sm text-gray-500">
          平台概覽和最新活動
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="總用戶數"
          value={stats.totalUsers}
          icon={Users}
          color="text-blue-500"
        />
        <StatCard
          title="師傅數量"
          value={stats.totalCraftsmen}
          icon={GraduationCap}
          color="text-green-500"
        />
        <StatCard
          title="課程數量"
          value={stats.totalCourses}
          icon={GraduationCap}
          color="text-purple-500"
        />
        <StatCard
          title="產品數量"
          value={stats.totalProducts}
          icon={Package}
          color="text-yellow-500"
        />
        <StatCard
          title="訂單數量"
          value={stats.totalOrders}
          icon={ShoppingCart}
          color="text-indigo-500"
        />
        <StatCard
          title="待處理舉報"
          value={stats.pendingReports}
          icon={AlertTriangle}
          color="text-red-500"
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            最新活動
          </h3>
          <div className="flow-root">
            <ul className="-mb-8">
              {stats.recentActivity.map((activity, index) => (
                <li key={activity.id}>
                  <div className="relative pb-8">
                    {index !== stats.recentActivity.length - 1 && (
                      <span
                        className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                        aria-hidden="true"
                      />
                    )}
                    <ActivityItem activity={activity} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
          {stats.recentActivity.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              暫無最新活動
            </p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            快速操作
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
              <Users className="mr-2 h-4 w-4" />
              管理用戶
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700">
              <Shield className="mr-2 h-4 w-4" />
              審核內容
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700">
              <TrendingUp className="mr-2 h-4 w-4" />
              查看報表
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700">
              <Activity className="mr-2 h-4 w-4" />
              系統日誌
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}