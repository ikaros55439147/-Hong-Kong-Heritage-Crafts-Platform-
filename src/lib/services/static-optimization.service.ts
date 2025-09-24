import { promises as fs } from 'fs';
import path from 'path';
import { gzipSync, brotliCompressSync } from 'zlib';
import { logger } from '../utils/logger';

export interface OptimizationOptions {
  minifyJS: boolean;
  minifyCSS: boolean;
  compressImages: boolean;
  generateWebP: boolean;
  generateAVIF: boolean;
  enableGzip: boolean;
  enableBrotli: boolean;
}

export class StaticOptimizationService {
  private options: OptimizationOptions;

  constructor(options: Partial<OptimizationOptions> = {}) {
    this.options = {
      minifyJS: true,
      minifyCSS: true,
      compressImages: true,
      generateWebP: true,
      generateAVIF: false, // 較新的格式，支援度較低
      enableGzip: true,
      enableBrotli: true,
      ...options
    };
  }

  /**
   * 優化靜態資源
   */
  async optimizeStaticAssets(publicDir: string = 'public'): Promise<void> {
    try {
      logger.info('Starting static asset optimization...');

      // 壓縮 JavaScript 和 CSS 文件
      if (this.options.minifyJS || this.options.minifyCSS) {
        await this.minifyAssets(publicDir);
      }

      // 壓縮圖片
      if (this.options.compressImages) {
        await this.compressImages(publicDir);
      }

      // 生成壓縮版本
      if (this.options.enableGzip || this.options.enableBrotli) {
        await this.generateCompressedVersions(publicDir);
      }

      logger.info('Static asset optimization completed');
    } catch (error) {
      logger.error('Error optimizing static assets:', error);
      throw error;
    }
  }

  /**
   * 壓縮 JavaScript 和 CSS
   */
  private async minifyAssets(publicDir: string): Promise<void> {
    const assetsDir = path.join(publicDir, '_next', 'static');
    
    try {
      await this.processDirectory(assetsDir, async (filePath) => {
        const ext = path.extname(filePath);
        
        if (ext === '.js' && this.options.minifyJS) {
          await this.minifyJavaScript(filePath);
        } else if (ext === '.css' && this.options.minifyCSS) {
          await this.minifyCSS(filePath);
        }
      });
    } catch (error) {
      logger.warn('Could not minify assets:', error);
    }
  }

