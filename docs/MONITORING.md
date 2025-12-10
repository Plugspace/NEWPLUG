# Monitoring Guide

## Overview

Plugspace.io Titan uses a comprehensive monitoring stack based on Prometheus, Grafana, and custom application metrics.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    MONITORING STACK                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Grafana    │◀───│  Prometheus  │◀───│   Exporters  │      │
│  │    :3030     │    │    :9090     │    │              │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                   │               │
│         │                   │                   │               │
│         ▼                   ▼                   ▼               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  Dashboards  │    │    Alerts    │    │  Node: 9100  │      │
│  │   & Panels   │    │    Rules     │    │  Nginx: 9113 │      │
│  └──────────────┘    └──────────────┘    │  Mongo: 9216 │      │
│                             │            │  Redis: 9121 │      │
│                             ▼            └──────────────┘      │
│                      ┌──────────────┐                          │
│                      │ Alertmanager │                          │
│                      │    :9093     │                          │
│                      └──────────────┘                          │
│                             │                                   │
│                             ▼                                   │
│                      ┌──────────────┐                          │
│                      │  Slack/Email │                          │
│                      │ PagerDuty    │                          │
│                      └──────────────┘                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### Prometheus

**Location:** `localhost:9090`

**Configuration:** `/etc/prometheus/prometheus.yml`

**Scrape Targets:**

| Job | Target | Metrics |
|-----|--------|---------|
| node-exporter | :9100 | System metrics |
| nginx | :9113 | Nginx stats |
| mongodb | :9216 | MongoDB stats |
| redis | :9121 | Redis stats |
| plugspace-api | :4000/api/metrics | Application metrics |
| plugspace-voice | :4001/metrics | Voice server metrics |

### Grafana

**Location:** `localhost:3030`

**Default Credentials:** admin / admin (change on first login)

**Pre-built Dashboards:**
- Plugspace Production Dashboard
- System Overview
- API Performance
- Voice Server Metrics
- Database Performance

### Alertmanager

**Location:** `localhost:9093`

**Configuration:** `/etc/alertmanager/alertmanager.yml`

## Key Metrics

### Application Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `http_requests_total` | Counter | Total HTTP requests |
| `http_request_duration_seconds` | Histogram | Request latency |
| `http_requests_in_flight` | Gauge | Current active requests |

### Voice Server Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `voice_active_sessions` | Gauge | Current voice sessions |
| `voice_session_latency_seconds` | Histogram | Voice-to-text latency |
| `voice_audio_bytes_received_total` | Counter | Audio data received |
| `voice_audio_bytes_sent_total` | Counter | Audio data sent |
| `voice_session_errors_total` | Counter | Session errors |

### Database Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `mongodb_connections_current` | Gauge | Current connections |
| `mongodb_connections_available` | Gauge | Available connections |
| `mongodb_op_counters_total` | Counter | Database operations |
| `redis_memory_used_bytes` | Gauge | Redis memory usage |
| `redis_connected_clients` | Gauge | Redis clients |

### System Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `node_cpu_seconds_total` | Counter | CPU time |
| `node_memory_MemTotal_bytes` | Gauge | Total memory |
| `node_memory_MemAvailable_bytes` | Gauge | Available memory |
| `node_filesystem_avail_bytes` | Gauge | Available disk space |
| `node_network_receive_bytes_total` | Counter | Network received |
| `node_network_transmit_bytes_total` | Counter | Network transmitted |

## Alert Rules

### Critical Alerts (Immediate Response)

| Alert | Condition | Response |
|-------|-----------|----------|
| ServiceDown | `up == 0` for 1m | Check service logs, restart |
| CriticalCPUUsage | CPU > 95% for 2m | Scale or investigate |
| CriticalMemoryUsage | Memory > 95% for 2m | Investigate, restart |
| CriticalDiskSpace | Disk < 5% | Clean up immediately |
| MongoDBDown | MongoDB unreachable | Check MongoDB status |
| RedisDown | Redis unreachable | Check Redis status |
| CriticalErrorRate | 5xx > 10% for 2m | Investigate errors |

