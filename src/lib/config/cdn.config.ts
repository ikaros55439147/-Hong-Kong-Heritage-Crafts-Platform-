export interface CDNConfig {
  enabled: boolean;
  provider: 'cloudflare' | 'aws' | 'azure' | 'local';
  baseUrl: string;
  zones: {
    images: string;
    videos: string;
    static: string;
    api: string;
  };
  caching: {
    images: number; // seconds
    videos: number;
    static: number;
    api: number;
  };
  optimization: {
    imageFormats: string[];
    videoFormats: string[];
    compression: boolean;
    minification: boolean;
  };
}

export const cdnConfig: CDNConfig = {
  enabled: process.env.NODE_ENV === 'production',
  provider: (process.env.CDN_PROVIDER as any) || 'cloudflare',
  baseUrl: process.env.CDN_BASE_URL || 'https://cdn.hk-heritage-crafts.com',
  zones: {
    images: process.env.CDN_IMAGES_ZONE || '/images',
    videos: process.env.CDN_VIDEOS_ZONE || '/videos',
    static: process.env.CDN_STATIC_ZONE || '/static',
    api: process.env.CDN_API_ZONE || '/api'
  },
  caching: {
    images: parseInt(process.env.CDN_IMAGES_CACHE || '86400'), // 24 hours
    videos: parseInt(process.env.CDN_VIDEOS_CACHE || '604800'), // 7 days
    static: parseInt(process.env.CDN_STATIC_CACHE || '2592000'), // 30 days
    api: parseInt(process.env.CDN_API_CACHE || '300') // 5 minutes
  },
  optimization: {
    imageFormats: ['webp', 'avif', 'jpg', 'png'],
    videoFormats: ['mp4', 'webm'],
    compression: true,
    minification: true
  }
};

export class CDNService {
  private config: CDNConfig;

  constructor(config: CDNConfig = cdnConfig) {
    this.config = config;
  }

  /**
   * 獲取 CDN URL
   */
  getCDNUrl(path: string, type: keyof CDNConfig['zones'] = 'static'): string {
    if (!this.config.enabled) {
      return path;
    }

    const zone = this.config.zones[type];
    const baseUrl = this.config.baseUrl.replace(/\/$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    
    return `${baseUrl}${zone}${cleanPath}`;
  }

  /**
   * 獲取優化的圖片 URL
   */
  getOptimizedImageUrl(
    path: string, 
    options: {
      width?: number;
      height?: number;
      quality?: number;
      format?: string;
    } = {}
  ): string {
    const baseUrl = this.getCDNUrl(path, 'images');
    
    if (!this.config.enabled || !this.config.optimization.compression) {
      return baseUrl;
    }

    const params = new URLSearchParams();
    
    if (options.width) params.set('w', options.width.toString());
    if (options.height) params.set('h', options.height.toString());
    if (options.quality) params.set('q', options.quality.toString());
    if (options.format) params.set('f', options.format);

    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }

  /**
   * 獲取響應式圖片 srcset
   */
  getResponsiveImageSrcSet(path: string, sizes: number[] = [320, 640, 1024, 1920]): string {
    return sizes
      .map(size => `${this.getOptimizedImageUrl(path, { width: size })} ${size}w`)
      .join(', ');
  }

  /**
   * 預載入關鍵資源
   */
  preloadCriticalResources(resources: Array<{
    url: string;
    type: 'image' | 'video' | 'script' | 'style';
    priority?: 'high' | 'low';
  }>): string[] {
    return resources.map(resource => {
      const url = this.getCDNUrl(resource.url, 
        resource.type === 'image' ? 'images' : 
        resource.type === 'video' ? 'videos' : 'static'
      );
      
      return `<link rel="preload" href="${url}" as="${resource.type}" ${
        resource.priority ? `fetchpriority="${resource.priority}"` : ''
      }>`;
    });
  }

  /**
   * 獲取緩存標頭
   */
  getCacheHeaders(type: keyof CDNConfig['zones']): Record<string, string> {
    const maxAge = this.config.caching[type];
    
    return {
      'Cache-Control': `public, max-age=${maxAge}, s-maxage=${maxAge}`,
      'Expires': new Date(Date.now() + maxAge * 1000).toUTCString(),
      'Vary': 'Accept-Encoding',
      'X-CDN-Cache': 'MISS'
    };
  }

  /**
   * 清除 CDN 緩存
   */
  async purgeCache(paths: string[] = ['/*']): Promise<boolean> {
    try {
      // 根據不同的 CDN 提供商實現緩存清除
      switch (this.config.provider) {
        case 'cloudflare':
          return await this.purgeCloudflareCache(paths);
        case 'aws':
          return await this.purgeAWSCache(paths);
        default:
          console.warn(`Cache purging not implemented for ${this.config.provider}`);
          return true;
      }
    } catch (error) {
      console.error('Error purging CDN cache:', error);
      return false;
    }
  }

  private async purgeCloudflareCache(paths: string[]): Promise<boolean> {
    const zoneId = process.env.CLOUDFLARE_ZONE_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (!zoneId || !apiToken) {
      console.warn('Cloudflare credentials not configured');
      return false;
    }

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          files: paths.map(path => this.getCDNUrl(path))
        })
      }
    );

    return response.ok;
  }

  private async purgeAWSCache(paths: string[]): Promise<boolean> {
    // AWS CloudFront 緩存清除實現
    console.log('AWS CloudFront cache purging not implemented');
    return true;
  }
}

export const cdnService = new CDNService();