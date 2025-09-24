# CI/CD Setup Documentation

## Overview

This document describes the Continuous Integration and Continuous Deployment (CI/CD) setup for the HK Heritage Crafts Platform. The CI/CD pipeline includes automated testing, code quality checks, security scanning, blue-green deployment, monitoring, and rollback capabilities.

## Architecture

```mermaid
graph TB
    A[Developer Push] --> B[GitHub Actions CI]
    B --> C[Code Quality Checks]
    B --> D[Security Scanning]
    B --> E[Automated Testing]
    C --> F[Build & Package]
    D --> F
    E --> F
    F --> G[Deploy to Staging]
    G --> H[Staging Tests]
    H --> I[Deploy to Production]
    I --> J[Health Checks]
    J --> K[Monitoring & Alerts]
    K --> L[Success Notification]
    J --> M[Rollback on Failure]
```

## CI/CD Components

### 1. Continuous Integration (.github/workflows/ci.yml)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

**Jobs:**
- **Test Suite**: Unit, integration, and E2E tests
- **Security Scan**: Vulnerability scanning and SAST analysis
- **Build**: Application build and Docker image creation

**Services:**
- PostgreSQL 15 (test database)
- Redis 7 (caching)

**Steps:**
1. Code checkout
2. Node.js setup and dependency installation
3. Database setup and migrations
4. Linting and type checking
5. Test execution with coverage
6. Security auditing
7. Docker image build and test

### 2. Code Quality Checks (.github/workflows/quality-checks.yml)

**Quality Gates:**
- ESLint code analysis
- Prettier formatting check
- TypeScript compilation
- Test coverage reporting
- SonarCloud analysis
- Dependency security check
- Performance analysis
- Accessibility testing

### 3. Continuous Deployment (.github/workflows/cd.yml)

**Deployment Strategy: Blue-Green Deployment**

**Staging Deployment:**
- Automatic deployment on successful CI
- Smoke tests execution
- Environment-specific configuration

**Production Deployment:**
- Manual approval required
- Blue-green deployment strategy
- Automatic rollback on failure
- Comprehensive health checks

### 4. Deployment Notifications (.github/workflows/deployment-notification.yml)

**Notification Channels:**
- Slack notifications
- Email alerts (on failure)
- GitHub issue creation (on failure)
- External monitoring system updates

## Monitoring and Logging

### 1. Application Monitoring

**Prometheus Metrics:**
- Request rate and response time
- Error rates and status codes
- Database connection health
- System resource usage
- Business metrics (users, courses, products)

**Grafana Dashboards:**
- Application performance overview
- Infrastructure monitoring
- Business metrics visualization
- Alert status dashboard

### 2. Log Aggregation

**Loki + Promtail:**
- Centralized log collection
- Structured logging format
- Log parsing and labeling
- Real-time log streaming

**Log Sources:**
- Application logs (JSON format)
- Nginx access/error logs
- PostgreSQL logs
- Docker container logs

### 3. Alerting

**Alertmanager Rules:**
- High error rate (>10% 5xx responses)
- High response time (>1s 95th percentile)
- Database connection failures
- High memory usage (>90%)
- High CPU usage (>80%)
- Low disk space (<10%)

## Scripts and Automation

### 1. Production Setup (scripts/production-setup.sh)
- Server configuration
- SSL certificate setup
- Environment variables
- Docker configuration

### 2. Monitoring Setup (scripts/monitoring-setup.sh)
- Prometheus configuration
- Grafana setup with dashboards
- Alertmanager configuration
- Log aggregation setup

### 3. Backup System (scripts/backup.sh)
- Database backups
- File system backups
- Configuration backups
- Automated cleanup

### 4. Rollback System (scripts/rollback.sh)
- Application rollback
- Database rollback
- Emergency rollback
- Health verification

### 5. Health Checks (scripts/health-check.sh)
- Application health monitoring
- Database connectivity
- API endpoint testing
- System resource monitoring

## Environment Configuration

### Required Secrets

**GitHub Secrets:**
```
# Container Registry
GITHUB_TOKEN

# Deployment Servers
STAGING_HOST
STAGING_USER
STAGING_SSH_KEY
PRODUCTION_HOST
PRODUCTION_USER
PRODUCTION_SSH_KEY

# Notifications
SLACK_WEBHOOK
NOTIFICATION_EMAIL
SMTP_SERVER
SMTP_PORT
SMTP_USERNAME
SMTP_PASSWORD

# Monitoring
MONITORING_WEBHOOK
SONAR_TOKEN
LHCI_GITHUB_APP_TOKEN
```

### Environment Variables

