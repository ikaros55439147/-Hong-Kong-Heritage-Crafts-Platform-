import sgMail from '@sendgrid/mail'
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'
import nodemailer from 'nodemailer'

export interface EmailData {
  to: string | string[]
  subject: string
  text?: string
  html?: string
  from?: string
  replyTo?: string
  attachments?: Array<{
    filename: string
    content: Buffer | string
    contentType?: string
  }>
}

export interface EmailTemplate {
  templateId: string
  dynamicData: Record<string, any>
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

export interface EmailProvider {
  sendEmail(emailData: EmailData): Promise<EmailResult>
  sendTemplateEmail(to: string | string[], template: EmailTemplate): Promise<EmailResult>
}

// SendGrid provider
class SendGridProvider implements EmailProvider {
  constructor() {
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    }
  }

  async sendEmail(emailData: EmailData): Promise<EmailResult> {
    try {
      const msg = {
        to: emailData.to,
        from: emailData.from || process.env.SENDGRID_FROM_EMAIL || 'noreply@example.com',
        subject: emailData.subject,
        text: emailData.text,
        html: emailData.html,
        replyTo: emailData.replyTo,
        attachments: emailData.attachments?.map(att => ({
          filename: att.filename,
          content: att.content,
          type: att.contentType
        }))
      }

      const response = await sgMail.send(msg)
      return {
        success: true,
        messageId: response[0].headers['x-message-id'] as string
      }
    } catch (error) {
      console.error('SendGrid email error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Email sending failed'
      }
    }
  }

  async sendTemplateEmail(to: string | string[], template: EmailTemplate): Promise<EmailResult> {
    try {
      const msg = {
        to,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@example.com',
        templateId: template.templateId,
        dynamicTemplateData: template.dynamicData
      }

      const response = await sgMail.send(msg)
      return {
        success: true,
        messageId: response[0].headers['x-message-id'] as string
      }
    } catch (error) {
      console.error('SendGrid template email error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Template email sending failed'
      }
    }
  }
}

// AWS SES provider
class SESProvider implements EmailProvider {
  private sesClient: SESClient

  constructor() {
    this.sesClient = new SESClient({
      region: process.env.AWS_SES_REGION || process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
      }
    })
  }

  async sendEmail(emailData: EmailData): Promise<EmailResult> {
    try {
      const command = new SendEmailCommand({
        Source: emailData.from || process.env.AWS_SES_FROM_EMAIL || 'noreply@example.com',
        Destination: {
          ToAddresses: Array.isArray(emailData.to) ? emailData.to : [emailData.to]
        },
        Message: {
          Subject: {
            Data: emailData.subject,
            Charset: 'UTF-8'
          },
          Body: {
            Text: emailData.text ? {
              Data: emailData.text,
              Charset: 'UTF-8'
            } : undefined,
            Html: emailData.html ? {
              Data: emailData.html,
              Charset: 'UTF-8'
            } : undefined
          }
        },
        ReplyToAddresses: emailData.replyTo ? [emailData.replyTo] : undefined
      })

      const response = await this.sesClient.send(command)
      return {
        success: true,
        messageId: response.MessageId
      }
    } catch (error) {
      console.error('AWS SES email error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Email sending failed'
      }
    }
  }

  async sendTemplateEmail(to: string | string[], template: EmailTemplate): Promise<EmailResult> {
    // AWS SES template sending would require SendTemplatedEmailCommand
    // For now, we'll use regular email sending
    return this.sendEmail({
      to,
      subject: 'Template Email',
      html: `<p>Template ID: ${template.templateId}</p><pre>${JSON.stringify(template.dynamicData, null, 2)}</pre>`
    })
  }
}

// SMTP provider using Nodemailer
class SMTPProvider implements EmailProvider {
  private transporter: nodemailer.Transporter

  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    })
  }

  async sendEmail(emailData: EmailData): Promise<EmailResult> {
    try {
      const mailOptions = {
        from: emailData.from || process.env.SMTP_USER,
        to: emailData.to,
        subject: emailData.subject,
        text: emailData.text,
        html: emailData.html,
        replyTo: emailData.replyTo,
        attachments: emailData.attachments
      }

      const info = await this.transporter.sendMail(mailOptions)
      return {
        success: true,
        messageId: info.messageId
      }
    } catch (error) {
      console.error('SMTP email error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Email sending failed'
      }
    }
  }

  async sendTemplateEmail(to: string | string[], template: EmailTemplate): Promise<EmailResult> {
    // Basic template implementation - in production you'd want a proper template engine
    return this.sendEmail({
      to,
      subject: 'Template Email',
      html: `<p>Template ID: ${template.templateId}</p><pre>${JSON.stringify(template.dynamicData, null, 2)}</pre>`
    })
  }
}

export class EmailService {
  private provider: EmailProvider

  constructor() {
    const emailService = process.env.EMAIL_SERVICE || 'sendgrid'
    
    switch (emailService) {
      case 'ses':
        this.provider = new SESProvider()
        break
      case 'smtp':
        this.provider = new SMTPProvider()
        break
      case 'sendgrid':
      default:
        this.provider = new SendGridProvider()
        break
    }
  }

  /**
   * Send a regular email
   */
  async sendEmail(emailData: EmailData): Promise<EmailResult> {
    return this.provider.sendEmail(emailData)
  }

  /**
   * Send a template-based email
   */
  async sendTemplateEmail(to: string | string[], template: EmailTemplate): Promise<EmailResult> {
    return this.provider.sendTemplateEmail(to, template)
  }

