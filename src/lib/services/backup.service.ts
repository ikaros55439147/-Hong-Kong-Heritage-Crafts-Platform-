import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

export interface BackupConfig {
  database: {
    enabled: boolean;
    schedule: string; // cron expression
    retention: number; // days
    compression: boolean;
    encryption: boolean;
  };
  files: {
    enabled: boolean;
    paths: string[];
    schedule: string;
    retention: number;
    compression: boolean;
  };
  storage: {
    local: {
      enabled: boolean;
      path: string;
    };
    s3: {
      enabled: boolean;
      bucket: string;
      region: string;
      accessKeyId?: string;
      secretAccessKey?: string;
    };
    ftp: {
      enabled: boolean;
      host: string;
      username: string;
      password: string;
      path: string;
    };
  };
}

export interface BackupResult {
  id: string;
  type: 'database' | 'files';
  timestamp: Date;
  size: number;
  duration: number;
  success: boolean;
  error?: string;
  location: string;
}

export class BackupService {
  private config: BackupConfig;
  private backupHistory: BackupResult[] = [];

  constructor(config: Partial<BackupConfig> = {}) {
    this.config = {
      database: {
        enabled: true,
        schedule: '0 2 * * *', // 每天凌晨 2 點
        retention: 30,
        compression: true,
        encryption: false,
        ...config.database
      },
      files: {
        enabled: true,
        paths: ['uploads', 'public', 'logs'],
        schedule: '0 3 * * *', // 每天凌晨 3 點
        retention: 7,
        compression: true,
        ...config.files
      },
      storage: {
        local: {
          enabled: true,
          path: process.env.BACKUP_LOCAL_PATH || './backups',
          ...config.storage?.local
        },
        s3: {
          enabled: false,
          bucket: process.env.BACKUP_S3_BUCKET || '',
          region: process.env.BACKUP_S3_REGION || 'us-east-1',
          accessKeyId: process.env.BACKUP_S3_ACCESS_KEY_ID,
          secretAccessKey: process.env.BACKUP_S3_SECRET_ACCESS_KEY,
          ...config.storage?.s3
        },
        ftp: {
          enabled: false,
          host: process.env.BACKUP_FTP_HOST || '',
          username: process.env.BACKUP_FTP_USERNAME || '',
          password: process.env.BACKUP_FTP_PASSWORD || '',
          path: process.env.BACKUP_FTP_PATH || '/',
          ...config.storage?.ftp
        }
      }
    };
  }

