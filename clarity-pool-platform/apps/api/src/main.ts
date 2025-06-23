import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

// Load .env file only in non-production environments
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: '../.env', override: true });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // CRITICAL: Enable CORS for Tech App
  app.enableCors({
    origin: [
      'http://localhost:19006',  // Expo web
      'http://localhost:8081',   // Expo mobile
      'http://localhost:3001',   // Tech App alt port
      /^https:\/\/.*\.replit\.dev$/,  // Replit previews
      'http://localhost:3000',   // Same origin
      'https://clarity-booking-widget.replit.app',
      'https://www.getclarity.services',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });
  
  // Global validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
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