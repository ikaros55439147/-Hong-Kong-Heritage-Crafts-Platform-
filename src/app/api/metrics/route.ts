import { NextResponse } from 'next/server'
import { prisma } from '@/lib/database'

// Prometheus metrics endpoint
export async function GET() {
  try {
    const metrics = await collectMetrics()
    
    // Format metrics in Prometheus format
    const prometheusMetrics = formatPrometheusMetrics(metrics)
    
    return new Response(prometheusMetrics, {
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8'
      }
    })
  } catch (error) {
    console.error('Metrics collection failed:', error)
    return NextResponse.json({ error: 'Metrics collection failed' }, { status: 500 })
  }
}

async function collectMetrics() {
  const [
    userCount,
    craftsmanCount,
    courseCount,
    productCount,
    orderCount,
    activeBookings
  ] = await Promise.all([
    prisma.user.count(),
    prisma.craftsmanProfile.count(),
    prisma.course.count({ where: { status: 'active' } }),
    prisma.product.count({ where: { status: 'active' } }),
    prisma.order.count(),
    prisma.booking.count({ where: { status: 'confirmed' } })
  ])

  return {
    userCount,
    craftsmanCount,
    courseCount,
    productCount,
    orderCount,
    activeBookings,
    timestamp: Date.now()
  }
}

function formatPrometheusMetrics(metrics: any) {
  return `
# HELP app_users_total Total number of registered users
# TYPE app_users_total counter
app_users_total ${metrics.userCount}

# HELP app_craftsmen_total Total number of craftsmen
# TYPE app_craftsmen_total counter
app_craftsmen_total ${metrics.craftsmanCount}

# HELP app_courses_active Active courses count
# TYPE app_courses_active gauge
app_courses_active ${metrics.courseCount}

# HELP app_products_active Active products count
# TYPE app_products_active gauge
app_products_active ${metrics.productCount}

# HELP app_orders_total Total number of orders
# TYPE app_orders_total counter
app_orders_total ${metrics.orderCount}

# HELP app_bookings_active Active bookings count
# TYPE app_bookings_active gauge
app_bookings_active ${metrics.activeBookings}

# HELP app_last_metric_collection_timestamp Last metrics collection timestamp
# TYPE app_last_metric_collection_timestamp gauge
app_last_metric_collection_timestamp ${metrics.timestamp}
`.trim()
}