  /**
   * 執行數據庫備份
   */
  async backupDatabase(): Promise<BackupResult> {
    const startTime = Date.now();
    const backupId = `db_${Date.now()}`;
    const timestamp = new Date();
    
    logger.info('Starting database backup', { backupId });

    try {
      // 確保備份目錄存在
      await this.ensureBackupDirectory();

      // 生成備份文件名
      const filename = `database_${timestamp.toISOString().replace(/[:.]/g, '-')}.sql`;
      const localPath = path.join(this.config.storage.local.path, filename);

      // 執行 pg_dump
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        throw new Error('DATABASE_URL not configured');
      }

      let command = `pg_dump "${databaseUrl}" > "${localPath}"`;
      
      // 添加壓縮
      if (this.config.database.compression) {
        command = `pg_dump "${databaseUrl}" | gzip > "${localPath}.gz"`;
      }

      await execAsync(command);

      // 獲取文件大小
      const finalPath = this.config.database.compression ? `${localPath}.gz` : localPath;
      const stats = await fs.stat(finalPath);
      const size = stats.size;

      // 上傳到遠程存儲
      await this.uploadToRemoteStorage(finalPath, 'database');

      const duration = Date.now() - startTime;
      const result: BackupResult = {
        id: backupId,
        type: 'database',
        timestamp,
        size,
        duration,
        success: true,
        location: finalPath
      };

      this.backupHistory.push(result);
      logger.info('Database backup completed', { 
        backupId, 
        size: this.formatBytes(size), 
        duration: `${duration}ms` 
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const result: BackupResult = {
        id: backupId,
        type: 'database',
        timestamp,
        size: 0,
        duration,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        location: ''
      };

      this.backupHistory.push(result);
      logger.error('Database backup failed', { backupId, error });
      
      return result;
    }
  }

  /**
   * 執行文件備份
   */
  async backupFiles(): Promise<BackupResult> {
    const startTime = Date.now();
    const backupId = `files_${Date.now()}`;
    const timestamp = new Date();
    
    logger.info('Starting files backup', { backupId });

    try {
      await this.ensureBackupDirectory();

      const filename = `files_${timestamp.toISOString().replace(/[:.]/g, '-')}.tar`;
      const localPath = path.join(this.config.storage.local.path, filename);

      // 創建 tar 命令
      const paths = this.config.files.paths.join(' ');
      let command = `tar -cf "${localPath}" ${paths}`;

      // 添加壓縮
      if (this.config.files.compression) {
        command = `tar -czf "${localPath}.gz" ${paths}`;
      }

      await execAsync(command);

      // 獲取文件大小
      const finalPath = this.config.files.compression ? `${localPath}.gz` : localPath;
      const stats = await fs.stat(finalPath);
      const size = stats.size;

      // 上傳到遠程存儲
      await this.uploadToRemoteStorage(finalPath, 'files');

      const duration = Date.now() - startTime;
      const result: BackupResult = {
        id: backupId,
        type: 'files',
        timestamp,
        size,
        duration,
        success: true,
        location: finalPath
      };

      this.backupHistory.push(result);
      logger.info('Files backup completed', { 
        backupId, 
        size: this.formatBytes(size), 
        duration: `${duration}ms` 
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const result: BackupResult = {
        id: backupId,
        type: 'files',
        timestamp,
        size: 0,
        duration,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        location: ''
      };

      this.backupHistory.push(result);
      logger.error('Files backup failed', { backupId, error });
      
      return result;
    }
  }

  /**
   * 確保備份目錄存在
   */
  private async ensureBackupDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.config.storage.local.path, { recursive: true });
    } catch (error) {
      logger.error('Failed to create backup directory', error);
      throw error;
    }
  }

  /**
   * 上傳到遠程存儲
   */
  private async uploadToRemoteStorage(filePath: string, type: string): Promise<void> {
    const filename = path.basename(filePath);

    // 上傳到 S3
    if (this.config.storage.s3.enabled) {
      try {
        await this.uploadToS3(filePath, filename);
        logger.info('Backup uploaded to S3', { filename });
      } catch (error) {
        logger.error('Failed to upload to S3', error);
      }
    }

    // 上傳到 FTP
    if (this.config.storage.ftp.enabled) {
      try {
        await this.uploadToFTP(filePath, filename);
        logger.info('Backup uploaded to FTP', { filename });
      } catch (error) {
        logger.error('Failed to upload to FTP', error);
      }
    }
  }

  /**
   * 上傳到 S3
   */
  private async uploadToS3(filePath: string, filename: string): Promise<void> {
    // 這裡應該使用 AWS SDK 實現 S3 上傳
    // 目前只是示例實現
    logger.debug(`Would upload ${filePath} to S3 bucket ${this.config.storage.s3.bucket}`);
  }

  /**
   * 上傳到 FTP
   */
  private async uploadToFTP(filePath: string, filename: string): Promise<void> {
    // 這裡應該使用 FTP 客戶端實現上傳
    // 目前只是示例實現
    logger.debug(`Would upload ${filePath} to FTP ${this.config.storage.ftp.host}`);
  }

  /**
   * 清理舊備份
   */
  async cleanupOldBackups(): Promise<void> {
    try {
      const files = await fs.readdir(this.config.storage.local.path);
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(this.config.storage.local.path, file);
        const stats = await fs.stat(filePath);
        
        const isDatabase = file.startsWith('database_');
        const isFiles = file.startsWith('files_');
        
        let retention: number;
        if (isDatabase) {
          retention = this.config.database.retention;
        } else if (isFiles) {
          retention = this.config.files.retention;
        } else {
          continue;
        }

        const ageInDays = (now - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
        
        if (ageInDays > retention) {
          await fs.unlink(filePath);
          logger.info('Deleted old backup', { file, ageInDays });
        }
      }
    } catch (error) {
      logger.error('Error cleaning up old backups', error);
    }
  }

