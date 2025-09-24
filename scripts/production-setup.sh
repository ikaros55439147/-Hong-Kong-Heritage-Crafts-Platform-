#!/bin/bash

# Production Environment Setup Script
# This script sets up the production environment for the HK Heritage Crafts Platform

set -e

echo "🚀 Setting up production environment for HK Heritage Crafts Platform..."

# Check if required tools are installed
check_dependencies() {
    echo "📋 Checking dependencies..."
    
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo "❌ Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    echo "✅ All dependencies are installed."
}

# Setup environment variables
setup_env() {
    echo "🔧 Setting up environment variables..."
    
    if [ ! -f .env.production.local ]; then
        echo "📝 Creating .env.production.local from template..."
        cp .env.production .env.production.local
        echo "⚠️  Please edit .env.production.local with your actual production values!"
        echo "   Required variables to update:"
        echo "   - DATABASE_URL"
        echo "   - JWT_SECRET"
        echo "   - AWS credentials"
        echo "   - Stripe keys"
        echo "   - SMTP configuration"
        echo "   - Domain URLs"
    else
        echo "✅ .env.production.local already exists."
    fi
}

# Setup SSL certificates
setup_ssl() {
    echo "🔒 Setting up SSL certificates..."
    
    read -p "Enter your domain name: " DOMAIN
    read -p "Enter your email for Let's Encrypt: " EMAIL
    
    if [ ! -z "$DOMAIN" ] && [ ! -z "$EMAIL" ]; then
        chmod +x scripts/ssl-setup.sh
        ./scripts/ssl-setup.sh "$DOMAIN" "$EMAIL"
    else
        echo "⚠️  Skipping SSL setup. You can run it later with: ./scripts/ssl-setup.sh <domain> <email>"
    fi
}

# Initialize database
init_database() {
    echo "🗄️  Initializing database..."
    
    # Start only the database service first
    docker-compose -f docker-compose.prod.yml up -d postgres redis
    
    # Wait for database to be ready
    echo "⏳ Waiting for database to be ready..."
    sleep 10
    
    # Run database migrations
    echo "🔄 Running database migrations..."
    docker-compose -f docker-compose.prod.yml run --rm app npx prisma migrate deploy
    
    # Seed the database
    echo "🌱 Seeding database..."
    docker-compose -f docker-compose.prod.yml run --rm app npx prisma db seed
    
    echo "✅ Database initialized successfully."
}

# Build and start services
start_services() {
    echo "🏗️  Building and starting all services..."
    
    # Build the application
    docker-compose -f docker-compose.prod.yml build
    
    # Start all services
    docker-compose -f docker-compose.prod.yml up -d
    
    echo "⏳ Waiting for services to start..."
    sleep 30
    
    # Check service health
    echo "🔍 Checking service health..."
    if curl -f http://localhost/api/health > /dev/null 2>&1; then
        echo "✅ Application is running successfully!"
    else
        echo "❌ Application health check failed. Please check the logs:"
        echo "   docker-compose -f docker-compose.prod.yml logs app"
    fi
}

# Setup monitoring and logging
setup_monitoring() {
    echo "📊 Setting up monitoring and logging..."
    
    # Create log directories
    mkdir -p logs/nginx
    mkdir -p logs/app
    
    # Setup log rotation
    cat > /etc/logrotate.d/hk-heritage-crafts << 'EOF'
/path/to/your/project/logs/nginx/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        docker-compose -f /path/to/your/project/docker-compose.prod.yml exec nginx nginx -s reload
    endscript
}

/path/to/your/project/logs/app/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 root root
}
EOF
    
    echo "✅ Monitoring and logging configured."
}

# Setup backup
setup_backup() {
    echo "💾 Setting up backup system..."
    
    # Create backup script
    cat > scripts/backup.sh << 'EOF'
#!/bin/bash
# Database Backup Script

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="hk_heritage_crafts"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U postgres $DB_NAME > $BACKUP_DIR/db_backup_$DATE.sql

# Backup uploaded files (if using local storage)
tar -czf $BACKUP_DIR/files_backup_$DATE.tar.gz uploads/

# Keep only last 30 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
EOF
    
    chmod +x scripts/backup.sh
    
    # Setup daily backup cron job
    (crontab -l 2>/dev/null; echo "0 2 * * * /path/to/your/project/scripts/backup.sh") | crontab -
    
    echo "✅ Backup system configured."
}

# Main execution
main() {
    echo "🎯 Starting production setup..."
    
    check_dependencies
    setup_env
    
    read -p "Do you want to setup SSL certificates? (y/n): " setup_ssl_choice
    if [[ $setup_ssl_choice =~ ^[Yy]$ ]]; then
        setup_ssl
    fi
    
    read -p "Do you want to initialize the database? (y/n): " init_db_choice
    if [[ $init_db_choice =~ ^[Yy]$ ]]; then
        init_database
    fi
    
    start_services
    setup_monitoring
    setup_backup
    
    echo ""
    echo "🎉 Production setup completed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Edit .env.production.local with your actual production values"
    echo "2. Update nginx/nginx.conf with your actual domain name"
    echo "3. Update cron job paths in the backup and SSL renewal scripts"
    echo "4. Test your application at https://your-domain.com"
    echo "5. Monitor logs with: docker-compose -f docker-compose.prod.yml logs -f"
    echo ""
    echo "🔧 Useful commands:"
    echo "- View logs: docker-compose -f docker-compose.prod.yml logs -f [service]"
    echo "- Restart services: docker-compose -f docker-compose.prod.yml restart"
    echo "- Update application: docker-compose -f docker-compose.prod.yml pull && docker-compose -f docker-compose.prod.yml up -d"
    echo "- Backup database: ./scripts/backup.sh"
    echo ""
}

# Run main function
main "$@"