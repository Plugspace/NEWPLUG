#!/bin/bash
# ==============================================
# PLUGSPACE.IO TITAN v1.4 - NGINX SETUP
# ==============================================
# Production Nginx configuration with
# reverse proxy, rate limiting, and security
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

# Domain configuration (modify these)
DOMAIN="${DOMAIN:-plugspace.io}"
ADMIN_DOMAIN="${ADMIN_DOMAIN:-admin.plugspace.io}"

echo "========================================"
echo "🌐 NGINX PRODUCTION SETUP"
echo "========================================"
echo ""
echo "Domain: ${DOMAIN}"
echo "Admin Domain: ${ADMIN_DOMAIN}"
echo ""

# ==============================================
# 1. INSTALL NGINX EXTRAS
# ==============================================
log_info "Installing Nginx with extras..."

apt-get install -y nginx libnginx-mod-http-headers-more-filter

log_success "Nginx installed"

# ==============================================
# 2. CREATE MAIN NGINX CONFIG
# ==============================================
log_info "Creating main Nginx configuration..."

# Backup original config
cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup

cat > /etc/nginx/nginx.conf << 'EOF'
# ==============================================
# PLUGSPACE NGINX PRODUCTION CONFIGURATION
# ==============================================

user www-data;
worker_processes auto;
worker_rlimit_nofile 65535;
pid /run/nginx.pid;

# Load modules
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 65535;
    use epoll;
    multi_accept on;
}

http {
    # ===========================================
    # BASIC SETTINGS
    # ===========================================
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    keepalive_requests 1000;
    types_hash_max_size 2048;
    server_tokens off;
    more_clear_headers Server;

    # MIME Types
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # ===========================================
    # BUFFER SETTINGS
    # ===========================================
    client_body_buffer_size 128k;
    client_max_body_size 50M;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 16k;
    output_buffers 1 32k;
    postpone_output 1460;

    # ===========================================
    # TIMEOUT SETTINGS
    # ===========================================
    client_body_timeout 60s;
    client_header_timeout 60s;
    send_timeout 60s;
    proxy_connect_timeout 60s;
    proxy_send_timeout 300s;
    proxy_read_timeout 300s;

    # ===========================================
    # GZIP COMPRESSION
    # ===========================================
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_min_length 256;
    gzip_buffers 16 8k;
    gzip_http_version 1.1;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml
        application/xml+rss
        application/x-javascript
        application/vnd.ms-fontobject
        application/x-font-ttf
        font/opentype
        image/svg+xml
        image/x-icon;

    # ===========================================
    # RATE LIMITING ZONES
    # ===========================================
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;
    limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=10r/m;
    limit_req_zone $binary_remote_addr zone=general_limit:10m rate=50r/s;
    limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

    # Rate limit status
    limit_req_status 429;
    limit_conn_status 429;

    # ===========================================
    # SSL CONFIGURATION
    # ===========================================
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;
    ssl_buffer_size 4k;

    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;

    # DH Parameters (generate with: openssl dhparam -out /etc/nginx/dhparam.pem 4096)
    # ssl_dhparam /etc/nginx/dhparam.pem;

    # ===========================================
    # SECURITY HEADERS
    # ===========================================
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(self), camera=()" always;

    # HSTS (uncomment after SSL is working)
    # add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # ===========================================
    # LOGGING
    # ===========================================
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for" '
                    'rt=$request_time uct="$upstream_connect_time" '
                    'uht="$upstream_header_time" urt="$upstream_response_time"';

    log_format json escape=json '{'
        '"time_local":"$time_local",'
        '"remote_addr":"$remote_addr",'
        '"remote_user":"$remote_user",'
        '"request":"$request",'
        '"status": "$status",'
        '"body_bytes_sent":"$body_bytes_sent",'
        '"request_time":"$request_time",'
        '"http_referrer":"$http_referer",'
        '"http_user_agent":"$http_user_agent",'
        '"http_x_forwarded_for":"$http_x_forwarded_for"'
    '}';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;

    # ===========================================
    # PROXY SETTINGS
    # ===========================================
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Request-ID $request_id;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_cache_bypass $http_upgrade;

    # ===========================================
    # UPSTREAM DEFINITIONS
    # ===========================================
    upstream frontend {
        server 127.0.0.1:3000;
        keepalive 32;
    }

    upstream backend {
        server 127.0.0.1:4000;
        keepalive 32;
    }

    upstream voice {
        server 127.0.0.1:4001;
        keepalive 16;
    }

    upstream admin {
        server 127.0.0.1:3002;
        keepalive 8;
    }

    # ===========================================
    # INCLUDE SITE CONFIGS
    # ===========================================
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
EOF

log_success "Main Nginx configuration created"

# ==============================================
# 3. CREATE SITE CONFIGURATION
# ==============================================
log_info "Creating site configuration..."

# Remove default site
rm -f /etc/nginx/sites-enabled/default

cat > /etc/nginx/sites-available/plugspace << EOF
# ==============================================
# PLUGSPACE SITE CONFIGURATION
# ==============================================

# HTTP -> HTTPS Redirect
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN} ${ADMIN_DOMAIN};

    # Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        allow all;
    }

    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://\$host\$request_uri;
    }
}

