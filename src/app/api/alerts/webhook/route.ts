import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/utils/logger'
import { sendNotification } from '@/lib/services/notification.service'

interface AlertManagerWebhook {
  version: string
  groupKey: string
  status: 'firing' | 'resolved'
  receiver: string
  groupLabels: Record<string, string>
  commonLabels: Record<string, string>
  commonAnnotations: Record<string, string>
  externalURL: string
  alerts: Array<{
    status: 'firing' | 'resolved'
    labels: Record<string, string>
    annotations: Record<string, string>
    startsAt: string
    endsAt?: string
    generatorURL: string
    fingerprint: string
  }>
}

export async function POST(request: NextRequest) {
  try {
    const webhook: AlertManagerWebhook = await request.json()
    
    logger.info('收到AlertManager告警', {
      status: webhook.status,
      alertCount: webhook.alerts.length,
      groupKey: webhook.groupKey
    })

    // 處理每個告警
    for (const alert of webhook.alerts) {
      await processAlert(alert, webhook.status)
    }

    // 發送系統通知給管理員
    if (webhook.status === 'firing') {
      await notifyAdministrators(webhook)
    }

    return NextResponse.json({ 
      success: true, 
      message: '告警處理完成',
      processed: webhook.alerts.length 
    })

  } catch (error) {
    logger.error('處理AlertManager告警失敗', error)
    return NextResponse.json(
      { error: '告警處理失敗' },
      { status: 500 }
    )
  }
}

async function processAlert(
  alert: AlertManagerWebhook['alerts'][0], 
  status: 'firing' | 'resolved'
) {
  const severity = alert.labels.severity || 'info'
  const alertName = alert.labels.alertname
  const summary = alert.annotations.summary
  const description = alert.annotations.description

  // 記錄告警到數據庫
  await recordAlert({
    name: alertName,
    severity,
    status,
    summary,
    description,
    labels: alert.labels,
    annotations: alert.annotations,
    startsAt: new Date(alert.startsAt),
    endsAt: alert.endsAt ? new Date(alert.endsAt) : null,
    fingerprint: alert.fingerprint
  })

  // 根據嚴重程度執行不同的響應動作
  switch (severity) {
    case 'critical':
      await handleCriticalAlert(alert)
      break
    case 'warning':
      await handleWarningAlert(alert)
      break
    case 'info':
      await handleInfoAlert(alert)
      break
  }
}

async function handleCriticalAlert(alert: AlertManagerWebhook['alerts'][0]) {
  logger.error('處理嚴重告警', {
    alertName: alert.labels.alertname,
    summary: alert.annotations.summary
  })

  // 立即通知所有管理員
  await sendNotification({
    type: 'system_alert',
    severity: 'critical',
    title: `🚨 嚴重告警: ${alert.labels.alertname}`,
    message: alert.annotations.summary,
    data: {
      alert: alert.labels,
      description: alert.annotations.description
    },
    recipients: await getAdminUsers(),
    channels: ['email', 'push', 'sms']
  })

  // 觸發自動恢復程序（如果適用）
  if (alert.labels.alertname === 'ApplicationDown') {
    await triggerAutoRecovery()
  }
}

async function handleWarningAlert(alert: AlertManagerWebhook['alerts'][0]) {
  logger.warn('處理警告告警', {
    alertName: alert.labels.alertname,
    summary: alert.annotations.summary
  })

  // 通知運維團隊
  await sendNotification({
    type: 'system_alert',
    severity: 'warning',
    title: `⚠️ 警告: ${alert.labels.alertname}`,
    message: alert.annotations.summary,
    data: {
      alert: alert.labels,
      description: alert.annotations.description
    },
    recipients: await getOperationsTeam(),
    channels: ['email', 'push']
  })
}

async function handleInfoAlert(alert: AlertManagerWebhook['alerts'][0]) {
  logger.info('處理信息告警', {
    alertName: alert.labels.alertname,
    summary: alert.annotations.summary
  })

  // 記錄到系統日誌，不發送通知
}

async function notifyAdministrators(webhook: AlertManagerWebhook) {
  const firingAlerts = webhook.alerts.filter(alert => alert.status === 'firing')
  
  if (firingAlerts.length === 0) return

  const criticalAlerts = firingAlerts.filter(alert => alert.labels.severity === 'critical')
  const warningAlerts = firingAlerts.filter(alert => alert.labels.severity === 'warning')

  let message = '系統告警摘要:\n'
  
  if (criticalAlerts.length > 0) {
    message += `🚨 嚴重告警: ${criticalAlerts.length}個\n`
    criticalAlerts.forEach(alert => {
      message += `- ${alert.annotations.summary}\n`
    })
  }

  if (warningAlerts.length > 0) {
    message += `⚠️ 警告告警: ${warningAlerts.length}個\n`
    warningAlerts.forEach(alert => {
      message += `- ${alert.annotations.summary}\n`
    })
  }

  await sendNotification({
    type: 'system_alert',
    severity: criticalAlerts.length > 0 ? 'critical' : 'warning',
    title: '系統告警摘要',
    message,
    recipients: await getAdminUsers(),
    channels: ['email', 'push']
  })
}

async function recordAlert(alertData: any) {
  // 這裡應該將告警記錄到數據庫
  // 由於沒有告警表的schema，我們先記錄到日誌
  logger.info('記錄告警到數據庫', alertData)
}

async function getAdminUsers() {
  // 返回管理員用戶列表
  return ['admin@hk-heritage-crafts.com']
}

async function getOperationsTeam() {
  // 返回運維團隊列表
  return ['ops@hk-heritage-crafts.com']
}

async function triggerAutoRecovery() {
  logger.info('觸發自動恢復程序')
  
  try {
    // 嘗試重啟應用程式服務
    // 這裡可以調用Docker API或Kubernetes API
    // 暫時只記錄日誌
    logger.info('執行自動恢復: 重啟應用程式服務')
    
  } catch (error) {
    logger.error('自動恢復失敗', error)
  }
}