import { NextRequest, NextResponse } from 'next/server';
import { backupService } from '@/lib/services/backup.service';
import { logger } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'history':
        const limit = parseInt(searchParams.get('limit') || '50');
        const history = backupService.getBackupHistory(limit);
        return NextResponse.json(history);

      case 'stats':
        const stats = backupService.getBackupStats();
        return NextResponse.json(stats);

      case 'test':
        const testResults = await backupService.testBackupSystem();
        return NextResponse.json(testResults);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    logger.error('Backup API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, type, backupPath, targetPath } = await request.json();

    switch (action) {
      case 'backup':
        let result;
        if (type === 'database') {
          result = await backupService.backupDatabase();
        } else if (type === 'files') {
          result = await backupService.backupFiles();
        } else {
          return NextResponse.json({ error: 'Invalid backup type' }, { status: 400 });
        }
        return NextResponse.json(result);

      case 'restore':
        if (!backupPath) {
          return NextResponse.json({ error: 'Backup path required' }, { status: 400 });
        }
        
        let success;
        if (type === 'database') {
          success = await backupService.restoreDatabase(backupPath);
        } else if (type === 'files') {
          success = await backupService.restoreFiles(backupPath, targetPath);
        } else {
          return NextResponse.json({ error: 'Invalid restore type' }, { status: 400 });
        }
        
        return NextResponse.json({ success });

      case 'cleanup':
        await backupService.cleanupOldBackups();
        return NextResponse.json({ success: true, message: 'Cleanup completed' });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    logger.error('Backup API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}