import { logger } from '../utils/logger';
import { backupService, BackupResult } from './backup.service';
import { monitoringService } from './monitoring.service';

export interface DisasterRecoveryPlan {
  id: string;
  name: string;
  description: string;
  triggers: DisasterTrigger[];
  actions: RecoveryAction[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedRTO: number; // Recovery Time Objective (minutes)
  estimatedRPO: number; // Recovery Point Objective (minutes)
}

export interface DisasterTrigger {
  type: 'system_failure' | 'data_corruption' | 'security_breach' | 'manual';
  conditions: Record<string, any>;
  threshold?: number;
}

export interface RecoveryAction {
  id: string;
  type: 'backup_restore' | 'service_restart' | 'failover' | 'notification' | 'custom';
  description: string;
  parameters: Record<string, any>;
  timeout: number; // seconds
  retries: number;
}

export interface DisasterEvent {
  id: string;
  timestamp: Date;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedServices: string[];
  recoveryPlan?: string;
  status: 'detected' | 'responding' | 'recovering' | 'resolved' | 'failed';
  actions: Array<{
    actionId: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    startTime?: Date;
    endTime?: Date;
    error?: string;
  }>;
  resolution?: {
    timestamp: Date;
    method: string;
    notes: string;
  };
}

export class DisasterRecoveryService {
  private recoveryPlans: DisasterRecoveryPlan[] = [];
  private activeEvents: DisasterEvent[] = [];
  private eventHistory: DisasterEvent[] = [];

  constructor() {
    this.initializeDefaultPlans();
    this.startMonitoring();
  }

  /**
   * 初始化默認恢復計劃
   */
  private initializeDefaultPlans(): void {
    // 數據庫故障恢復計劃
    this.recoveryPlans.push({
      id: 'db-failure',
      name: 'Database Failure Recovery',
      description: 'Recover from database connection failures or corruption',
      triggers: [
        {
          type: 'system_failure',
          conditions: { service: 'database', error_rate: 100 }
        }
      ],
      actions: [
        {
          id: 'restart-db',
          type: 'service_restart',
          description: 'Restart database service',
          parameters: { service: 'postgresql' },
          timeout: 300,
          retries: 3
        },
        {
          id: 'restore-backup',
          type: 'backup_restore',
          description: 'Restore from latest backup',
          parameters: { type: 'database' },
          timeout: 1800,
          retries: 1
        },
        {
          id: 'notify-team',
          type: 'notification',
          description: 'Notify operations team',
          parameters: { channels: ['email', 'slack'] },
          timeout: 60,
          retries: 2
        }
      ],
      priority: 'critical',
      estimatedRTO: 30,
      estimatedRPO: 60
    });

    // 應用程式故障恢復計劃
    this.recoveryPlans.push({
      id: 'app-failure',
      name: 'Application Failure Recovery',
      description: 'Recover from application crashes or high error rates',
      triggers: [
        {
          type: 'system_failure',
          conditions: { service: 'application', error_rate: 50 },
          threshold: 5
        }
      ],
      actions: [
        {
          id: 'restart-app',
          type: 'service_restart',
          description: 'Restart application service',
          parameters: { service: 'app' },
          timeout: 120,
          retries: 3
        },
        {
          id: 'scale-up',
          type: 'custom',
          description: 'Scale up application instances',
          parameters: { instances: 2 },
          timeout: 300,
          retries: 1
        }
      ],
      priority: 'high',
      estimatedRTO: 10,
      estimatedRPO: 5
    });

    // 安全事件恢復計劃
    this.recoveryPlans.push({
      id: 'security-breach',
      name: 'Security Breach Response',
      description: 'Respond to potential security breaches',
      triggers: [
        {
          type: 'security_breach',
          conditions: { suspicious_activity: true }
        }
      ],
      actions: [
        {
          id: 'isolate-system',
          type: 'custom',
          description: 'Isolate affected systems',
          parameters: { mode: 'maintenance' },
          timeout: 60,
          retries: 1
        },
        {
          id: 'backup-logs',
          type: 'backup_restore',
          description: 'Backup security logs',
          parameters: { type: 'logs', priority: 'high' },
          timeout: 300,
          retries: 1
        },
        {
          id: 'notify-security',
          type: 'notification',
          description: 'Notify security team',
          parameters: { channels: ['email', 'sms'], priority: 'urgent' },
          timeout: 30,
          retries: 3
        }
      ],
      priority: 'critical',
      estimatedRTO: 5,
      estimatedRPO: 1
    });
  }

