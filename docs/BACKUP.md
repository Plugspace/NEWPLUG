# Backup & Disaster Recovery Guide

## Overview

This guide covers backup procedures, disaster recovery, and data protection strategies for the Plugspace.io Titan platform.

## Backup Strategy

### Backup Types

| Type | Frequency | Retention | Content |
|------|-----------|-----------|---------|
| Full | Weekly (Sunday 3 AM) | 4 weeks | Everything |
| Incremental | Daily (2 AM) | 30 days | Changes only |
| Database | Every 6 hours | 7 days | MongoDB oplog |
| Configuration | On change | 90 days | Configs, secrets |

### What Gets Backed Up

- **MongoDB Database**: All collections and oplog
- **Redis Data**: RDB snapshot
- **Application Files**: Source code, uploads, assets
- **Configuration**: Nginx, MongoDB, Redis, PM2, environment
- **SSL Certificates**: Let's Encrypt certificates

## Backup Procedures

### Automated Backup

Backups run automatically via cron:

```bash
# Crontab entries
0 2 * * * /home/plugspace/plugspace/infrastructure/backup/backup.sh >> /var/log/plugspace/backup.log 2>&1
0 3 * * 0 /home/plugspace/plugspace/infrastructure/backup/backup.sh --full >> /var/log/plugspace/backup.log 2>&1
```

### Manual Backup

```bash
# Run full backup
sudo /home/plugspace/plugspace/infrastructure/backup/backup.sh

# Check backup status
ls -la /home/plugspace/backups/

# View backup manifest
cat /home/plugspace/backups/YYYYMMDD_HHMMSS/manifest.json
```

### Remote Backup

Configure remote storage in backup script:

```bash
# Edit backup configuration
export REMOTE_ENABLED=true
export REMOTE_BUCKET=plugspace-backups
export REMOTE_PATH=production

# Configure rclone for cloud storage
rclone config
```

**Supported Remote Storage:**
- AWS S3
- Google Cloud Storage
- Backblaze B2
- Azure Blob Storage
- SFTP/SSH

## Restore Procedures

### Full System Restore

```bash
# 1. List available backups
ls /home/plugspace/backups/

# 2. Dry run to verify
/home/plugspace/plugspace/infrastructure/backup/restore.sh 20240101_120000 --all --dry-run

# 3. Execute restore
/home/plugspace/plugspace/infrastructure/backup/restore.sh 20240101_120000 --all

# 4. Verify services
pm2 status
curl https://plugspace.io/api/health
```

### Selective Restore

```bash
# MongoDB only
/home/plugspace/plugspace/infrastructure/backup/restore.sh 20240101_120000 --mongodb

# Redis only
/home/plugspace/plugspace/infrastructure/backup/restore.sh 20240101_120000 --redis

# Application files only
/home/plugspace/plugspace/infrastructure/backup/restore.sh 20240101_120000 --app

# Configuration only
/home/plugspace/plugspace/infrastructure/backup/restore.sh 20240101_120000 --config
```

### Point-in-Time Recovery (MongoDB)

```bash
# 1. Restore full backup
mongorestore --uri="$MONGODB_URI" --gzip --archive=backup.archive.gz --drop

# 2. Apply oplog to specific timestamp
mongorestore --uri="$MONGODB_URI" --oplogReplay --oplogLimit="1704067200:1"
```

## Disaster Recovery

### Recovery Time Objectives (RTO)

| Scenario | RTO | Procedure |
|----------|-----|-----------|
| Service failure | 5 min | PM2 auto-restart |
| Database failure | 15 min | Restore from backup |
| Server failure | 30 min | Provision new server + restore |
| Full disaster | 2 hours | Full infrastructure rebuild |

### Recovery Point Objectives (RPO)

| Data Type | RPO | Method |
|-----------|-----|--------|
| Database | 6 hours | Regular backups + oplog |
| User uploads | 24 hours | Daily backup |
| Configuration | On change | Version control + backup |

### Disaster Recovery Runbook

#### Scenario 1: Service Failure

```bash
# 1. Check service status
pm2 status

# 2. Restart failed service
pm2 restart <service-name>

# 3. If restart fails, check logs
pm2 logs <service-name> --lines 100

# 4. Check system resources
free -m && df -h

# 5. If resource issue, restart all
pm2 restart all
```

