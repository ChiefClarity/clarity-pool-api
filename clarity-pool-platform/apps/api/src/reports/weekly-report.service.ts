import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PoolbrainService } from '../poolbrain/poolbrain.service';
import { EmailService } from '../email/email.service';
import { WeatherService } from '../weather/weather.service';
import { ClaudeAnalysisService } from '../claude-analysis/claude-analysis.service';
import { HealthScoreCalculator } from './health-score.calculator';
import { ChemistryTrendAnalyzer } from './chemistry-trend.analyzer';
import { WeeklyReportTemplate } from './templates/weekly-report.template';
import {
  WeeklyReportData,
  ChemistryReadings,
  EquipmentStatus,
  ReportPreferences,
} from './interfaces/report.interface';

@Injectable()
export class WeeklyReportService {
  private readonly logger = new Logger(WeeklyReportService.name);

  constructor(
    private prisma: PrismaService,
    private poolbrain: PoolbrainService,
    private email: EmailService,
    private weather: WeatherService,
    private claudeAnalysis: ClaudeAnalysisService,
    private healthScoreCalculator: HealthScoreCalculator,
    private chemistryTrendAnalyzer: ChemistryTrendAnalyzer,
    private weeklyReportTemplate: WeeklyReportTemplate,
  ) {}

  async generateReportForJob(jobId: number): Promise<boolean> {
    try {
      this.logger.log(`Starting report generation for job ${jobId}`);

      // Step 1: Fetch job details from Poolbrain
      const jobDetails = await this.fetchJobDetails(jobId);
      if (!jobDetails) {
        this.logger.error(`No job details found for job ${jobId}`);
        return false;
      }

      // Step 2: Get customer preferences
      const preferences = await this.getCustomerPreferences(
        jobDetails.customerId,
      );
      if (!preferences.enabled) {
        this.logger.log(
          `Reports disabled for customer ${jobDetails.customerId}`,
        );
        return false;
      }

      // Step 3: Gather all report data
      const reportData = await this.compileReportData(jobDetails);

      // Step 4: Send the report
      const sent = await this.email.sendWeeklyReport(
        reportData.customerEmail,
        reportData,
      );

      // Step 5: Log report history
      if (sent) {
        await this.logReportHistory(reportData);
      }

      return sent;
    } catch (error) {
      this.logger.error(`Failed to generate report for job ${jobId}:`, error);
      throw error;
    }
  }

  private async fetchJobDetails(jobId: number): Promise<any> {
    try {
      const response = await this.poolbrain.getJobDetails([jobId]);

      if (!response.data || response.data.length === 0) {
        throw new Error(`No job details found for job ${jobId}`);
      }

      return response.data[0];
    } catch (error) {
      this.logger.error(`Failed to fetch job details:`, error);

      // In development, return mock data
      if (process.env.NODE_ENV === 'development') {
        return this.getMockJobDetails(jobId);
      }

      throw error;
    }
  }

  private async getCustomerPreferences(
    customerId: number,
  ): Promise<ReportPreferences> {
    try {
      // For now, return default preferences until schema is migrated
      return {
        enabled: true,
        reportDelay: 5,
        includeCharts: true,
      };

      // TODO: Uncomment after migration
      // const preferences = await this.prisma.reportPreferences.findUnique({
      //   where: { customerId },
      // });
      // return preferences || {
      //   enabled: true,
      //   reportDelay: 5,
      //   includeCharts: true,
      // };
    } catch (error) {
      this.logger.error(`Failed to fetch customer preferences:`, error);
      return {
        enabled: true,
        reportDelay: 5,
        includeCharts: true,
      };
    }
  }

  private async compileReportData(jobDetails: any): Promise<WeeklyReportData> {
    try {
      // Extract chemistry readings
      const chemistry = this.extractChemistryReadings(jobDetails);

      // Get historical chemistry for trends
      const chemistryTrends = await this.chemistryTrendAnalyzer.analyzeTrends(
        jobDetails.customerId,
        chemistry,
      );

      // Get weather data
      const weather = await this.weather.getWeatherData(
        jobDetails.address.latitude,
        jobDetails.address.longitude,
      );

      // Extract equipment status
      const equipment = this.extractEquipmentStatus(jobDetails);

      // Calculate health score
      const healthDetails = this.healthScoreCalculator.calculateScore({
        chemistry,
        trends: chemistryTrends,
        equipment,
        environment: weather,
      });

      // Get AI-powered recommendations
      const aiRecommendations = await this.claudeAnalysis.analyzePoolCondition({
        chemistry,
        equipment,
        weather,
        trends: chemistryTrends,
      });

      return {
        jobId: jobDetails.id,
        customerName: `${jobDetails.customer.firstName} ${jobDetails.customer.lastName}`,
        customerEmail: jobDetails.customer.email,
        poolAddress: jobDetails.address.fullAddress,
        serviceDate: new Date(jobDetails.completedAt),
        technicianName: jobDetails.technician.name,

        healthScore: healthDetails.overall,
        healthDetails,

        chemistry,
        chemistryTrends,

        equipment,
        weather,

        servicesPerformed: this.extractServicesPerformed(jobDetails),
        chemicalsAdded: this.extractChemicalsAdded(jobDetails),

        notes: jobDetails.notes || '',
        recommendations: [
          ...healthDetails.details.recommendations,
          ...aiRecommendations,
        ],

        nextServiceDate: this.calculateNextServiceDate(jobDetails),
        urgentIssues: healthDetails.details.concerns.filter((c) =>
          this.isUrgent(c),
        ),
      };
    } catch (error) {
      this.logger.error(`Failed to compile report data:`, error);
      throw error;
    }
  }

