import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { WeeklyReportService } from '../reports/weekly-report.service';
import { WeeklyReportTemplate } from '../reports/templates/weekly-report.template';
import { WeatherService } from '../weather/weather.service';
import { 
  AdminReportConfig,
  AdminReportHistory,
  AdminReportAnalytics,
  AdminReportPreferences,
  BulkSendResult,
  ReportRecipient 
} from './interfaces/admin-reports.interface';
import {
  ReportConfigDto,
  TestReportDto,
  PreviewReportDto,
  CustomerPreferencesDto,
  BulkSendDto
} from './dto/admin-reports.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class AdminReportsService {
  private readonly logger = new Logger(AdminReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly weeklyReportService: WeeklyReportService,
    private readonly weeklyReportTemplate: WeeklyReportTemplate,
    private readonly weatherService: WeatherService,
  ) {}

  async getReportConfig(): Promise<AdminReportConfig> {
    try {
      // For now, return default config until admin schema is added
      const config = await this.prisma.systemConfig.findUnique({
        where: { key: 'admin_report_config' },
      });

      if (!config) {
        // Create default config if none exists
        return this.createDefaultConfig();
      }

      const configData = config.value as any;
      return {
        id: config.id.toString(),
        isEnabled: configData.isEnabled ?? true,
        scheduleDay: configData.scheduleDay ?? 'monday',
        scheduleTime: configData.scheduleTime ?? '09:00',
        timeZone: configData.timeZone ?? 'America/New_York',
        emailSubjectTemplate: configData.emailSubjectTemplate ?? 'Your Weekly Pool Service Report',
        emailFooterText: configData.emailFooterText ?? 'Thank you for choosing our pool service!',
        notificationEmails: configData.notificationEmails ?? [],
        lastModifiedBy: configData.lastModifiedBy ?? 'system',
        lastModifiedAt: configData.lastModifiedAt ? new Date(configData.lastModifiedAt) : new Date(),
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      };
    } catch (error) {
      this.logger.error('Error fetching report config:', error);
      // Return default config on error
      return this.createDefaultConfig();
    }
  }

  async updateReportConfig(dto: ReportConfigDto, adminEmail: string): Promise<AdminReportConfig> {
    try {
      const configData = {
        enabledDays: dto.enabledDays,
        defaultTime: dto.defaultTime,
        enabledFeatures: dto.enabledFeatures,
        retryAttempts: dto.retryAttempts,
        retryDelayMinutes: dto.retryDelayMinutes,
        lastModifiedBy: adminEmail,
        lastModifiedAt: new Date(),
      };

      await this.prisma.systemConfig.upsert({
        where: { key: 'admin_report_config' },
        update: { value: configData },
        create: {
          key: 'admin_report_config',
          value: configData,
        },
      });

      return this.getReportConfig();
    } catch (error) {
      this.logger.error('Error updating report config:', error);
      throw error;
    }
  }

  async getReportHistory(
    page: number = 1,
    limit: number = 20,
    status?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{ data: AdminReportHistory[]; total: number; page: number; totalPages: number }> {
    try {
      const skip = (page - 1) * limit;
      
      const where: Prisma.ReportHistoryWhereInput = {};
      if (status) {
        where.deliveryStatus = status;
      }
      if (startDate || endDate) {
        where.sentAt = {};
        if (startDate) {
          where.sentAt.gte = startDate;
        }
        if (endDate) {
          where.sentAt.lte = endDate;
        }
      }

      const [data, total] = await Promise.all([
        this.prisma.reportHistory.findMany({
          where,
          skip,
          take: limit,
          orderBy: { sentAt: 'desc' },
          include: {
            customer: true,
          },
        }),
        this.prisma.reportHistory.count({ where }),
      ]);

      const history: AdminReportHistory[] = data.map((item: any) => ({
        id: item.id.toString(),
        reportType: item.reportType,
        recipientCount: 1,
        successCount: item.deliveryStatus === 'delivered' ? 1 : 0,
        failureCount: item.deliveryStatus === 'failed' ? 1 : 0,
        status: item.deliveryStatus || 'sent',
        errorMessage: undefined,
        sentAt: item.sentAt,
        sentBy: 'system',
        metadata: {
          customerId: item.customerId,
          customerEmail: item.customer.email,
          jobId: item.jobId,
          healthScore: item.healthScore,
        },
      }));

      return {
        data: history,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error('Error fetching report history:', error);
      throw error;
    }
  }

  async getReportAnalytics(
    startDate: Date,
    endDate: Date,
  ): Promise<AdminReportAnalytics> {
    try {
      const reports = await this.prisma.reportHistory.findMany({
        where: {
          sentAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      const totalReports = reports.length;
      const successfulReports = reports.filter((r: any) => r.deliveryStatus === 'delivered').length;
      const failedReports = reports.filter((r: any) => r.deliveryStatus === 'failed').length;
      const totalRecipients = reports.length;
      const averageDeliveryRate = totalRecipients > 0
        ? (successfulReports / totalRecipients) * 100
        : 0;

      // Calculate daily breakdown
      const dailyBreakdown = new Map<string, { sent: number; delivered: number; failed: number }>();
      
      reports.forEach((report: any) => {
        const date = report.sentAt.toISOString().split('T')[0];
        const existing = dailyBreakdown.get(date) || { sent: 0, delivered: 0, failed: 0 };
        existing.sent += 1;
        existing.delivered += report.deliveryStatus === 'delivered' ? 1 : 0;
        existing.failed += report.deliveryStatus === 'failed' ? 1 : 0;
        dailyBreakdown.set(date, existing);
      });

      return {
        totalReports,
        successfulReports,
        failedReports,
        totalRecipients,
        averageDeliveryRate,
        dailyBreakdown: Array.from(dailyBreakdown.entries()).map(([date, stats]) => ({
          date,
          ...stats,
        })),
      };
    } catch (error) {
      this.logger.error('Error fetching report analytics:', error);
      throw error;
    }
  }

  async generateTestReport(dto: TestReportDto): Promise<{ success: boolean; message: string }> {
    try {
      // Get a sample customer for test data
      const sampleUser = await this.prisma.customer.findFirst({
        where: { email: dto.recipientEmail },
        include: {
          jobs: {
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!sampleUser) {
        throw new NotFoundException('Test recipient user not found');
      }

      // Generate test report data
      const report = await this.generateUserReportData(sampleUser);
      
      // Send test email
      await this.emailService.sendWeeklyReport(
        dto.recipientEmail,
        report,
      );

      // Log test report - using existing schema
      // Note: This is a workaround until proper admin report history is implemented
      this.logger.log(`Test report sent to ${dto.recipientEmail}`);

      return {
        success: true,
        message: `Test report sent successfully to ${dto.recipientEmail}`,
      };
    } catch (error) {
      this.logger.error('Error generating test report:', error);
      
      // Log failed test
      this.logger.error(`Failed to send test report to ${dto.recipientEmail}:`, error);

      throw error;
    }
  }

  async generatePreview(dto: PreviewReportDto): Promise<{ html: string; subject: string }> {
    try {
      // Get sample data
      const sampleUser = await this.prisma.customer.findFirst({
        where: dto.userId ? { id: parseInt(dto.userId) } : undefined,
        include: {
          jobs: {
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!sampleUser) {
        throw new NotFoundException('Sample user not found');
      }

      // Generate report data
      const reportData = await this.generateUserReportData(sampleUser);
      
      // Apply template if provided
      const config = await this.getReportConfig();
      const subject = dto.emailTemplate?.subject || config.emailSubjectTemplate || 'Your Weekly Pool Service Report';
      
      // Generate HTML preview using the template
      const { html } = this.weeklyReportTemplate.generateReport(reportData);

      return { html, subject };
    } catch (error) {
      this.logger.error('Error generating preview:', error);
      throw error;
    }
  }

  async getReportPreferences(userId: string): Promise<AdminReportPreferences> {
    try {
      // For now, use SystemConfig to store user preferences until schema is updated
      const config = await this.prisma.systemConfig.findUnique({
        where: { key: `user_report_preferences_${userId}` },
      });

      if (!config) {
        // Return default preferences
        return {
          userId,
          receiveWeeklyReports: true,
          reportFrequency: 'weekly',
          preferredDay: 'monday',
          preferredTime: '09:00',
          includeWeatherData: true,
          includeServiceHistory: true,
          includeUpcomingServices: true,
          emailFormat: 'html',
        };
      }

      const prefs = config.value as any;
      return {
        userId,
        receiveWeeklyReports: prefs.receiveWeeklyReports ?? true,
        reportFrequency: prefs.reportFrequency ?? 'weekly',
        preferredDay: prefs.preferredDay ?? 'monday',
        preferredTime: prefs.preferredTime ?? '09:00',
        includeWeatherData: prefs.includeWeatherData ?? true,
        includeServiceHistory: prefs.includeServiceHistory ?? true,
        includeUpcomingServices: prefs.includeUpcomingServices ?? true,
        emailFormat: prefs.emailFormat ?? 'html',
      };
    } catch (error) {
      this.logger.error('Error fetching report preferences:', error);
      throw error;
    }
  }

  async updateReportPreferences(
    userId: string,
    dto: CustomerPreferencesDto,
  ): Promise<AdminReportPreferences> {
    try {
      const preferences = {
        receiveWeeklyReports: dto.receiveWeeklyReports,
        reportFrequency: dto.reportFrequency,
        preferredDay: dto.preferredDay,
        preferredTime: dto.preferredTime,
        includeWeatherData: dto.includeWeatherData,
        includeServiceHistory: dto.includeServiceHistory,
        includeUpcomingServices: dto.includeUpcomingServices,
        emailFormat: dto.emailFormat,
      };

      await this.prisma.systemConfig.upsert({
        where: { key: `user_report_preferences_${userId}` },
        update: { value: preferences },
        create: {
          key: `user_report_preferences_${userId}`,
          value: preferences,
        },
      });

      return {
        userId,
        receiveWeeklyReports: preferences.receiveWeeklyReports ?? true,
        reportFrequency: preferences.reportFrequency ?? 'weekly',
        preferredDay: preferences.preferredDay ?? 'monday',
        preferredTime: preferences.preferredTime ?? '09:00',
        includeWeatherData: preferences.includeWeatherData ?? true,
        includeServiceHistory: preferences.includeServiceHistory ?? true,
        includeUpcomingServices: preferences.includeUpcomingServices ?? true,
        emailFormat: preferences.emailFormat ?? 'html',
      };
    } catch (error) {
      this.logger.error('Error updating report preferences:', error);
      throw error;
    }
  }

  async bulkSendReports(dto: BulkSendDto): Promise<BulkSendResult> {
    try {
      const startTime = Date.now();
      let recipients: ReportRecipient[] = [];

      // Get recipients based on criteria
      if (dto.recipientIds && dto.recipientIds.length > 0) {
        const customers = await this.prisma.customer.findMany({
          where: { id: { in: dto.recipientIds.map(id => parseInt(id)) } },
        });
        recipients = customers.map(customer => ({
          id: customer.id.toString(),
          email: customer.email,
          name: customer.firstName || customer.email,
        }));
      } else if (dto.sendToAll) {
        // For now, get all customers since preferences are stored separately
        const customers = await this.prisma.customer.findMany({});
        
        // Filter customers who have opted in (default is true)
        const filteredCustomers = [];
        for (const customer of customers) {
          const prefs = await this.getReportPreferences(customer.id.toString());
          if (prefs.receiveWeeklyReports) {
            filteredCustomers.push(customer);
          }
        }
        recipients = filteredCustomers.map(customer => ({
          id: customer.id.toString(),
          email: customer.email,
          name: customer.firstName || customer.email,
        }));
      }

      if (recipients.length === 0) {
        throw new BadRequestException('No recipients found for bulk send');
      }

      // Send reports in batches
      const results = {
        totalRecipients: recipients.length,
        successCount: 0,
        failureCount: 0,
        failures: [] as Array<{ email: string; error: string }>,
      };

      const batchSize = 10;
      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (recipient) => {
            try {
              const customer = await this.prisma.customer.findUnique({
                where: { id: parseInt(recipient.id) },
                include: {
                  jobs: {
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                  },
                },
              });
              if (customer) {
                const report = await this.generateUserReportData(customer);
                await this.emailService.sendWeeklyReport(recipient.email, report);
              }
              results.successCount++;
            } catch (error) {
              results.failureCount++;
              results.failures.push({
                email: recipient.email,
                error: error.message,
              });
              this.logger.error(`Failed to send report to ${recipient.email}:`, error);
            }
          }),
        );

        // Add delay between batches to avoid rate limiting
        if (i + batchSize < recipients.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const duration = Date.now() - startTime;

      // Log bulk send summary
      this.logger.log(`Bulk send completed: ${results.successCount} successful, ${results.failureCount} failed, duration: ${duration}ms`);

      return {
        ...results,
        duration,
      };
    } catch (error) {
      this.logger.error('Error in bulk send:', error);
      throw error;
    }
  }

  private async createDefaultConfig(): Promise<AdminReportConfig> {
    const now = new Date();
    return {
      id: '1',
      isEnabled: true,
      scheduleDay: 'monday',
      scheduleTime: '09:00',
      timeZone: 'America/New_York',
      emailSubjectTemplate: 'Your Weekly Pool Service Report',
      emailFooterText: 'Thank you for choosing our pool service!',
      notificationEmails: [this.configService.get('ADMIN_EMAIL') || 'admin@clarity-pool.com'],
      lastModifiedBy: 'system',
      lastModifiedAt: now,
      createdAt: now,
      updatedAt: now,
    };
  }

  private async generateUserReportData(customer: any): Promise<any> {
    // Mock report data for now - in a real implementation, this would fetch actual pool service data
    const mockChemistryReadings = {
      chlorine: 2.5,
      ph: 7.4,
      alkalinity: 100,
      calcium: 250,
      cyanuricAcid: 50,
      salt: undefined,
      tds: undefined,
      phosphates: undefined,
      copper: undefined,
      iron: undefined,
    };

    const mockEquipmentStatus = {
      pump: {
        status: 'operational',
        lastService: new Date(),
        issues: [],
      },
      filter: {
        status: 'operational',
        lastCleaning: new Date(),
        pressure: 15,
      },
      heater: undefined,
      sanitizer: undefined,
    };

    const mockWeatherData = {
      temperature: 75,
      conditions: 'Sunny',
      forecast: [
        { date: new Date(), temp: 78, conditions: 'Partly Cloudy', precipitation: 0 },
        { date: new Date(Date.now() + 86400000), temp: 72, conditions: 'Sunny', precipitation: 0 },
        { date: new Date(Date.now() + 172800000), temp: 74, conditions: 'Sunny', precipitation: 10 },
      ],
    };

    return {
      jobId: Math.floor(Math.random() * 10000),
      customerName: `${customer.firstName || 'Customer'} ${customer.lastName || ''}`.trim(),
      customerEmail: customer.email,
      poolAddress: `${customer.address}, ${customer.city}, ${customer.state} ${customer.zipCode}`,
      serviceDate: new Date(),
      technicianName: 'John Doe',
      healthScore: 85,
      healthDetails: {
        overall: 85,
        details: {
          recommendations: ['Check filter pressure weekly', 'Monitor pH levels closely'],
          concerns: [],
        },
      },
      chemistry: mockChemistryReadings,
      chemistryTrends: [
        { parameter: 'chlorine', trend: 'stable', changePercent: 0 },
        { parameter: 'ph', trend: 'increasing', changePercent: 5 },
      ],
      equipment: mockEquipmentStatus,
      weather: mockWeatherData,
      servicesPerformed: [
        'Tested water chemistry',
        'Added chemicals as needed',
        'Cleaned skimmer baskets',
        'Brushed pool walls',
        'Vacuumed pool',
        'Checked equipment operation',
      ],
      chemicalsAdded: [
        { chemical: 'Liquid Chlorine', amount: '1 gallon', reason: 'Maintain sanitizer level' },
      ],
      notes: 'Pool is in good condition. All equipment operating normally.',
      recommendations: ['Consider upgrading to a variable speed pump for energy savings'],
      nextServiceDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      urgentIssues: [],
    };
  }
}