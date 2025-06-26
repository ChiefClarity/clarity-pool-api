# Database Connection Guide for Clarity Pool Platform

## Connection Strategy

### Development
- **Type**: Session Pooler
- **Port**: 5432 (pooler endpoint)
- **Why**: Supports all Prisma features including migrations

### Production  
- **Type**: Transaction Pooler
- **Port**: 6543
- **Parameters**: ?pgbouncer=true&connection_limit=1
- **Why**: Better for serverless, handles thousands of concurrent users

## Switching Between Environments

1. **For Migrations**: Use direct connection temporarily
2. **For Runtime**: Use appropriate pooler
3. **For Monitoring**: Check connection type in logs

## Troubleshooting

- "prepared statement already exists" → Use Session Pooler or add ?pgbouncer=true
- "too many connections" → Switch to Transaction Pooler
- "connection timeout" → Check if database is paused in Supabase

## Best Practices

1. Always use pooled connections in production
2. Set connection_limit=1 for serverless
3. Monitor connection count in Supabase dashboard
4. Use direct connection only for migrations