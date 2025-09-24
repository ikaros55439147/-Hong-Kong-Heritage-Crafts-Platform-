import { createWriteStream, WriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import path from 'path';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  metadata?: Record<string, any>;
  requestId?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  console: boolean;
  file: boolean;
  logDir: string;
  maxFileSize: number; // bytes
  maxFiles: number;
  format: 'json' | 'text';
  includeStack: boolean;
}

class Logger {
  private config: LoggerConfig;
  private fileStream: WriteStream | null = null;
  private currentLogFile: string | null = null;
  private logLevels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    fatal: 4
  };

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: (process.env.LOG_LEVEL as LogLevel) || 'info',
      console: process.env.NODE_ENV !== 'production',
      file: true,
      logDir: process.env.LOG_DIR || 'logs',
      maxFileSize: parseInt(process.env.LOG_MAX_FILE_SIZE || '10485760'), // 10MB
      maxFiles: parseInt(process.env.LOG_MAX_FILES || '5'),
      format: (process.env.LOG_FORMAT as 'json' | 'text') || 'json',
      includeStack: process.env.NODE_ENV === 'development',
      ...config
    };

    this.initializeFileLogging();
  }

  /**
   * 初始化文件日誌
   */
  private async initializeFileLogging(): Promise<void> {
    if (!this.config.file) return;

    try {
      await mkdir(this.config.logDir, { recursive: true });
      await this.createNewLogFile();
    } catch (error) {
      console.error('Failed to initialize file logging:', error);
    }
  }

  /**
   * 創建新的日誌文件
   */
  private async createNewLogFile(): Promise<void> {
    if (this.fileStream) {
      this.fileStream.end();
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.currentLogFile = path.join(this.config.logDir, `app-${timestamp}.log`);
    
    this.fileStream = createWriteStream(this.currentLogFile, { flags: 'a' });
    
    this.fileStream.on('error', (error) => {
      console.error('Log file stream error:', error);
    });
  }

  /**
   * 檢查是否需要輪轉日誌文件
   */
  private async checkLogRotation(): Promise<void> {
    if (!this.fileStream || !this.currentLogFile) return;

    try {
      const fs = await import('fs');
      const stats = fs.statSync(this.currentLogFile);
      
      if (stats.size > this.config.maxFileSize) {
        await this.rotateLogFile();
      }
    } catch (error) {
      console.error('Error checking log rotation:', error);
    }
  }

  /**
   * 輪轉日誌文件
   */
  private async rotateLogFile(): Promise<void> {
    try {
      await this.createNewLogFile();
      await this.cleanupOldLogFiles();
    } catch (error) {
      console.error('Error rotating log file:', error);
    }
  }

  /**
   * 清理舊的日誌文件
   */
  private async cleanupOldLogFiles(): Promise<void> {
    try {
      const fs = await import('fs');
      const files = fs.readdirSync(this.config.logDir)
        .filter(file => file.startsWith('app-') && file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: path.join(this.config.logDir, file),
          stats: fs.statSync(path.join(this.config.logDir, file))
        }))
        .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

      // 保留最新的 N 個文件
      const filesToDelete = files.slice(this.config.maxFiles);
      
      for (const file of filesToDelete) {
        fs.unlinkSync(file.path);
      }
    } catch (error) {
      console.error('Error cleaning up old log files:', error);
    }
  }

  /**
   * 記錄日誌
   */
  private async log(level: LogLevel, message: string, metadata?: Record<string, any>): Promise<void> {
    // 檢查日誌級別
    if (this.logLevels[level] < this.logLevels[this.config.level]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      metadata
    };

    // 添加錯誤堆棧信息
    if (this.config.includeStack && (level === 'error' || level === 'fatal')) {
      const stack = new Error().stack;
      if (stack) {
        entry.metadata = { ...entry.metadata, stack };
      }
    }

    // 控制台輸出
    if (this.config.console) {
      this.logToConsole(entry);
    }

    // 文件輸出
    if (this.config.file && this.fileStream) {
      await this.logToFile(entry);
    }
  }

  /**
   * 輸出到控制台
   */
  private logToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    
    let output: string;
    
    if (this.config.format === 'json') {
      output = JSON.stringify(entry);
    } else {
      output = `${timestamp} [${level}] ${entry.message}`;
      if (entry.metadata) {
        output += ` ${JSON.stringify(entry.metadata)}`;
      }
    }

    // 根據級別選擇輸出方法
    switch (entry.level) {
      case 'debug':
        console.debug(output);
        break;
      case 'info':
        console.info(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'error':
      case 'fatal':
        console.error(output);
        break;
    }
  }

  /**
   * 輸出到文件
   */
  private async logToFile(entry: LogEntry): Promise<void> {
    if (!this.fileStream) return;

    try {
      await this.checkLogRotation();
      
      const output = this.config.format === 'json' 
        ? JSON.stringify(entry) + '\n'
        : `${entry.timestamp.toISOString()} [${entry.level.toUpperCase()}] ${entry.message}${
            entry.metadata ? ' ' + JSON.stringify(entry.metadata) : ''
          }\n`;

      this.fileStream.write(output);
    } catch (error) {
      console.error('Error writing to log file:', error);
    }
  }

  /**
   * Debug 級別日誌
   */
  debug(message: string, metadata?: Record<string, any>): void {
    this.log('debug', message, metadata);
  }

  /**
   * Info 級別日誌
   */
  info(message: string, metadata?: Record<string, any>): void {
    this.log('info', message, metadata);
  }

  /**
   * Warning 級別日誌
   */
  warn(message: string, metadata?: Record<string, any>): void {
    this.log('warn', message, metadata);
  }

  /**
   * Error 級別日誌
   */
  error(message: string, error?: Error | Record<string, any>): void {
    let metadata: Record<string, any> | undefined;
    
    if (error instanceof Error) {
      metadata = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    } else if (error) {
      metadata = error;
    }
    
    this.log('error', message, metadata);
  }

  /**
   * Fatal 級別日誌
   */
  fatal(message: string, error?: Error | Record<string, any>): void {
    let metadata: Record<string, any> | undefined;
    
    if (error instanceof Error) {
      metadata = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    } else if (error) {
      metadata = error;
    }
    
    this.log('fatal', message, metadata);
  }

  /**
   * 創建子日誌器（帶有上下文）
   */
  child(context: Record<string, any>): Logger {
    const childLogger = new Logger(this.config);
    
    // 覆蓋 log 方法以添加上下文
    const originalLog = childLogger.log.bind(childLogger);
    childLogger.log = async (level: LogLevel, message: string, metadata?: Record<string, any>) => {
      const mergedMetadata = { ...context, ...metadata };
      return originalLog(level, message, mergedMetadata);
    };
    
    return childLogger;
  }

  /**
   * 關閉日誌器
   */
  close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.fileStream) {
        this.fileStream.end(() => {
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

// 創建全局日誌器實例
export const logger = new Logger();

// 請求日誌中間件
export function createRequestLogger() {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(7);
    
    // 創建請求特定的日誌器
    req.logger = logger.child({
      requestId,
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // 記錄請求開始
    req.logger.info('Request started');

    // 監聽響應結束
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      req.logger.info('Request completed', {
        statusCode: res.statusCode,
        duration
      });
    });

    next();
  };
}

// 錯誤日誌中間件
export function createErrorLogger() {
  return (error: Error, req: any, res: any, next: any) => {
    const requestLogger = req.logger || logger;
    
    requestLogger.error('Request error', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    next(error);
  };
}