# Main Application
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN} www.${DOMAIN};

    # SSL Configuration (will be updated by Certbot)
    ssl_certificate /etc/nginx/ssl/selfsigned.crt;
    ssl_certificate_key /etc/nginx/ssl/selfsigned.key;

    # Security
    limit_conn conn_limit 20;

    # Root for static files
    root /home/plugspace/plugspace/apps/frontend/public;

    # Health check endpoint (no rate limit)
    location /health {
        access_log off;
        return 200 'OK';
        add_header Content-Type text/plain;
    }

    # API endpoints
    location /api/ {
        limit_req zone=api_limit burst=50 nodelay;
        
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        
        # Timeouts for API
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    # tRPC endpoints
    location /trpc/ {
        limit_req zone=api_limit burst=50 nodelay;
        
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }

    # WebSocket for voice
    location /voice {
        proxy_pass http://voice;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # Static assets with caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
        try_files \$uri @frontend;
    }

    # Next.js static files
    location /_next/static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
        proxy_pass http://frontend;
    }

    # Next.js image optimization
    location /_next/image {
        proxy_pass http://frontend;
    }

    # Frontend (Next.js)
    location / {
        limit_req zone=general_limit burst=30 nodelay;
        
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }

    location @frontend {
        proxy_pass http://frontend;
    }

    # Error pages
    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
        internal;
    }
}

