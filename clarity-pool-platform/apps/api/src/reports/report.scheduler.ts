import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { WeeklyReportService } from './weekly-report.service';

@Injectable()
export class ReportScheduler {
  private readonly logger = new Logger(ReportScheduler.name);

  constructor(
    private prisma: PrismaService,
    private weeklyReportService: WeeklyReportService,
  ) {}

  // Run every day at 6 PM to send any pending reports
  @Cron(CronExpression.EVERY_DAY_AT_6PM)
  async sendPendingReports() {
    try {
      this.logger.log('Starting scheduled report generation');

      // Get jobs completed today that haven't had reports sent
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const pendingJobs = await this.getPendingReportJobs(todayStart);

      this.logger.log(
        `Found ${pendingJobs.length} jobs pending report generation`,
      );

      for (const job of pendingJobs) {
        try {
          await this.weeklyReportService.generateReportForJob(job.id);
          this.logger.log(`Report generated for job ${job.id}`);
        } catch (error) {
          this.logger.error(
            `Failed to generate report for job ${job.id}:`,
            error,
          );
        }
      }
    } catch (error) {
      this.logger.error('Failed to run scheduled report generation:', error);
    }
  }

  // Run weekly summary reports on Sundays at 8 AM
  @Cron('0 8 * * 0') // Every Sunday at 8 AM
  async sendWeeklySummaryReports() {
    try {
      this.logger.log('Starting weekly summary report generation');

      // Get all active customers with reports enabled
      const activeCustomers = await this.getActiveCustomersWithReports();

      for (const customer of activeCustomers) {
        try {
          // Generate a weekly summary report
          await this.generateWeeklySummary(customer.id);
        } catch (error) {
          this.logger.error(
            `Failed to generate weekly summary for customer ${customer.id}:`,
            error,
          );
        }
      }
    } catch (error) {
      this.logger.error('Failed to run weekly summary generation:', error);
    }
  }

  private async getPendingReportJobs(sinceDate: Date): Promise<any[]> {
    try {
      // This query would need to be adjusted based on your actual schema
      const jobs = await this.prisma.$queryRaw`
        SELECT j.* 
        FROM Job j
        LEFT JOIN ReportHistory rh ON j.id = rh.jobId
        WHERE j.completedAt >= ${sinceDate}
        AND j.status = 'completed'
        AND rh.id IS NULL
        AND EXISTS (
          SELECT 1 FROM ReportPreferences rp 
          WHERE rp.customerId = j.customerId 
          AND rp.enabled = true
        )
      `;

      return jobs as any[];
    } catch (error) {
      this.logger.error('Failed to fetch pending report jobs:', error);
      return [];
    }
  }

  private async getActiveCustomersWithReports(): Promise<any[]> {
    try {
      // Temporarily return empty array until schema is migrated
      return [];

      // TODO: Uncomment after migration
      // return await this.prisma.customer.findMany({
      //   where: {
      //     active: true,
      //     reportPreferences: {
      //       enabled: true,
      //     },
      //   },
      //   include: {
      //     reportPreferences: true,
      //   },
      // });
    } catch (error) {
      this.logger.error('Failed to fetch active customers:', error);
      return [];
    }
  }

  private async generateWeeklySummary(customerId: number): Promise<void> {
    try {
      // Get all jobs for the past week
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const weeklyJobs = await this.prisma.$queryRaw`
        SELECT * FROM Job
        WHERE customerId = ${customerId}
        AND completedAt >= ${weekAgo}
        AND status = 'completed'
        ORDER BY completedAt DESC
      `;

      if ((weeklyJobs as any[]).length > 0) {
        // Generate report for the most recent job with weekly summary data
        const mostRecentJob = (weeklyJobs as any[])[0];
        await this.weeklyReportService.generateReportForJob(mostRecentJob.id);
      }
    } catch (error) {
      this.logger.error(
        `Failed to generate weekly summary for customer ${customerId}:`,
        error,
      );
    }
  }
}