  private extractChemistryReadings(jobDetails: any): ChemistryReadings {
    const readings = jobDetails.chemistryReadings || {};

    return {
      chlorine: readings.chlorine || 0,
      ph: readings.ph || 0,
      alkalinity: readings.alkalinity || 0,
      calcium: readings.calcium || 0,
      cyanuricAcid: readings.cyanuricAcid || 0,
      salt: readings.salt,
      tds: readings.tds,
      phosphates: readings.phosphates,
      copper: readings.copper,
      iron: readings.iron,
    };
  }

  private extractEquipmentStatus(jobDetails: any): EquipmentStatus {
    const equipment = jobDetails.equipment || {};

    return {
      pump: {
        status: equipment.pump?.status || 'operational',
        lastService: equipment.pump?.lastService || new Date(),
        issues: equipment.pump?.issues || [],
      },
      filter: {
        status: equipment.filter?.status || 'operational',
        lastCleaning: equipment.filter?.lastCleaning || new Date(),
        pressure: equipment.filter?.pressure || 15,
      },
      heater: equipment.heater
        ? {
            status: equipment.heater.status,
            temperature: equipment.heater.temperature,
          }
        : undefined,
      sanitizer: equipment.sanitizer
        ? {
            type: equipment.sanitizer.type,
            status: equipment.sanitizer.status,
          }
        : undefined,
    };
  }

  private extractServicesPerformed(jobDetails: any): string[] {
    return (
      jobDetails.servicesPerformed || [
        'Tested water chemistry',
        'Added chemicals as needed',
        'Cleaned skimmer baskets',
        'Brushed pool walls',
        'Vacuumed pool',
        'Checked equipment operation',
      ]
    );
  }

  private extractChemicalsAdded(
    jobDetails: any,
  ): Array<{ chemical: string; amount: string; reason: string }> {
    return jobDetails.chemicalsAdded || [];
  }

  private calculateNextServiceDate(jobDetails: any): Date {
    const serviceDate = new Date(jobDetails.completedAt);
    const daysToAdd = jobDetails.serviceFrequency === 'weekly' ? 7 : 14;
    serviceDate.setDate(serviceDate.getDate() + daysToAdd);
    return serviceDate;
  }

  private isUrgent(concern: string): boolean {
    const urgentKeywords = [
      'high',
      'low',
      'danger',
      'critical',
      'immediately',
      'urgent',
    ];
    return urgentKeywords.some((keyword) =>
      concern.toLowerCase().includes(keyword),
    );
  }

  private async logReportHistory(reportData: WeeklyReportData): Promise<void> {
    try {
      // TODO: Implement after migration
      // await this.prisma.reportHistory.create({
      //   data: {
      //     customerId: await this.getCustomerIdByEmail(reportData.customerEmail),
      //     jobId: reportData.jobId,
      //     healthScore: reportData.healthScore,
      //     reportType: 'post-service',
      //   },
      // });
      this.logger.log(`Report history logging skipped - pending migration`);
    } catch (error) {
      this.logger.error(`Failed to log report history:`, error);
    }
  }

  private async getCustomerIdByEmail(email: string): Promise<number> {
    try {
      const customer = await this.prisma.customer.findFirst({
        where: { email },
      });
      return customer?.id || 0;
    } catch (error) {
      this.logger.error(`Failed to get customer ID by email:`, error);
      return 0;
    }
  }

  private getMockJobDetails(jobId: number): any {
    return {
      id: jobId,
      customerId: 1,
      customer: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
      },
      address: {
        fullAddress: '123 Pool St, Poolville, PL 12345',
        latitude: 34.0522,
        longitude: -118.2437,
      },
      completedAt: new Date(),
      technician: {
        name: 'Tech Smith',
      },
      chemistryReadings: {
        chlorine: 2.5,
        ph: 7.4,
        alkalinity: 100,
        calcium: 250,
        cyanuricAcid: 50,
      },
      equipment: {
        pump: { status: 'operational' },
        filter: { status: 'operational', pressure: 15 },
      },
      notes: 'Pool in good condition',
      serviceFrequency: 'weekly',
    };
  }

  getReportTemplate() {
    return this.weeklyReportTemplate;
  }
}