### Warning Alerts

| Alert | Condition | Response |
|-------|-----------|----------|
| HighCPUUsage | CPU > 80% for 5m | Monitor, consider scaling |
| HighMemoryUsage | Memory > 85% for 5m | Monitor, investigate |
| LowDiskSpace | Disk < 15% for 5m | Plan cleanup |
| HighResponseTime | p95 > 1s for 5m | Investigate bottlenecks |
| HighErrorRate | 5xx > 5% for 5m | Review logs |
| SSLCertificateExpiringSoon | < 30 days | Renew certificate |

## Useful Prometheus Queries

### Request Rate

```promql
# Requests per second
sum(rate(http_requests_total[5m]))

# Requests per second by status
sum(rate(http_requests_total[5m])) by (status)

# Error rate percentage
sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100
```

### Latency

```promql
# p50 latency
histogram_quantile(0.50, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))

# p95 latency
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))

# p99 latency
histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
```

### Resource Usage

```promql
# CPU usage percentage
100 - (avg(irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Memory usage percentage
(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100

# Disk usage percentage
100 - ((node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100)
```

### Voice Server

```promql
# Active voice sessions
voice_active_sessions

# Voice latency p95
histogram_quantile(0.95, sum(rate(voice_session_latency_seconds_bucket[5m])) by (le))

# Audio throughput
rate(voice_audio_bytes_received_total[5m]) + rate(voice_audio_bytes_sent_total[5m])
```

## Setting Up Alerts

### Slack Integration

```yaml
# /etc/alertmanager/alertmanager.yml
route:
  receiver: 'slack-notifications'
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h

receivers:
  - name: 'slack-notifications'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/xxx/yyy/zzz'
        channel: '#alerts'
        send_resolved: true
        title: '{{ .Status | toUpper }}: {{ .CommonAnnotations.summary }}'
        text: '{{ .CommonAnnotations.description }}'
```

### PagerDuty Integration

```yaml
receivers:
  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: 'your-service-key'
        severity: '{{ .CommonLabels.severity }}'
```

### Email Alerts

```yaml
receivers:
  - name: 'email'
    email_configs:
      - to: 'alerts@plugspace.io'
        from: 'prometheus@plugspace.io'
        smarthost: 'smtp.gmail.com:587'
        auth_username: 'prometheus@plugspace.io'
        auth_password: 'xxx'
```

## Grafana Dashboard Setup

### Import Pre-built Dashboard

1. Open Grafana at http://localhost:3030
2. Go to Dashboards → Import
3. Upload `infrastructure/monitoring/grafana-dashboard.json`
4. Select Prometheus data source
5. Click Import

### Custom Dashboard

1. Create new dashboard
2. Add panels with Prometheus queries
3. Set refresh interval (30s recommended)
4. Save and share with team

## Troubleshooting

### Prometheus Not Scraping

```bash
# Check Prometheus status
systemctl status prometheus

# Check targets
curl -s localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health: .health}'

# Check config
promtool check config /etc/prometheus/prometheus.yml
```

### Exporter Not Running

```bash
# Check exporter status
systemctl status node_exporter
systemctl status nginx_exporter
systemctl status redis_exporter

# Test exporter endpoint
curl localhost:9100/metrics
```

### Alerts Not Firing

```bash
# Check alert rules
curl -s localhost:9090/api/v1/rules | jq '.data.groups[].rules[] | {name: .name, state: .state}'

# Check Alertmanager
curl -s localhost:9093/api/v2/alerts | jq '.'
```

## Best Practices

1. **Retention Policy**: Keep metrics for 15-30 days
2. **Scrape Interval**: 15s for most targets, 10s for critical
3. **Alert Thresholds**: Set based on baseline, not arbitrary values
4. **Documentation**: Document all custom alerts
5. **Testing**: Test alert notifications regularly
6. **Dashboard Organization**: Group related metrics
7. **Access Control**: Restrict Grafana access
