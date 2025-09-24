import { NextRequest, NextResponse } from 'next/server'
import { feedbackService } from '@/lib/services/feedback.service'
import { authMiddleware } from '@/lib/auth/middleware'

export async function GET(request: NextRequest) {
  try {
    const user = await authMiddleware(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      )
    }

    const dateRange = {
      start: new Date(startDate),
      end: new Date(endDate)
    }

    const report = await feedbackService.generateFeedbackReport(dateRange)

    return NextResponse.json({
      success: true,
      report,
      generatedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error generating feedback report:', error)
    return NextResponse.json(
      { error: 'Failed to generate feedback report' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authMiddleware(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { startDate, endDate, format = 'json' } = body

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      )
    }

    const dateRange = {
      start: new Date(startDate),
      end: new Date(endDate)
    }

    const report = await feedbackService.generateFeedbackReport(dateRange)

    if (format === 'csv') {
      // 生成CSV格式報告
      const csvData = this.generateCSVReport(report)
      
      return new NextResponse(csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="feedback-report-${startDate}-${endDate}.csv"`
        }
      })
    }

    return NextResponse.json({
      success: true,
      report,
      generatedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error generating feedback report:', error)
    return NextResponse.json(
      { error: 'Failed to generate feedback report' },
      { status: 500 }
    )
  }
}

function generateCSVReport(report: any): string {
  const headers = [
    'ID',
    'Category',
    'Title',
    'Description',
    'Severity',
    'Status',
    'Created At',
    'Updated At'
  ]

  const rows = report.detailedIssues.map((issue: any) => [
    issue.id,
    issue.category,
    issue.title,
    issue.description.replace(/,/g, ';'), // 替換逗號避免CSV格式問題
    issue.severity,
    issue.status,
    issue.createdAt,
    issue.updatedAt
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')

  return csvContent
}