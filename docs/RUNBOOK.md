# Operations Runbook

## Overview

This runbook provides step-by-step procedures for common operational tasks and incident response for the Plugspace.io Titan platform.

## Quick Reference

### Service Status Commands

```bash
# Check all services
pm2 status

# Check system services
systemctl status nginx mongod redis

# Check Prometheus targets
curl -s localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health: .health}'
```

### Log Locations

| Service | Log Location |
|---------|--------------|
| Nginx | `/var/log/nginx/` |
| PM2 | `/var/log/pm2/` |
| MongoDB | `/var/log/mongodb/` |
| Redis | `/var/log/redis/` |
| Application | `/var/log/plugspace/` |

## Incident Response Procedures

### 1. Service Down

#### API Service Down

**Symptoms:**
- 502/503 errors on API endpoints
- `pm2 status` shows API offline

**Resolution:**

```bash
# 1. Check PM2 status
pm2 status

# 2. Check logs for errors
pm2 logs plugspace-api --lines 100

# 3. Restart service
pm2 restart plugspace-api

# 4. If restart fails, check for port conflicts
lsof -i :4000

# 5. Check system resources
free -m
df -h

# 6. If memory issue, restart all services
pm2 restart all
```

#### Voice Server Down

**Symptoms:**
- WebSocket connections failing
- Voice features unavailable

**Resolution:**

```bash
# 1. Check voice server status
pm2 status plugspace-voice

# 2. Check WebSocket port
netstat -tlnp | grep 4001

# 3. Check logs
pm2 logs plugspace-voice --lines 100

# 4. Restart voice server
pm2 restart plugspace-voice

# 5. If Redis connection issue
redis-cli -a $REDIS_PASSWORD ping
```

### 2. Database Issues

#### MongoDB Connection Failed

**Symptoms:**
- Database connection errors in logs
- Data not persisting

**Resolution:**

```bash
# 1. Check MongoDB status
systemctl status mongod

# 2. Check MongoDB logs
tail -100 /var/log/mongodb/mongod.log

# 3. Check disk space
df -h /var/lib/mongodb

# 4. Restart MongoDB
systemctl restart mongod

# 5. Check replica set status
mongosh --eval "rs.status()"

# 6. If replica set issue
mongosh --eval "rs.initiate()"
```

#### Redis Connection Failed

**Symptoms:**
- Session errors
- Queue processing stopped
- Cache misses

**Resolution:**

```bash
# 1. Check Redis status
systemctl status redis

# 2. Test connection
redis-cli -a $REDIS_PASSWORD ping

# 3. Check memory usage
redis-cli -a $REDIS_PASSWORD INFO memory

# 4. Restart Redis
systemctl restart redis

# 5. Check for memory issues
redis-cli -a $REDIS_PASSWORD CONFIG GET maxmemory
```

### 3. Performance Issues

#### High CPU Usage

**Symptoms:**
- Alert: HighCPUUsage
- Slow response times

**Resolution:**

```bash
# 1. Identify process
top -c

# 2. Check PM2 metrics
pm2 monit

# 3. If specific app is high
pm2 restart <app-name>

# 4. Check for runaway processes
ps aux --sort=-%cpu | head -20

# 5. Scale if needed
pm2 scale plugspace-api +2
```

#### High Memory Usage

**Symptoms:**
- Alert: HighMemoryUsage
- OOM errors

**Resolution:**

```bash
# 1. Check memory usage
free -m

# 2. Check per-process memory
pm2 monit

# 3. Restart high-memory processes
pm2 restart plugspace-api

# 4. Check for memory leaks
pm2 logs plugspace-api --lines 500 | grep -i "memory\|heap"

# 5. If MongoDB using too much memory
# Edit /etc/mongod.conf, reduce cacheSizeGB
systemctl restart mongod
```

#### High Response Time

**Symptoms:**
- Alert: HighResponseTime
- User complaints of slowness

**Resolution:**

```bash
# 1. Check which endpoints are slow
# Review Grafana dashboard or logs

# 2. Check database performance
mongosh --eval "db.currentOp()"

# 3. Check Redis
redis-cli -a $REDIS_PASSWORD SLOWLOG GET 10

# 4. Check Nginx
tail -f /var/log/nginx/access.log | grep -v 200

# 5. Scale API servers
pm2 scale plugspace-api 6
```

### 4. SSL Certificate Issues

#### Certificate Expiring

**Symptoms:**
- Alert: SSLCertificateExpiringSoon
- Browser warnings

**Resolution:**

