// apps/api/src/admin/admin.module.ts
// SIMPLIFIED VERSION - No WebSocket for initial deployment
import { Module } from '@nestjs/common';
import { AdminReportsController } from './admin-reports.controller';
import { AdminReportsService } from './admin-reports.service';
import { AdminGateway } from './admin.gateway';
import { ReportsModule } from '../reports/reports.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    ReportsModule,
    PrismaModule,
  ],
  controllers: [AdminReportsController],
  providers: [AdminReportsService, AdminGateway],
  exports: [AdminReportsService],
})
export class AdminModule {}