  /**
   * 開始監控災難事件
   */
  private startMonitoring(): void {
    setInterval(async () => {
      try {
        await this.checkForDisasters();
      } catch (error) {
        logger.error('Error in disaster monitoring:', error);
      }
    }, 30000); // 每 30 秒檢查一次

    logger.info('Disaster recovery monitoring started');
  }

  /**
   * 檢查災難事件
   */
  private async checkForDisasters(): Promise<void> {
    const healthStatus = monitoringService.getHealthStatus();
    const activeAlerts = monitoringService.getActiveAlerts();

    // 檢查系統健康狀態
    if (healthStatus.status === 'critical') {
      await this.handleSystemFailure(healthStatus);
    }

    // 檢查活躍警報
    for (const alert of activeAlerts) {
      if (alert.type === 'critical') {
        await this.handleCriticalAlert(alert);
      }
    }
  }

  /**
   * 處理系統故障
   */
  private async handleSystemFailure(healthStatus: any): Promise<void> {
    const eventId = `system-failure-${Date.now()}`;
    
    const event: DisasterEvent = {
      id: eventId,
      timestamp: new Date(),
      type: 'system_failure',
      severity: 'critical',
      description: `System health critical: ${healthStatus.issues.join(', ')}`,
      affectedServices: ['application', 'database'],
      status: 'detected',
      actions: []
    };

    // 查找匹配的恢復計劃
    const plan = this.findMatchingPlan('system_failure', {
      service: 'application',
      error_rate: 100 - healthStatus.score
    });

    if (plan) {
      event.recoveryPlan = plan.id;
      await this.executeRecoveryPlan(event, plan);
    }

    this.activeEvents.push(event);
    logger.error('System failure detected', { eventId, healthStatus });
  }

  /**
   * 處理關鍵警報
   */
  private async handleCriticalAlert(alert: any): Promise<void> {
    // 檢查是否已經有相同類型的活躍事件
    const existingEvent = this.activeEvents.find(e => 
      e.type === alert.type && e.status !== 'resolved'
    );

    if (existingEvent) {
      return; // 避免重複處理
    }

    const eventId = `alert-${alert.id}`;
    
    const event: DisasterEvent = {
      id: eventId,
      timestamp: new Date(),
      type: alert.type,
      severity: 'high',
      description: alert.message,
      affectedServices: ['application'],
      status: 'detected',
      actions: []
    };

    // 查找匹配的恢復計劃
    const plan = this.findMatchingPlan('system_failure', {
      service: 'application',
      error_rate: 50
    });

    if (plan) {
      event.recoveryPlan = plan.id;
      await this.executeRecoveryPlan(event, plan);
    }

    this.activeEvents.push(event);
    logger.warn('Critical alert triggered disaster recovery', { eventId, alert });
  }

  /**
   * 查找匹配的恢復計劃
   */
  private findMatchingPlan(triggerType: string, conditions: Record<string, any>): DisasterRecoveryPlan | null {
    return this.recoveryPlans.find(plan => 
      plan.triggers.some(trigger => 
        trigger.type === triggerType &&
        this.matchesConditions(trigger.conditions, conditions)
      )
    ) || null;
  }

  /**
   * 檢查條件是否匹配
   */
  private matchesConditions(triggerConditions: Record<string, any>, actualConditions: Record<string, any>): boolean {
    for (const [key, value] of Object.entries(triggerConditions)) {
      if (actualConditions[key] !== value) {
        return false;
      }
    }
    return true;
  }

