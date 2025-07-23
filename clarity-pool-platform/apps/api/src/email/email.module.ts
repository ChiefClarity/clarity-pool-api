import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { BookingEmailTemplate } from './templates/booking-notification.template';
import { WeeklyReportTemplate } from '../reports/templates/weekly-report.template';

@Module({
  providers: [EmailService, BookingEmailTemplate, WeeklyReportTemplate],
  exports: [EmailService],
})
export class EmailModule {}