  /**
   * 壓縮圖片
   */
  private async compressImages(publicDir: string): Promise<void> {
    const imagesDir = path.join(publicDir, 'images');
    
    try {
      await this.processDirectory(imagesDir, async (filePath) => {
        const ext = path.extname(filePath).toLowerCase();
        
        if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
          await this.optimizeImage(filePath);
        }
      });
    } catch (error) {
      logger.warn('Could not compress images:', error);
    }
  }

  /**
   * 生成壓縮版本（Gzip 和 Brotli）
   */
  private async generateCompressedVersions(publicDir: string): Promise<void> {
    try {
      await this.processDirectory(publicDir, async (filePath) => {
        const ext = path.extname(filePath);
        const stats = await fs.stat(filePath);
        
        // 只壓縮文本文件且大於 1KB 的文件
        if (this.isTextFile(ext) && stats.size > 1024) {
          const content = await fs.readFile(filePath);
          
          if (this.options.enableGzip) {
            const gzipped = gzipSync(content, { level: 9 });
            await fs.writeFile(`${filePath}.gz`, gzipped);
          }
          
          if (this.options.enableBrotli) {
            const brotlied = brotliCompressSync(content, {
              params: {
                [require('zlib').constants.BROTLI_PARAM_QUALITY]: 11
              }
            });
            await fs.writeFile(`${filePath}.br`, brotlied);
          }
        }
      });
    } catch (error) {
      logger.warn('Could not generate compressed versions:', error);
    }
  }

  /**
   * 處理目錄中的所有文件
   */
  private async processDirectory(
    dir: string, 
    processor: (filePath: string) => Promise<void>
  ): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await this.processDirectory(fullPath, processor);
        } else if (entry.isFile()) {
          await processor(fullPath);
        }
      }
    } catch (error) {
      // 目錄不存在或無法訪問
      logger.debug(`Could not process directory ${dir}:`, error);
    }
  }

  /**
   * 壓縮 JavaScript
   */
  private async minifyJavaScript(filePath: string): Promise<void> {
    try {
      // 這裡可以整合 terser 或其他 JS 壓縮工具
      // 目前只是示例實現
      const content = await fs.readFile(filePath, 'utf8');
      
      // 簡單的壓縮：移除註釋和多餘空白
      const minified = content
        .replace(/\/\*[\s\S]*?\*\//g, '') // 移除塊註釋
        .replace(/\/\/.*$/gm, '') // 移除行註釋
        .replace(/\s+/g, ' ') // 壓縮空白
        .trim();
      
      if (minified.length < content.length) {
        await fs.writeFile(filePath, minified);
        logger.debug(`Minified ${filePath}`);
      }
    } catch (error) {
      logger.warn(`Could not minify ${filePath}:`, error);
    }
  }

  /**
   * 壓縮 CSS
   */
  private async minifyCSS(filePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      
      // 簡單的 CSS 壓縮
      const minified = content
        .replace(/\/\*[\s\S]*?\*\//g, '') // 移除註釋
        .replace(/\s+/g, ' ') // 壓縮空白
        .replace(/;\s*}/g, '}') // 移除最後一個分號
        .replace(/\s*{\s*/g, '{') // 壓縮大括號周圍空白
        .replace(/;\s*/g, ';') // 壓縮分號後空白
        .trim();
      
      if (minified.length < content.length) {
        await fs.writeFile(filePath, minified);
        logger.debug(`Minified ${filePath}`);
      }
    } catch (error) {
      logger.warn(`Could not minify ${filePath}:`, error);
    }
  }

  /**
   * 優化圖片
   */
  private async optimizeImage(filePath: string): Promise<void> {
    try {
      // 這裡可以整合 sharp 或其他圖片處理庫
      // 目前只是示例實現
      logger.debug(`Would optimize image: ${filePath}`);
      
      // 生成 WebP 版本
      if (this.options.generateWebP) {
        const webpPath = filePath.replace(/\.(jpg|jpeg|png)$/i, '.webp');
        // await sharp(filePath).webp({ quality: 80 }).toFile(webpPath);
        logger.debug(`Would generate WebP: ${webpPath}`);
      }
      
      // 生成 AVIF 版本
      if (this.options.generateAVIF) {
        const avifPath = filePath.replace(/\.(jpg|jpeg|png)$/i, '.avif');
        // await sharp(filePath).avif({ quality: 50 }).toFile(avifPath);
        logger.debug(`Would generate AVIF: ${avifPath}`);
      }
    } catch (error) {
      logger.warn(`Could not optimize image ${filePath}:`, error);
    }
  }

  /**
   * 檢查是否為文本文件
   */
  private isTextFile(ext: string): boolean {
    const textExtensions = [
      '.html', '.htm', '.css', '.js', '.json', '.xml', '.svg',
      '.txt', '.md', '.csv', '.tsv', '.rss', '.atom'
    ];
    
    return textExtensions.includes(ext.toLowerCase());
  }

  /**
   * 獲取資源優化報告
   */
  async getOptimizationReport(publicDir: string = 'public'): Promise<{
    totalFiles: number;
    totalSize: number;
    compressedSize: number;
    savings: number;
    details: Array<{
      file: string;
      originalSize: number;
      compressedSize: number;
      savings: number;
    }>;
  }> {
    const report = {
      totalFiles: 0,
      totalSize: 0,
      compressedSize: 0,
      savings: 0,
      details: [] as any[]
    };

    try {
      await this.processDirectory(publicDir, async (filePath) => {
        const stats = await fs.stat(filePath);
        const gzipPath = `${filePath}.gz`;
        
        report.totalFiles++;
        report.totalSize += stats.size;
        
        try {
          const gzipStats = await fs.stat(gzipPath);
          const savings = stats.size - gzipStats.size;
          
          report.compressedSize += gzipStats.size;
          report.details.push({
            file: path.relative(publicDir, filePath),
            originalSize: stats.size,
            compressedSize: gzipStats.size,
            savings
          });
        } catch {
          // Gzip 文件不存在
          report.compressedSize += stats.size;
        }
      });

      report.savings = report.totalSize - report.compressedSize;
      
      return report;
    } catch (error) {
      logger.error('Error generating optimization report:', error);
      throw error;
    }
  }
}

export const staticOptimizer = new StaticOptimizationService();