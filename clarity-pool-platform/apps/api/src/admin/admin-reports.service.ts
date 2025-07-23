// apps/api/src/admin/admin-reports.service.ts
// ENTERPRISE GRADE FIX - Properly handles all DTO properties and Prisma types
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WeeklyReportService } from '../reports/weekly-report.service';
import { ConfigService } from '@nestjs/config';
import { AdminGateway } from './admin.gateway';
import * as Sentry from '@sentry/node';
import { 
  UpdateReportConfigDto,
  ReportHistoryFiltersDto,
  UpdatePreferencesDto,
  TestReportDto,
  PreviewReportDto,
  CustomerPreferencesDto,
  BulkSendDto,
} from './dto/admin-reports.dto';

@Injectable()
export class AdminReportsService {
  private readonly logger = new Logger(AdminReportsService.name);
  private readonly defaultConfig = {
    enabled: true,
    defaultDelay: 5,
    includeCharts: true,
    aiProvider: 'claude',
    weatherEnabled: process.env.WEATHER_ENABLED !== 'false',
    defaultFormat: 'html',
    scheduleCron: '0 9 * * MON',
  };
  
  constructor(
    private readonly prisma: PrismaService,
    private readonly weeklyReportService: WeeklyReportService,
    private readonly configService: ConfigService,
    private readonly adminGateway: AdminGateway,
  ) {}

  async getWeeklyReportConfig() {
    try {
      const config = await this.prisma.systemConfig.findFirst({
        where: { key: 'weekly_reports' }
      });

      if (!config) {
        this.logger.log('No config found, returning defaults');
        return this.defaultConfig;
      }

      return {
        ...this.defaultConfig,
        ...(config.value as object),
      };
    } catch (error) {
      this.logger.error('Failed to fetch weekly report config', {
        error: error.message,
        stack: error.stack,
      });
      
      if (process.env.NODE_ENV === 'production') {
        Sentry.captureException(error);
      }
      
      if (process.env.NODE_ENV === 'development') {
        return this.defaultConfig;
      }
      
      throw error;
    }
  }

  async updateWeeklyReportConfig(config: UpdateReportConfigDto) {
    try {
      if (config.defaultDelay !== undefined && config.defaultDelay < 0) {
        throw new BadRequestException('Default delay cannot be negative');
      }

      const mergedConfig = {
        ...this.defaultConfig,
        ...config,
      };

      // Ensure proper JSON serialization for Prisma
      const configData = JSON.parse(JSON.stringify({
        ...mergedConfig,
        enabledDays: config.enabledDays || ['MON', 'TUE', 'WED', 'THU', 'FRI'],
        defaultTime: config.defaultTime || '09:00',
        enabledFeatures: config.enabledFeatures || { 
          charts: true, 
          weather: process.env.WEATHER_ENABLED !== 'false', 
          insights: true 
        },
        retryAttempts: config.retryAttempts || 3,
        retryDelayMinutes: config.retryDelayMinutes || 15,
        lastModifiedBy: 'admin',
        lastModifiedAt: new Date().toISOString(),
      }));

      const updated = await this.prisma.systemConfig.upsert({
        where: { key: 'weekly_reports' },
        update: { 
          value: configData,
          updatedAt: new Date(),
        },
        create: { 
          key: 'weekly_reports', 
          value: configData,
        }
      });

      this.logger.log('Weekly report configuration updated');
      this.adminGateway.notifyConfigUpdate(configData);
      
      return updated.value as any;
    } catch (error) {
      this.logger.error('Failed to update weekly report config', error);
      if (process.env.NODE_ENV === 'production') {
        Sentry.captureException(error);
      }
      throw error;
    }
  }

  async getReportHistory(filters: ReportHistoryFiltersDto) {
    try {
      const where: any = {};
      
      if (filters.startDate || filters.endDate) {
        where.sentAt = {};
        if (filters.startDate) {
          where.sentAt.gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          where.sentAt.lte = new Date(filters.endDate);
        }
      }

      if (filters.customerId) {
        where.customerId = filters.customerId;
      }

      const limit = filters.limit || 50;
      const offset = filters.offset || 0;

      const [reports, total] = await Promise.all([
        this.prisma.reportHistory.findMany({
          where,
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                address: true,
                city: true,
                state: true,
              }
            },
          },
          orderBy: { sentAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        this.prisma.reportHistory.count({ where })
      ]);

      return {
        reports,
        total,
        page: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(total / limit),
        limit,
        offset,
      };
    } catch (error) {
      this.logger.error('Failed to fetch report history', error);
      throw error;
    }
  }

