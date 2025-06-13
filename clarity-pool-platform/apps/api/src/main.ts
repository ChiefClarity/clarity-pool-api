import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

// Load .env file only in non-production environments
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: '../.env', override: true });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'https://clarity-booking-widget.replit.app',
      'https://949bb9d9-20e5-4034-8684-cb259147ff61-00-a5qcmciupnit.picard.replit.dev:3000',
      'https://www.getclarity.services',
      /\.replit\.dev$/
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
  }));
  
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();