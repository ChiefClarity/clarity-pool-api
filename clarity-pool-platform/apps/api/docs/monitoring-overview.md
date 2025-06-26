# Clarity Pool API - Enterprise Monitoring & Security

## Overview

The Clarity Pool API now includes comprehensive monitoring and security features suitable for enterprise-grade production deployment.

## Implemented Features

### 1. Rate Limiting (express-rate-limit)
- **Global Limit**: 60 requests/minute per IP
- **Auth Limit**: 5 login attempts/15 minutes
- **Refresh Token Limit**: 10 attempts/5 minutes
- **Bypass Tokens**: Support for internal services
- **Monitoring**: Real-time violation tracking

### 2. Error Tracking (Sentry)
- **Real-time Alerts**: Instant notifications for errors
- **Error Filtering**: Smart filtering to reduce noise
- **Performance Monitoring**: Track slow transactions
- **User Context**: Automatic user identification
- **Environment Separation**: Dev/staging/production

### 3. Security Headers (Helmet)
- **CSP**: Content Security Policy to prevent XSS
- **HSTS**: Strict Transport Security for HTTPS
- **X-Frame-Options**: Clickjacking protection
- **X-Content-Type-Options**: MIME type sniffing prevention
- **Referrer Policy**: Privacy protection
- **Permissions Policy**: Feature restrictions

### 4. Response Compression
- **Gzip/Brotli**: Automatic response compression
- **Threshold**: Only compress responses >1KB
- **Smart Filtering**: Skip compression for SSE

### 5. CORS Configuration
- **Whitelisted Origins**: www.getclarity.services
- **Credential Support**: Cookies and auth headers
- **Preflight Caching**: 24-hour max age

### 6. Database Query Monitoring
- **Query Performance**: Track all query execution times
- **Slow Query Detection**: Alert on queries >1 second
- **Connection Pool Monitoring**: Track pool utilization
- **Query Type Analysis**: Breakdown by SELECT/INSERT/UPDATE/DELETE
- **Sentry Integration**: Critical alerts for >5 second queries

## Monitoring Endpoints

### Rate Limiting
- `GET /api/monitoring/rate-limits/violations` - Recent violations
- `GET /api/monitoring/rate-limits/stats` - Current statistics
- `POST /api/monitoring/rate-limits/clear` - Clear violations (auth required)

### Sentry Testing
- `GET /api/monitoring/sentry/test-error` - Trigger test error
- `POST /api/monitoring/sentry/test-logged-error` - Test error logging

### Security Headers
- `GET /api/monitoring/security/headers` - View all security headers

### Database Monitoring
- `GET /api/monitoring/database/stats` - Database statistics
- `GET /api/monitoring/database/slow-queries` - Slow query log
- `GET /api/monitoring/database/connection-pool` - Pool statistics
- `POST /api/monitoring/database/set-threshold` - Update slow query threshold
- `POST /api/monitoring/database/test-performance` - Run performance test

## Environment Variables

```bash
# Rate Limiting
RATE_LIMIT_USE_MEMORY=true
RATE_LIMIT_BYPASS_TOKENS=token1,token2

# Sentry
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# Security
ALLOWED_ORIGINS=https://additional-domain.com
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:pass@host:port/db
```

## Production Checklist

- [x] Rate limiting configured and tested
- [x] Sentry error tracking with DSN
- [x] Security headers (Helmet) enabled
- [x] CORS configured for production domain
- [x] Response compression enabled
- [x] Database query monitoring active
- [x] All monitoring endpoints protected
- [x] Environment variables documented

## Next Steps

1. **Metrics Dashboard**: Consider adding Grafana/Prometheus
2. **Log Aggregation**: Implement centralized logging (ELK stack)
3. **APM**: Add Application Performance Monitoring
4. **Health Checks**: Implement comprehensive health endpoints
5. **Backup Monitoring**: Track database backup status

## Testing

Run the monitoring test suite:
```bash
# Test rate limiting
./test-rate-limit.sh

# Test database monitoring
./test-database-monitoring.sh

# Test security headers
curl -I http://localhost:3000
```

## Support

For monitoring alerts and issues:
1. Check Sentry dashboard for real-time errors
2. Review slow query logs for performance issues
3. Monitor rate limit violations for abuse patterns
4. Verify security headers are properly set