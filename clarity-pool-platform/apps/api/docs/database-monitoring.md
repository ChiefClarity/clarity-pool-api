# Database Query Monitoring

## Overview

The database query monitoring system tracks all database queries, identifies slow queries, monitors connection pool usage, and integrates with Sentry for critical alerts.

## Features

- **Query Performance Tracking**: Records duration for all database queries
- **Slow Query Detection**: Automatically identifies and logs queries exceeding threshold (default: 1000ms)
- **Connection Pool Monitoring**: Tracks active/idle connections and alerts on exhaustion
- **Sentry Integration**: Sends alerts for critical slow queries (>5 seconds)
- **Performance Testing**: Built-in tools to simulate various load scenarios

## API Endpoints

### Get Database Statistics
```
GET /api/monitoring/database/stats
```

Returns comprehensive database metrics including:
- Query count and average execution time
- Top slow queries
- Query breakdown by type (SELECT, INSERT, UPDATE, DELETE)
- Connection pool status

### Get Slow Queries
```
GET /api/monitoring/database/slow-queries?limit=20
```

Returns a list of the slowest queries with execution times and timestamps.

### Get Connection Pool Status
```
GET /api/monitoring/database/connection-pool
```

Returns current connection pool statistics and recommendations.

### Set Slow Query Threshold (Protected)
```
POST /api/monitoring/database/set-threshold
Authorization: Bearer <token>
Body: { "threshold": 2000 }
```

Updates the threshold for what's considered a slow query (in milliseconds).

### Run Performance Test (Protected)
```
POST /api/monitoring/database/test-performance
Authorization: Bearer <token>
```

Runs a simulated performance test to verify monitoring is working correctly.

### Test Slow Query (Protected)
```
POST /api/monitoring/database/test-slow-query
Authorization: Bearer <token>
```

Intentionally runs a slow query to test alerting.

## Configuration

### Environment Variables

```bash
# Enable query logging in development
NODE_ENV=development

# Sentry DSN for alert integration
SENTRY_DSN=your-sentry-dsn
```

### Slow Query Threshold

The default slow query threshold is 1000ms. You can adjust this:

1. Via API: Use the `/set-threshold` endpoint
2. In code: Modify `DatabaseMonitorService` constructor

## Implementation Details

### Query Monitoring

The system intercepts all database queries using:
- Custom `executeRawQuery` method for raw SQL
- Prisma middleware for ORM queries (when available)

### Connection Pool Monitoring

Currently simulates connection pool stats. For production:
1. Replace with actual pool metrics from your database driver
2. Consider using `pg-pool` events for PostgreSQL

### Data Retention

- Stores last 1000 queries in memory
- Resets statistics every hour
- Slow queries are preserved separately

## Alerts and Notifications

### Sentry Alerts

Automatic alerts are sent to Sentry for:
- Queries taking >5 seconds
- Connection pool >90% utilization
- Database connection failures

### Monitoring Dashboard

Access real-time metrics at:
- Development: http://localhost:3000/api/monitoring/database/stats
- Production: https://api.getclarity.services/api/monitoring/database/stats

## Best Practices

1. **Set Appropriate Thresholds**: Adjust slow query threshold based on your application's needs
2. **Regular Monitoring**: Check slow queries weekly to identify optimization opportunities
3. **Connection Pool Sizing**: Monitor pool usage and adjust size based on traffic
4. **Query Optimization**: Use the slow query log to identify and optimize problematic queries

## Troubleshooting

### No Queries Showing Up
- Ensure `NODE_ENV` is set to development
- Check that DatabaseMonitorService is properly injected

### High Memory Usage
- Reduce `maxStoredQueries` in DatabaseMonitorService
- Implement external storage (Redis) for production

### False Positive Slow Queries
- Adjust threshold based on your infrastructure
- Consider network latency in threshold calculation