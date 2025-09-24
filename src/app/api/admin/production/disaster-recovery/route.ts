import { NextRequest, NextResponse } from 'next/server';
import { disasterRecoveryService } from '@/lib/services/disaster-recovery.service';
import { logger } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'events':
        const events = disasterRecoveryService.getActiveEvents();
        return NextResponse.json(events);

      case 'history':
        const limit = parseInt(searchParams.get('limit') || '50');
        const history = disasterRecoveryService.getEventHistory(limit);
        return NextResponse.json(history);

      case 'plans':
        const plans = disasterRecoveryService.getRecoveryPlans();
        return NextResponse.json(plans);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    logger.error('Disaster recovery API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, planId, reason, plan } = await request.json();

    switch (action) {
      case 'trigger':
        if (!planId || !reason) {
          return NextResponse.json(
            { error: 'Plan ID and reason required' }, 
            { status: 400 }
          );
        }
        
        const eventId = await disasterRecoveryService.triggerRecoveryPlan(planId, reason);
        return NextResponse.json({ eventId, message: 'Recovery plan triggered' });

      case 'test':
        if (!planId) {
          return NextResponse.json({ error: 'Plan ID required' }, { status: 400 });
        }
        
        const testResult = await disasterRecoveryService.testRecoveryPlan(planId);
        return NextResponse.json({ success: testResult });

      case 'add_plan':
        if (!plan) {
          return NextResponse.json({ error: 'Plan data required' }, { status: 400 });
        }
        
        disasterRecoveryService.addRecoveryPlan(plan);
        return NextResponse.json({ success: true, message: 'Recovery plan added' });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    logger.error('Disaster recovery API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}