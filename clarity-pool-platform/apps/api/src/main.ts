// IMPORTANT: Make sure to import `instrument.ts` at the top of your file.
// If you're using CommonJS (CJS) syntax, use `require("./instrument.ts");`
import './instrument';

// All other imports below
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import * as compression from 'compression';
import { SentryExceptionFilter } from './common/filters/sentry-exception.filter';
import { SecurityConfig } from './config/security.config';

// Load .env file only in non-production environments
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: '../.env', override: true });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Get security config
  const securityConfig = app.get(SecurityConfig);
  
  // Apply Helmet with custom configuration
  app.use(helmet(securityConfig.getHelmetOptions()));
  
  // Enable compression for responses
  app.use(compression(securityConfig.getCompressionOptions()));
  
  // Get the Express instance
  const expressApp = app.getHttpAdapter().getInstance();
  
  // Trust proxy - important for rate limiting and getting real IPs
  expressApp.set('trust proxy', 1);
  
  // Disable X-Powered-By
  expressApp.disable('x-powered-by');
  
  // Global rate limit - 60 requests per minute
  const globalLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 requests
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });
  
  // Auth rate limit - 5 attempts per 15 minutes
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
    message: 'Too many login attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful logins
  });
  
  // Apply global limiter to all routes
  app.use(globalLimiter);
  
  // Apply stricter limiter to auth routes
  app.use('/api/auth/technician/login', authLimiter);
  app.use('/api/auth/technician/refresh', rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // 10 refresh attempts
    skipSuccessfulRequests: true,
  }));
  
  // Bypass for internal services
  app.use((req: any, _res: any, next: any) => {
    const bypassTokens = ['internal-service-token-1', 'internal-service-token-2'];
    const authHeader = req.headers.authorization;
    
    if (authHeader && bypassTokens.some(token => authHeader.includes(token))) {
      // Skip rate limiting
      req.rateLimit = { limit: 999999, remaining: 999999, resetTime: new Date() };
    }
    next();
  });
  
  // Configure CORS with strict settings
  app.enableCors(securityConfig.getCorsOptions());
  
  // Global validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
  // Add Sentry exception filter
  app.useGlobalFilters(new SentryExceptionFilter());
  
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  
  console.log(`
  🚀 Clarity Pool API Running!
  ============================
  URL: http://localhost:${port}
  
  Test Endpoints:
  - POST http://localhost:${port}/api/auth/technician/login
    Body: {"email":"test@claritypool.com","password":"test123"}
  
  - GET http://localhost:${port}/api/offers/technician/1
    Header: Authorization: Bearer YOUR_TOKEN
  
  - GET http://localhost:${port}/api/onboarding/sessions/technician/1
    Header: Authorization: Bearer YOUR_TOKEN
  `);
}

bootstrap();