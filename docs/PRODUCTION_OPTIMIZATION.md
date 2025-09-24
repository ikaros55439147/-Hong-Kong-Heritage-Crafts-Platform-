# Production Environment Optimization

This document describes the production optimization features implemented for the Hong Kong Heritage Crafts Platform.

## Overview

The production optimization system includes four main components:
1. Database Query Performance and Indexing
2. CDN Configuration and Static Asset Optimization
3. Monitoring and Logging System
4. Automated Backup and Disaster Recovery

## Database Optimization

### Features

- **Query Performance Analysis**: Identifies slow queries and provides optimization suggestions
- **Index Management**: Automatically creates and manages database indexes for optimal performance
- **Connection Pool Monitoring**: Tracks database connection usage and performance
- **Data Cleanup**: Removes old data to maintain database performance

### Database Indexes

The system automatically creates indexes for:
- User authentication and role-based queries
- Craftsman profile searches and filtering
- Course and product catalog browsing
- Order and booking management
- Content search and categorization
- Multi-language content queries

### Usage

```typescript
import { databaseOptimizer } from '@/lib/services/database-optimizer.service';

// Analyze query performance
const analysis = await databaseOptimizer.analyzeQueryPerformance();

// Optimize database
await databaseOptimizer.optimizeDatabase();

// Check connection pool status
const connections = await databaseOptimizer.getConnectionPoolStatus();
```

### API Endpoints

- `GET /api/admin/production/database?action=analyze` - Get query analysis
- `GET /api/admin/production/database?action=connections` - Get connection status
- `POST /api/admin/production/database` - Trigger optimization

## CDN and Static Asset Optimization

### Features

- **Multi-Provider CDN Support**: Supports Cloudflare, AWS CloudFront, and Azure CDN
- **Image Optimization**: Automatic WebP/AVIF conversion and responsive image generation
- **Asset Compression**: Gzip and Brotli compression for text assets
- **Cache Management**: Intelligent caching strategies and cache purging
- **Static Asset Minification**: JavaScript and CSS minification

### CDN Configuration

```typescript
// Environment variables
CDN_PROVIDER=cloudflare
CDN_BASE_URL=https://cdn.hk-heritage-crafts.com
CDN_IMAGES_ZONE=/images
CDN_VIDEOS_ZONE=/videos
CDN_STATIC_ZONE=/static
```

### Usage

```typescript
import { cdnService } from '@/lib/config/cdn.config';

// Get CDN URL
const imageUrl = cdnService.getCDNUrl('/photo.jpg', 'images');

// Get optimized image URL
const optimizedUrl = cdnService.getOptimizedImageUrl('/photo.jpg', {
  width: 800,
  height: 600,
  quality: 80,
  format: 'webp'
});

// Generate responsive srcset
const srcset = cdnService.getResponsiveImageSrcSet('/photo.jpg', [320, 640, 1024]);

// Purge cache
await cdnService.purgeCache(['/images/*']);
```

### API Endpoints

- `GET /api/admin/production/cdn?action=config` - Get CDN configuration
- `GET /api/admin/production/cdn?action=optimization_report` - Get optimization report
- `POST /api/admin/production/cdn` - Purge cache or optimize assets

## Monitoring and Logging System

### Features

- **System Metrics Collection**: CPU, memory, disk, and network monitoring
- **Application Performance Monitoring**: Response times, error rates, active users
- **Real-time Alerting**: Configurable thresholds and notification channels
- **Health Status Dashboard**: Overall system health scoring
- **Structured Logging**: JSON-formatted logs with rotation and retention

### Monitoring Metrics

- **CPU Usage**: Current usage percentage and load averages
- **Memory Usage**: Used/total memory and percentage
- **Disk Usage**: Storage utilization monitoring
- **Network Traffic**: Bytes in/out tracking
- **Database Performance**: Connection count and query times
- **Application Metrics**: User activity and error rates

### Alert Thresholds

```typescript
const thresholds = {
  cpu: 80,           // % CPU usage
  memory: 85,        // % Memory usage
  disk: 90,          // % Disk usage
  responseTime: 2000, // ms response time
  errorRate: 5,      // % error rate
  dbConnections: 80  // % of max connections
};
```

### Usage

```typescript
import { monitoringService } from '@/lib/services/monitoring.service';

// Collect current metrics
const metrics = await monitoringService.collectMetrics();

// Get health status
const health = monitoringService.getHealthStatus();

// Get active alerts
const alerts = monitoringService.getActiveAlerts();

// Start monitoring
monitoringService.startMonitoring(60000); // 1 minute interval
```

### Logging Configuration

```typescript
// Environment variables
LOG_LEVEL=info
LOG_DIR=logs
LOG_MAX_FILE_SIZE=10485760  // 10MB
LOG_MAX_FILES=5
LOG_FORMAT=json
```

### API Endpoints

- `GET /api/admin/production/monitoring?action=metrics` - Get current metrics
- `GET /api/admin/production/monitoring?action=history` - Get metrics history
- `GET /api/admin/production/monitoring?action=alerts` - Get active alerts
- `GET /api/admin/production/monitoring?action=health` - Get health status
- `POST /api/admin/production/monitoring` - Collect metrics or resolve alerts

## Backup and Disaster Recovery

### Features

- **Automated Backups**: Scheduled database and file backups
- **Multiple Storage Options**: Local, S3, and FTP storage support
- **Compression and Encryption**: Optional backup compression and encryption
- **Disaster Recovery Plans**: Predefined recovery procedures
- **Automatic Recovery**: Intelligent disaster detection and response
- **Backup Verification**: Integrity checking and restoration testing

### Backup Configuration