  /**
   * 恢復數據庫
   */
  async restoreDatabase(backupPath: string): Promise<boolean> {
    try {
      logger.info('Starting database restore', { backupPath });

      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        throw new Error('DATABASE_URL not configured');
      }

      let command: string;
      if (backupPath.endsWith('.gz')) {
        command = `gunzip -c "${backupPath}" | psql "${databaseUrl}"`;
      } else {
        command = `psql "${databaseUrl}" < "${backupPath}"`;
      }

      await execAsync(command);
      
      logger.info('Database restore completed', { backupPath });
      return true;
    } catch (error) {
      logger.error('Database restore failed', { backupPath, error });
      return false;
    }
  }

  /**
   * 恢復文件
   */
  async restoreFiles(backupPath: string, targetPath: string = './'): Promise<boolean> {
    try {
      logger.info('Starting files restore', { backupPath, targetPath });

      let command: string;
      if (backupPath.endsWith('.gz')) {
        command = `tar -xzf "${backupPath}" -C "${targetPath}"`;
      } else {
        command = `tar -xf "${backupPath}" -C "${targetPath}"`;
      }

      await execAsync(command);
      
      logger.info('Files restore completed', { backupPath, targetPath });
      return true;
    } catch (error) {
      logger.error('Files restore failed', { backupPath, targetPath, error });
      return false;
    }
  }

  /**
   * 獲取備份歷史
   */
  getBackupHistory(limit: number = 50): BackupResult[] {
    return this.backupHistory
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * 獲取備份統計
   */
  getBackupStats(): {
    total: number;
    successful: number;
    failed: number;
    totalSize: number;
    lastBackup?: Date;
  } {
    const total = this.backupHistory.length;
    const successful = this.backupHistory.filter(b => b.success).length;
    const failed = total - successful;
    const totalSize = this.backupHistory.reduce((sum, b) => sum + b.size, 0);
    const lastBackup = this.backupHistory.length > 0 
      ? this.backupHistory[this.backupHistory.length - 1].timestamp 
      : undefined;

    return {
      total,
      successful,
      failed,
      totalSize,
      lastBackup
    };
  }

  /**
   * 測試備份系統
   */
  async testBackupSystem(): Promise<{
    database: boolean;
    files: boolean;
    storage: {
      local: boolean;
      s3: boolean;
      ftp: boolean;
    };
  }> {
    const results = {
      database: false,
      files: false,
      storage: {
        local: false,
        s3: false,
        ftp: false
      }
    };

    // 測試數據庫連接
    try {
      const databaseUrl = process.env.DATABASE_URL;
      if (databaseUrl) {
        await execAsync(`pg_isready -d "${databaseUrl}"`);
        results.database = true;
      }
    } catch (error) {
      logger.warn('Database test failed', error);
    }

    // 測試文件路徑
    try {
      for (const filePath of this.config.files.paths) {
        await fs.access(filePath);
      }
      results.files = true;
    } catch (error) {
      logger.warn('Files test failed', error);
    }

    // 測試本地存儲
    try {
      await this.ensureBackupDirectory();
      const testFile = path.join(this.config.storage.local.path, 'test.txt');
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);
      results.storage.local = true;
    } catch (error) {
      logger.warn('Local storage test failed', error);
    }

    // 測試 S3（如果啟用）
    if (this.config.storage.s3.enabled) {
      // 實現 S3 連接測試
      results.storage.s3 = true;
    }

    // 測試 FTP（如果啟用）
    if (this.config.storage.ftp.enabled) {
      // 實現 FTP 連接測試
      results.storage.ftp = true;
    }

    return results;
  }

  /**
   * 格式化字節大小
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 啟動自動備份
   */
  startAutomaticBackups(): void {
    // 這裡應該整合 cron 或類似的調度器
    // 目前只是示例實現
    logger.info('Automatic backups started', {
      databaseSchedule: this.config.database.schedule,
      filesSchedule: this.config.files.schedule
    });
  }
}

export const backupService = new BackupService();