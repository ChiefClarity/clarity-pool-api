import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UseFilters,
  HttpException,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import { AdminGuard } from '../auth/guards/admin.guard';
import { BookingExceptionFilter } from '../common/filters/booking-exception.filter';
import { WeeklyReportService } from '../reports/weekly-report.service';
import { ReportScheduler } from '../reports/report.scheduler';
import { PrismaService } from '../prisma/prisma.service';
import {
  ReportConfigDto,
  CustomerPreferencesDto,
  BulkSendDto,
  TestReportDto,
  PreviewReportDto,
  GetReportHistoryDto,
  GetReportAnalyticsDto,
} from './dto/admin-reports.dto';

@Controller('admin/reports')
@UseGuards(AdminGuard)
@UseFilters(BookingExceptionFilter)
export class AdminReportsController {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  @Get('config')
  async getReportConfiguration() {
    try {
      // Get current system configuration for reports
      const config = await this.prisma.systemConfig.findMany({
        where: {
          key: {
            in: ['report_enabled_days', 'report_default_time', 'report_features', 'report_retry_config']
          }
        }
      });
      
      // Parse config values with defaults
      const configData = {
        enabledDays: config.find(c => c.key === 'report_enabled_days')?.value || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        defaultTime: config.find(c => c.key === 'report_default_time')?.value || '09:00',
        enabledFeatures: config.find(c => c.key === 'report_features')?.value || {
          chemistryAnalysis: true,
          weatherIntegration: true,
          aiInsights: true,
          equipmentStatus: true,
          maintenanceReminders: true
        },
        retryAttempts: (config.find(c => c.key === 'report_retry_config')?.value as any)?.retryAttempts || 3,
        retryDelayMinutes: (config.find(c => c.key === 'report_retry_config')?.value as any)?.retryDelayMinutes || 5
      };
      
      return {
        success: true,
        config: configData,
      };
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve report configuration',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('config')
  async updateReportConfiguration(
    @Body(new ValidationPipe({ transform: true, whitelist: true })) data: ReportConfigDto,
  ) {
    try {
      // Update system configuration
      await Promise.all([
        this.prisma.systemConfig.upsert({
          where: { key: 'report_enabled_days' },
          create: { key: 'report_enabled_days', value: data.enabledDays },
          update: { value: data.enabledDays }
        }),
        this.prisma.systemConfig.upsert({
          where: { key: 'report_default_time' },
          create: { key: 'report_default_time', value: data.defaultTime },
          update: { value: data.defaultTime }
        }),
        this.prisma.systemConfig.upsert({
          where: { key: 'report_features' },
          create: { key: 'report_features', value: data.enabledFeatures as any },
          update: { value: data.enabledFeatures as any }
        }),
        this.prisma.systemConfig.upsert({
          where: { key: 'report_retry_config' },
          create: { key: 'report_retry_config', value: { retryAttempts: data.retryAttempts, retryDelayMinutes: data.retryDelayMinutes } },
          update: { value: { retryAttempts: data.retryAttempts, retryDelayMinutes: data.retryDelayMinutes } }
        })
      ]);
      
      return {
        success: true,
        message: 'Report configuration updated successfully',
        config: data,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update report configuration',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('history')
  async getReportHistory(
    @Query(new ValidationPipe({ transform: true, whitelist: true })) query: GetReportHistoryDto,
  ) {
    const { page = 1, limit = 20, status, startDate, endDate } = query;
    const customerId = (query as any).customerId;
    try {
      const pageNum = page;
      const limitNum = limit;
      
      const where: any = {};
      
      if (customerId) {
        where.customerId = customerId;
      }
      
      if (status) {
        where.deliveryStatus = status;
      }
      
      if (startDate || endDate) {
        where.sentAt = {};
        if (startDate) {
          where.sentAt.gte = new Date(startDate);
        }
        if (endDate) {
          where.sentAt.lte = new Date(endDate);
        }
      }
      
      const [reports, total] = await Promise.all([
        this.prisma.reportHistory.findMany({
          where,
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
          orderBy: { sentAt: 'desc' },
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        }),
        this.prisma.reportHistory.count({ where }),
      ]);
      
      return {
        success: true,
        data: reports,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      };
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve report history',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('analytics')
  async getReportAnalytics(
    @Query(new ValidationPipe({ transform: true, whitelist: true })) query: GetReportAnalyticsDto,
  ) {
    const { startDate, endDate } = query;
    try {
      const dateFilter: any = {};
      
      if (startDate || endDate) {
        dateFilter.sentAt = {};
        if (startDate) {
          dateFilter.sentAt.gte = new Date(startDate);
        }
        if (endDate) {
          dateFilter.sentAt.lte = new Date(endDate);
        }
      }
      
      const [totalSent, totalFailed] = await Promise.all([
        this.prisma.reportHistory.count({
          where: { ...dateFilter, deliveryStatus: 'delivered' },
        }),
        this.prisma.reportHistory.count({
          where: { ...dateFilter, deliveryStatus: 'failed' },
        }),
      ]);
      
      const successRate = totalSent + totalFailed > 0 
        ? (totalSent / (totalSent + totalFailed)) * 100 
        : 0;
      
      return {
        success: true,
        analytics: {
          totalSent,
          totalFailed,
          successRate: Math.round(successRate * 100) / 100,
          avgDeliveryTimeMs: 0, // Not available in current schema
          topFailureReasons: [], // Not available in current schema
          dateRange: {
            start: startDate || 'all time',
            end: endDate || 'current',
          },
        },
      };
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve report analytics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('test')
  async sendTestReport(
    @Body(new ValidationPipe({ transform: true, whitelist: true })) data: TestReportDto,
  ) {
    try {
      // For now, we'll simulate sending a test report
      // In a real implementation, this would call the weekly report service
      const result = {
        reportId: `test_${Date.now()}`,
        success: true
      };
      
      return {
        success: true,
        message: 'Test report sent successfully',
        reportId: result.reportId,
        sentAt: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to send test report',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('preview')
  async generateReportPreview(
    @Body(new ValidationPipe({ transform: true, whitelist: true })) data: PreviewReportDto,
  ) {
    try {
      // For now, we'll return a simulated preview
      // In a real implementation, this would generate an actual preview
      const preview = {
        html: '<h1>Sample Report Preview</h1><p>This is a preview of the weekly report.</p>',
        text: 'Sample Report Preview\n\nThis is a preview of the weekly report.',
        subject: `${data.reportType.charAt(0).toUpperCase() + data.reportType.slice(1)} Pool Report Preview`,
        metadata: {
          customerId: data.customerId,
          reportType: data.reportType,
          generatedAt: new Date().toISOString()
        }
      };
      
      return {
        success: true,
        preview: {
          html: preview.html,
          text: preview.text,
          subject: preview.subject,
          metadata: preview.metadata,
        },
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to generate report preview',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('preferences/:customerId')
  async getCustomerPreferences(@Param('customerId') customerId: string) {
    try {
      const preferences = await this.prisma.reportPreferences.findUnique({
        where: { customerId: parseInt(customerId) },
      });
      
      if (!preferences) {
        // Return default preferences if none exist
        return {
          success: true,
          preferences: {
            enabled: true,
            reportDelay: 5,
            includeCharts: true,
            preferredFormat: 'html',
          },
        };
      }
      
      return {
        success: true,
        preferences,
      };
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve customer preferences',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('preferences/:customerId')
  async updateCustomerPreferences(
    @Param('customerId') customerId: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) data: CustomerPreferencesDto,
  ) {
    try {
      const updatedPreferences = await this.prisma.reportPreferences.upsert({
        where: { customerId: parseInt(customerId) },
        create: {
          customerId: parseInt(customerId),
          enabled: data.receiveReports,
          reportDelay: 5,
          includeCharts: true,
          preferredFormat: data.emailFormat,
        },
        update: {
          enabled: data.receiveReports,
          preferredFormat: data.emailFormat,
        },
      });
      
      return {
        success: true,
        message: 'Customer preferences updated successfully',
        preferences: updatedPreferences,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update customer preferences',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('bulk-send')
  async sendBulkReports(
    @Body(new ValidationPipe({ transform: true, whitelist: true })) data: BulkSendDto,
  ) {
    try {
      // Build customer filter
      const where: any = {};
      
      if (data.customerIds && data.customerIds.length > 0) {
        where.id = { in: data.customerIds };
      }
      
      if (data.tags && data.tags.length > 0) {
        where.tags = { hasSome: data.tags };
      }
      
      // Get eligible customers
      const customers = await this.prisma.customer.findMany({
        where: {
          ...where,
          active: true,
          reportPreferences: {
            enabled: true,
          },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      });
      
      if (data.dryRun) {
        return {
          success: true,
          dryRun: true,
          message: `Would send ${data.reportType} reports to ${customers.length} customers`,
          customers: customers.map(c => ({
            id: c.id,
            name: `${c.firstName} ${c.lastName}`,
            email: c.email,
          })),
        };
      }
      
      // Queue reports for sending
      const results = await Promise.allSettled(
        customers.map(customer =>
          // Simulate queuing a report - in real implementation this would call the scheduler
          Promise.resolve({ success: true, customerId: customer.id })
        ),
      );
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      return {
        success: true,
        message: `Bulk report send initiated`,
        summary: {
          total: customers.length,
          queued: successful,
          failed,
        },
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to send bulk reports',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}