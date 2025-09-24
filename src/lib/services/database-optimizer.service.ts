import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export class DatabaseOptimizerService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * 分析查詢性能並提供優化建議
   */
  async analyzeQueryPerformance(): Promise<{
    slowQueries: any[];
    indexSuggestions: string[];
    performanceMetrics: any;
  }> {
    try {
      // 獲取慢查詢統計
      const slowQueries = await this.prisma.$queryRaw`
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          rows
        FROM pg_stat_statements 
        WHERE mean_time > 100 
        ORDER BY mean_time DESC 
        LIMIT 10
      `;

      // 檢查缺失的索引
      const indexSuggestions = await this.suggestMissingIndexes();

      // 獲取數據庫性能指標
      const performanceMetrics = await this.getPerformanceMetrics();

      return {
        slowQueries: slowQueries as any[],
        indexSuggestions,
        performanceMetrics
      };
    } catch (error) {
      logger.error('Error analyzing query performance:', error);
      throw error;
    }
  }

  /**
   * 建議缺失的索引
   */
  private async suggestMissingIndexes(): Promise<string[]> {
    const suggestions: string[] = [];

    try {
      // 檢查經常查詢但沒有索引的列
      const missingIndexes = await this.prisma.$queryRaw`
        SELECT 
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation
        FROM pg_stats 
        WHERE schemaname = 'public'
        AND n_distinct > 100
        AND correlation < 0.1
      `;

      (missingIndexes as any[]).forEach((row) => {
        suggestions.push(
          `Consider adding index on ${row.tablename}.${row.attname} (n_distinct: ${row.n_distinct})`
        );
      });

      return suggestions;
    } catch (error) {
      logger.warn('Could not analyze missing indexes:', error);
      return [];
    }
  }

  /**
   * 獲取數據庫性能指標
   */
  private async getPerformanceMetrics(): Promise<any> {
    try {
      const metrics = await this.prisma.$queryRaw`
        SELECT 
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
          (SELECT setting FROM pg_settings WHERE name = 'max_connections') as max_connections,
          (SELECT sum(numbackends) FROM pg_stat_database) as total_connections,
          (SELECT sum(xact_commit) FROM pg_stat_database) as total_commits,
          (SELECT sum(xact_rollback) FROM pg_stat_database) as total_rollbacks,
          (SELECT sum(blks_read) FROM pg_stat_database) as blocks_read,
          (SELECT sum(blks_hit) FROM pg_stat_database) as blocks_hit
      `;

      return (metrics as any[])[0];
    } catch (error) {
      logger.warn('Could not get performance metrics:', error);
      return {};
    }
  }

  /**
   * 優化數據庫配置
   */
  async optimizeDatabase(): Promise<void> {
    try {
      // 更新表統計信息
      await this.prisma.$executeRaw`ANALYZE`;

      // 清理無用的數據
      await this.cleanupOldData();

      // 重建索引（如果需要）
      await this.reindexIfNeeded();

      logger.info('Database optimization completed');
    } catch (error) {
      logger.error('Error optimizing database:', error);
      throw error;
    }
  }

  /**
   * 清理舊數據
   */
  private async cleanupOldData(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
      // 清理舊的用戶行為記錄
      await this.prisma.$executeRaw`
        DELETE FROM user_behaviors 
        WHERE created_at < ${thirtyDaysAgo}
        AND action_type IN ('page_view', 'click')
      `;

      // 清理舊的日誌記錄
      await this.prisma.$executeRaw`
        DELETE FROM system_logs 
        WHERE created_at < ${thirtyDaysAgo}
        AND level = 'info'
      `;

      logger.info('Old data cleanup completed');
    } catch (error) {
      logger.warn('Could not cleanup old data:', error);
    }
  }

  /**
   * 重建索引（如果需要）
   */
  private async reindexIfNeeded(): Promise<void> {
    try {
      // 檢查索引膨脹
      const bloatedIndexes = await this.prisma.$queryRaw`
        SELECT 
          schemaname,
          tablename,
          indexname,
          pg_size_pretty(pg_relation_size(indexrelid)) as size
        FROM pg_stat_user_indexes 
        WHERE pg_relation_size(indexrelid) > 100000000
      `;

      if ((bloatedIndexes as any[]).length > 0) {
        logger.info('Found bloated indexes, consider reindexing');
        // 在維護窗口期間執行 REINDEX
      }
    } catch (error) {
      logger.warn('Could not check index bloat:', error);
    }
  }

  /**
   * 獲取連接池狀態
   */
  async getConnectionPoolStatus(): Promise<any> {
    try {
      const status = await this.prisma.$queryRaw`
        SELECT 
          state,
          count(*) as count
        FROM pg_stat_activity 
        WHERE datname = current_database()
        GROUP BY state
      `;

      return status;
    } catch (error) {
      logger.error('Error getting connection pool status:', error);
      return [];
    }
  }
}

export const databaseOptimizer = new DatabaseOptimizerService(
  new PrismaClient()
);