#### Scenario 2: Database Corruption

```bash
# 1. Stop application
pm2 stop all

# 2. Stop database
systemctl stop mongod

# 3. Identify latest good backup
ls -la /home/plugspace/backups/

# 4. Restore database
/home/plugspace/plugspace/infrastructure/backup/restore.sh YYYYMMDD_HHMMSS --mongodb

# 5. Verify data
mongosh plugspace --eval "db.users.count()"

# 6. Restart application
pm2 start all
```

#### Scenario 3: Complete Server Failure

```bash
# On new server:

# 1. Run VPS hardening
./deploy/vps-hardening.sh

# 2. Set up databases
./deploy/mongodb-setup.sh
./deploy/redis-setup.sh

# 3. Set up Nginx
./deploy/nginx-setup.sh

# 4. Download latest backup from remote storage
rclone copy remote:plugspace-backups/latest /home/plugspace/backups/

# 5. Restore everything
./infrastructure/backup/restore.sh YYYYMMDD_HHMMSS --all

# 6. Set up SSL
./deploy/ssl-setup.sh

# 7. Start services
./deploy/pm2-setup.sh

# 8. Verify
curl https://plugspace.io/api/health
```

### Data Center Failover

For multi-region deployment:

```bash
# 1. Update DNS to failover region
# Via Cloudflare or Route53

# 2. Ensure failover region is in sync
# Check replication status

# 3. Verify traffic is routing to failover
dig plugspace.io

# 4. Monitor for issues
# Check Grafana dashboard
```

## Backup Verification

### Automated Verification

```bash
# Test restore to temporary database
mongorestore --uri="mongodb://localhost:27017/test_restore" \
  --gzip --archive=backup.archive.gz \
  --drop

# Verify data integrity
mongosh test_restore --eval "db.users.count()"

# Clean up
mongosh test_restore --eval "db.dropDatabase()"
```

### Monthly Verification Checklist

- [ ] Verify backup files exist
- [ ] Check backup file sizes are reasonable
- [ ] Verify checksums match manifest
- [ ] Test restore to staging environment
- [ ] Verify all collections restored
- [ ] Test application functionality
- [ ] Document any issues

## Security Considerations

### Backup Encryption

```bash
# Enable encryption in backup script
export ENCRYPTION_KEY="your-strong-encryption-key"

# Or encrypt manually
gpg --encrypt --recipient admin@plugspace.io backup.tar.gz
```

### Access Control

```bash
# Backup directory permissions
chmod 700 /home/plugspace/backups
chown plugspace:plugspace /home/plugspace/backups

# Remote storage credentials
chmod 600 ~/.config/rclone/rclone.conf
```

### Compliance

- **GDPR**: Ensure PII is handled according to data retention policies
- **SOC2**: Document backup procedures and test regularly
- **Audit Trail**: Keep logs of all backup/restore operations

## Monitoring

### Backup Monitoring

```bash
# Check backup status
tail -f /var/log/plugspace/backup.log

# Set up alerts for:
# - Backup job failures
# - Backup size anomalies
# - Missing backups
# - Remote upload failures
```

### Prometheus Metrics

```promql
# Backup job status
backup_job_success{job="plugspace-backup"}

# Time since last backup
time() - backup_last_success_timestamp
```

## Troubleshooting

### Backup Failures

```bash
# Check disk space
df -h

# Check MongoDB status
systemctl status mongod

# Check network (for remote backup)
rclone lsd remote:

# Check logs
tail -100 /var/log/plugspace/backup.log
```

### Restore Failures

```bash
# Verify backup integrity
gunzip -t backup.archive.gz

# Check disk space
df -h

# Check permissions
ls -la /var/lib/mongodb

# Check MongoDB logs
tail -100 /var/log/mongodb/mongod.log
```

## Best Practices

1. **Test Restores Regularly**: Monthly at minimum
2. **Multiple Locations**: Keep backups in at least 2 locations
3. **Encrypt Sensitive Data**: Always encrypt backups with PII
4. **Monitor Backups**: Alert on failures immediately
5. **Document Everything**: Keep runbooks up to date
6. **Automate Verification**: Test restores automatically
7. **Version Control Configs**: Track configuration changes
8. **Retention Policy**: Balance storage costs with recovery needs
