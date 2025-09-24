import { NextRequest, NextResponse } from 'next/server';
import { monitoringService } from '@/lib/services/monitoring.service';
import { logger } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'metrics':
        const metrics = monitoringService.getLatestMetrics();
        return NextResponse.json(metrics);

      case 'history':
        const hours = parseInt(searchParams.get('hours') || '24');
        const history = monitoringService.getMetricsHistory(hours);
        return NextResponse.json(history);

      case 'alerts':
        const alerts = monitoringService.getActiveAlerts();
        return NextResponse.json(alerts);

      case 'health':
        const health = monitoringService.getHealthStatus();
        return NextResponse.json(health);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    logger.error('Monitoring API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, alertId } = await request.json();

    switch (action) {
      case 'collect':
        const metrics = await monitoringService.collectMetrics();
        return NextResponse.json(metrics);

      case 'resolve_alert':
        if (!alertId) {
          return NextResponse.json({ error: 'Alert ID required' }, { status: 400 });
        }
        const resolved = monitoringService.resolveAlert(alertId);
        return NextResponse.json({ success: resolved });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    logger.error('Monitoring API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}