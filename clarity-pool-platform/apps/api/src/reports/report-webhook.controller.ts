import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpException,
  HttpStatus,
  Logger,
  Headers,
} from '@nestjs/common';
import { PoolbrainJobCompletedDto } from './dto/report-data.dto';
import { WeeklyReportService } from './weekly-report.service';
import * as crypto from 'crypto';

@Controller('api/webhooks/poolbrain')
export class ReportWebhookController {
  private readonly logger = new Logger(ReportWebhookController.name);

  constructor(private weeklyReportService: WeeklyReportService) {}

  @Post('job-completed')
  @HttpCode(200)
  async handleJobCompleted(
    @Body() payload: PoolbrainJobCompletedDto,
    @Headers('x-webhook-signature') signature?: string,
  ) {
    try {
      // Validate webhook signature if configured
      if (process.env.POOLBRAIN_WEBHOOK_SECRET && signature) {
        const isValid = this.validateWebhookSignature(
          payload,
          signature,
          process.env.POOLBRAIN_WEBHOOK_SECRET,
        );

        if (!isValid) {
          this.logger.error('Invalid webhook signature');
          throw new HttpException('Invalid signature', HttpStatus.UNAUTHORIZED);
        }
      }

      this.logger.log(
        `Received job completion webhook for job ${payload.jobId}`,
      );

      // Queue report generation with delay (async - don't wait)
      this.scheduleReportGeneration(payload.jobId);

      // Return immediately for async processing
      return {
        success: true,
        message: 'Report generation scheduled',
        jobId: payload.jobId,
      };
    } catch (error) {
      this.logger.error('Failed to process job completion webhook:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to process webhook',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private validateWebhookSignature(
    payload: any,
    signature: string,
    secret: string,
  ): boolean {
    try {
      const computedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(computedSignature),
      );
    } catch (error) {
      this.logger.error('Error validating webhook signature:', error);
      return false;
    }
  }

  private async scheduleReportGeneration(jobId: number): Promise<void> {
    try {
      // Default 5-minute delay (configurable per customer)
      const delayMs = 5 * 60 * 1000;

      setTimeout(async () => {
        try {
          await this.weeklyReportService.generateReportForJob(jobId);
          this.logger.log(`Report generated successfully for job ${jobId}`);
        } catch (error) {
          this.logger.error(
            `Failed to generate report for job ${jobId}:`,
            error,
          );
        }
      }, delayMs);

      this.logger.log(
        `Scheduled report generation for job ${jobId} in ${delayMs}ms`,
      );
    } catch (error) {
      this.logger.error(`Failed to schedule report generation:`, error);
    }
  }
}
