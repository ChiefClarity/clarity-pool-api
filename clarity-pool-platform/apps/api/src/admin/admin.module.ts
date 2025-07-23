// apps/api/src/admin/admin.module.ts
// ENTERPRISE GRADE - Properly configured module with all dependencies
import { Module } from '@nestjs/common';
import { AdminReportsController } from './admin-reports.controller';
import { AdminReportsService } from './admin-reports.service';
import { AdminGateway } from './admin.gateway';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ReportsModule } from '../reports/reports.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    ReportsModule,
    PrismaModule,
  ],
  controllers: [AdminReportsController],
  providers: [
    AdminReportsService,
    AdminGateway,
    AdminGuard, // Provide AdminGuard in this module
  ],
  exports: [AdminReportsService, AdminGuard],
})
export class AdminModule {}