```bash
# 1. Check certificate expiry
certbot certificates

# 2. Renew certificates
certbot renew

# 3. If renewal fails
certbot renew --force-renewal

# 4. Reload Nginx
systemctl reload nginx

# 5. Verify
echo | openssl s_client -connect plugspace.io:443 2>/dev/null | openssl x509 -noout -dates
```

### 5. Disk Space Issues

#### Low Disk Space

**Symptoms:**
- Alert: LowDiskSpace
- Services failing to write

**Resolution:**

```bash
# 1. Check disk usage
df -h

# 2. Find large files
du -sh /* | sort -hr | head -20

# 3. Clean up logs
find /var/log -name "*.log" -size +100M -exec truncate -s 0 {} \;

# 4. Clean Docker
docker system prune -a

# 5. Clean old backups
find /home/plugspace/backups -mtime +7 -delete

# 6. Clean PM2 logs
pm2 flush
```

## Deployment Procedures

### Standard Deployment

```bash
# 1. SSH to server
ssh -p 2222 plugspace@plugspace.io

# 2. Pull latest code
cd /home/plugspace/plugspace
git pull origin main

# 3. Install dependencies
npm ci

# 4. Run migrations
npx prisma migrate deploy

# 5. Build
npm run build

# 6. Reload services (zero downtime)
pm2 reload all

# 7. Verify
pm2 status
curl https://plugspace.io/api/health
```

### Rollback Procedure

```bash
# 1. Find previous working commit
git log --oneline -10

# 2. Checkout previous commit
git checkout <commit-hash>

# 3. Rebuild
npm ci
npm run build

# 4. Restart
pm2 restart all

# 5. Verify rollback
curl https://plugspace.io/api/health
```

### Database Migration

```bash
# 1. Backup first
/usr/local/bin/backup.sh

# 2. Run migration
cd /home/plugspace/plugspace
npx prisma migrate deploy

# 3. Verify
npx prisma migrate status
```

## Maintenance Procedures

### Scheduled Maintenance

```bash
# 1. Enable maintenance mode (update Nginx)
# Add to site config: return 503;

# 2. Notify users via status page

# 3. Stop application services
pm2 stop all

# 4. Perform maintenance

# 5. Start services
pm2 start all

# 6. Verify
pm2 status
curl https://plugspace.io/api/health

# 7. Remove maintenance mode

# 8. Update status page
```

### Backup Verification

```bash
# 1. Run backup
/usr/local/bin/backup.sh

# 2. Verify backup files
ls -la /home/plugspace/backups/$(date +%Y%m%d)*

# 3. Test restore (dry run)
/usr/local/bin/restore.sh <timestamp> --dry-run --all

# 4. Verify checksums
cat /home/plugspace/backups/*/manifest.json | jq '.checksums'
```

## Monitoring & Alerts

### Silence an Alert

```bash
# Via Alertmanager API
curl -X POST http://localhost:9093/api/v2/silences -d '{
  "matchers": [{"name": "alertname", "value": "HighCPUUsage", "isRegex": false}],
  "startsAt": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
  "endsAt": "'$(date -u -d "+2 hours" +%Y-%m-%dT%H:%M:%SZ)'",
  "comment": "Investigating high CPU",
  "createdBy": "ops"
}'
```

### Check Alert Status

```bash
# Via Prometheus
curl -s localhost:9090/api/v1/alerts | jq '.data.alerts[] | {alertname: .labels.alertname, state: .state}'
```

## Security Procedures

### Rotate Database Credentials

```bash
# 1. Generate new password
NEW_PASSWORD=$(openssl rand -base64 32 | tr -d '/+=')

# 2. Update MongoDB
mongosh admin -u admin -p $OLD_PASSWORD --eval "
  db.changeUserPassword('plugspace_app', '$NEW_PASSWORD')
"

# 3. Update .env file
sed -i "s/OLD_PASSWORD/$NEW_PASSWORD/g" /home/plugspace/plugspace/.env

# 4. Restart services
pm2 restart all

# 5. Verify
pm2 logs plugspace-api --lines 10
```

### Block IP Address

```bash
# 1. Add to UFW
ufw deny from <IP_ADDRESS>

# 2. Or add to fail2ban
fail2ban-client set sshd banip <IP_ADDRESS>

# 3. Verify
ufw status
fail2ban-client status sshd
```

## Escalation Matrix

| Severity | Response Time | Escalation |
|----------|--------------|------------|
| Critical | 15 minutes | On-call → Team Lead → CTO |
| High | 1 hour | On-call → Team Lead |
| Medium | 4 hours | On-call |
| Low | 24 hours | Next business day |

## Contact Information

| Role | Contact |
|------|---------|
| On-call | See PagerDuty |
| Infrastructure Lead | infrastructure@plugspace.io |
| Security Team | security@plugspace.io |
