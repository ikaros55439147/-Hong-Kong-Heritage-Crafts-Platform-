import { logger } from '../utils/logger';

export interface SystemMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
  };
  database: {
    connections: number;
    queryTime: number;
    slowQueries: number;
  };
  application: {
    activeUsers: number;
    requestsPerMinute: number;
    errorRate: number;
    responseTime: number;
  };
}

export interface Alert {
  id: string;
  type: 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  resolved: boolean;
  metadata?: Record<string, any>;
}

export class MonitoringService {
  private metrics: SystemMetrics[] = [];
  private alerts: Alert[] = [];
  private thresholds = {
    cpu: 80, // %
    memory: 85, // %
    disk: 90, // %
    responseTime: 2000, // ms
    errorRate: 5, // %
    dbConnections: 80 // % of max connections
  };

  /**
   * 收集系統指標
   */
  async collectMetrics(): Promise<SystemMetrics> {
    try {
      const metrics: SystemMetrics = {
        timestamp: new Date(),
        cpu: await this.getCPUMetrics(),
        memory: await this.getMemoryMetrics(),
        disk: await this.getDiskMetrics(),
        network: await this.getNetworkMetrics(),
        database: await this.getDatabaseMetrics(),
        application: await this.getApplicationMetrics()
      };

      // 保存指標
      this.metrics.push(metrics);
      
      // 只保留最近 24 小時的數據
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      this.metrics = this.metrics.filter(m => m.timestamp > oneDayAgo);

      // 檢查閾值並生成警報
      await this.checkThresholds(metrics);

      return metrics;
    } catch (error) {
      logger.error('Error collecting metrics:', error);
      throw error;
    }
  }

  /**
   * 獲取 CPU 指標
   */
  private async getCPUMetrics(): Promise<SystemMetrics['cpu']> {
    try {
      const os = await import('os');
      const cpus = os.cpus();
      const loadAvg = os.loadavg();
      
      // 計算 CPU 使用率
      let totalIdle = 0;
      let totalTick = 0;
      
      cpus.forEach(cpu => {
        for (const type in cpu.times) {
          totalTick += (cpu.times as any)[type];
        }
        totalIdle += cpu.times.idle;
      });
      
      const usage = 100 - (totalIdle / totalTick * 100);
      
      return {
        usage: Math.round(usage * 100) / 100,
        loadAverage: loadAvg
      };
    } catch (error) {
      logger.warn('Could not get CPU metrics:', error);
      return { usage: 0, loadAverage: [0, 0, 0] };
    }
  }

  /**
   * 獲取記憶體指標
   */
  private async getMemoryMetrics(): Promise<SystemMetrics['memory']> {
    try {
      const os = await import('os');
      const total = os.totalmem();
      const free = os.freemem();
      const used = total - free;
      const percentage = (used / total) * 100;
      
      return {
        used: Math.round(used / 1024 / 1024), // MB
        total: Math.round(total / 1024 / 1024), // MB
        percentage: Math.round(percentage * 100) / 100
      };
    } catch (error) {
      logger.warn('Could not get memory metrics:', error);
      return { used: 0, total: 0, percentage: 0 };
    }
  }

  /**
   * 獲取磁碟指標
   */
  private async getDiskMetrics(): Promise<SystemMetrics['disk']> {
    try {
      const fs = await import('fs');
      const stats = fs.statSync('.');
      
      // 這是簡化版本，實際應該使用 statvfs 或類似 API
      return {
        used: 0,
        total: 0,
        percentage: 0
      };
    } catch (error) {
      logger.warn('Could not get disk metrics:', error);
      return { used: 0, total: 0, percentage: 0 };
    }
  }

  /**
   * 獲取網路指標
   */
  private async getNetworkMetrics(): Promise<SystemMetrics['network']> {
    try {
      // 這裡應該實現實際的網路流量監控
      return {
        bytesIn: 0,
        bytesOut: 0
      };
    } catch (error) {
      logger.warn('Could not get network metrics:', error);
      return { bytesIn: 0, bytesOut: 0 };
    }
  }

  /**
   * 獲取數據庫指標
   */
  private async getDatabaseMetrics(): Promise<SystemMetrics['database']> {
    try {
      // 這裡應該從數據庫優化服務獲取指標
      return {
        connections: 0,
        queryTime: 0,
        slowQueries: 0
      };
    } catch (error) {
      logger.warn('Could not get database metrics:', error);
      return { connections: 0, queryTime: 0, slowQueries: 0 };
    }
  }

  /**
   * 獲取應用程式指標
   */
  private async getApplicationMetrics(): Promise<SystemMetrics['application']> {
    try {
      // 這裡應該從應用程式統計中獲取指標
      return {
        activeUsers: 0,
        requestsPerMinute: 0,
        errorRate: 0,
        responseTime: 0
      };
    } catch (error) {
      logger.warn('Could not get application metrics:', error);
      return { activeUsers: 0, requestsPerMinute: 0, errorRate: 0, responseTime: 0 };
    }
  }