  /**
   * 執行恢復計劃
   */
  async executeRecoveryPlan(event: DisasterEvent, plan: DisasterRecoveryPlan): Promise<void> {
    logger.info('Executing recovery plan', { eventId: event.id, planId: plan.id });
    
    event.status = 'responding';
    
    for (const action of plan.actions) {
      const actionStatus = {
        actionId: action.id,
        status: 'pending' as const,
        startTime: new Date()
      };
      
      event.actions.push(actionStatus);
      
      try {
        actionStatus.status = 'running';
        await this.executeRecoveryAction(action);
        actionStatus.status = 'completed';
        actionStatus.endTime = new Date();
        
        logger.info('Recovery action completed', { 
          eventId: event.id, 
          actionId: action.id 
        });
      } catch (error) {
        actionStatus.status = 'failed';
        actionStatus.endTime = new Date();
        actionStatus.error = error instanceof Error ? error.message : String(error);
        
        logger.error('Recovery action failed', { 
          eventId: event.id, 
          actionId: action.id, 
          error 
        });

        // 如果是關鍵動作失敗，停止執行計劃
        if (plan.priority === 'critical') {
          event.status = 'failed';
          return;
        }
      }
    }

    event.status = 'recovering';
    
    // 等待一段時間後檢查恢復狀態
    setTimeout(() => {
      this.checkRecoveryStatus(event);
    }, 60000); // 1 分鐘後檢查
  }

