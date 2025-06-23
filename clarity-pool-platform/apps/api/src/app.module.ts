import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
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
import { HealthController } from './health/health.controller';

@Module({
  imports: [
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
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}