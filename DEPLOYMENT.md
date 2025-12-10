# Plugspace.io Titan v1.4 - Production Deployment Guide

## 🎯 5-Phase Deployment Process

### Phase 1: Server Preparation

1. **Provision Hostinger VPS** (Ubuntu 24.04 LTS)
   - Minimum: 4 CPU cores, 8GB RAM, 100GB SSD
   - Recommended: 8 CPU cores, 16GB RAM, 200GB SSD

2. **Run Initial Setup**:
   ```bash
   chmod +x scripts/setup-server.sh
   ./scripts/setup-server.sh
   ```

3. **Configure Environment**:
   ```bash
   cp .env.example .env
   # Edit .env with production values
   ```

### Phase 2: Database Setup

**Option A: MongoDB Atlas (Recommended)**
- Create cluster on MongoDB Atlas
- Whitelist server IP
- Get connection string
- Update `DATABASE_URL` in `.env`

**Option B: Self-Hosted MongoDB**
- MongoDB 7 installed via setup script
- Configure replica set for production
- Enable authentication
- Update `DATABASE_URL` in `.env`

**Redis Setup**:
- Use Redis Cloud or self-hosted
- Configure cluster mode for high availability
- Update `REDIS_URL` in `.env`

### Phase 3: Application Deployment

1. **Clone Repository**:
   ```bash
   cd /var/www/plugspace
   git clone <repository-url> .
   ```

2. **Install Dependencies**:
   ```bash
   pnpm install --frozen-lockfile
   ```

3. **Build Applications**:
   ```bash
   pnpm build
   ```

4. **Database Migrations**:
   ```bash
   cd packages/db
   pnpm prisma:migrate deploy
   cd ../..
   ```

5. **Start with PM2**:
   ```bash
   pm2 start infrastructure/pm2.config.js
   pm2 save
   pm2 startup
   ```

### Phase 4: Nginx & SSL Configuration

1. **Configure Nginx**:
   ```bash
   sudo cp infrastructure/nginx.conf /etc/nginx/sites-available/plugspace
   sudo ln -s /etc/nginx/sites-available/plugspace /etc/nginx/sites-enabled/
   sudo nginx -t
   ```

2. **Setup SSL**:
   ```bash
   chmod +x scripts/setup-ssl.sh
   ./scripts/setup-ssl.sh
   ```

3. **Reload Nginx**:
   ```bash
   sudo systemctl reload nginx
   ```

### Phase 5: Monitoring & Maintenance

1. **Setup Monitoring**:
   - Configure PM2 monitoring: `pm2 install pm2-logrotate`
   - Setup Prometheus + Grafana (optional)
   - Configure uptime monitoring (UptimeRobot, etc.)

2. **Backup Strategy**:
   - Daily MongoDB backups
   - Redis persistence enabled
   - Code repository backups

3. **Security Hardening**:
   - Enable firewall (UFW)
   - Regular security updates
   - Monitor logs for suspicious activity
   - Setup fail2ban

## 🔧 Maintenance Commands

```bash
# View application status
pm2 status

# View logs
pm2 logs

# Restart applications
pm2 restart all

# Update application
git pull
pnpm install
pnpm build
pm2 restart all

# Database backup
mongodump --uri="$DATABASE_URL" --out=/backup/$(date +%Y%m%d)

# SSL certificate renewal (automatic via cron)
sudo certbot renew
```

## 📊 Performance Targets

- **API Response Time**: < 100ms (p95)
- **Uptime SLA**: 99.9%
- **Concurrent Users**: 10,000+
- **Database Queries**: < 50ms (p95)
- **Cache Hit Rate**: > 80%

## 🚨 Troubleshooting

### Application Won't Start
1. Check logs: `pm2 logs`
2. Verify environment variables: `cat .env`
3. Check port availability: `sudo netstat -tulpn | grep :3000`

### Database Connection Issues
1. Verify MongoDB is running: `sudo systemctl status mongod`
2. Check connection string format
3. Verify network connectivity

### SSL Certificate Issues
1. Check certificate expiry: `sudo certbot certificates`
2. Renew manually: `sudo certbot renew`
3. Verify Nginx config: `sudo nginx -t`

## 📞 Support

For production issues, contact:
- Email: support@plugspace.io
- Emergency: [on-call contact]
