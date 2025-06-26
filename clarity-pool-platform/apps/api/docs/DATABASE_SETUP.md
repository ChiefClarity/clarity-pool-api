# Database Setup Guide - Clarity Pool Platform

## Overview

This guide explains how to set up and configure the Supabase PostgreSQL database for the Clarity Pool Platform API.

## Prerequisites

- Supabase account (free tier is sufficient for development)
- Node.js 18+ installed
- Access to environment variables (Replit Secrets or local .env)

## Supabase Setup Steps

### 1. Create a Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click "New Project"
3. Fill in:
   - Project name: `clarity-pool-platform`
   - Database Password: (save this securely)
   - Region: Choose closest to your users
4. Click "Create Project" and wait for setup

### 2. Get Your Database Connection String

1. In Supabase Dashboard, go to **Settings** → **Database**
2. Find the **Connection String** section
3. Select **"Transaction"** mode (for connection pooling)
4. Copy the connection string - it looks like:
   ```
   postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
   ```

### 3. Configure Environment Variables

#### For Local Development

Create or update `.env` file:
```env
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres?pgbouncer=true"
```

#### For Replit

1. Open your Replit project
2. Click on "Secrets" (🔒 icon)
3. Add new secret:
   - Key: `DATABASE_URL`
   - Value: Your connection string with `?pgbouncer=true` appended

### 4. Initialize Database Schema

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Verify connection
npx ts-node src/scripts/test-db.ts
```

## Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Supabase connection string (Transaction mode) | `postgresql://postgres.xxx:pass@aws-0-region.pooler.supabase.com:5432/postgres?pgbouncer=true` |
| `DIRECT_URL` | (Optional) Direct connection for migrations | `postgresql://postgres.xxx:pass@db.xxx.supabase.co:5432/postgres` |
| `JWT_SECRET` | Secret for JWT tokens (min 32 chars) | `your-super-secret-jwt-key-change-in-production` |
| `NODE_ENV` | Environment mode | `development` or `production` |

## Common Connection Issues and Solutions

### Issue 1: "Can't reach database server"

**Error**: `P1001: Can't reach database server at localhost:5432`

**Solution**:
- Ensure DATABASE_URL is set correctly
- Check if you're using the pooler URL (not direct connection)
- Verify network connectivity

### Issue 2: "SSL/TLS required"

**Error**: SSL connection required

**Solution**:
- Add `?pgbouncer=true` to your connection string
- Or use `?sslmode=require` for direct connections

### Issue 3: "Authentication failed"

**Error**: `P1010: Access denied` or password authentication failed

**Solution**:
- Verify password is correct (check for special characters)
- Ensure you're using the database password, not dashboard password
- Try resetting database password in Supabase settings

### Issue 4: "Query Engine compatibility"

**Error**: Prisma Client could not locate Query Engine

**Solution**:
```prisma
// In schema.prisma, add:
generator client {
  provider = "prisma-client-js"
  binaryTargets = ["native", "debian-openssl-3.0.x"]
}
```
Then run `npx prisma generate`

### Issue 5: "Connection timeout"

**Error**: `P1002: The database server was reached but timed out`

**Solution**:
- Check firewall/security settings
- Use connection pooler URL (not direct)
- Verify region is accessible

## Verifying Database Connection

### Method 1: Test Script
```bash
npx ts-node src/scripts/test-db.ts
```

### Method 2: Health Check Endpoint
```bash
curl http://localhost:3000/health/database
```

### Method 3: Comprehensive Verification
```bash
npx ts-node src/scripts/verify-db-connection.ts
```

## Database Schema

The API uses Prisma ORM with the following main models:
- **Customer**: Pool service customers
- **Technician**: Service technicians
- **OnboardingSession**: Customer onboarding sessions
- **WaterChemistry**: Pool water test results
- **Equipment**: Pool equipment records
- **PoolDetails**: Pool specifications

## Mock Mode

When database is unavailable, the API automatically runs in "mock mode":
- Uses in-memory data from `MockDataService`
- All endpoints remain functional
- Perfect for development and testing
- No data persistence between restarts

## Production Checklist

- [ ] Use connection pooler URL (Transaction mode)
- [ ] Set strong JWT_SECRET (minimum 32 characters)
- [ ] Enable Row Level Security (RLS) in Supabase
- [ ] Configure backup schedule in Supabase
- [ ] Set up monitoring/alerts
- [ ] Use environment-specific connection strings
- [ ] Test failover behavior

## Monitoring Database Health

The API provides detailed database monitoring at `/health`:

```json
{
  "database": {
    "connected": true,
    "status": "healthy",
    "tableCount": 10,
    "connectionAttempts": 1,
    "lastSuccessfulQuery": "2024-01-20T10:30:00Z",
    "responseTime": "12ms"
  }
}
```

## Support

For database issues:
1. Check `/health/database` endpoint
2. Review logs: `npm run start:dev`
3. Run verification: `npx ts-node src/scripts/verify-db-connection.ts`
4. Check Supabase dashboard for service status

## Security Best Practices

1. **Never commit** `.env` files with real credentials
2. **Use different** passwords for development/production
3. **Enable RLS** on all tables in Supabase
4. **Rotate** credentials regularly
5. **Monitor** failed connection attempts
6. **Use** connection pooling for serverless