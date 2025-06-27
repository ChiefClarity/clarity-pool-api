import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { OnboardingSyncService } from './onboarding-sync.service';
import { PoolbrainModule } from '../poolbrain/poolbrain.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MockDataService } from '../common/mock-data.service';
import { AuthModule } from '../auth/auth.module';
import { AIModule } from '../ai/ai.module';

@Module({
  imports: [
    PoolbrainModule, 
    PrismaModule, 
    AuthModule,
    AIModule,
    MulterModule.register({
      dest: './uploads',
    }),
  ],
  controllers: [OnboardingController],
  providers: [OnboardingService, OnboardingSyncService, MockDataService],
})
export class OnboardingModule {}