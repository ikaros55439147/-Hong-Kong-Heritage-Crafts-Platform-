import { NextRequest, NextResponse } from 'next/server'

export interface LogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  service: string
  requestId?: string
  userId?: string
  method?: string
  url?: string
  statusCode?: number
  responseTime?: number
  userAgent?: string
  ip?: string
  error?: any
}

class Logger {
  private static instance: Logger
  private requestCounter = 0

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${++this.requestCounter}`
  }

  private formatLog(entry: LogEntry): string {
    return JSON.stringify({
      ...entry,
      timestamp: new Date().toISOString()
    })
  }

  private writeLog(entry: LogEntry): void {
    const formattedLog = this.formatLog(entry)
    
    // In production, this would write to a file or send to a logging service
    if (process.env.NODE_ENV === 'production') {
      // Write to stdout for Docker log collection
      console.log(formattedLog)
    } else {
      // Development logging
      const color = this.getLogColor(entry.level)
      console.log(`${color}[${entry.level.toUpperCase()}]${'\x1b[0m'} ${entry.message}`)
    }
  }

  private getLogColor(level: string): string {
    switch (level) {
      case 'error': return '\x1b[31m' // Red
      case 'warn': return '\x1b[33m'  // Yellow
      case 'info': return '\x1b[36m'  // Cyan
      case 'debug': return '\x1b[90m' // Gray
      default: return '\x1b[0m'       // Reset
    }
  }

  info(message: string, meta: Partial<LogEntry> = {}): void {
    this.writeLog({
      level: 'info',
      message,
      service: 'hk-heritage-crafts',
      timestamp: new Date().toISOString(),
      ...meta
    })
  }

  warn(message: string, meta: Partial<LogEntry> = {}): void {
    this.writeLog({
      level: 'warn',
      message,
      service: 'hk-heritage-crafts',
      timestamp: new Date().toISOString(),
      ...meta
    })
  }

  error(message: string, error?: any, meta: Partial<LogEntry> = {}): void {
    this.writeLog({
      level: 'error',
      message,
      service: 'hk-heritage-crafts',
      timestamp: new Date().toISOString(),
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined,
      ...meta
    })
  }

  debug(message: string, meta: Partial<LogEntry> = {}): void {
    if (process.env.NODE_ENV === 'development' || process.env.LOG_LEVEL === 'debug') {
      this.writeLog({
        level: 'debug',
        message,
        service: 'hk-heritage-crafts',
        timestamp: new Date().toISOString(),
        ...meta
      })
    }
  }

  // HTTP request logging middleware
  logRequest(request: NextRequest, response: NextResponse, responseTime: number): void {
    const requestId = this.generateRequestId()
    const statusCode = response.status
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info'

    this.writeLog({
      level,
      message: `${request.method} ${request.url} ${statusCode} - ${responseTime}ms`,
      service: 'hk-heritage-crafts-api',
      timestamp: new Date().toISOString(),
      requestId,
      method: request.method,
      url: request.url,
      statusCode,
      responseTime,
      userAgent: request.headers.get('user-agent') || undefined,
      ip: request.headers.get('x-forwarded-for') || 
          request.headers.get('x-real-ip') || 
          'unknown'
    })
  }

  // Database operation logging
  logDatabaseOperation(operation: string, table: string, duration: number, success: boolean): void {
    this.writeLog({
      level: success ? 'info' : 'error',
      message: `Database ${operation} on ${table} - ${duration}ms`,
      service: 'hk-heritage-crafts-db',
      timestamp: new Date().toISOString(),
      responseTime: duration
    })
  }

  // Authentication logging
  logAuth(event: string, userId?: string, success: boolean = true, meta: any = {}): void {
    this.writeLog({
      level: success ? 'info' : 'warn',
      message: `Auth event: ${event}`,
      service: 'hk-heritage-crafts-auth',
      timestamp: new Date().toISOString(),
      userId,
      ...meta
    })
  }

  // Business logic logging
  logBusinessEvent(event: string, meta: Partial<LogEntry> = {}): void {
    this.writeLog({
      level: 'info',
      message: `Business event: ${event}`,
      service: 'hk-heritage-crafts-business',
      timestamp: new Date().toISOString(),
      ...meta
    })
  }
}

export const logger = Logger.getInstance()

// Request logging middleware function
export function createRequestLogger() {
  return (request: NextRequest) => {
    const startTime = Date.now()
    
    // Create a response interceptor
    const originalJson = NextResponse.json
    NextResponse.json = function(body: any, init?: ResponseInit) {
      const response = originalJson.call(this, body, init)
      const responseTime = Date.now() - startTime
      
      // Log the request
      logger.logRequest(request, response, responseTime)
      
      return response
    }

    return NextResponse.next()
  }
}

// Error boundary logging
export function logUnhandledError(error: Error, context: string): void {
  logger.error(`Unhandled error in ${context}`, error, {
    service: 'hk-heritage-crafts-error-boundary'
  })
}

// Performance monitoring
export class PerformanceMonitor {
  private static timers = new Map<string, number>()

  static start(operation: string): void {
    this.timers.set(operation, Date.now())
  }

  static end(operation: string): number {
    const startTime = this.timers.get(operation)
    if (!startTime) {
      logger.warn(`Performance timer not found for operation: ${operation}`)
      return 0
    }

    const duration = Date.now() - startTime
    this.timers.delete(operation)

    logger.info(`Performance: ${operation} completed in ${duration}ms`, {
      service: 'hk-heritage-crafts-performance',
      responseTime: duration
    })

    return duration
  }

  static measure<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    return new Promise(async (resolve, reject) => {
      this.start(operation)
      try {
        const result = await fn()
        this.end(operation)
        resolve(result)
      } catch (error) {
        this.end(operation)
        logger.error(`Performance: ${operation} failed`, error)
        reject(error)
      }
    })
  }
}