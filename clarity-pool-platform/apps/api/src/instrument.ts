// Import with 'const Sentry = require' for CJS
import * as Sentry from '@sentry/nestjs';

Sentry.init({
  dsn: 'https://0bb3211b190970a04037ee7d32c3caa6@o4509565617708864.ingest.us.sentry.io/4509565741367296',

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  profilesSampleRate: 1.0,

  // Environment
  environment: process.env.NODE_ENV || 'development',

  // Release tracking
  release: process.env.npm_package_version,

  // Setting this option to true will send default PII data to Sentry.
  // For production, set to false and manually control what gets sent
  sendDefaultPii: false,

  // Our custom beforeSend filter
  beforeSend(event) {
    // Don't send 4xx client errors except 429 (rate limit)
    if (
      event.exception?.values?.[0]?.value?.includes('status code: 4') &&
      !event.exception?.values?.[0]?.value?.includes('429')
    ) {
      return null;
    }

    // Remove sensitive data
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers?.authorization;
      if (event.request.data && typeof event.request.data === 'object') {
        const data = event.request.data as any;
        delete data.password;
        delete data.passwordHash;
      }
    }

    return event;
  },
});