```typescript
const backupConfig = {
  database: {
    enabled: true,
    schedule: '0 2 * * *',    // Daily at 2 AM
    retention: 30,            // 30 days
    compression: true,
    encryption: false
  },
  files: {
    enabled: true,
    paths: ['uploads', 'public', 'logs'],
    schedule: '0 3 * * *',    // Daily at 3 AM
    retention: 7,             // 7 days
    compression: true
  },
  storage: {
    local: {
      enabled: true,
      path: './backups'
    },
    s3: {
      enabled: false,
      bucket: 'backup-bucket',
      region: 'us-east-1'
    }
  }
};
```

### Disaster Recovery Plans

The system includes predefined recovery plans for:

1. **Database Failure Recovery**
   - Restart database service
   - Restore from latest backup
   - Notify operations team

2. **Application Failure Recovery**
   - Restart application service
   - Scale up instances
   - Monitor recovery

3. **Security Breach Response**
   - Isolate affected systems
   - Backup security logs
   - Notify security team

### Usage

```typescript
import { backupService } from '@/lib/services/backup.service';
import { disasterRecoveryService } from '@/lib/services/disaster-recovery.service';

// Create database backup
const dbBackup = await backupService.backupDatabase();

// Create files backup
const filesBackup = await backupService.backupFiles();

// Restore database
const success = await backupService.restoreDatabase('/path/to/backup.sql');

// Trigger recovery plan
const eventId = await disasterRecoveryService.triggerRecoveryPlan('db-failure', 'Database connection lost');

// Test recovery plan
const testResult = await disasterRecoveryService.testRecoveryPlan('app-failure');
```

### API Endpoints

- `GET /api/admin/production/backup?action=history` - Get backup history
- `GET /api/admin/production/backup?action=stats` - Get backup statistics
- `GET /api/admin/production/backup?action=test` - Test backup system
- `POST /api/admin/production/backup` - Create backup or restore
- `GET /api/admin/production/disaster-recovery?action=events` - Get disaster events
- `GET /api/admin/production/disaster-recovery?action=plans` - Get recovery plans
- `POST /api/admin/production/disaster-recovery` - Trigger or test recovery plan

## Production Dashboard

The production dashboard provides a unified interface for monitoring and managing all optimization features.

### Features

- **Real-time System Health**: Live health status and metrics
- **Performance Monitoring**: CPU, memory, and application metrics
- **Database Management**: Query optimization and performance analysis
- **Backup Operations**: Manual backup triggers and history viewing
- **CDN Management**: Cache purging and asset optimization
- **Alert Management**: Active alerts and resolution tracking

### Access

The production dashboard is available at `/admin/production` and requires administrator privileges.

## Environment Variables

### Database Optimization
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/database
```

### CDN Configuration
```bash
CDN_PROVIDER=cloudflare
CDN_BASE_URL=https://cdn.example.com
CDN_IMAGES_ZONE=/images
CDN_VIDEOS_ZONE=/videos
CDN_STATIC_ZONE=/static
CLOUDFLARE_ZONE_ID=your_zone_id
CLOUDFLARE_API_TOKEN=your_api_token
```

### Monitoring
```bash
LOG_LEVEL=info
LOG_DIR=logs
LOG_MAX_FILE_SIZE=10485760
LOG_MAX_FILES=5
LOG_FORMAT=json
```

### Backup
```bash
BACKUP_LOCAL_PATH=./backups
BACKUP_S3_BUCKET=your-backup-bucket
BACKUP_S3_REGION=us-east-1
BACKUP_S3_ACCESS_KEY_ID=your_access_key
BACKUP_S3_SECRET_ACCESS_KEY=your_secret_key
```

## Performance Considerations

### Database
- Indexes are created automatically but may need tuning for specific workloads
- Regular ANALYZE operations keep query planner statistics up to date
- Connection pooling prevents database overload

### CDN
- Image optimization reduces bandwidth usage by 60-80%
- Gzip compression reduces text asset sizes by 70-90%
- Proper cache headers improve browser caching

### Monitoring
- Metrics collection has minimal performance impact (<1% CPU)
- Log rotation prevents disk space issues
- Alert thresholds prevent false positives

### Backup
- Backups are scheduled during low-traffic periods
- Compression reduces storage requirements by 80-90%
- Incremental backups minimize backup time

## Security Considerations

- All API endpoints require administrator authentication
- Backup files can be encrypted at rest
- Sensitive configuration is stored in environment variables
- Disaster recovery plans include security breach response
- Logs exclude sensitive information like passwords

## Troubleshooting

### Common Issues

1. **High CPU Usage**
   - Check for slow database queries
   - Review application error logs
   - Consider scaling up resources

2. **Memory Issues**
   - Monitor for memory leaks
   - Check cache usage
   - Review application memory usage

3. **Backup Failures**
   - Verify database connectivity
   - Check disk space availability
   - Review backup configuration

4. **CDN Issues**
   - Verify CDN provider credentials
   - Check cache purge permissions
   - Review CDN configuration

### Monitoring Commands

```bash
# Check system resources
htop
df -h
free -h

# Check application logs
tail -f logs/app.log

# Check database performance
psql -c "SELECT * FROM pg_stat_activity;"

# Test backup system
curl -X GET "http://localhost:3000/api/admin/production/backup?action=test"
```

## Maintenance

### Daily Tasks
- Review system health dashboard
- Check backup completion status
- Monitor alert notifications
- Review error logs

### Weekly Tasks
- Analyze database performance reports
- Review backup storage usage
- Test disaster recovery procedures
- Update optimization configurations

### Monthly Tasks
- Review and update alert thresholds
- Analyze CDN usage and costs
- Test full system recovery
- Update documentation

## Future Enhancements

- Machine learning-based performance prediction
- Automated scaling based on metrics
- Advanced anomaly detection
- Integration with external monitoring tools
- Automated performance tuning recommendations