#!/bin/bash

# SSL Certificate Setup Script for Production
# This script sets up SSL certificates using Let's Encrypt

set -e

DOMAIN=${1:-"your-domain.com"}
EMAIL=${2:-"admin@your-domain.com"}

echo "Setting up SSL certificates for domain: $DOMAIN"

# Create SSL directory
mkdir -p nginx/ssl

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    echo "Installing certbot..."
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get update
        sudo apt-get install -y certbot python3-certbot-nginx
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install certbot
    else
        echo "Please install certbot manually for your operating system"
        exit 1
    fi
fi

# Generate SSL certificate
echo "Generating SSL certificate..."
sudo certbot certonly --standalone \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN

# Copy certificates to nginx directory
sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem nginx/ssl/key.pem

# Set proper permissions
sudo chown $USER:$USER nginx/ssl/cert.pem nginx/ssl/key.pem
chmod 644 nginx/ssl/cert.pem
chmod 600 nginx/ssl/key.pem

echo "SSL certificates generated successfully!"

# Create renewal script
cat > scripts/renew-ssl.sh << 'EOF'
#!/bin/bash
# SSL Certificate Renewal Script

DOMAIN=$1
if [ -z "$DOMAIN" ]; then
    echo "Usage: $0 <domain>"
    exit 1
fi

# Renew certificate
sudo certbot renew --quiet

# Copy renewed certificates
sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem nginx/ssl/key.pem

# Set permissions
sudo chown $USER:$USER nginx/ssl/cert.pem nginx/ssl/key.pem
chmod 644 nginx/ssl/cert.pem
chmod 600 nginx/ssl/key.pem

# Reload nginx
docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload

echo "SSL certificates renewed successfully!"
EOF

chmod +x scripts/renew-ssl.sh

# Create cron job for automatic renewal
echo "Setting up automatic SSL renewal..."
(crontab -l 2>/dev/null; echo "0 3 * * 0 /path/to/your/project/scripts/renew-ssl.sh $DOMAIN") | crontab -

echo "SSL setup completed!"
echo "Don't forget to:"
echo "1. Update the nginx configuration with your actual domain"
echo "2. Update the cron job path to your actual project directory"
echo "3. Test the SSL configuration with: docker-compose -f docker-compose.prod.yml up -d"