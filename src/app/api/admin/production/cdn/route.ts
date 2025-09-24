import { NextRequest, NextResponse } from 'next/server';
import { cdnService } from '@/lib/config/cdn.config';
import { staticOptimizer } from '@/lib/services/static-optimization.service';
import { logger } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'config':
        return NextResponse.json({
          enabled: process.env.NODE_ENV === 'production',
          provider: process.env.CDN_PROVIDER || 'cloudflare',
          baseUrl: process.env.CDN_BASE_URL || 'https://cdn.hk-heritage-crafts.com'
        });

      case 'optimization_report':
        const publicDir = searchParams.get('dir') || 'public';
        const report = await staticOptimizer.getOptimizationReport(publicDir);
        return NextResponse.json(report);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    logger.error('CDN API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, paths, publicDir } = await request.json();

    switch (action) {
      case 'purge_cache':
        const purgePaths = paths || ['/*'];
        const success = await cdnService.purgeCache(purgePaths);
        return NextResponse.json({ 
          success, 
          message: success ? 'Cache purged successfully' : 'Cache purge failed' 
        });

      case 'optimize_assets':
        const targetDir = publicDir || 'public';
        await staticOptimizer.optimizeStaticAssets(targetDir);
        return NextResponse.json({ 
          success: true, 
          message: 'Static assets optimization completed' 
        });

      case 'get_cdn_url':
        const { path, type, options } = await request.json();
        if (!path) {
          return NextResponse.json({ error: 'Path required' }, { status: 400 });
        }

        let url;
        if (type === 'image' && options) {
          url = cdnService.getOptimizedImageUrl(path, options);
        } else {
          url = cdnService.getCDNUrl(path, type);
        }

        return NextResponse.json({ url });

      case 'get_responsive_srcset':
        const { imagePath, sizes } = await request.json();
        if (!imagePath) {
          return NextResponse.json({ error: 'Image path required' }, { status: 400 });
        }

        const srcset = cdnService.getResponsiveImageSrcSet(imagePath, sizes);
        return NextResponse.json({ srcset });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    logger.error('CDN API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}