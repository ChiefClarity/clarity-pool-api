// apps/api/src/admin/admin.gateway.ts
// STUB VERSION - WebSocket functionality disabled for initial deployment
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AdminGateway {
  private readonly logger = new Logger(AdminGateway.name);

  constructor() {
    this.logger.log('AdminGateway initialized (stub mode - WebSocket disabled)');
  }

  // Stub methods that do nothing but log
  notifyConfigUpdate(config: any): void {
    this.logger.debug('notifyConfigUpdate called (stub)', { config });
  }

  notifyReportSent(data: any): void {
    this.logger.debug('notifyReportSent called (stub)', { data });
  }

  notifyReportOpened(data: any): void {
    this.logger.debug('notifyReportOpened called (stub)', { data });
  }

  notifyPreferencesUpdate(data: any): void {
    this.logger.debug('notifyPreferencesUpdate called (stub)', { data });
  }

  notifyBulkProgress(data: any): void {
    this.logger.debug('notifyBulkProgress called (stub)', { data });
  }

  notifyBulkComplete(result: any): void {
    this.logger.debug('notifyBulkComplete called (stub)', { result });
  }

  notifyError(data: any): void {
    this.logger.debug('notifyError called (stub)', { data });
  }

  getConnectedClients(): any[] {
    return [];
  }
}