**Production (.env.production):**
```bash
NODE_ENV=production
DATABASE_URL=postgresql://user:password@localhost:5432/hk_heritage_crafts
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=ap-southeast-1
S3_BUCKET_NAME=your_s3_bucket
```

## Deployment Process

### 1. Development Workflow

```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Make changes and commit
git add .
git commit -m "feat: add new feature"

# 3. Push and create PR
git push origin feature/new-feature

# 4. CI runs automatically on PR
# 5. Code review and approval
# 6. Merge to main triggers CD
```

### 2. Staging Deployment

1. **Automatic Trigger**: Merge to main branch
2. **CI Pipeline**: All tests and quality checks pass
3. **Build**: Docker image created and pushed
4. **Deploy**: Blue-green deployment to staging
5. **Smoke Tests**: Basic functionality verification
6. **Notification**: Success/failure notification

### 3. Production Deployment

1. **Manual Approval**: Required for production deployment
2. **Backup**: Automatic backup before deployment
3. **Blue-Green Deploy**: Zero-downtime deployment
4. **Health Checks**: Comprehensive system verification
5. **Traffic Switch**: Gradual traffic migration
6. **Monitoring**: Real-time monitoring activation
7. **Rollback**: Automatic rollback on failure

## Monitoring and Alerting

### 1. Access Monitoring Systems

**Grafana Dashboard:**
```bash
# Local development
http://localhost:3001
# Username: admin
# Password: admin123
```

**Prometheus:**
```bash
# Local development
http://localhost:9090
```

**Alertmanager:**
```bash
# Local development
http://localhost:9093
```

### 2. Log Access

**Application Logs:**
```bash
# View real-time logs
npm run logs:app

# View specific service logs
npm run logs:nginx
npm run logs:postgres
```

**Centralized Logs (Loki):**
```bash
# Access through Grafana Explore
# URL: http://localhost:3001/explore
```

## Troubleshooting

### 1. Deployment Failures

**Check CI/CD Status:**
```bash
# View GitHub Actions
https://github.com/your-repo/actions

# Check deployment logs
kubectl logs -f deployment/app
```

**Manual Rollback:**
```bash
# Emergency rollback
./scripts/rollback.sh emergency

# Rollback to specific version
./scripts/rollback.sh app rollback_tag
```

### 2. Health Check Failures

**Run Manual Health Check:**
```bash
# Comprehensive health check
./scripts/health-check.sh

# Check specific component
./scripts/health-check.sh database
./scripts/health-check.sh redis
```

**Check Application Status:**
```bash
# Health endpoint
curl http://localhost/api/health

# Metrics endpoint
curl http://localhost/api/metrics
```

### 3. Performance Issues

**Monitor System Resources:**
```bash
# Check container resources
docker stats

# Check system resources
htop
df -h
free -h
```

**Check Application Metrics:**
```bash
# View Grafana dashboards
# Check Prometheus metrics
# Review application logs
```

## Security Considerations

### 1. Secret Management
- All secrets stored in GitHub Secrets
- Environment-specific configuration
- Regular secret rotation

### 2. Access Control
- SSH key-based authentication
- Principle of least privilege
- Regular access review

### 3. Security Scanning
- Dependency vulnerability scanning
- SAST code analysis
- Container image scanning
- Regular security updates

## Maintenance

### 1. Regular Tasks

**Weekly:**
- Review monitoring alerts
- Check backup integrity
- Update dependencies
- Security patch review

**Monthly:**
- Rotate secrets and keys
- Review access permissions
- Performance optimization
- Capacity planning

### 2. Backup and Recovery

**Backup Schedule:**
- Database: Daily automated backups
- Files: Daily automated backups
- Configuration: On every deployment

**Recovery Testing:**
- Monthly recovery drills
- Backup integrity verification
- Rollback procedure testing

## Performance Optimization

### 1. CI/CD Pipeline Optimization
- Parallel job execution
- Docker layer caching
- Dependency caching
- Test parallelization

### 2. Deployment Optimization
- Blue-green deployment
- Health check optimization
- Gradual traffic migration
- Resource pre-warming

## Compliance and Auditing

### 1. Audit Trail
- All deployments logged
- Change tracking
- Access logging
- Security event monitoring

### 2. Compliance Requirements
- Data protection compliance
- Security standards adherence
- Regular compliance reviews
- Documentation maintenance

## Support and Escalation

### 1. On-Call Procedures
- Alert escalation matrix
- Response time requirements
- Communication protocols
- Post-incident reviews

### 2. Contact Information
- Development team contacts
- Operations team contacts
- Emergency escalation procedures
- Vendor support contacts