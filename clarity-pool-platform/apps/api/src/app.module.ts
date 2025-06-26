import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { BookingModule } from './booking/booking.module';
import { PoolbrainModule } from './poolbrain/poolbrain.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { CustomerModule } from './customer/customer.module';
import { TechnicianModule } from './technician/technician.module';
import { WebsocketModule } from './websocket/websocket.module';
import { EmailModule } from './email/email.module';
import { AuthModule } from './auth/auth.module';
import { OffersModule } from './offers/offers.module';
import { HealthModule } from './health/health.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { AIModule } from './ai/ai.module';
import { SentryConfig } from './config/sentry.config';
import { SentryModule } from '@sentry/nestjs/setup';
import { SecurityMiddleware } from './common/middleware/security.middleware';
import { SecurityConfig } from './config/security.config';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

@Module({
  imports: [
    SentryModule.forRoot(), // Add this first
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    PoolbrainModule,
    BookingModule,
    OnboardingModule,
    CustomerModule,
    TechnicianModule,
    WebsocketModule,
    EmailModule,
    AuthModule,
    OffersModule,
    HealthModule,
    MonitoringModule,
    AIModule,
  ],
  controllers: [AppController],
  providers: [
    AppService, 
    SentryConfig, 
    SecurityConfig,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SecurityMiddleware)
      .forRoutes('*'); // Apply to all routes
  }
}