  /**
   * 檢查閾值並生成警報
   */
  private async checkThresholds(metrics: SystemMetrics): Promise<void> {
    const alerts: Alert[] = [];

    // CPU 使用率檢查
    if (metrics.cpu.usage > this.thresholds.cpu) {
      alerts.push({
        id: `cpu-${Date.now()}`,
        type: metrics.cpu.usage > 95 ? 'critical' : 'warning',
        title: 'High CPU Usage',
        message: `CPU usage is ${metrics.cpu.usage}%`,
        timestamp: new Date(),
        resolved: false,
        metadata: { usage: metrics.cpu.usage }
      });
    }

    // 記憶體使用率檢查
    if (metrics.memory.percentage > this.thresholds.memory) {
      alerts.push({
        id: `memory-${Date.now()}`,
        type: metrics.memory.percentage > 95 ? 'critical' : 'warning',
        title: 'High Memory Usage',
        message: `Memory usage is ${metrics.memory.percentage}%`,
        timestamp: new Date(),
        resolved: false,
        metadata: { usage: metrics.memory.percentage }
      });
    }

    // 磁碟使用率檢查
    if (metrics.disk.percentage > this.thresholds.disk) {
      alerts.push({
        id: `disk-${Date.now()}`,
        type: metrics.disk.percentage > 95 ? 'critical' : 'warning',
        title: 'High Disk Usage',
        message: `Disk usage is ${metrics.disk.percentage}%`,
        timestamp: new Date(),
        resolved: false,
        metadata: { usage: metrics.disk.percentage }
      });
    }

    // 響應時間檢查
    if (metrics.application.responseTime > this.thresholds.responseTime) {
      alerts.push({
        id: `response-time-${Date.now()}`,
        type: 'warning',
        title: 'Slow Response Time',
        message: `Average response time is ${metrics.application.responseTime}ms`,
        timestamp: new Date(),
        resolved: false,
        metadata: { responseTime: metrics.application.responseTime }
      });
    }

    // 錯誤率檢查
    if (metrics.application.errorRate > this.thresholds.errorRate) {
      alerts.push({
        id: `error-rate-${Date.now()}`,
        type: 'error',
        title: 'High Error Rate',
        message: `Error rate is ${metrics.application.errorRate}%`,
        timestamp: new Date(),
        resolved: false,
        metadata: { errorRate: metrics.application.errorRate }
      });
    }

    // 保存新警報
    this.alerts.push(...alerts);

    // 發送警報通知
    for (const alert of alerts) {
      await this.sendAlert(alert);
    }
  }

  /**
   * 發送警報通知
   */
  private async sendAlert(alert: Alert): Promise<void> {
    try {
      logger.warn(`ALERT: ${alert.title} - ${alert.message}`, alert.metadata);
      
      // 這裡可以整合各種通知渠道
      // - 電子郵件
      // - Slack
      // - Discord
      // - SMS
      // - PagerDuty
      
    } catch (error) {
      logger.error('Error sending alert:', error);
    }
  }

  /**
   * 獲取最新指標
   */
  getLatestMetrics(): SystemMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  /**
   * 獲取指標歷史
   */
  getMetricsHistory(hours: number = 24): SystemMetrics[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.metrics.filter(m => m.timestamp > cutoff);
  }

  /**
   * 獲取未解決的警報
   */
  getActiveAlerts(): Alert[] {
    return this.alerts.filter(a => !a.resolved);
  }

  /**
   * 解決警報
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      return true;
    }
    return false;
  }

  /**
   * 獲取系統健康狀態
   */
  getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    score: number;
    issues: string[];
  } {
    const latest = this.getLatestMetrics();
    const activeAlerts = this.getActiveAlerts();
    
    if (!latest) {
      return {
        status: 'warning',
        score: 0,
        issues: ['No metrics available']
      };
    }

    const issues: string[] = [];
    let score = 100;

    // 檢查各項指標
    if (latest.cpu.usage > this.thresholds.cpu) {
      issues.push(`High CPU usage: ${latest.cpu.usage}%`);
      score -= 20;
    }

    if (latest.memory.percentage > this.thresholds.memory) {
      issues.push(`High memory usage: ${latest.memory.percentage}%`);
      score -= 20;
    }

    if (latest.disk.percentage > this.thresholds.disk) {
      issues.push(`High disk usage: ${latest.disk.percentage}%`);
      score -= 15;
    }

    if (latest.application.responseTime > this.thresholds.responseTime) {
      issues.push(`Slow response time: ${latest.application.responseTime}ms`);
      score -= 15;
    }

    if (latest.application.errorRate > this.thresholds.errorRate) {
      issues.push(`High error rate: ${latest.application.errorRate}%`);
      score -= 30;
    }

    // 根據分數確定狀態
    let status: 'healthy' | 'warning' | 'critical';
    if (score >= 80) {
      status = 'healthy';
    } else if (score >= 60) {
      status = 'warning';
    } else {
      status = 'critical';
    }

    return { status, score: Math.max(0, score), issues };
  }

  /**
   * 啟動監控
   */
  startMonitoring(intervalMs: number = 60000): void {
    setInterval(async () => {
      try {
        await this.collectMetrics();
      } catch (error) {
        logger.error('Error in monitoring cycle:', error);
      }
    }, intervalMs);

    logger.info(`Monitoring started with ${intervalMs}ms interval`);
  }
}

export const monitoringService = new MonitoringService();