import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { DatabaseMonitorService } from '../monitoring/database-monitor.service';

@Global()
@Module({
  providers: [DatabaseMonitorService, PrismaService],
  exports: [PrismaService, DatabaseMonitorService],
})
export class PrismaModule {}
