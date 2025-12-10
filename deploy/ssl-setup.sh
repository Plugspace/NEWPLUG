#!/bin/bash
# ==============================================
# PLUGSPACE.IO TITAN v1.4 - SSL SETUP
# ==============================================
# Automated SSL certificate management with
# Let's Encrypt and auto-renewal
# ==============================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root"
   exit 1
fi

# Configuration
DOMAIN="${DOMAIN:-plugspace.io}"
ADMIN_DOMAIN="${ADMIN_DOMAIN:-admin.plugspace.io}"
EMAIL="${EMAIL:-admin@plugspace.io}"
STAGING="${STAGING:-false}"

echo "========================================"
echo "🔐 SSL CERTIFICATE SETUP"
echo "========================================"
echo ""
echo "Domain: ${DOMAIN}"
echo "Admin Domain: ${ADMIN_DOMAIN}"
echo "Email: ${EMAIL}"
echo "Staging: ${STAGING}"
echo ""

# ==============================================
# 1. VERIFY DNS
# ==============================================
log_info "Verifying DNS resolution..."

# Check main domain
DOMAIN_IP=$(dig +short ${DOMAIN} | head -1)
if [ -z "$DOMAIN_IP" ]; then
    log_error "DNS not configured for ${DOMAIN}"
    log_warning "Please update your DNS records first"
    exit 1
fi
log_success "DNS for ${DOMAIN} resolves to ${DOMAIN_IP}"

# Check admin domain
ADMIN_IP=$(dig +short ${ADMIN_DOMAIN} | head -1)
if [ -z "$ADMIN_IP" ]; then
    log_warning "DNS not configured for ${ADMIN_DOMAIN}, skipping..."
else
    log_success "DNS for ${ADMIN_DOMAIN} resolves to ${ADMIN_IP}"
fi

# ==============================================
# 2. CERTBOT OPTIONS
# ==============================================
CERTBOT_OPTS=""
if [ "$STAGING" = "true" ]; then
    CERTBOT_OPTS="--staging"
    log_warning "Using Let's Encrypt STAGING environment"
fi

# ==============================================
# 3. OBTAIN MAIN DOMAIN CERTIFICATE
# ==============================================
log_info "Obtaining SSL certificate for ${DOMAIN}..."

certbot certonly \
    --nginx \
    --non-interactive \
    --agree-tos \
    --email ${EMAIL} \
    --no-eff-email \
    -d ${DOMAIN} \
    -d www.${DOMAIN} \
    ${CERTBOT_OPTS}

if [ $? -eq 0 ]; then
    log_success "Certificate obtained for ${DOMAIN}"
else
    log_error "Failed to obtain certificate for ${DOMAIN}"
    exit 1
fi

# ==============================================
# 4. OBTAIN ADMIN DOMAIN CERTIFICATE
# ==============================================
if [ -n "$ADMIN_IP" ]; then
    log_info "Obtaining SSL certificate for ${ADMIN_DOMAIN}..."
    
    certbot certonly \
        --nginx \
        --non-interactive \
        --agree-tos \
        --email ${EMAIL} \
        --no-eff-email \
        -d ${ADMIN_DOMAIN} \
        ${CERTBOT_OPTS}
    
    if [ $? -eq 0 ]; then
        log_success "Certificate obtained for ${ADMIN_DOMAIN}"
    else
        log_warning "Failed to obtain certificate for ${ADMIN_DOMAIN}"
    fi
fi

# ==============================================
# 5. UPDATE NGINX CONFIGURATION
# ==============================================
log_info "Updating Nginx configuration..."

# Update main site config
sed -i "s|ssl_certificate /etc/nginx/ssl/selfsigned.crt;|ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;|g" /etc/nginx/sites-available/plugspace
sed -i "s|ssl_certificate_key /etc/nginx/ssl/selfsigned.key;|ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;|g" /etc/nginx/sites-available/plugspace

# Add HSTS header (uncomment in config)
sed -i 's/# add_header Strict-Transport-Security/add_header Strict-Transport-Security/g' /etc/nginx/nginx.conf

log_success "Nginx configuration updated"

# ==============================================
# 6. TEST NGINX CONFIG
# ==============================================
log_info "Testing Nginx configuration..."

nginx -t
if [ $? -eq 0 ]; then
    systemctl reload nginx
    log_success "Nginx reloaded with SSL certificates"
else
    log_error "Nginx configuration test failed"
    exit 1
fi

# ==============================================
# 7. SETUP AUTO-RENEWAL
# ==============================================
log_info "Configuring certificate auto-renewal..."

# Create renewal hook
mkdir -p /etc/letsencrypt/renewal-hooks/deploy

cat > /etc/letsencrypt/renewal-hooks/deploy/nginx-reload.sh << 'EOF'
#!/bin/bash
# Reload Nginx after certificate renewal
systemctl reload nginx

# Optional: Send notification
# curl -X POST https://api.plugspace.io/webhooks/ssl-renewed \
#   -H "Content-Type: application/json" \
#   -d '{"domain":"'"$RENEWED_DOMAINS"'","date":"'"$(date)"'"}'
EOF

chmod +x /etc/letsencrypt/renewal-hooks/deploy/nginx-reload.sh

# Test renewal
certbot renew --dry-run

if [ $? -eq 0 ]; then
    log_success "Certificate renewal test passed"
else
    log_warning "Certificate renewal test failed - check configuration"
fi

# Enable certbot timer
systemctl enable certbot.timer
systemctl start certbot.timer

log_success "Auto-renewal configured"

# ==============================================
# 8. GENERATE DH PARAMETERS
# ==============================================
log_info "Generating DH parameters (this may take a while)..."

if [ ! -f /etc/nginx/dhparam.pem ]; then
    openssl dhparam -out /etc/nginx/dhparam.pem 2048
    
    # Add to Nginx config
    if ! grep -q "ssl_dhparam" /etc/nginx/nginx.conf; then
        sed -i '/ssl_stapling_verify on;/a\    ssl_dhparam /etc/nginx/dhparam.pem;' /etc/nginx/nginx.conf
    fi
    
    nginx -t && systemctl reload nginx
    log_success "DH parameters generated"
else
    log_info "DH parameters already exist"
fi

# ==============================================
# 9. TEST SSL CONFIGURATION
# ==============================================
log_info "Testing SSL configuration..."

# Wait for nginx to be ready
sleep 2

# Test HTTPS
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 https://${DOMAIN} || echo "000")

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
    log_success "HTTPS is working (HTTP ${HTTP_CODE})"
else
    log_warning "HTTPS test returned HTTP ${HTTP_CODE}"
fi

# ==============================================
# SUMMARY
# ==============================================
echo ""
echo "========================================"
echo "✅ SSL SETUP COMPLETE"
echo "========================================"
echo ""
echo "SSL certificates have been configured:"
echo "  • Main domain: ${DOMAIN}"
if [ -n "$ADMIN_IP" ]; then
echo "  • Admin domain: ${ADMIN_DOMAIN}"
fi
echo ""
echo "Features enabled:"
echo "  • TLS 1.2/1.3 only"
echo "  • HSTS enabled"
echo "  • OCSP Stapling enabled"
echo "  • Auto-renewal via certbot timer"
echo ""
echo "Test your SSL configuration at:"
echo "  https://www.ssllabs.com/ssltest/analyze.html?d=${DOMAIN}"
echo ""
