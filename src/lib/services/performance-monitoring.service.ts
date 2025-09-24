import { Redis } from 'ioredis';
import { PerformanceBenchmark, PerformanceThreshold } from './performance-benchmark.service';

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  cooldownMinutes: number;
}

export interface PerformanceAlert {
  id: string;
  ruleId: string;
  ruleName: string;
  metric: string;
  currentValue: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

export interface MonitoringConfig {
  enabled: boolean;
  checkIntervalSeconds: number;
  retentionDays: number;
  alertChannels: {
    email: boolean;
    slack: boolean;
    webhook: boolean;
  };
}

export class PerformanceMonitoringService {
  private redis: Redis;
  private alertRules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, PerformanceAlert> = new Map();
  private config: MonitoringConfig;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.config = {
      enabled: true,
      checkIntervalSeconds: 60,
      retentionDays: 30,
      alertChannels: {
        email: true,
        slack: false,
        webhook: true
      }
    };

    this.initializeDefaultRules();
  }

  // 初始化默認告警規則
  private initializeDefaultRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'response-time-high',
        name: 'High Response Time',
        metric: 'responseTime',
        operator: 'gt',
        threshold: 2000, // 2 seconds
        severity: 'high',
        enabled: true,
        cooldownMinutes: 5
      },
      {
        id: 'response-time-critical',
        name: 'Critical Response Time',
        metric: 'responseTime',
        operator: 'gt',
        threshold: 5000, // 5 seconds
        severity: 'critical',
        enabled: true,
        cooldownMinutes: 2
      },
      {
        id: 'throughput-low',
        name: 'Low Throughput',
        metric: 'throughput',
        operator: 'lt',
        threshold: 10, // requests per second
        severity: 'medium',
        enabled: true,
        cooldownMinutes: 10
      },
      {
        id: 'error-rate-high',
        name: 'High Error Rate',
        metric: 'errorRate',
        operator: 'gt',
        threshold: 5, // 5%
        severity: 'high',
        enabled: true,
        cooldownMinutes: 3
      },
      {
        id: 'error-rate-critical',
        name: 'Critical Error Rate',
        metric: 'errorRate',
        operator: 'gt',
        threshold: 15, // 15%
        severity: 'critical',
        enabled: true,
        cooldownMinutes: 1
      },
      {
        id: 'cpu-usage-high',
        name: 'High CPU Usage',
        metric: 'cpuUsage',
        operator: 'gt',
        threshold: 80, // 80%
        severity: 'medium',
        enabled: true,
        cooldownMinutes: 5
      },
      {
        id: 'cpu-usage-critical',
        name: 'Critical CPU Usage',
        metric: 'cpuUsage',
        operator: 'gt',
        threshold: 95, // 95%
        severity: 'critical',
        enabled: true,
        cooldownMinutes: 2
      },
      {
        id: 'memory-usage-high',
        name: 'High Memory Usage',
        metric: 'memoryUsage',
        operator: 'gt',
        threshold: 85, // 85%
        severity: 'medium',
        enabled: true,
        cooldownMinutes: 5
      },
      {
        id: 'memory-usage-critical',
        name: 'Critical Memory Usage',
        metric: 'memoryUsage',
        operator: 'gt',
        threshold: 95, // 95%
        severity: 'critical',
        enabled: true,
        cooldownMinutes: 2
      },
      {
        id: 'db-connections-high',
        name: 'High Database Connections',
        metric: 'dbConnections',
        operator: 'gt',
        threshold: 80,
        severity: 'medium',
        enabled: true,
        cooldownMinutes: 5
      },
      {
        id: 'cache-hit-rate-low',
        name: 'Low Cache Hit Rate',
        metric: 'cacheHitRate',
        operator: 'lt',
        threshold: 70, // 70%
        severity: 'low',
        enabled: true,
        cooldownMinutes: 15
      }
    ];

    defaultRules.forEach(rule => {
      this.alertRules.set(rule.id, rule);
    });
  }

  // 建立性能監控和告警閾值
  async setupMonitoring(thresholds: PerformanceThreshold[]): Promise<void> {
    console.log('Setting up performance monitoring...');

    // Convert thresholds to alert rules
    for (const threshold of thresholds) {
      const warningRule: AlertRule = {
        id: `${threshold.metric}-warning`,
        name: `${threshold.metric} Warning`,
        metric: threshold.metric,
        operator: 'gt',
        threshold: threshold.warning,
        severity: 'medium',
        enabled: true,
        cooldownMinutes: 10
      };

      const criticalRule: AlertRule = {
        id: `${threshold.metric}-critical`,
        name: `${threshold.metric} Critical`,
        metric: threshold.metric,
        operator: 'gt',
        threshold: threshold.critical,
        severity: 'critical',
        enabled: true,
        cooldownMinutes: 5
      };

      this.alertRules.set(warningRule.id, warningRule);
      this.alertRules.set(criticalRule.id, criticalRule);
    }

    // Store rules in Redis
    await this.redis.setex(
      'monitoring:rules',
      86400 * 7, // 1 week
      JSON.stringify(Array.from(this.alertRules.values()))
    );

    // Store config
    await this.redis.setex(
      'monitoring:config',
      86400 * 7,
      JSON.stringify(this.config)
    );

    console.log(`Monitoring setup complete with ${this.alertRules.size} rules`);
  }

  // 檢查性能指標並觸發告警
  async checkMetrics(benchmark: PerformanceBenchmark): Promise<PerformanceAlert[]> {
    const triggeredAlerts: PerformanceAlert[] = [];

    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) continue;

      const metricValue = benchmark.metrics[rule.metric as keyof typeof benchmark.metrics];
      if (metricValue === undefined) continue;

      // Check if rule condition is met
      const conditionMet = this.evaluateCondition(metricValue, rule.operator, rule.threshold);
      
      if (conditionMet) {
        // Check cooldown period
        const lastAlert = await this.getLastAlert(rule.id);
        if (lastAlert && !this.isCooldownExpired(lastAlert, rule.cooldownMinutes)) {
          continue;
        }

        // Create new alert
        const alert: PerformanceAlert = {
          id: `alert-${Date.now()}-${rule.id}`,
          ruleId: rule.id,
          ruleName: rule.name,
          metric: rule.metric,
          currentValue: metricValue,
          threshold: rule.threshold,
          severity: rule.severity,
          message: this.generateAlertMessage(rule, metricValue, benchmark),
          timestamp: new Date(),
          resolved: false
        };

        triggeredAlerts.push(alert);
        this.activeAlerts.set(alert.id, alert);

        // Store alert
        await this.storeAlert(alert);

        // Send notifications
        await this.sendAlertNotifications(alert);
      } else {
        // Check if we need to resolve any active alerts for this rule
        await this.resolveAlertsForRule(rule.id);
      }
    }

    return triggeredAlerts;
  }

  // 評估條件
  private evaluateCondition(value: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case 'gt': return value > threshold;
      case 'gte': return value >= threshold;
      case 'lt': return value < threshold;
      case 'lte': return value <= threshold;
      case 'eq': return value === threshold;
      default: return false;
    }
  }

  // 檢查冷卻期是否已過
  private isCooldownExpired(lastAlert: PerformanceAlert, cooldownMinutes: number): boolean {
    const cooldownMs = cooldownMinutes * 60 * 1000;
    return Date.now() - lastAlert.timestamp.getTime() > cooldownMs;
  }

  // 生成告警消息
  private generateAlertMessage(rule: AlertRule, currentValue: number, benchmark: PerformanceBenchmark): string {
    const unit = this.getMetricUnit(rule.metric);
    return `${rule.name}: ${rule.metric} is ${currentValue.toFixed(2)}${unit}, exceeding threshold of ${rule.threshold}${unit} for ${benchmark.testName || benchmark.endpoint}`;
  }

  // 獲取指標單位
  private getMetricUnit(metric: string): string {
    const units: Record<string, string> = {
      responseTime: 'ms',
      throughput: ' req/s',
      errorRate: '%',
      cpuUsage: '%',
      memoryUsage: '%',
      dbConnections: '',
      cacheHitRate: '%'
    };
    return units[metric] || '';
  }

  // 存儲告警
  private async storeAlert(alert: PerformanceAlert): Promise<void> {
    await this.redis.lpush('monitoring:alerts', JSON.stringify(alert));
    await this.redis.ltrim('monitoring:alerts', 0, 999); // Keep last 1000 alerts
    
    // Store by rule for quick lookup
    await this.redis.setex(
      `monitoring:last_alert:${alert.ruleId}`,
      3600, // 1 hour
      JSON.stringify(alert)
    );
  }

  // 獲取最後一次告警
  private async getLastAlert(ruleId: string): Promise<PerformanceAlert | null> {
    const alertData = await this.redis.get(`monitoring:last_alert:${ruleId}`);
    return alertData ? JSON.parse(alertData) : null;
  }

  // 解決規則的告警
  private async resolveAlertsForRule(ruleId: string): Promise<void> {
    const activeAlert = Array.from(this.activeAlerts.values())
      .find(alert => alert.ruleId === ruleId && !alert.resolved);

    if (activeAlert) {
      activeAlert.resolved = true;
      activeAlert.resolvedAt = new Date();
      
      await this.storeAlert(activeAlert);
      this.activeAlerts.delete(activeAlert.id);
    }
  }

  // 發送告警通知
  private async sendAlertNotifications(alert: PerformanceAlert): Promise<void> {
    console.log(`🚨 PERFORMANCE ALERT: ${alert.message}`);

    // Email notification
    if (this.config.alertChannels.email) {
      await this.sendEmailAlert(alert);
    }

    // Slack notification
    if (this.config.alertChannels.slack) {
      await this.sendSlackAlert(alert);
    }

    // Webhook notification
    if (this.config.alertChannels.webhook) {
      await this.sendWebhookAlert(alert);
    }
  }

  // 發送郵件告警
  private async sendEmailAlert(alert: PerformanceAlert): Promise<void> {
    // Implementation would integrate with email service
    console.log(`📧 Email alert sent: ${alert.message}`);
  }

  // 發送Slack告警
  private async sendSlackAlert(alert: PerformanceAlert): Promise<void> {
    // Implementation would integrate with Slack API
    console.log(`💬 Slack alert sent: ${alert.message}`);
  }

  // 發送Webhook告警
  private async sendWebhookAlert(alert: PerformanceAlert): Promise<void> {
    try {
      const webhookUrl = process.env.PERFORMANCE_WEBHOOK_URL;
      if (!webhookUrl) return;

      const payload = {
        alert: alert,
        timestamp: new Date().toISOString(),
        source: 'performance-monitoring'
      };

      // In a real implementation, you would make an HTTP request
      console.log(`🔗 Webhook alert sent: ${JSON.stringify(payload)}`);
    } catch (error) {
      console.error('Failed to send webhook alert:', error);
    }
  }

  // 獲取活躍告警
  async getActiveAlerts(): Promise<PerformanceAlert[]> {
    return Array.from(this.activeAlerts.values()).filter(alert => !alert.resolved);
  }

  // 獲取告警歷史
  async getAlertHistory(limit: number = 100): Promise<PerformanceAlert[]> {
    const alerts = await this.redis.lrange('monitoring:alerts', 0, limit - 1);
    return alerts.map(alert => JSON.parse(alert));
  }

  // 獲取告警統計
  async getAlertStats(): Promise<{
    total: number;
    active: number;
    resolved: number;
    bySeverity: Record<string, number>;
    byMetric: Record<string, number>;
  }> {
    const alerts = await this.getAlertHistory(1000);
    const active = alerts.filter(a => !a.resolved).length;
    const resolved = alerts.filter(a => a.resolved).length;

    const bySeverity: Record<string, number> = {};
    const byMetric: Record<string, number> = {};

    alerts.forEach(alert => {
      bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;
      byMetric[alert.metric] = (byMetric[alert.metric] || 0) + 1;
    });

    return {
      total: alerts.length,
      active,
      resolved,
      bySeverity,
      byMetric
    };
  }

  // 更新告警規則
  async updateAlertRule(ruleId: string, updates: Partial<AlertRule>): Promise<AlertRule | null> {
    const rule = this.alertRules.get(ruleId);
    if (!rule) return null;

    const updatedRule = { ...rule, ...updates };
    this.alertRules.set(ruleId, updatedRule);

    // Update in Redis
    await this.redis.setex(
      'monitoring:rules',
      86400 * 7,
      JSON.stringify(Array.from(this.alertRules.values()))
    );

    return updatedRule;
  }

  // 添加新的告警規則
  async addAlertRule(rule: Omit<AlertRule, 'id'>): Promise<AlertRule> {
    const newRule: AlertRule = {
      ...rule,
      id: `custom-${Date.now()}`
    };

    this.alertRules.set(newRule.id, newRule);

    // Update in Redis
    await this.redis.setex(
      'monitoring:rules',
      86400 * 7,
      JSON.stringify(Array.from(this.alertRules.values()))
    );

    return newRule;
  }

  // 刪除告警規則
  async deleteAlertRule(ruleId: string): Promise<boolean> {
    const deleted = this.alertRules.delete(ruleId);
    
    if (deleted) {
      // Update in Redis
      await this.redis.setex(
        'monitoring:rules',
        86400 * 7,
        JSON.stringify(Array.from(this.alertRules.values()))
      );

      // Clean up related alerts
      await this.redis.del(`monitoring:last_alert:${ruleId}`);
    }

    return deleted;
  }

  // 獲取所有告警規則
  getAllAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  // 更新監控配置
  async updateConfig(config: Partial<MonitoringConfig>): Promise<MonitoringConfig> {
    this.config = { ...this.config, ...config };
    
    await this.redis.setex(
      'monitoring:config',
      86400 * 7,
      JSON.stringify(this.config)
    );

    return this.config;
  }

  // 獲取監控配置
  getConfig(): MonitoringConfig {
    return this.config;
  }

  // 清理過期數據
  async cleanup(): Promise<void> {
    const retentionMs = this.config.retentionDays * 24 * 60 * 60 * 1000;
    const cutoffTime = Date.now() - retentionMs;

    // Clean up old alerts
    const alerts = await this.getAlertHistory(10000);
    const validAlerts = alerts.filter(alert => 
      alert.timestamp.getTime() > cutoffTime
    );

    // Replace alerts list with valid ones
    await this.redis.del('monitoring:alerts');
    for (const alert of validAlerts.reverse()) {
      await this.redis.lpush('monitoring:alerts', JSON.stringify(alert));
    }

    console.log(`Cleaned up ${alerts.length - validAlerts.length} old alerts`);
  }
}