  /**
   * Send welcome email to new users
   */
  async sendWelcomeEmail(to: string, userName: string): Promise<EmailResult> {
    return this.sendEmail({
      to,
      subject: '歡迎加入香港弱勢行業傳承平台 - Welcome to HK Heritage Crafts Platform',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">歡迎加入香港弱勢行業傳承平台</h1>
          <p>親愛的 ${userName}，</p>
          <p>歡迎您加入香港弱勢行業傳承平台！我們很高興您成為我們社群的一員。</p>
          <p>在這個平台上，您可以：</p>
          <ul>
            <li>探索香港傳統手工藝和弱勢行業</li>
            <li>與經驗豐富的師傅學習</li>
            <li>參與課程和工作坊</li>
            <li>購買正宗的手工藝品</li>
            <li>與其他愛好者交流</li>
          </ul>
          <p>立即開始探索：<a href="${process.env.NEXTAUTH_URL}" style="color: #2563eb;">訪問平台</a></p>
          <p>如有任何問題，請隨時聯繫我們。</p>
          <p>祝好，<br>香港弱勢行業傳承平台團隊</p>
        </div>
      `
    })
  }

  /**
   * Send course booking confirmation email
   */
  async sendBookingConfirmationEmail(to: string, bookingDetails: {
    userName: string
    courseName: string
    craftsmanName: string
    bookingDate: string
    bookingTime: string
    location?: string
  }): Promise<EmailResult> {
    return this.sendEmail({
      to,
      subject: `課程預約確認 - ${bookingDetails.courseName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">課程預約確認</h1>
          <p>親愛的 ${bookingDetails.userName}，</p>
          <p>您的課程預約已確認！</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">預約詳情</h3>
            <p><strong>課程名稱：</strong>${bookingDetails.courseName}</p>
            <p><strong>師傅：</strong>${bookingDetails.craftsmanName}</p>
            <p><strong>日期：</strong>${bookingDetails.bookingDate}</p>
            <p><strong>時間：</strong>${bookingDetails.bookingTime}</p>
            ${bookingDetails.location ? `<p><strong>地點：</strong>${bookingDetails.location}</p>` : ''}
          </div>
          <p>請準時出席課程。如需取消或更改預約，請提前24小時通知。</p>
          <p>期待與您見面！</p>
          <p>祝好，<br>香港弱勢行業傳承平台團隊</p>
        </div>
      `
    })
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmationEmail(to: string, orderDetails: {
    userName: string
    orderId: string
    items: Array<{ name: string; quantity: number; price: number }>
    totalAmount: number
    shippingAddress?: string
  }): Promise<EmailResult> {
    const itemsHtml = orderDetails.items.map(item => 
      `<tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.price.toFixed(2)}</td>
      </tr>`
    ).join('')

    return this.sendEmail({
      to,
      subject: `訂單確認 - ${orderDetails.orderId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">訂單確認</h1>
          <p>親愛的 ${orderDetails.userName}，</p>
          <p>感謝您的訂購！您的訂單已確認。</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">訂單詳情</h3>
            <p><strong>訂單編號：</strong>${orderDetails.orderId}</p>
            <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
              <thead>
                <tr style="background-color: #e5e7eb;">
                  <th style="padding: 8px; text-align: left;">商品</th>
                  <th style="padding: 8px; text-align: center;">數量</th>
                  <th style="padding: 8px; text-align: right;">價格</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            <p style="text-align: right; font-size: 18px; font-weight: bold;">
              總計：$${orderDetails.totalAmount.toFixed(2)}
            </p>
            ${orderDetails.shippingAddress ? `<p><strong>配送地址：</strong>${orderDetails.shippingAddress}</p>` : ''}
          </div>
          <p>我們將盡快處理您的訂單並安排配送。</p>
          <p>祝好，<br>香港弱勢行業傳承平台團隊</p>
        </div>
      `
    })
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(to: string, resetToken: string): Promise<EmailResult> {
    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`
    
    return this.sendEmail({
      to,
      subject: '密碼重設 - 香港弱勢行業傳承平台',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">密碼重設</h1>
          <p>您好，</p>
          <p>我們收到了您的密碼重設請求。請點擊下方連結重設您的密碼：</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">重設密碼</a>
          </div>
          <p>此連結將在24小時後失效。如果您沒有請求重設密碼，請忽略此郵件。</p>
          <p>為了您的帳戶安全，請勿將此連結分享給他人。</p>
          <p>祝好，<br>香港弱勢行業傳承平台團隊</p>
        </div>
      `
    })
  }

  /**
   * Send notification email for craftsman status changes
   */
  async sendCraftsmanStatusNotification(to: string, craftsmanName: string, status: string): Promise<EmailResult> {
    const statusMessages = {
      approved: '您的師傅檔案已通過審核！',
      rejected: '很抱歉，您的師傅檔案未通過審核。',
      pending: '您的師傅檔案正在審核中。'
    }

    return this.sendEmail({
      to,
      subject: `師傅檔案狀態更新 - ${craftsmanName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">師傅檔案狀態更新</h1>
          <p>親愛的 ${craftsmanName}，</p>
          <p>${statusMessages[status as keyof typeof statusMessages] || '您的師傅檔案狀態已更新。'}</p>
          ${status === 'approved' ? `
            <p>恭喜！您現在可以：</p>
            <ul>
              <li>創建和管理課程</li>
              <li>上架手工藝品</li>
              <li>與學習者互動</li>
            </ul>
          ` : ''}
          ${status === 'rejected' ? `
            <p>請檢查您的檔案資料並重新提交。如有疑問，請聯繫我們的客服團隊。</p>
          ` : ''}
          <p>立即查看您的檔案：<a href="${process.env.NEXTAUTH_URL}/profile" style="color: #2563eb;">前往個人檔案</a></p>
          <p>祝好，<br>香港弱勢行業傳承平台團隊</p>
        </div>
      `
    })
  }
}

export const emailService = new EmailService()