  /**
   * 執行恢復動作
   */
  private async executeRecoveryAction(action: RecoveryAction): Promise<void> {
    switch (action.type) {
      case 'backup_restore':
        await this.executeBackupRestore(action);
        break;
      case 'service_restart':
        await this.executeServiceRestart(action);
        break;
      case 'failover':
        await this.executeFailover(action);
        break;
      case 'notification':
        await this.executeNotification(action);
        break;
      case 'custom':
        await this.executeCustomAction(action);
        break;
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * 執行備份恢復
   */
  private async executeBackupRestore(action: RecoveryAction): Promise<void> {
    const { type } = action.parameters;
    
    if (type === 'database') {
      // 獲取最新的數據庫備份
      const backups = backupService.getBackupHistory(10);
      const latestDbBackup = backups.find(b => b.type === 'database' && b.success);
      
      if (!latestDbBackup) {
        throw new Error('No valid database backup found');
      }
      
      const success = await backupService.restoreDatabase(latestDbBackup.location);
      if (!success) {
        throw new Error('Database restore failed');
      }
    } else if (type === 'files') {
      const backups = backupService.getBackupHistory(10);
      const latestFileBackup = backups.find(b => b.type === 'files' && b.success);
      
      if (!latestFileBackup) {
        throw new Error('No valid file backup found');
      }
      
      const success = await backupService.restoreFiles(latestFileBackup.location);
      if (!success) {
        throw new Error('File restore failed');
      }
    }
  }

  /**
   * 執行服務重啟
   */
  private async executeServiceRestart(action: RecoveryAction): Promise<void> {
    const { service } = action.parameters;
    
    // 這裡應該實現實際的服務重啟邏輯
    logger.info(`Restarting service: ${service}`);
    
    // 模擬重啟過程
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  /**
   * 執行故障轉移
   */
  private async executeFailover(action: RecoveryAction): Promise<void> {
    // 實現故障轉移邏輯
    logger.info('Executing failover', action.parameters);
  }

  /**
   * 執行通知
   */
  private async executeNotification(action: RecoveryAction): Promise<void> {
    const { channels, priority } = action.parameters;
    
    for (const channel of channels) {
      logger.info(`Sending ${priority || 'normal'} notification via ${channel}`);
      // 實現實際的通知發送
    }
  }

  /**
   * 執行自定義動作
   */
  private async executeCustomAction(action: RecoveryAction): Promise<void> {
    logger.info('Executing custom action', action.parameters);
    // 實現自定義動作邏輯
  }

  /**
   * 檢查恢復狀態
   */
  private async checkRecoveryStatus(event: DisasterEvent): Promise<void> {
    try {
      const healthStatus = monitoringService.getHealthStatus();
      
      if (healthStatus.status === 'healthy' || healthStatus.status === 'warning') {
        event.status = 'resolved';
        event.resolution = {
          timestamp: new Date(),
          method: 'automatic_recovery',
          notes: 'System recovered after executing recovery plan'
        };
        
        // 移動到歷史記錄
        this.eventHistory.push(event);
        this.activeEvents = this.activeEvents.filter(e => e.id !== event.id);
        
        logger.info('Disaster event resolved', { eventId: event.id });
      } else {
        // 如果仍未恢復，可能需要人工介入
        logger.warn('System not fully recovered, may need manual intervention', { 
          eventId: event.id 
        });
      }
    } catch (error) {
      logger.error('Error checking recovery status', { eventId: event.id, error });
    }
  }

  /**
   * 手動觸發恢復計劃
   */
  async triggerRecoveryPlan(planId: string, reason: string): Promise<string> {
    const plan = this.recoveryPlans.find(p => p.id === planId);
    if (!plan) {
      throw new Error(`Recovery plan not found: ${planId}`);
    }

    const eventId = `manual-${Date.now()}`;
    const event: DisasterEvent = {
      id: eventId,
      timestamp: new Date(),
      type: 'manual',
      severity: 'medium',
      description: `Manual recovery triggered: ${reason}`,
      affectedServices: [],
      recoveryPlan: planId,
      status: 'detected',
      actions: []
    };

    await this.executeRecoveryPlan(event, plan);
    this.activeEvents.push(event);

    logger.info('Manual recovery plan triggered', { eventId, planId, reason });
    return eventId;
  }

  /**
   * 獲取活躍事件
   */
  getActiveEvents(): DisasterEvent[] {
    return this.activeEvents;
  }

  /**
   * 獲取事件歷史
   */
  getEventHistory(limit: number = 50): DisasterEvent[] {
    return this.eventHistory
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * 獲取恢復計劃
   */
  getRecoveryPlans(): DisasterRecoveryPlan[] {
    return this.recoveryPlans;
  }

  /**
   * 添加恢復計劃
   */
  addRecoveryPlan(plan: DisasterRecoveryPlan): void {
    this.recoveryPlans.push(plan);
    logger.info('Recovery plan added', { planId: plan.id });
  }

  /**
   * 測試恢復計劃
   */
  async testRecoveryPlan(planId: string): Promise<boolean> {
    const plan = this.recoveryPlans.find(p => p.id === planId);
    if (!plan) {
      throw new Error(`Recovery plan not found: ${planId}`);
    }

    try {
      logger.info('Testing recovery plan', { planId });
      
      // 創建測試事件
      const testEvent: DisasterEvent = {
        id: `test-${Date.now()}`,
        timestamp: new Date(),
        type: 'manual',
        severity: 'low',
        description: `Test execution of recovery plan: ${plan.name}`,
        affectedServices: [],
        recoveryPlan: planId,
        status: 'detected',
        actions: []
      };

      // 只執行非破壞性動作
      const safeActions = plan.actions.filter(action => 
        action.type === 'notification' || 
        (action.type === 'custom' && action.parameters.test === true)
      );

      for (const action of safeActions) {
        try {
          await this.executeRecoveryAction(action);
          logger.info('Test action completed', { planId, actionId: action.id });
        } catch (error) {
          logger.warn('Test action failed', { planId, actionId: action.id, error });
        }
      }

      logger.info('Recovery plan test completed', { planId });
      return true;
    } catch (error) {
      logger.error('Recovery plan test failed', { planId, error });
      return false;
    }
  }
}

export const disasterRecoveryService = new DisasterRecoveryService();