'use client'

import React, { useEffect, useState } from 'react'
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Eye, 
  MessageSquare,
  User,
  Calendar
} from 'lucide-react'
import { Report, ReportStatus, User as UserType, Comment } from '@prisma/client'
import { PaginationResult } from '@/types'

interface ReportWithDetails extends Report {
  reporter: UserType
  reviewer?: UserType
  comment?: Comment & { user: UserType }
}

export default function ContentModeration() {
  const [reports, setReports] = useState<PaginationResult<ReportWithDetails> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    status: '',
    entityType: '',
    page: 1,
    limit: 20
  })
  const [selectedReport, setSelectedReport] = useState<ReportWithDetails | null>(null)

  useEffect(() => {
    fetchReports()
  }, [filters])

  const fetchReports = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString())
      })

      const response = await fetch(`/api/admin/reports?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch reports')
      }

      const data = await response.json()
      setReports(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleReviewReport = async (reportId: string, action: 'approve' | 'dismiss' | 'remove_content', notes?: string) => {
    try {
      const response = await fetch(`/api/admin/reports/${reportId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ action, notes })
      })

      if (!response.ok) {
        throw new Error('Failed to review report')
      }

      fetchReports() // Refresh the list
      setSelectedReport(null)
    } catch (err) {
      console.error('Review report error:', err)
      alert('處理舉報失敗')
    }
  }

  const getStatusColor = (status: ReportStatus) => {
    switch (status) {
      case ReportStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800'
      case ReportStatus.RESOLVED:
        return 'bg-green-100 text-green-800'
      case ReportStatus.DISMISSED:
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: ReportStatus) => {
    switch (status) {
      case ReportStatus.PENDING:
        return '待處理'
      case ReportStatus.RESOLVED:
        return '已處理'
      case ReportStatus.DISMISSED:
        return '已駁回'
      default:
        return '未知'
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
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
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">內容審核</h1>
        <p className="mt-1 text-sm text-gray-500">
          管理用戶舉報和內容審核
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              狀態
            </label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
            >
              <option value="">全部狀態</option>
              <option value="PENDING">待處理</option>
              <option value="RESOLVED">已處理</option>
              <option value="DISMISSED">已駁回</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              內容類型
            </label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              value={filters.entityType}
              onChange={(e) => setFilters({ ...filters, entityType: e.target.value, page: 1 })}
            >
              <option value="">全部類型</option>
              <option value="COMMENT">評論</option>
              <option value="COURSE">課程</option>
              <option value="PRODUCT">產品</option>
              <option value="CRAFTSMAN_PROFILE">師傅檔案</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={fetchReports}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
            >
              搜索
            </button>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="divide-y divide-gray-200">
          {reports?.data.map((report) => (
            <div key={report.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(report.status)}`}>
                      {getStatusText(report.status)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {report.entityType === 'COMMENT' ? '評論' :
                       report.entityType === 'COURSE' ? '課程' :
                       report.entityType === 'PRODUCT' ? '產品' : '師傅檔案'}
                    </span>
                  </div>
                  
                  <h3 className="text-sm font-medium text-gray-900 mb-1">
                    {report.reason}
                  </h3>
                  
                  {report.description && (
                    <p className="text-sm text-gray-600 mb-2">
                      {report.description}
                    </p>
                  )}

                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <div className="flex items-center">
                      <User className="h-3 w-3 mr-1" />
                      舉報者: {report.reporter.email}
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {new Date(report.createdAt).toLocaleDateString('zh-HK')}
                    </div>
                  </div>

                  {report.comment && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-md">
                      <div className="flex items-center mb-1">
                        <MessageSquare className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="text-xs text-gray-600">被舉報的評論</span>
                      </div>
                      <p className="text-sm text-gray-800">{report.comment.content}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        作者: {report.comment.user.email}
                      </p>
                    </div>
                  )}
                </div>

                <div className="ml-4 flex-shrink-0">
                  {report.status === ReportStatus.PENDING ? (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedReport(report)}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        查看
                      </button>
                      <button
                        onClick={() => handleReviewReport(report.id, 'dismiss')}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-gray-600 hover:bg-gray-700"
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        駁回
                      </button>
                      <button
                        onClick={() => handleReviewReport(report.id, 'remove_content')}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700"
                      >
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        移除內容
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500">
                      {report.reviewer && (
                        <p>處理者: {report.reviewer.email}</p>
                      )}
                      {report.reviewedAt && (
                        <p>處理時間: {new Date(report.reviewedAt).toLocaleDateString('zh-HK')}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {reports?.data.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            沒有找到舉報記錄
          </div>
        )}
      </div>

      {/* Pagination */}
      {reports && reports.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            顯示 {((reports.page - 1) * reports.limit) + 1} 到 {Math.min(reports.page * reports.limit, reports.total)} 項，
            共 {reports.total} 項
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
              disabled={filters.page <= 1}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              上一頁
            </button>
            <span className="px-3 py-1 text-sm">
              第 {filters.page} 頁，共 {reports.totalPages} 頁
            </span>
            <button
              onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
              disabled={filters.page >= reports.totalPages}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一頁
            </button>
          </div>
        </div>
      )}

      {/* Report Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">舉報詳情</h3>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">舉報原因</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedReport.reason}</p>
                </div>

                {selectedReport.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">詳細描述</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedReport.description}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">舉報者</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedReport.reporter.email}</p>
                </div>

                {selectedReport.comment && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">被舉報的內容</label>
                    <div className="mt-1 p-3 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-900">{selectedReport.comment.content}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        作者: {selectedReport.comment.user.email} | 
                        發布時間: {new Date(selectedReport.comment.createdAt).toLocaleString('zh-HK')}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={() => handleReviewReport(selectedReport.id, 'dismiss')}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    駁回舉報
                  </button>
                  <button
                    onClick={() => handleReviewReport(selectedReport.id, 'remove_content')}
                    className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                  >
                    移除內容
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}