import { NextRequest, NextResponse } from 'next/server';
import { databaseOptimizer } from '@/lib/services/database-optimizer.service';
import { logger } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'analyze':
        const analysis = await databaseOptimizer.analyzeQueryPerformance();
        return NextResponse.json(analysis);

      case 'connections':
        const connections = await databaseOptimizer.getConnectionPoolStatus();
        return NextResponse.json(connections);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    logger.error('Database optimization API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    switch (action) {
      case 'optimize':
        await databaseOptimizer.optimizeDatabase();
        return NextResponse.json({ success: true, message: 'Database optimization completed' });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    logger.error('Database optimization API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}