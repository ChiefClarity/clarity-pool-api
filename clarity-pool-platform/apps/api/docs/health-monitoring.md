# Health Check & System Monitoring

## Overview

The Clarity Pool API includes comprehensive health check endpoints suitable for Kubernetes deployments and real-time system monitoring.

## Health Check Endpoints

### Basic Health Check
```
GET /health
```

Simple endpoint that returns service status and basic info:
```json
{
  "status": "ok",
  "timestamp": "2025-06-26T17:16:57.031Z",
  "service": "clarity-pool-api"
}
```

### Detailed Health Status
```
GET /health/detailed
```

Comprehensive health check including all subsystems:
```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2025-06-26T17:16:57.031Z",
  "uptime": 1283.68,
  "version": "1.0.0",
  "environment": "development",
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": 59,
      "message": "Database responding in 59ms",
      "details": {
        "connected": true,
        "responseTime": 59,
        "tableCount": 7
      }
    },
    "memory": {
      "status": "healthy",
      "message": "Memory usage: System 45.2%, Heap 78.5%",
      "details": {
        "system": {
          "total": 8589934592,
          "free": 4712345600,
          "used": 3877588992,
          "percent": 45.2
        },
        "process": {
          "rss": 118439936,
          "heapTotal": 41795584,
          "heapUsed": 39915472,
          "heapPercent": 78.5,
          "external": 2369847
        }
      }
    },
    "api": {
      "status": "healthy",
      "message": "All 3 critical endpoints responding",
      "details": {
        "endpoints": [
          {"endpoint": "Auth", "status": "healthy", "path": "/api/auth/technician/login"},
          {"endpoint": "Offers", "status": "healthy", "path": "/api/offers/technician/1"},
          {"endpoint": "Onboarding", "status": "healthy", "path": "/api/onboarding/sessions/technician/1"}
        ]
      }
    },
    "external": {
      "status": "degraded",
      "message": "2/3 external services healthy",
      "details": {
        "sentry": {"status": "healthy", "message": "Sentry configured and active"},
        "supabase": {"status": "healthy", "message": "Supabase database accessible"},
        "poolbrain": {"status": "degraded", "message": "Poolbrain not fully configured"}
      }
    }
  }
}
```

### Kubernetes Probes

#### Liveness Probe
```
GET /health/live
```

Checks if the service is running:
```json
{
  "status": "live",
  "timestamp": "2025-06-26T17:16:57.031Z"
}
```

#### Readiness Probe
```
GET /health/ready
```

Checks if the service is ready to accept traffic:
```json
{
  "status": "ready|not_ready",
  "timestamp": "2025-06-26T17:16:57.031Z",
  "details": {} // Only included if not ready
}
```

#### Startup Probe
```
GET /health/startup
```

For slow-starting containers:
```json
{
  "status": "started|starting",
  "uptime": 45, // seconds
  "timestamp": "2025-06-26T17:16:57.031Z"
}
```

## Monitoring Dashboard

### Unified Dashboard
```
GET /api/monitoring/dashboard
```

Returns comprehensive monitoring data:
```json
{
  "timestamp": "2025-06-26T17:16:57.031Z",
  "system": {
    "status": "healthy",
    "uptime": 1283.68,
    "version": "1.0.0",
    "environment": "development"
  },
  "health": {
    "database": {...},
    "memory": {...},
    "api": {...},
    "external": {...}
  },
  "database": {
    "queries": {
      "totalQueries": 156,
      "averageQueryTime": 45,
      "slowQueryCount": 3
    },
    "slowQueries": [
      {
        "query": "SELECT COUNT(*) FROM offers WHERE status = $1",
        "duration": 2500,
        "timestamp": "2025-06-26T17:15:30.123Z"
      }
    ]
  },
  "alerts": [
    {
      "level": "warning",
      "message": "High average query time",
      "details": "523ms"
    }
  ]
}
```

## Health Status Determination

### Status Levels

1. **Healthy**: All checks pass
2. **Degraded**: Some non-critical checks fail
3. **Unhealthy**: Critical checks fail

### Check Thresholds

#### Database
- Healthy: Response time < 100ms
- Degraded: Response time 100-500ms
- Unhealthy: Response time > 500ms or connection failed

#### Memory
- Healthy: System/Heap usage < 80%
- Degraded: System/Heap usage 80-90%
- Unhealthy: System/Heap usage > 90%

#### External Services
- Healthy: All services configured and accessible
- Degraded: Some services missing or inaccessible
- Unhealthy: All services down

## Kubernetes Configuration

### Deployment Example

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: clarity-pool-api
spec:
  template:
    spec:
      containers:
      - name: api
        image: clarity-pool-api:latest
        ports:
        - containerPort: 3000
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        startupProbe:
          httpGet:
            path: /health/startup
            port: 3000
          failureThreshold: 30
          periodSeconds: 10
```

## Sentry Integration

The health check service automatically sends alerts to Sentry when:
- Overall system status becomes unhealthy
- Database connection fails
- Memory usage exceeds critical thresholds
- Connection pool is near exhaustion

## Monitoring Best Practices

1. **Regular Health Checks**: Monitor `/health/detailed` every 30 seconds
2. **Alert Thresholds**: Set up alerts for degraded status
3. **Dashboard Monitoring**: Use `/api/monitoring/dashboard` for real-time insights
4. **Probe Configuration**: Adjust Kubernetes probe intervals based on your needs
5. **Metrics Collection**: Export health metrics to Prometheus/Grafana

## Troubleshooting

### Service Not Ready
1. Check database connectivity
2. Verify environment variables
3. Review memory usage
4. Check external service configuration

### High Memory Usage
1. Review query performance
2. Check for memory leaks
3. Adjust Node.js heap size
4. Consider horizontal scaling

### Database Issues
1. Verify connection string
2. Check network connectivity
3. Review slow query log
4. Monitor connection pool usage