  async getReportAnalytics(days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const [totalSent, totalOpened, avgHealthScore] = await Promise.all([
        this.prisma.reportHistory.count({
          where: { sentAt: { gte: startDate } }
        }),
        this.prisma.reportHistory.count({
          where: { 
            sentAt: { gte: startDate },
            opened: true 
          }
        }),
        this.prisma.reportHistory.aggregate({
          where: { sentAt: { gte: startDate } },
          _avg: { healthScore: true }
        }),
      ]);

      const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;

      return {
        totalSent,
        totalOpened,
        openRate: parseFloat(openRate.toFixed(1)),
        avgHealthScore: avgHealthScore._avg.healthScore || 0,
        uniqueCustomers: 0, // TODO: Implement
        deliveryRate: 100, // TODO: Implement
        byDay: [], // TODO: Implement
      };
    } catch (error) {
      this.logger.error('Failed to generate report analytics', error);
      throw error;
    }
  }

  async sendTestReport(dto: TestReportDto) {
    try {
      // Find customer by email
      const customer = await this.prisma.customer.findFirst({
        where: { email: dto.recipientEmail },
      });

      if (!customer) {
        throw new NotFoundException(`Customer with email ${dto.recipientEmail} not found`);
      }

      // Use provided customerId or the found customer's ID
      const targetCustomerId = dto.customerId || customer.id;

      // Generate and send report
      await this.weeklyReportService.generateReportForJob(targetCustomerId);
      
      this.logger.log(`Test report sent to ${dto.recipientEmail}`);
      
      return { 
        success: true, 
        message: `Test report sent successfully to ${dto.recipientEmail}`,
      };
    } catch (error) {
      this.logger.error(`Failed to send test report to ${dto.recipientEmail}:`, error);
      throw error;
    }
  }

  async generateReportPreview(dto: PreviewReportDto) {
    try {
      // Implementation for preview
      const config = await this.getWeeklyReportConfig();
      const subject = dto.emailTemplate?.subject || 'Your Weekly Pool Service Report';
      
      return {
        html: `<h1>${subject}</h1><p>Preview content here...</p>`,
        previewMode: true,
        generatedAt: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to generate preview', error);
      throw error;
    }
  }

  async updateCustomerPreferences(customerId: number, dto: CustomerPreferencesDto) {
    try {
      const updated = await this.prisma.reportPreferences.upsert({
        where: { customerId },
        update: {
          enabled: dto.receiveReports,
          reportDelay: 5,
          includeCharts: true,
          preferredFormat: 'html',
          updatedAt: new Date(),
        },
        create: {
          customerId,
          enabled: dto.receiveReports,
          reportDelay: 5,
          includeCharts: true,
          preferredFormat: 'html',
        }
      });

      this.logger.log(`Updated preferences for customer ${customerId}`);
      return updated;
    } catch (error) {
      this.logger.error(`Failed to update preferences`, error);
      throw error;
    }
  }

  async getCustomerPreferences(customerId: number) {
    try {
      return await this.prisma.reportPreferences.findUnique({
        where: { customerId }
      });
    } catch (error) {
      this.logger.error(`Failed to fetch preferences`, error);
      throw error;
    }
  }

  async sendBulkReports(dto: BulkSendDto) {
    try {
      let customerIds: number[] = [];

      if (dto.recipientIds && dto.recipientIds.length > 0) {
        const customers = await this.prisma.customer.findMany({
          where: { id: { in: dto.recipientIds.map(id => parseInt(id)) } },
          select: { id: true }
        });
        customerIds = customers.map(c => c.id);
      } else if (dto.sendToAll) {
        const customers = await this.prisma.customer.findMany({
          where: { active: true },
          select: { id: true },
          take: 100, // Limit for safety
        });
        customerIds = customers.map(c => c.id);
      } else if (dto.customerIds) {
        customerIds = dto.customerIds;
      }

      const results = [];
      for (const customerId of customerIds) {
        try {
          await this.weeklyReportService.generateReportForJob(customerId);
          results.push({ customerId, success: true });
        } catch (error) {
          results.push({ customerId, success: false, error: error.message });
        }
      }

      return {
        total: customerIds.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
      };
    } catch (error) {
      this.logger.error('Failed to send bulk reports', error);
      throw error;
    }
  }
}