// apps/api/src/admin/admin-reports.controller.ts
// ENTERPRISE GRADE FIX - Matches DTOs exactly
import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Body, 
  Param, 
  Query,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AdminReportsService } from './admin-reports.service';
import { 
  UpdateReportConfigDto,
  ReportHistoryFiltersDto,
  TestReportDto,
  PreviewReportDto,
  CustomerPreferencesDto,
  BulkSendDto,
} from './dto/admin-reports.dto';
@Controller('api/admin/reports')
@UseGuards(AdminGuard)
export class AdminReportsController {
  private readonly logger = new Logger(AdminReportsController.name);

  constructor(
    private readonly adminReportsService: AdminReportsService,
  ) {}

  @Get('weekly/config')
  async getWeeklyReportConfig() {
    try {
      return await this.adminReportsService.getWeeklyReportConfig();
    } catch (error) {
      this.logger.error('Failed to fetch report configuration', error);
      throw error;
    }
  }

  @Put('weekly/config')
  async updateWeeklyReportConfig(@Body() config: UpdateReportConfigDto) {
    try {
      return await this.adminReportsService.updateWeeklyReportConfig(config);
    } catch (error) {
      this.logger.error('Failed to update report configuration', error);
      throw error;
    }
  }

  @Get('weekly/history')
  async getReportHistory(@Query() filters: ReportHistoryFiltersDto) {
    try {
      return await this.adminReportsService.getReportHistory(filters);
    } catch (error) {
      this.logger.error('Failed to fetch report history', error);
      throw error;
    }
  }

  @Post('weekly/test')
  @HttpCode(HttpStatus.OK)
  async sendTestReport(@Body() dto: TestReportDto) {
    try {
      return await this.adminReportsService.sendTestReport(dto);
    } catch (error) {
      this.logger.error('Failed to send test report', error);
      throw error;
    }
  }

  @Get('weekly/analytics')
  async getReportAnalytics(
    @Query('days', ParseIntPipe) days: number = 30
  ) {
    try {
      return await this.adminReportsService.getReportAnalytics(days);
    } catch (error) {
      this.logger.error('Failed to fetch report analytics', error);
      throw error;
    }
  }

  @Post('weekly/preview')
  async previewReport(@Body() dto: PreviewReportDto) {
    try {
      return await this.adminReportsService.generateReportPreview(dto);
    } catch (error) {
      this.logger.error('Failed to generate preview', error);
      throw error;
    }
  }

  @Put('preferences/:customerId')
  async updateCustomerPreferences(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Body() preferences: CustomerPreferencesDto
  ) {
    try {
      return await this.adminReportsService.updateCustomerPreferences(customerId, preferences);
    } catch (error) {
      this.logger.error(`Failed to update preferences for customer ${customerId}`, error);
      throw error;
    }
  }

  @Get('preferences/:customerId')
  async getCustomerPreferences(
    @Param('customerId', ParseIntPipe) customerId: number
  ) {
    try {
      return await this.adminReportsService.getCustomerPreferences(customerId);
    } catch (error) {
      this.logger.error(`Failed to fetch preferences for customer ${customerId}`, error);
      throw error;
    }
  }

  @Post('weekly/bulk-send')
  @HttpCode(HttpStatus.ACCEPTED)
  async sendBulkReports(@Body() dto: BulkSendDto) {
    try {
      return await this.adminReportsService.sendBulkReports(dto);
    } catch (error) {
      this.logger.error('Failed to send bulk reports', error);
      throw error;
    }
  }
}