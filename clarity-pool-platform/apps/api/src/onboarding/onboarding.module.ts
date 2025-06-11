import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { OnboardingSyncService } from './onboarding-sync.service';
import { PoolbrainModule } from '../poolbrain/poolbrain.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PoolbrainModule, PrismaModule],
  controllers: [OnboardingController],
  providers: [OnboardingService, OnboardingSyncService],
})
export class OnboardingModule {}