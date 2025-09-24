import { NextRequest, NextResponse } from 'next/server';
import { PerformanceMonitoringService, AlertRule, PerformanceThreshold } from '@/lib/services/performance-monitoring.service';

const monitoringService = new PerformanceMonitoringService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'setup-monitoring':
        const { thresholds } = body;
        if (!thresholds || !Array.isArray(thresholds)) {
          return NextResponse.json(
            { success: false, error: 'Performance thresholds required' },
            { status: 400 }
          );
        }

        await monitoringService.setupMonitoring(thresholds as PerformanceThreshold[]);
        
        return NextResponse.json({
          success: true,
          message: 'Performance monitoring setup completed'
        });

      case 'add-alert-rule':
        const { rule } = body;
        if (!rule) {
          return NextResponse.json(
            { success: false, error: 'Alert rule required' },
            { status: 400 }
          );
        }

        const newRule = await monitoringService.addAlertRule(rule);
        
        return NextResponse.json({
          success: true,
          data: newRule,
          message: 'Alert rule added successfully'
        });

      case 'update-alert-rule':
        const { ruleId, updates } = body;
        if (!ruleId || !updates) {
          return NextResponse.json(
            { success: false, error: 'Rule ID and updates required' },
            { status: 400 }
          );
        }

        const updatedRule = await monitoringService.updateAlertRule(ruleId, updates);
        
        if (!updatedRule) {
          return NextResponse.json(
            { success: false, error: 'Alert rule not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          data: updatedRule,
          message: 'Alert rule updated successfully'
        });

      case 'delete-alert-rule':
        const { ruleId: deleteRuleId } = body;
        if (!deleteRuleId) {
          return NextResponse.json(
            { success: false, error: 'Rule ID required' },
            { status: 400 }
          );
        }

        const deleted = await monitoringService.deleteAlertRule(deleteRuleId);
        
        if (!deleted) {
          return NextResponse.json(
            { success: false, error: 'Alert rule not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Alert rule deleted successfully'
        });

      case 'update-config':
        const { config } = body;
        if (!config) {
          return NextResponse.json(
            { success: false, error: 'Configuration required' },
            { status: 400 }
          );
        }

        const updatedConfig = await monitoringService.updateConfig(config);
        
        return NextResponse.json({
          success: true,
          data: updatedConfig,
          message: 'Monitoring configuration updated'
        });

      case 'cleanup':
        await monitoringService.cleanup();
        
        return NextResponse.json({
          success: true,
          message: 'Monitoring data cleanup completed'
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Performance monitoring error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'active-alerts':
        const activeAlerts = await monitoringService.getActiveAlerts();
        return NextResponse.json({
          success: true,
          data: activeAlerts
        });

      case 'alert-history':
        const limit = parseInt(searchParams.get('limit') || '100');
        const alertHistory = await monitoringService.getAlertHistory(limit);
        return NextResponse.json({
          success: true,
          data: alertHistory
        });

      case 'alert-stats':
        const stats = await monitoringService.getAlertStats();
        return NextResponse.json({
          success: true,
          data: stats
        });

      case 'alert-rules':
        const rules = monitoringService.getAllAlertRules();
        return NextResponse.json({
          success: true,
          data: rules
        });

      case 'config':
        const config = monitoringService.getConfig();
        return NextResponse.json({
          success: true,
          data: config
        });

      case 'dashboard':
        // Return comprehensive monitoring dashboard data
        const [alerts, history, alertStats, alertRules, monitoringConfig] = await Promise.all([
          monitoringService.getActiveAlerts(),
          monitoringService.getAlertHistory(50),
          monitoringService.getAlertStats(),
          Promise.resolve(monitoringService.getAllAlertRules()),
          Promise.resolve(monitoringService.getConfig())
        ]);

        return NextResponse.json({
          success: true,
          data: {
            activeAlerts: alerts,
            recentHistory: history,
            stats: alertStats,
            rules: alertRules,
            config: monitoringConfig,
            summary: {
              totalActiveAlerts: alerts.length,
              criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
              highAlerts: alerts.filter(a => a.severity === 'high').length,
              enabledRules: alertRules.filter(r => r.enabled).length,
              totalRules: alertRules.length
            }
          }
        });

      default:
        // Return basic monitoring status
        const basicStats = await monitoringService.getAlertStats();
        const basicConfig = monitoringService.getConfig();
        
        return NextResponse.json({
          success: true,
          data: {
            enabled: basicConfig.enabled,
            stats: basicStats,
            checkInterval: basicConfig.checkIntervalSeconds
          }
        });
    }
  } catch (error) {
    console.error('Performance monitoring GET error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}