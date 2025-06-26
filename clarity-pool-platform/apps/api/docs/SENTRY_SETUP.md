# Sentry Setup Guide

## Quick Setup (5 minutes)

1. **Create Sentry Account**
   - Go to https://sentry.io
   - Sign up for a free account
   - Create a new project:
     - Platform: Node.js
     - Alert frequency: Alert me on every new issue
     - Project name: clarity-pool-api

2. **Get Your DSN**
   - After creating the project, you'll see your DSN
   - It looks like: `https://abc123@o456.ingest.sentry.io/789`
   - Copy this value

3. **Add to Environment**
   ```bash
   # Add to your .env file
   SENTRY_DSN=your_dsn_here
   ```

4. **Restart the API**
   ```bash
   npm run start
   ```

5. **Test It Works**
   ```bash
   # This will create a test error in Sentry
   curl http://localhost:3000/api/monitoring/sentry/test-error
   ```

   Check your Sentry dashboard - you should see the error!

## What Sentry Tracks

- **Server Errors (5xx)** - Database failures, unhandled exceptions
- **Rate Limit Violations (429)** - When users hit rate limits
- **Performance Issues** - Slow API endpoints
- **User Context** - Which user experienced the error

## What Sentry Ignores

- **Client Errors (4xx)** - Bad requests, validation errors
- **Sensitive Data** - Passwords, auth tokens are filtered out

## Production Best Practices

1. **Set Environment**
   ```bash
   NODE_ENV=production
   ```

2. **Lower Sample Rate** 
   - Already configured to 10% in production to save costs

3. **Set Up Alerts**
   - In Sentry dashboard, configure email/Slack alerts
   - Recommended: Alert on new issues only

4. **Monitor Dashboard**
   - Check weekly for error trends
   - Fix recurring errors first

## Costs

- **Free Tier**: 5,000 errors/month
- **With 60 customers**: Should stay well within free tier
- **Upgrade when**: You exceed 5K errors or need team features