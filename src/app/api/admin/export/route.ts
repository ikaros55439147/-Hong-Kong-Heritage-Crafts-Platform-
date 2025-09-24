import { NextRequest, NextResponse } from 'next/server'
import { AnalyticsService } from '@/lib/services/analytics.service'
import { verifyAdminAuth } from '@/lib/auth/admin-middleware'
import { Permission } from '@/lib/auth/permissions'

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request, [Permission.EXPORT_DATA])
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { entities, startDate, endDate, format = 'json' } = body

    if (!entities || !Array.isArray(entities) || entities.length === 0) {
      return NextResponse.json(
        { error: 'Please specify entities to export' },
        { status: 400 }
      )
    }

    const validEntities = ['users', 'courses', 'products', 'orders', 'bookings']
    const invalidEntities = entities.filter((entity: string) => !validEntities.includes(entity))
    
    if (invalidEntities.length > 0) {
      return NextResponse.json(
        { error: `Invalid entities: ${invalidEntities.join(', ')}` },
        { status: 400 }
      )
    }

    const dateRange = startDate && endDate ? {
      startDate: new Date(startDate),
      endDate: new Date(endDate)
    } : undefined

    const result = await AnalyticsService.exportData(entities, dateRange)

    if (!result.isValid) {
      return NextResponse.json(
        { error: 'Export failed', details: result.errors },
        { status: 400 }
      )
    }

    if (format === 'csv') {
      // Convert to CSV format
      const csvData = convertToCSV(result.data!, entities)
      
      return new NextResponse(csvData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="platform-export-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }

    // Return JSON format
    return NextResponse.json({
      success: true,
      data: result.data,
      exportedAt: new Date().toISOString(),
      entities,
      dateRange
    })
  } catch (error) {
    console.error('Export API error:', error)
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    )
  }
}

function convertToCSV(data: any, entities: string[]): string {
  let csv = ''
  
  entities.forEach(entity => {
    if (data[entity] && data[entity].length > 0) {
      csv += `\n# ${entity.toUpperCase()}\n`
      
      const items = data[entity]
      const headers = Object.keys(items[0])
      csv += headers.join(',') + '\n'
      
      items.forEach((item: any) => {
        const values = headers.map(header => {
          const value = item[header]
          if (value === null || value === undefined) return ''
          if (typeof value === 'object') return JSON.stringify(value).replace(/"/g, '""')
          return String(value).replace(/"/g, '""')
        })
        csv += '"' + values.join('","') + '"\n'
      })
    }
  })
  
  return csv
}