# Admin Panel (Restricted)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${ADMIN_DOMAIN};

    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/selfsigned.crt;
    ssl_certificate_key /etc/nginx/ssl/selfsigned.key;

    # Extra security for admin
    limit_conn conn_limit 5;
    limit_req zone=auth_limit burst=5 nodelay;

    # IP Whitelist (uncomment and configure for production)
    # allow 1.2.3.4;
    # deny all;

    location / {
        proxy_pass http://admin;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/plugspace /etc/nginx/sites-enabled/

log_success "Site configuration created"

# ==============================================
# 4. CREATE SELF-SIGNED CERTIFICATE
# ==============================================
log_info "Creating self-signed certificate for initial setup..."

mkdir -p /etc/nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/selfsigned.key \
    -out /etc/nginx/ssl/selfsigned.crt \
    -subj "/C=US/ST=State/L=City/O=Plugspace/CN=${DOMAIN}"

log_success "Self-signed certificate created"

# ==============================================
# 5. CREATE CERTBOT DIRECTORY
# ==============================================
log_info "Creating Let's Encrypt directories..."

mkdir -p /var/www/certbot
chown -R www-data:www-data /var/www/certbot

log_success "Certbot directories created"

# ==============================================
# 6. INSTALL NGINX PROMETHEUS EXPORTER
# ==============================================
log_info "Installing Nginx Prometheus Exporter..."

# Enable stub_status for metrics
cat > /etc/nginx/conf.d/stub_status.conf << 'EOF'
server {
    listen 127.0.0.1:8080;
    server_name localhost;
    
    location /nginx_status {
        stub_status on;
        access_log off;
        allow 127.0.0.1;
        deny all;
    }
}
EOF

# Install nginx-prometheus-exporter
useradd --no-create-home --shell /bin/false nginx_exporter 2>/dev/null || true

NGINX_EXPORTER_VERSION="0.11.0"
wget -q "https://github.com/nginxinc/nginx-prometheus-exporter/releases/download/v${NGINX_EXPORTER_VERSION}/nginx-prometheus-exporter_${NGINX_EXPORTER_VERSION}_linux_amd64.tar.gz" -O /tmp/nginx_exporter.tar.gz
tar xzf /tmp/nginx_exporter.tar.gz -C /tmp
cp /tmp/nginx-prometheus-exporter /usr/local/bin/
chmod +x /usr/local/bin/nginx-prometheus-exporter
rm -rf /tmp/nginx*

cat > /etc/systemd/system/nginx_exporter.service << 'EOF'
[Unit]
Description=Nginx Prometheus Exporter
After=network.target nginx.service

[Service]
Type=simple
User=nginx_exporter
Group=nginx_exporter
ExecStart=/usr/local/bin/nginx-prometheus-exporter -nginx.scrape-uri=http://127.0.0.1:8080/nginx_status
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable nginx_exporter
systemctl start nginx_exporter

log_success "Nginx Exporter running on :9113"

# ==============================================
# 7. TEST NGINX CONFIGURATION
# ==============================================
log_info "Testing Nginx configuration..."

nginx -t
if [ $? -eq 0 ]; then
    systemctl reload nginx
    log_success "Nginx configuration valid and reloaded"
else
    log_error "Nginx configuration test failed"
    exit 1
fi

# ==============================================
# 8. CREATE CUSTOM ERROR PAGES
# ==============================================
log_info "Creating custom error pages..."

mkdir -p /usr/share/nginx/html

cat > /usr/share/nginx/html/50x.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Service Temporarily Unavailable - Plugspace</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            text-align: center;
            padding: 20px;
        }
        .container { max-width: 500px; }
        h1 { font-size: 6rem; font-weight: 700; opacity: 0.9; }
        h2 { font-size: 1.5rem; margin: 1rem 0; font-weight: 400; }
        p { opacity: 0.8; margin: 1rem 0; }
        .btn {
            display: inline-block;
            padding: 12px 24px;
            background: rgba(255,255,255,0.2);
            border: 2px solid white;
            border-radius: 50px;
            color: white;
            text-decoration: none;
            margin-top: 2rem;
            transition: all 0.3s;
        }
        .btn:hover { background: white; color: #667eea; }
    </style>
</head>
<body>
    <div class="container">
        <h1>503</h1>
        <h2>Service Temporarily Unavailable</h2>
        <p>We're performing some maintenance. We'll be back shortly!</p>
        <a href="/" class="btn">Try Again</a>
    </div>
</body>
</html>
EOF

log_success "Custom error pages created"

# ==============================================
# SUMMARY
# ==============================================
echo ""
echo "========================================"
echo "✅ NGINX SETUP COMPLETE"
echo "========================================"
echo ""
echo "Nginx has been configured with:"
echo "  • HTTP -> HTTPS redirect"
echo "  • Rate limiting"
echo "  • Security headers"
echo "  • Gzip compression"
echo "  • WebSocket support"
echo "  • Prometheus metrics on :9113"
echo ""
echo "⚠️  NEXT STEPS:"
echo "  1. Update DNS records to point to this server"
echo "  2. Run ./ssl-setup.sh to obtain SSL certificates"
echo "  3. Update Nginx config with real certificates"
echo ""
