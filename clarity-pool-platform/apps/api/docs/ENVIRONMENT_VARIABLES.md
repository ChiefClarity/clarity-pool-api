# Environment Variables Documentation

This document describes all environment variables used by the Clarity Pool API.

## Required Environment Variables

### Database Configuration
- `DATABASE_URL` - PostgreSQL connection string (required)
  - Format: `postgresql://user:password@host:port/database`
  - Example: `postgresql://postgres:password@localhost:5432/clarity_pool`

### Poolbrain Integration
- `POOLBRAIN_API_URL` - Poolbrain API base URL (required)
  - Example: `https://api.poolbrain.com`
- `POOLBRAIN_API_KEY` - Poolbrain API authentication key (required)

### Authentication
- `JWT_SECRET` - Secret key for JWT token signing (required)
  - Should be a long, random string
  - Change this in production!

### Admin Configuration
- `ADMIN_EMAILS` - Comma-separated list of admin email addresses (required)
  - Example: `admin@claritypool.com,manager@claritypool.com`
- `ADMIN_JWT_SECRET` - Separate JWT secret for admin authentication (optional)
  - Falls back to `JWT_SECRET` if not provided
- `ADMIN_DASHBOARD_URL` - URL of the admin dashboard for CORS (required)
  - Example: `http://localhost:3001` for development

## Optional Environment Variables

### Application Settings
- `NODE_ENV` - Application environment (default: `development`)
  - Options: `development`, `production`, `test`
- `PORT` - Server port (default: `3000`)

### AI Services
- `GEMINI_API_KEY` - Google Gemini API key for AI analysis
- `ANTHROPIC_API_KEY` - Anthropic Claude API key for AI analysis
- `GOOGLE_MAPS_API_KEY` - Google Maps API key for location services

### AWS S3 Storage
- `AWS_ACCESS_KEY_ID` - AWS access key for S3
- `AWS_SECRET_ACCESS_KEY` - AWS secret key for S3
- `AWS_REGION` - AWS region (default: `us-east-2`)
- `S3_BUCKET_NAME` - S3 bucket name for file storage

### Email Configuration
- `GMAIL_USER` - Gmail address for sending emails
- `GMAIL_APP_PASSWORD` - Gmail app-specific password
- `FRONT_CHANNEL_EMAIL` - Primary email for notifications
- `CC_EMAILS` - Comma-separated CC email addresses

### Report Configuration
- `WEATHER_API_KEY` - OpenWeatherMap API key for weather data
- `WEATHER_API_URL` - Weather API base URL (default: `https://api.openweathermap.org/data/2.5`)
- `REPORT_DELAY_MINUTES` - Delay in minutes before sending reports (default: `5`)
- `POOLBRAIN_WEBHOOK_SECRET` - Secret for validating Poolbrain webhooks

### Optional Services
- `GOOGLE_CSE_ID` - Google Custom Search Engine ID for equipment search
- `SENTRY_DSN` - Sentry DSN for error tracking
- `DIRECT_URL` - Direct database URL for migrations (bypasses connection pooling)

### OpenTelemetry Monitoring
- `OTEL_EXPORTER_OTLP_ENDPOINT` - OpenTelemetry collector endpoint
- `OTEL_SERVICE_NAME` - Service name for telemetry (default: `clarity-pool-api`)

## Environment-Specific Configuration

### Development
```env
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@localhost:5432/clarity_pool_dev
ADMIN_DASHBOARD_URL=http://localhost:3001
```

### Production
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:password@production-host:5432/clarity_pool
ADMIN_DASHBOARD_URL=https://admin.claritypool.com
# Ensure all secrets are changed!
JWT_SECRET=<strong-random-secret>
ADMIN_JWT_SECRET=<different-strong-random-secret>
POOLBRAIN_WEBHOOK_SECRET=<webhook-secret>
```

## Security Notes

1. **Never commit real secrets to version control**
2. **Use different secrets for different environments**
3. **Rotate secrets regularly**
4. **Use strong, randomly generated secrets**
5. **Consider using a secrets management service in production**

## Getting API Keys

1. **OpenWeatherMap API Key**
   - Sign up at https://openweathermap.org/api
   - Free tier includes 1,000 calls/day
   
2. **Google APIs**
   - Create a project at https://console.cloud.google.com
   - Enable required APIs (Maps, Gemini)
   - Create API keys with appropriate restrictions

3. **Anthropic API Key**
   - Apply for access at https://www.anthropic.com/api
   - Requires approval for production use

4. **AWS Credentials**
   - Create IAM user with S3 permissions
   - Generate access keys in AWS Console

5. **Gmail App Password**
   - Enable 2FA on your Google account
   - Generate app-specific password at https://myaccount.google.com/apppasswords