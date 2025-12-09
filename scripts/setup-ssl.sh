#!/bin/bash

# SSL Certificate Setup with Let's Encrypt

set -e

DOMAIN="plugspace.io"
EMAIL="admin@plugspace.io"

echo "🔒 Setting up SSL certificates for $DOMAIN..."

# Install certbot if not installed
if ! command -v certbot &> /dev/null; then
    echo "Installing certbot..."
    sudo apt-get update
    sudo apt-get install -y certbot python3-certbot-nginx
fi

# Obtain certificate
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --email $EMAIL --agree-tos --non-interactive

# Setup auto-renewal
echo "0 0 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'" | sudo crontab -

echo "✅ SSL certificates configured!"
echo "📋 Certificate location: /etc/letsencrypt/live/$DOMAIN/"
