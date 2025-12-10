# Plugspace.io Titan v1.4 - Deployment Guide

## Overview

This guide covers deploying Plugspace.io Titan to a production environment on Hostinger VPS or similar infrastructure.

## Prerequisites

- Ubuntu 24.04 LTS server with at least:
  - 4 CPU cores
  - 8GB RAM
  - 100GB SSD storage
- Domain name with DNS access
- SSH key pair
- Required API keys:
  - Firebase project credentials
  - Anthropic API key
  - Google AI API key
  - Stripe API key (for billing)

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/plugspace/titan.git
cd titan
```

### 2. Initial Setup

```bash
# First time setup
make setup

# Edit environment variables
cp .env.example .env
nano .env  # Edit with your values
```

### 3. Start Services

```bash
# Development
make dev

# Production
make prod
```

## Detailed Deployment Steps

### Step 1: VPS Initial Setup

Run the VPS setup script on a fresh Ubuntu 24.04 server:

```bash
# Download and run setup script
curl -fsSL https://raw.githubusercontent.com/plugspace/titan/main/infrastructure/scripts/vps-setup.sh | sudo bash
```

This script will:
- Update the system
- Install required packages (Node.js, Docker, Nginx)
- Configure firewall (UFW)
- Set up Fail2ban
- Create application user and directories
- Configure SSH security
- Set up automatic updates

### Step 2: Configure DNS

Add the following DNS records for your domain:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | YOUR_SERVER_IP | 3600 |
| A | www | YOUR_SERVER_IP | 3600 |
| A | api | YOUR_SERVER_IP | 3600 |
| A | studio | YOUR_SERVER_IP | 3600 |
| A | admin | YOUR_SERVER_IP | 3600 |
| A | *.projects | YOUR_SERVER_IP | 3600 |

### Step 3: SSL Certificates

```bash
# Request certificates
sudo certbot certonly --nginx -d plugspace.io -d www.plugspace.io -d api.plugspace.io -d studio.plugspace.io -d admin.plugspace.io

# Test renewal
sudo certbot renew --dry-run
```

### Step 4: Configure Environment

Create production environment file:

```bash
sudo nano /var/www/plugspace/.env
```

Essential variables:

```env
# Environment
NODE_ENV=production

# Database
DATABASE_URL=mongodb://admin:SECURE_PASSWORD@localhost:27017/plugspace?replicaSet=rs0&authSource=admin
MONGO_ROOT_PASSWORD=SECURE_PASSWORD

# Redis
REDIS_URL=redis://:SECURE_PASSWORD@localhost:6379/0
REDIS_PASSWORD=SECURE_PASSWORD

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# AI
ANTHROPIC_API_KEY=sk-ant-api03-...
GOOGLE_AI_API_KEY=...

# Security
JWT_SECRET=your-secure-jwt-secret-at-least-32-chars
ENCRYPTION_KEY=your-32-character-encryption-key!

# Domain
DOMAIN=plugspace.io
```

### Step 5: Deploy Application

```bash
# Navigate to app directory
cd /var/www/plugspace

# Clone repository
git clone https://github.com/plugspace/titan.git .

# Install dependencies
npm ci

# Build applications
npm run build

# Start with Docker Compose
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Step 6: Configure Nginx

The VPS setup script installs Nginx. Update the configuration:

```bash
# Copy nginx configuration
sudo cp infrastructure/nginx/nginx.conf /etc/nginx/nginx.conf
sudo cp infrastructure/nginx/sites-available/* /etc/nginx/sites-available/

# Enable sites
sudo ln -sf /etc/nginx/sites-available/plugspace.conf /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Step 7: Initialize Database

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed initial data (optional)
npm run db:seed
```

### Step 8: Verify Deployment

```bash
# Check service health
make health

# Or use curl
curl https://api.plugspace.io/health
curl https://plugspace.io
curl https://studio.plugspace.io
curl https://admin.plugspace.io
```

## Docker Compose Deployment

### Development Environment

```bash
# Start all services
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

### Production Environment

```bash
# Build and start
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Scale services
docker compose up -d --scale api=3
```

### Service Management

```bash
# View running containers
docker compose ps

# Restart specific service
docker compose restart api

# View logs for service
docker compose logs -f api

# Execute command in container
docker compose exec api sh
```

## PM2 Deployment (Non-Docker)

If not using Docker, use PM2:

```bash
# Install PM2 globally
npm install -g pm2

# Start services
pm2 start ecosystem.config.js

# Save configuration
pm2 save

# Set up startup script
pm2 startup
```

## Zero-Downtime Deployment

### Rolling Update

```bash
# Update application
cd /var/www/plugspace
git pull origin main
npm ci
npm run build

# Rolling restart
make deploy-rolling
```

### Blue-Green Deployment

```bash
# Build new version
docker compose -f docker-compose.prod.yml build

# Deploy to blue/green
./infrastructure/scripts/blue-green-deploy.sh
```

## Database Management

### Backup

```bash
# Manual backup
make backup

# Or use script
./infrastructure/scripts/backup.sh
```

### Restore

```bash
# List available backups
make backup-list

# Restore from backup
./infrastructure/scripts/restore.sh --mongodb backup_20240101_020000.gz
```

### Migrations

```bash
# Create migration
npm run db:migrate-dev

# Apply migrations
npm run db:migrate

# Reset database (WARNING: destroys data)
npm run db:migrate-reset
```

## Monitoring Setup

### Prometheus & Grafana

```bash
# Start monitoring stack
docker compose -f docker-compose.monitoring.yml up -d

# Access dashboards
# Grafana: http://localhost:3003
# Prometheus: http://localhost:9090
```

### Log Aggregation

```bash
# View all logs
make logs

# View specific service logs
make logs-api

# View error logs only
make logs-error
```

## Security Checklist

- [ ] Change all default passwords
- [ ] Enable firewall (UFW)
- [ ] Configure Fail2ban
- [ ] Disable root SSH login
- [ ] Use SSH key authentication only
- [ ] Enable automatic security updates
- [ ] Set up SSL certificates
- [ ] Configure rate limiting
- [ ] Enable audit logging
- [ ] Regular security scans

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker compose logs api

# Check system resources
htop
df -h
free -m
```

### Database Connection Issues

```bash
# Check MongoDB status
docker compose exec mongo-primary mongosh --eval "rs.status()"

# Check connection string
echo $DATABASE_URL
```

### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Force renewal
sudo certbot renew --force-renewal
```

### Performance Issues

```bash
# Check resource usage
docker stats

# Check slow queries
docker compose exec mongo-primary mongosh --eval "db.adminCommand({profilerStatus: 1})"
```

## Rollback Procedure

If deployment fails:

```bash
# Revert to previous version
git checkout <previous-commit>

# Rebuild and restart
docker compose up -d --build

# Restore database if needed
./infrastructure/scripts/restore.sh --mongodb latest
```

## Support

For deployment issues:
- Check logs: `make logs`
- Review documentation: https://docs.plugspace.io
- Contact support: support@plugspace.io
