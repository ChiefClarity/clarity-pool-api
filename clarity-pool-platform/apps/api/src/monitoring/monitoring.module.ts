import { Module } from '@nestjs/common';
import { RateLimitController } from './rate-limit.controller';
import { SentryTestController } from './sentry-test.controller';
import { SecurityTestController } from './security-test.controller';
import { DatabaseMonitorService } from './database-monitor.service';
import { DatabaseMonitorController } from './database-monitor.controller';
import { MonitoringDashboardController } from './monitoring-dashboard.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { HealthModule } from '../health/health.module';

@Module({
  imports: [PrismaModule, HealthModule],
  controllers: [
    RateLimitController, 
    SentryTestController, 
    SecurityTestController,
    DatabaseMonitorController,
    MonitoringDashboardController,
  ],
  providers: [DatabaseMonitorService],
  exports: [DatabaseMonitorService],
})
export class MonitoringModule {}